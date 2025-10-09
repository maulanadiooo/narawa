import { Database } from '../Config/database';
import P from 'pino';
import { IWebhookSendData, WebhookEventType, WebhookPayload } from '../Types';
import { db, printConsole } from '..';
import { UuidV7 } from '../Helper/uuid';


export class WebhookService {

    constructor() {

    }

    async sendEvent(props: IWebhookSendData): Promise<void> {
        const { sessionId, webhookUrl, eventType, eventData } = props;
        if (!webhookUrl) {
            printConsole.warning('Webhook URL not configured, skipping event');
            return;
        }
        let idEvent: string | undefined;
        try {
            const eventId = UuidV7();
            const payload: WebhookPayload = {
                id: eventId,
                eventType,
                sessionId,
                data: eventData,
                timestamp: Date.now()
            };

            // Store event in database
            // idEvent = await this.storeEvent(sessionId, eventType, JSON.stringify(payload), webhookUrl);

            await fetch(webhookUrl, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'NaraWa/1.0',
                    'x-webhook-id': idEvent ?? ""

                }
            })

            // Update event status
            if (idEvent) {
                await this.updateEventStatus(idEvent, 'sent');
            }
            

            printConsole.info(`Webhook event sent successfully: ${eventType} for session ${sessionId}`);
        } catch (error) {
            printConsole.error(`Failed to send webhook event: ${(error as Error).message}`);

            // Update event status to failed
            if (idEvent) {
                await this.updateEventStatus(eventData.id, 'failed');
            }
        }
    }

    private async storeEvent(sessionId: string, eventType: WebhookEventType, eventData: string, webhookUrl: string): Promise<string> {
        const eventId = UuidV7();
        const sql = `
            INSERT INTO webhook_events (id, session_id, event_type, event_data, webhook_url, status)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        await db.query(sql, [
            eventId,
            sessionId,
            eventType,
            eventData,
            webhookUrl,
            'pending'
        ]);
        
        return eventId;
    }

    async updateEventStatus(eventId: string, status: 'pending' | 'sent' | 'failed'): Promise<void> {
        const sql = `
            UPDATE webhook_events 
            SET status = ?
            WHERE id = ?
        `;

        printConsole.success(`Updated event status to ${status} for event ${eventId}`);

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
