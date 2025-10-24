import { LabelAssociationType, LabelAssociationTypes } from "@whiskeysockets/baileys/lib/Types/LabelAssociation";
import { db } from "..";
import { UuidV7 } from "../Helper/uuid";
import { ILabelsAssociation, ISession } from "../Types";

export class LabelAssociation implements ILabelsAssociation {
    public id: string;
    public sessionId: string;
    public labelId: string;
    public type: LabelAssociationTypes;
    public chatId: string;
    public messageId: string;


    constructor(data: Partial<ILabelsAssociation> = {}) {
        this.id = data.id || UuidV7();
        this.sessionId = data.sessionId || '';
        this.labelId = data.labelId || '';
        this.type = data.type || LabelAssociationType.Chat;
        this.chatId = data.chatId || '';
        this.messageId = data.messageId || '';
    }

    async save(): Promise<void> {
        const sql = `INSERT INTO label_associations 
                    (id, session_id, label_id, type, chat_id, message_id) 
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                    label_id = ?,
                    type = ?,
                    chat_id = ?,
                    message_id = ?`;

        await db.query(sql, [
            this.id,
            this.sessionId,
            this.labelId,
            this.type,
            this.chatId,
            this.messageId,
            this.labelId,
            this.type,
            this.chatId,
            this.messageId,
        ]);
    }

    async remove(): Promise<void> {
        const sql = `DELETE FROM label_associations WHERE session_id = ? AND label_id = ? AND type = ? AND chat_id = ?`;
        await db.query(sql, [
            this.sessionId,
            this.labelId,
            this.type,
            this.chatId,
        ]);
    }

    checkLabelAssociationExists = async (session: ISession, labelId: string, chatId: string): Promise<boolean> => {
        const sql = `SELECT 
        COUNT(*) as count
        FROM label_associations
        WHERE 
        session_id = ? AND label_id = ? AND chat_id = ?`;
        const rows = await db.query(sql, [session.id, labelId, chatId]);
        return rows[0]?.count ?? 0 > 0;
    }

    getAllLabels = async (session: ISession) => {
        const sql = `SELECT
        la.chat_id as chat_id,
        la.message_id as message_id,
        la.type as for_label, 
        l.name as label_name, 
        l.color as label_color, 
        l.label_id as label_id, 
        l.is_deleted as is_deleted
FROM label_associations la
LEFT JOIN labels l ON la.label_id = l.label_id
WHERE la.session_id = ?
`
        const rows = await db.query(sql, [session.id]);
        return rows;
    }
}