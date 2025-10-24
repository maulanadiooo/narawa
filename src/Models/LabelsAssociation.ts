import { LabelAssociationType, LabelAssociationTypes } from "@whiskeysockets/baileys/lib/Types/LabelAssociation";
import { db } from "..";
import { UuidV7 } from "../Helper/uuid";
import { ILabelsAssociation } from "../Types";

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
}