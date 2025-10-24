import { LabelAssociationType, LabelAssociationTypes } from "@whiskeysockets/baileys/lib/Types/LabelAssociation";
import { db } from "..";
import { UuidV7 } from "../Helper/uuid";
import { ILabels, ILabelsAssociation } from "../Types";

export class Labels implements ILabels {
    public id: string;
    public sessionId: string;
    public labelId: string;
    public name: string;
    public color: string;
    public isDeleted: boolean;
    

    constructor(data: Partial<ILabels> = {}) {
        this.id = data.id || UuidV7();
        this.sessionId = data.sessionId || '';
        this.labelId = data.labelId || '';
        this.name = data.name || '';
        this.color = data.color || '';
        this.isDeleted = data.isDeleted || false;
    }

    async save(): Promise<void> {
        const sql = `INSERT INTO labels 
                    (id, session_id, label_id, name, color, is_deleted) 
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                    label_id = ?,
                    name = ?,
                    color = ?,
                    is_deleted = ?`;

        await db.query(sql, [
            this.id,
            this.sessionId,
            this.labelId,
            this.name,
            this.color,
            this.isDeleted,
            this.labelId,
            this.name,
            this.color,
            this.isDeleted,
        ]);
    }
}