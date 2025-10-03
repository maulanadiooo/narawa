import { v4 as uuidv4 } from 'uuid';
import {Database} from '../Config/database';
import P from 'pino';
import { WebhookEventType, WebhookPayload } from '../Types';
import { db } from '..';

export class WebhookService {
    private logger: P.Logger;
    private webhookUrl?: string;

    constructor() {
        this.logger = P({ level: Bun.env.LOG_LEVEL || 'info' });
        this.webhookUrl = Bun.env.WEBHOOK_URL;
    }

    async sendEvent(sessionId: string, eventType: WebhookEventType, eventData: any): Promise<void> {
        if (!this.webhookUrl) {
            this.logger.warn('Webhook URL not configured, skipping event');
            return;
        }

        try {
            const eventId = uuidv4();
            const payload: WebhookPayload = {
                id: eventId,
                sessionId,
                eventType,
                data: eventData,
                timestamp: new Date().toISOString()
            };

            // Store event in database
            await this.storeEvent(sessionId, eventType, JSON.stringify(payload));

            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'WaNara/1.0'
                }
            })

            // Update event status
            await this.updateEventStatus(eventId, 'sent');

            this.logger.info(`Webhook event sent successfully: ${eventType} for session ${sessionId}`);
        } catch (error) {
            this.logger.error(`Failed to send webhook event: ${(error as Error).message}`);
            
            // Update event status to failed
            if (eventData.id) {
                await this.updateEventStatus(eventData.id, 'failed');
            }
        }
    }

    private async storeEvent(sessionId: string, eventType: WebhookEventType, eventData: string): Promise<void> {
        const sql = `
            INSERT INTO webhook_events (id, session_id, event_type, event_data, webhook_url, status)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        await db.query(sql, [
            uuidv4(),
            sessionId,
            eventType,
            eventData,
            this.webhookUrl,
            'pending'
        ]);
    }

    async updateEventStatus(eventId: string, status: 'pending' | 'sent' | 'failed'): Promise<void> {
        const sql = `
            UPDATE webhook_events 
            SET status = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `;
        
        await db.query(sql, [status, eventId]);
    }

    async getFailedEvents(): Promise<any[]> {
        const sql = `
            SELECT * FROM webhook_events 
            WHERE status = 'failed' AND retry_count < 3
            ORDER BY created_at ASC
        `;
        
        return await db.query(sql);
    }

    async retryFailedEvent(eventId: string): Promise<void> {
        const sql = `
            UPDATE webhook_events 
            SET retry_count = retry_count + 1, status = 'pending'
            WHERE id = ?
        `;
        
        await db.query(sql, [eventId]);
    }
}

export default WebhookService;
