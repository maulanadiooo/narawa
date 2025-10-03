import { v4 as uuidv4 } from 'uuid';
import { ISession, SessionData, SessionStatus } from '../Types';
import { Database } from '../Config/database';
import { db } from '..';

export class Session implements ISession {
    public id: string;
    public sessionName: string;
    public phoneNumber?: string;
    public status: SessionStatus;
    public qrCode?: string;
    public authState?: string;
    public isActive: boolean;
    public createdAt?: Date;
    public updatedAt?: Date;
    public lastSeen?: Date;
    public webhookUrl?: string;

    constructor(data: Partial<ISession> & Partial<SessionData> = {}) {
        this.id = data.id || uuidv4();
        this.sessionName = data.session_name || data.sessionName || '';
        this.phoneNumber = data.phone_number || data.phoneNumber;
        this.status = data.status || 'qr_required';
        this.qrCode = data.qr_code || data.qrCode;
        this.authState = data.auth_state || data.authState;
        this.isActive = data.is_active !== undefined ? data.is_active : true;
        this.createdAt = data.created_at || data.createdAt;
        this.updatedAt = data.updated_at || data.updatedAt;
        this.lastSeen = data.last_seen || data.lastSeen;
    }

    async save(): Promise<void> {
        const sql = `
            INSERT INTO sessions (id, session_name, phone_number, status, qr_code, auth_state, is_active, webhook_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            phone_number = VALUES(phone_number),
            status = VALUES(status),
            qr_code = VALUES(qr_code),
            auth_state = VALUES(auth_state),
            is_active = VALUES(is_active),
            updated_at = CURRENT_TIMESTAMP
        `;
        
        await db.query(sql, [
            this.id,
            this.sessionName,
            this.phoneNumber || null,
            this.status,
            this.qrCode || null,
            this.authState || null,
            this.isActive,
            this.webhookUrl ?? ""
        ]);
    }

    async update(data: Partial<ISession>): Promise<void> {
        const fields: string[] = [];
        const values: any[] = [];

        Object.keys(data).forEach(key => {
            if (data[key as keyof ISession] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(data[key as keyof ISession]);
            }
        });

        if (fields.length === 0) return;

        values.push(this.id);
        const sql = `UPDATE sessions SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        
        await db.query(sql, values);
    }

    async delete(): Promise<void> {
        const sql = 'DELETE FROM sessions WHERE id = ?';
        await db.query(sql, [this.id]);
    }

    static async findById(id: string): Promise<Session | null> {
        const sql = 'SELECT * FROM sessions WHERE id = ?';
        const rows = await db.query(sql, [id]);
        return rows.length > 0 ? new Session(rows[0]) : null;
    }

    static async findBySessionName(sessionName: string): Promise<Session | null> {
        const sql = 'SELECT * FROM sessions WHERE session_name = ?';
        const rows = await db.query(sql, [sessionName]);
        return rows.length > 0 ? new Session(rows[0]) : null;
    }

    static async findAll(activeOnly: boolean = true): Promise<Session[]> {
        let sql = 'SELECT * FROM sessions';
        const params: any[] = [];
        
        if (activeOnly) {
            sql += ' WHERE is_active = ?';
            params.push(true);
        }
        
        sql += ' ORDER BY created_at DESC';
        const rows = await db.query(sql, params);
        return rows.map((row: SessionData) => new Session(row));
    }

    static async findByStatus(status: SessionStatus): Promise<Session[]> {
        const sql = 'SELECT * FROM sessions WHERE status = ? AND is_active = ?';
        const rows = await db.query(sql, [status, true]);
        return rows.map((row: SessionData) => new Session(row));
    }

    toJSON(): Partial<ISession> {
        return {
            id: this.id,
            sessionName: this.sessionName,
            phoneNumber: this.phoneNumber,
            status: this.status,
            qrCode: this.qrCode,
            isActive: this.isActive,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            lastSeen: this.lastSeen
        };
    }
}

export default Session;
