import { LabelAssociationType, LabelAssociationTypes } from "@whiskeysockets/baileys/lib/Types/LabelAssociation";
import { db } from "..";
import { UuidV7 } from "../Helper/uuid";
import { ILabels, ILabelsAssociation, ISession } from "../Types";

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

    

    lastLabelId = async (session: ISession): Promise<string> => {
        const sql = `SELECT 
        label_id 
        FROM labels
        WHERE session_id = ? 
        ORDER BY CAST(label_id AS UNSIGNED) DESC 
        LIMIT 1`;
        const rows = await db.query(sql, [session.id]);
        return rows[0]?.label_id ?? '';
    }

    checkLabelIdExists = async (session: ISession, labelId: string): Promise<boolean> => {
        const sql = `SELECT 
        COUNT(*) as count
        FROM labels
        WHERE 
        session_id = ? AND label_id = ? AND is_deleted = FALSE`;
        const rows = await db.query(sql, [session.id, labelId]);
        return rows[0]?.count ?? 0 > 0;
    }

    getAllLabels = async (session: ISession) => {
        const sql = `SELECT
        label_id as id,
        name,
        color
        FROM labels
        WHERE session_id = ? AND is_deleted = FALSE
        ORDER BY CAST(label_id AS UNSIGNED) ASC`;
        const rows = await db.query(sql, [session.id]);
        return rows;
    }
}