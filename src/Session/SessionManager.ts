import {
    makeWASocket, DisconnectReason,
    ConnectionState, jidDecode, jidNormalizedUser, Browsers, AnyMediaMessageContent,
    makeCacheableSignalKeyStore,
    WAMessageUpdate,
    WAMessage,
    MessageUpsertType,
    proto
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode';
import P from 'pino';
import { existsSync, rmdirSync } from 'fs';
import { Session } from '../Models/Session';
import { WebhookService } from '../Webhook/WebhookService';
import { ISession, SessionManagerData, MessageData } from '../Types';
import { PrintConsole } from '../Helper/PrintConsole';
import { ErrorResponse } from '../Helper/ResponseError';
import { useMySQLAuthState } from './MysqlAuth';
import { db } from '..';
import { UuidV7 } from '../Helper/uuid';
import { getAckString } from '../Helper/GetAckString';

const printConsole = new PrintConsole();

export class SessionManager {
    sessions: Map<string, SessionManagerData>;
    private logger: P.Logger;
    private webhookService: WebhookService;
    readonly sessionModel: Session;

    constructor() {
        this.sessions = new Map();
        this.logger = P({ level: Bun.env.LOG_LEVEL || 'info' });
        this.webhookService = new WebhookService();
        this.sessionModel = new Session();
    }
    private validateAndNormalizeJid = (jid: string) => {
        try {
            // Normalize JID first
            const normalizedJid = jidNormalizedUser(jid);

            // Try to decode to validate
            const decoded = jidDecode(normalizedJid);
            if (!decoded || !decoded.user) {
                throw new Error('Invalid JID format');
            }

            return normalizedJid;
        } catch (error) {
            // If normalization fails, try to format manually
            let formattedJid = jid;

            // Remove any non-numeric characters except @
            formattedJid = formattedJid.replace(/[^\d@]/g, '');

            // Add @s.whatsapp.net if not present
            if (!formattedJid.includes('@')) {
                formattedJid += '@s.whatsapp.net';
            }

            // Validate the formatted JID
            const decoded = jidDecode(formattedJid);
            if (!decoded || !decoded.user) {
                throw new ErrorResponse(400, "INVALID_WHATSAPP_NUMBER_FORMAT", `Invalid WhatsApp number format: ${jid}`);
            }

            return formattedJid;
        }
    }

    loadActiveSessions = async (): Promise<void> => {
        try {
            printConsole.info('Loading active sessions from database...');
            const activeSessions = await this.sessionModel.findAll();

            for (const session of activeSessions) {
                if (session.isActive && session.status === 'connected') {
                    printConsole.info(`Reloading session: ${session.sessionName}`);
                    try {
                        await this.initializeSession(session);
                        printConsole.success(`Session ${session.sessionName} reloaded successfully`);
                    } catch (error) {
                        printConsole.error(`Failed to reload session ${session.sessionName}: ${(error as Error).message}`);
                        // Mark session as disconnected if reload fails
                        session.status = 'disconnected';
                        await session.save();
                        printConsole.info(`Session ${session.sessionName} marked as disconnected and deleted from database`);
                        await this.deleteAndRemoveSession(session.sessionName);
                    }
                }
            }

            printConsole.info(`Loaded ${this.sessions.size} active sessions`);
        } catch (error) {
            printConsole.error(`Failed to load active sessions: ${(error as Error).message}`);
        }
    }

    createSession = async (sessionName: string, webhookUrl?: string): Promise<ISession> => {
        // Check if session already exists in memory
        if (this.sessions.has(sessionName)) {
            throw new ErrorResponse(400, "SESSION_IS_ACTIVE", `Session '${sessionName}' already exists and active in memory`);
        }

        // Check if session already exists in database
        let session = await this.sessionModel.findBySessionName(sessionName);

        if (session) {
            if (session.isActive) {
                throw new ErrorResponse(400, "SESSION_IS_ACTIVE", `Session '${sessionName}' already exists and active`);
            }
            // Reactivate existing session
            session.isActive = true;
            await session.save();
        } else {
            // Create new session
            session = new Session({
                sessionName: sessionName,
                status: 'qr_required',
                webhookUrl: webhookUrl
            });
            await session.save();
        }

        // Initialize Baileys socket
        await this.initializeSession(session);

        return session;

    }

    private initializeSession = async (session: ISession): Promise<void> => {
        try {
            const { state, saveCreds, removeCreds } = await useMySQLAuthState(session.id);

            const socket = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, this.logger)
                },
                printQRInTerminal: false,
                logger: this.logger,
                browser: Browsers.macOS('Google Chrome'),
                generateHighQualityLinkPreview: true,
                connectTimeoutMs: 60_000,
                keepAliveIntervalMs: 30_000,
                retryRequestDelayMs: 250,
                maxMsgRetryCount: 5,
                markOnlineOnConnect: true,
                syncFullHistory: true,
            });

            // Store socket reference
            this.sessions.set(session.sessionName, {
                socket,
                session,
                saveCreds
            });

            // Event handlers
            socket.ev.on('connection.update', async (update) => {
                await this.handleConnectionUpdate(session, update);
            });

            socket.ev.on('creds.update', () => {
                saveCreds();
            });

            socket.ev.on('messages.upsert', async (m) => {
                await this.handleMessages(session, m);
            });

            socket.ev.on('messages.update', async (m) => {
                await this.handleMessageUpdates(session, m);
            });

            // Update session status
            session.status = 'connecting';
            await (session as Session).save();

            printConsole.info(`Session ${session.sessionName} initialized`);
        } catch (error) {
            printConsole.error(`Failed to initialize session ${session.sessionName}: ${(error as Error).message}`);
            throw new ErrorResponse(500, "FAILED_TO_CREATE_SESSION", `Failed to initialize session ${session.sessionName}`);
        }
    }

    private handleConnectionUpdate = async (session: ISession, update: Partial<ConnectionState>): Promise<void> => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            // Generate QR code as base64
            try {
                const qrCodeBase64 = await qrcode.toDataURL(qr);
                session.qrCode = qr;
                session.status = 'qr_required';
                await (session as Session).save();
                printConsole.info(`QR code generated for session ${session.sessionName}`);
            } catch (error) {
                printConsole.error(`Failed to generate QR code for session ${session.sessionName}: ${(error as Error).message}`);
            }
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

            // Check if it's a conflict error - don't reconnect immediately
            // const isConflictError = lastDisconnect?.error?.message?.includes('conflict') || 
            //                       lastDisconnect?.error?.message?.includes('replaced');

            if (shouldReconnect) {
                printConsole.info(`Reconnecting session ${session.sessionName}...`);
                session.status = 'connecting';
                await (session as Session).save();
                await this.webhookService.sendEvent({
                    sessionId: session.id,
                    webhookUrl: session.webhookUrl,
                    eventType: 'session.retry',
                    eventData: {
                        sessionName: session.sessionName,
                        reason: lastDisconnect?.error?.message,
                        timestamp: new Date().toISOString()
                    }
                })

                // Wait a bit before reconnecting
                setTimeout(async () => {
                    try {
                        await this.initializeSession(session);
                    } catch (error) {
                        printConsole.error(`Failed to reconnect session ${session.sessionName}: ${(error as Error).message}`);
                    }
                }, 5000); // Wait 5 seconds before reconnecting
            }
            else {
                printConsole.info(`Session ${session.sessionName} logged out`);
                session.status = 'disconnected';
                session.qrCode = undefined;
                await (session as Session).save();

                await this.webhookService.sendEvent({
                    sessionId: session.id,
                    webhookUrl: session.webhookUrl,
                    eventType: 'session.disconnected',
                    eventData: {
                        sessionName: session.sessionName,
                        reason: lastDisconnect?.error?.message,
                        timestamp: new Date().toISOString()
                    }
                })

                this.deleteAndRemoveSession(session.sessionName);
            }
        } else if (connection === 'open') {
            printConsole.success(`Session ${session.sessionName} connected successfully`);
            session.status = 'connected';
            session.qrCode = undefined;

            // Get phone number from socket
            const sessionData = this.sessions.get(session.sessionName);
            if (sessionData) {
                sessionData.session.status = 'connected';
                if (sessionData.socket?.user?.id) {
                    session.phoneNumber = sessionData.socket.user.id.split(':')[0];
                }
            }

            await (session as Session).save();

            // Send webhook notification
            await this.webhookService.sendEvent({
                sessionId: session.id,
                webhookUrl: session.webhookUrl,
                eventType: 'session.connected',
                eventData: {
                    sessionName: session.sessionName,
                    phoneNumber: session.phoneNumber,
                    timestamp: new Date().toISOString()
                }
            });
        }
    }

    private handleMessages = async (session: ISession, m: {
        messages: WAMessage[];
        type: MessageUpsertType;
        requestId?: string;
    }): Promise<void> => {
        try {
            const messages = m.messages;

            for (const message of messages) {
                // Validate and normalize the sender JID
                let fromJid = message.key.remoteJid;
                try {
                    fromJid = this.validateAndNormalizeJid(message.key.remoteJid || '');
                } catch (error) {
                    printConsole.warning(`Invalid sender JID: ${message.key.remoteJid}, skipping message`);
                    continue;
                }

                // check if image or not
                const isImage = message.message?.imageMessage || 
                message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage ||
                message.message?.associatedChildMessage?.message?.imageMessage

                const sessionData = this.sessions.get(session.sessionName);
                if (sessionData && isImage) {
                    // download image
                    
                }



                // Send webhook for incoming messages
                await this.webhookService.sendEvent({
                    sessionId: session.id,
                    webhookUrl: session.webhookUrl,
                    eventType: 'message.received',
                    eventData: {
                        sessionName: session.sessionName,
                        messageId: message.key.id,
                        from: fromJid,
                        message: message.message,
                        m: m,
                        timestamp: new Date().toISOString()
                    }
                });

                // for now, only save from personal chat, ignore group and etc
                if (fromJid.includes('s.whatsapp.net')) {
                    await db.beginTransaction();
                    const sql = 'INSERT INTO messages (id, session_id, message_id, from_me, is_read, event, data, ack, ack_string) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
                    const params = [
                        UuidV7(),
                        session.id,
                        message.key.id,
                        message.key.fromMe,
                        0,
                        'message.received',
                        typeof message.message === 'string' ? message.message : JSON.stringify(message.message),
                        message.status ?? null,
                        getAckString(message.status)
                    ]
                    await db.query(sql, params);
                    await db.commitTransaction();
                }


            }
        } catch (error) {
            printConsole.error(`Error handling messages for session ${session.sessionName}: ${(error as Error).message}`);
        }
    }

    private handleMessageUpdates = async (session: ISession, updates: WAMessageUpdate[]): Promise<void> => {
        try {
            for (const update of updates) {
                // Send webhook for message updates (delivery, read, etc.)
                const status = update.update.status
                if (status) {
                    const ackString = getAckString(status)
                    const isRead = status === proto.WebMessageInfo.Status.READ || status === proto.WebMessageInfo.Status.PLAYED
                    if (isRead) {
                        printConsole.success(`Message ${update.key.id} marked as read for session ${session.sessionName}`);
                    } else {
                        printConsole.warning(`Message ${update.key.id} marked as ${ackString} for session ${session.sessionName}`);
                    }
                    const sqlUpdateMessageReadu = `UPDATE messages SET is_read = ?, ack = ?, ack_string = ? WHERE message_id = ?`;
                    await db.query(sqlUpdateMessageReadu, [isRead, status, ackString, update.key.id]);
                }
                await this.webhookService.sendEvent({
                    sessionId: session.id,
                    webhookUrl: session.webhookUrl,
                    eventType: 'message.update',
                    eventData: {
                        sessionName: session.sessionName,
                        messageId: update.key.id,
                        update: update,
                        timestamp: new Date().toISOString()
                    }
                });
            }
        } catch (error) {
            printConsole.error(`Error handling message updates for session ${session.sessionName}: ${(error as Error).message}`);
        }
    }

    getSession = (sessionName: string): SessionManagerData | undefined => {
        return this.sessions.get(sessionName);
    }

    getAllSessions = async (): Promise<Array<{ sessionName: string; status: string; phoneNumber?: string }>> => {
        const sessions: Array<{ sessionName: string; status: string; phoneNumber?: string }> = [];

        // Get sessions from memory
        for (const [sessionName, sessionData] of this.sessions) {
            sessions.push({
                sessionName,
                status: sessionData.session.status,
                phoneNumber: sessionData.session.phoneNumber
            });
        }

        // Also check database for sessions that might not be in memory
        try {
            const dbSessions = await this.sessionModel.findAll();
            for (const dbSession of dbSessions) {
                if (!this.sessions.has(dbSession.sessionName)) {
                    sessions.push({
                        sessionName: dbSession.sessionName,
                        status: dbSession.status,
                        phoneNumber: dbSession.phoneNumber
                    });
                }
            }
        } catch (error) {
            printConsole.error(`Failed to get sessions from database: ${(error as Error).message}`);
        }

        return sessions;
    }

    getSessionStatus = async (sessionName: string): Promise<{ sessionName: string; status: string; phoneNumber?: string; isActive: boolean; lastSeen?: Date } | null> => {
        // Check memory first
        const sessionData = this.sessions.get(sessionName);
        if (sessionData) {
            return {
                sessionName: sessionData.session.sessionName,
                status: sessionData.session.status,
                phoneNumber: sessionData.session.phoneNumber,
                isActive: sessionData.session.isActive,
                lastSeen: sessionData.session.lastSeen
            };
        }

        // Check database if not in memory
        try {
            const session = await this.sessionModel.findBySessionName(sessionName);
            if (session) {
                return {
                    sessionName: session.sessionName,
                    status: session.status,
                    phoneNumber: session.phoneNumber,
                    isActive: session.isActive,
                    lastSeen: session.lastSeen
                };
            }
        } catch (error) {
            printConsole.error(`Failed to get session status from database: ${(error as Error).message}`);
        }

        return null;
    }

    async deleteSession(sessionName: string): Promise<void> {
        const sessionData = this.sessions.get(sessionName);
        if (sessionData) {
            try {
                // Disconnect socket gracefully
                await sessionData.socket.logout();
            } catch (error) {
                printConsole.warning(`Error during socket logout: ${(error as Error).message}`);
            }

            // Remove from memory
            this.sessions.delete(sessionName);
            printConsole.info(`Session ${sessionName} removed from memory`);

            await this.deleteAndRemoveSession(sessionName);
        } else {
            printConsole.error(`Session ${sessionName} not found in sessions`);
            printConsole.info(`Try remove folder manually: ./sessions/${sessionName}`);
            await this.deleteAndRemoveSession(sessionName);
        }
    }

    private async deleteAndRemoveSession(sessionName: string): Promise<void> {
        const session = await this.sessionModel.findBySessionName(sessionName);
        if (session) {
            await session.delete();
            printConsole.info(`Session ${sessionName} deleted from database`);
        }
        // check folder exists
        // if (existsSync(`./sessions/${sessionName}`)) {
        //     rmdirSync(`./sessions/${sessionName}`, { recursive: true });
        //     printConsole.info(`Session ${sessionName} folder removed`);
        // } else {
        //     printConsole.error(`Session ${sessionName} folder not found`);
        // }
    }

    async restartSession(sessionName: string): Promise<void> {
        const sessionData = this.sessions.get(sessionName);
        if (sessionData) {
            // Disconnect current socket
            await sessionData.socket.logout();
            this.sessions.delete(sessionName);
        }

        // Find session in database
        const session = await this.sessionModel.findBySessionName(sessionName);
        if (session) {
            // Reset session status
            session.status = 'qr_required';
            session.qrCode = undefined;
            await session.save();

            // Reinitialize session
            await this.initializeSession(session);
        }
    }

    async sendMessage(sessionName: string, to: string, message: string | MessageData, type: 'text' | 'image' | 'document' = 'text'): Promise<any> {
        // Check if session exists in memory
        let sessionData = this.sessions.get(sessionName);

        // If not in memory, try to reload from database
        if (!sessionData) {
            printConsole.info(`Session ${sessionName} not in memory`);
            throw new ErrorResponse(400, "SESSION_NOT_FOUND", `Session ${sessionName} not found or not active`)
            // const session = await this.sessionModel.findBySessionName(sessionName);
            // if (session && session.isActive) {
            //     try {
            //         await this.initializeSession(session);
            //         sessionData = this.sessions.get(sessionName);
            //     } catch (error) {
            //         printConsole.error(`Failed to reload session ${sessionName}: ${(error as Error).message}`);
            //         throw new ErrorResponse(400, "FAILED_TO_RELOAD_SESSION", `Session ${sessionName} not found or not connected`);

            //     }
            // } else {
            //     throw new ErrorResponse(400, "SESSION_NOT_FOUND", `Session ${sessionName} not found or not active`);

            // }
        }

        if (!sessionData) {
            throw new ErrorResponse(400, "SESSION_NOT_CONNECTED", `Session ${sessionName} is not connected`);
        }

        try {
            // Validate and normalize the recipient JID
            const normalizedTo = this.validateAndNormalizeJid(to);
            printConsole.info(`Sending ${type} message to: ${normalizedTo}`);

            let result: any;

            switch (type) {
                case 'text':
                    result = await sessionData.socket.sendMessage(normalizedTo, { text: message as string });
                    break;
                case 'image':
                    const imageData = message as MessageData;
                    if (!imageData.url && !imageData.buffer) {
                        throw new ErrorResponse(400, "IMAGE_DATA_REQUIRED", `Image should as string url or File`);
                    }
                    let dataImage: AnyMediaMessageContent = {
                        image: imageData.url ? { url: imageData.url } : imageData.buffer!,
                        caption: imageData.caption || '',
                        mimetype: imageData.mimetype || 'image/png'
                    }
                    result = await sessionData.socket.sendMessage(normalizedTo, dataImage);
                    break;
                case 'document':
                    const docData = message as MessageData;
                    if (!docData.url && !docData.buffer) {
                        throw new ErrorResponse(400, "DOCUMENT_DATA_REQUIRED", `Document should as string url or File`);
                    }
                    result = await sessionData.socket.sendMessage(normalizedTo, {
                        document: docData.url ? { url: docData.url } : docData.buffer!,
                        mimetype: docData.mimetype || 'application/octet-stream',
                        fileName: docData.fileName || 'document',
                        jpegThumbnail: docData.url ? undefined : docData.buffer?.toString('base64'),
                        caption: docData.caption || ''
                    });
                    break;
                default:
                    throw new ErrorResponse(400, "UNSUPPORTED_MESSAGE_TYPE", `Unsupported message type: ${type}`);

            }

            // Send webhook notification
            await this.webhookService.sendEvent({
                sessionId: sessionData.session.id,
                webhookUrl: sessionData.session.webhookUrl,
                eventType: 'message.sent',
                eventData: {
                    sessionName,
                    to: normalizedTo,
                    messageType: type,
                    messageId: result?.key?.id,
                    timestamp: new Date().toISOString()
                }
            });

            return result;
        } catch (error) {
            printConsole.error(`Failed to send message via session ${sessionName}: ${(error as Error).message}`);
            throw new ErrorResponse(500, "FAILED_TO_SEND_MESSAGE", `Failed to send message via session ${sessionName}`);
        }
    }

    sendRead = async (session: ISession, to: string, messageIds?: string[]) => {
        const sessionData = this.sessions.get(session.sessionName);
        const normalizedTo = this.validateAndNormalizeJid(to);
        printConsole.info(`Sending read to: ${normalizedTo}`);

        if (sessionData) {
            if (messageIds && messageIds.length > 0) {
                let dataToRead = []
                for (const x of messageIds) {
                    dataToRead.push({ remoteJid: normalizedTo, id: x })
                }
                await sessionData.socket.readMessages(dataToRead);
            } else {
                // check databasse
                const sql = 'SELECT message_id, id FROM messages WHERE session_id = ? AND from_me = ? AND is_read = ? AND event = ?';
                const dataMessages = await db.query(sql, [session.id, 0, 0, 'message.received']);

                let dataToRead = []
                for (const x of dataMessages) {
                    dataToRead.push({ remoteJid: normalizedTo, id: x.message_id })
                }
                if (dataToRead.length > 0) {
                    await sessionData.socket.readMessages(dataToRead);
                    const ids = dataMessages.map((x: any) => x.id);
                    if (ids.length) {
                        const placeholders = ids.map(() => '?').join(',');
                        await db.query(`UPDATE messages SET is_read = ? WHERE id IN (${placeholders})`, [1, ...ids]);
                    }
                } else {
                    printConsole.warning(`No messages to read for session ${session.sessionName}`);
                }
            }

        }
    }
    stopTyping = async (sessionName: string, to: string) => {
        const sessionData = this.sessions.get(sessionName);
        const normalizedTo = this.validateAndNormalizeJid(to);

        if (sessionData) {
            await sessionData.socket.sendPresenceUpdate('paused', normalizedTo);
        }
    }

    sendTyping = async (sessionName: string, to: string) => {
        const sessionData = this.sessions.get(sessionName);
        const normalizedTo = this.validateAndNormalizeJid(to);

        if (sessionData) {
            await sessionData.socket.sendPresenceUpdate('composing', normalizedTo);
        }
    }
}
