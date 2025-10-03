import { makeWASocket, DisconnectReason, useMultiFileAuthState, ConnectionState, jidDecode, jidNormalizedUser, Browsers } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode';
import P from 'pino';
import { existsSync, rmdirSync } from 'fs';
import { Session } from '../Models/Session';
import { WebhookService } from '../Webhook/WebhookService';
import { ISession, SessionManagerData, MessageData, WebhookEventType } from '../Types';
import { PrintConsole } from '../Helper/PrintConsole';

const printConsole = new PrintConsole();

export class SessionManager {
    private sessions: Map<string, SessionManagerData>;
    private logger: P.Logger;
    private webhookService: WebhookService;

    private validateAndNormalizeJid(jid: string): string {
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
                throw new Error(`Invalid WhatsApp number format: ${jid}`);
            }

            return formattedJid;
        }
    }

    constructor() {
        this.sessions = new Map();
        this.logger = P({ level: Bun.env.LOG_LEVEL || 'info' });
        this.webhookService = new WebhookService();

        // Auto-reload active sessions on startup
        // this.loadActiveSessions();
    }

    async loadActiveSessions(): Promise<void> {
        try {
            printConsole.info('Loading active sessions from database...');
            const activeSessions = await Session.findAll();

            for (const session of activeSessions) {
                if (session.isActive && session.status === 'connected') {
                    printConsole.info(`Reloading session: ${session.sessionName}`);
                    try {
                        await this.initializeSession(session);
                        printConsole.info(`Session ${session.sessionName} reloaded successfully`);
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

    async createSession(sessionName: string): Promise<ISession> {
        try {
            // Check if session already exists
            let session = await Session.findBySessionName(sessionName);

            if (session) {
                if (session.isActive) {
                    throw new Error(`Session '${sessionName}' already exists and is active`);
                }
                // Reactivate existing session
                session.isActive = true;
                await session.save();
            } else {
                // Create new session
                session = new Session({
                    sessionName: sessionName,
                    status: 'qr_required'
                });
                await session.save();
            }

            // Initialize Baileys socket
            await this.initializeSession(session);

            return session;
        } catch (error) {
            printConsole.error(`Failed to create session ${sessionName}: ${(error as Error).message}`);
            throw error;
        }
    }

    private async initializeSession(session: ISession): Promise<void> {
        try {
            const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${session.sessionName}`);

            const socket = makeWASocket({
                auth: state,
                printQRInTerminal: false,
                logger: this.logger,
                browser: Browsers.macOS("Desktop"),
                generateHighQualityLinkPreview: true,
                connectTimeoutMs: 60_000,
                keepAliveIntervalMs: 30_000,
                retryRequestDelayMs: 250,
                maxMsgRetryCount: 5,
                markOnlineOnConnect: true,
                syncFullHistory: false,
                getMessage: async (key) => {
                    return undefined;
                }
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

            socket.ev.on('creds.update', saveCreds);

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
            throw error;
        }
    }

    private async handleConnectionUpdate(session: ISession, update: Partial<ConnectionState>): Promise<void> {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            // Generate QR code as base64
            try {
                const qrCodeBase64 = await qrcode.toDataURL(qr);
                session.qrCode = qrCodeBase64;
                session.status = 'qr_required';
                await (session as Session).save();
                printConsole.info(`QR code generated for session ${session.sessionName}`);
            } catch (error) {
                printConsole.error(`Failed to generate QR code for session ${session.sessionName}: ${(error as Error).message}`);
            }
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

            if (shouldReconnect) {
                printConsole.info(`Reconnecting session ${session.sessionName}...`);
                session.status = 'connecting';
                await (session as Session).save();

                // Wait a bit before reconnecting
                setTimeout(async () => {
                    try {
                        await this.initializeSession(session);
                    } catch (error) {
                        printConsole.error(`Failed to reconnect session ${session.sessionName}: ${(error as Error).message}`);
                    }
                }, 5000); // Wait 5 seconds before reconnecting
            } else {
                printConsole.info(`Session ${session.sessionName} logged out`);
                session.status = 'disconnected';
                session.qrCode = undefined;
                await (session as Session).save();
                this.deleteAndRemoveSession(session.sessionName);
            }
        } else if (connection === 'open') {
            printConsole.info(`Session ${session.sessionName} connected successfully`);
            session.status = 'connected';
            session.qrCode = undefined;

            // Get phone number from socket
            const sessionData = this.sessions.get(session.sessionName);
            if (sessionData?.socket?.user?.id) {
                session.phoneNumber = sessionData.socket.user.id.split(':')[0];
            }

            await (session as Session).save();

            // Send webhook notification
            await this.webhookService.sendEvent(session.id, 'session.connected', {
                sessionName: session.sessionName,
                phoneNumber: session.phoneNumber,
                timestamp: new Date().toISOString()
            });
        }
    }

    private async handleMessages(session: ISession, m: any): Promise<void> {
        try {
            const messages = m.messages;

            for (const message of messages) {
                // Validate and normalize the sender JID
                let fromJid = message.key.remoteJid;
                try {
                    fromJid = this.validateAndNormalizeJid(message.key.remoteJid);
                } catch (error) {
                    printConsole.warning(`Invalid sender JID: ${message.key.remoteJid}, skipping message`);
                    continue;
                }

                // Send webhook for incoming messages
                await this.webhookService.sendEvent(session.id, 'message.received', {
                    sessionName: session.sessionName,
                    messageId: message.key.id,
                    from: fromJid,
                    message: message.message,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            printConsole.error(`Error handling messages for session ${session.sessionName}: ${(error as Error).message}`);
        }
    }

    private async handleMessageUpdates(session: ISession, updates: any[]): Promise<void> {
        try {
            for (const update of updates) {
                // Send webhook for message updates (delivery, read, etc.)
                await this.webhookService.sendEvent(session.id, 'message.update', {
                    sessionName: session.sessionName,
                    messageId: update.key.id,
                    update: update,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            printConsole.error(`Error handling message updates for session ${session.sessionName}: ${(error as Error).message}`);
        }
    }

    async getSession(sessionName: string): Promise<SessionManagerData | undefined> {
        return this.sessions.get(sessionName);
    }

    async getAllSessions(): Promise<Array<{ sessionName: string; status: string; phoneNumber?: string }>> {
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
            const dbSessions = await Session.findAll();
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

    async getSessionStatus(sessionName: string): Promise<{ sessionName: string; status: string; phoneNumber?: string; isActive: boolean; lastSeen?: Date } | null> {
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
            const session = await Session.findBySessionName(sessionName);
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
            // Disconnect socket
            await sessionData.socket.logout();
            this.sessions.delete(sessionName);

            await this.deleteAndRemoveSession(sessionName);
        } else {
            printConsole.error(`Session ${sessionName} not found in sessions`);
            printConsole.info(`Try remove folder manually: ./sessions/${sessionName}`);
            await this.deleteAndRemoveSession(sessionName);
        }
    }

    private async deleteAndRemoveSession(sessionName: string): Promise<void> {
        const session = await Session.findBySessionName(sessionName);
        if (session) {
            await session.delete();
            printConsole.info(`Session ${sessionName} deleted from database`);
        }
        // check folder exists
        if (existsSync(`./sessions/${sessionName}`)) {
            rmdirSync(`./sessions/${sessionName}`, { recursive: true });
            printConsole.info(`Session ${sessionName} folder removed`);
        } else {
            printConsole.error(`Session ${sessionName} folder not found`);
        }
    }

    async restartSession(sessionName: string): Promise<void> {
        const sessionData = this.sessions.get(sessionName);
        if (sessionData) {
            // Disconnect current socket
            await sessionData.socket.logout();
            this.sessions.delete(sessionName);
        }

        // Find session in database
        const session = await Session.findBySessionName(sessionName);
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
            printConsole.info(`Session ${sessionName} not in memory, attempting to reload from database...`);
            const session = await Session.findBySessionName(sessionName);
            if (session && session.isActive) {
                try {
                    await this.initializeSession(session);
                    sessionData = this.sessions.get(sessionName);
                    printConsole.info(`Session ${sessionName} reloaded successfully`);
                } catch (error) {
                    printConsole.error(`Failed to reload session ${sessionName}: ${(error as Error).message}`);
                    throw new Error(`Session ${sessionName} not found or not connected`);
                }
            } else {
                throw new Error(`Session ${sessionName} not found or not active`);
            }
        }

        if (!sessionData || sessionData.session.status !== 'connected') {
            throw new Error(`Session ${sessionName} is not connected`);
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
                    result = await sessionData.socket.sendMessage(normalizedTo, {
                        image: { url: imageData.url },
                        caption: imageData.caption || ''
                    });
                    break;
                case 'document':
                    const docData = message as MessageData;
                    result = await sessionData.socket.sendMessage(normalizedTo, {
                        document: { url: docData.url },
                        mimetype: docData.mimetype || 'application/octet-stream',
                        fileName: docData.fileName || 'document'
                    });
                    break;
                default:
                    throw new Error(`Unsupported message type: ${type}`);
            }

            // Send webhook notification
            await this.webhookService.sendEvent(sessionData.session.id, 'message.sent', {
                sessionName,
                to: normalizedTo,
                messageType: type,
                messageId: result?.key?.id,
                timestamp: new Date().toISOString()
            });

            return result;
        } catch (error) {
            printConsole.error(`Failed to send message via session ${sessionName}: ${(error as Error).message}`);
            throw error;
        }
    }
}

export default SessionManager;
