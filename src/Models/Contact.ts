import { db } from "..";
import { IGetContact } from "../App/Contact/Contact.types";
import { UuidV7 } from "../Helper/uuid";
import { IContact } from "../Types";

export class Contact implements IContact {
    public id: string;
    public sessionId: string;
    public name?: string;
    public phoneNumber?: string;
    public verifiedName?: string;
    public identifier: 'personal' | 'lid' | 'group' | 'other';

    constructor(data: Partial<IContact> = {}) {
        this.id = data.id || UuidV7();
        this.sessionId = data.sessionId || '';
        this.name = data.name || '';
        this.phoneNumber = data.phoneNumber || '';
        this.verifiedName = data.verifiedName || '';
        this.identifier = data.identifier || 'other';
    }

    async save(value: Object): Promise<void> {
        const sql = `INSERT INTO contacts 
                    (id, session_id, name, phone_number, verified_name, value, identifier) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                    name = ?,
                    verified_name = ?,
                    identifier = ?,
                    value = ?`;

        await db.query(sql, [
            this.id,
            this.sessionId,
            this.name,
            this.phoneNumber,
            this.verifiedName,
            value,
            this.identifier,
            this.name,
            this.verifiedName,
            this.identifier,
            value
        ]);
    }

    getByPagination = async (props: IGetContact) => {
        const { query, session } = props;
        const { page, limit, identifier } = query;

        const offset = (page - 1) * limit;
        let sql = `SELECT name, phone_number, verified_name, identifier FROM contacts WHERE session_id = ? `;
        let sqlParams: any = [session.id];


        let sqlCount = `SELECT COUNT(*) as totalData FROM contacts WHERE session_id = ? `;
        if (identifier && identifier.length > 0) {
            if (identifier.length == 1) {
                sql += ` AND identifier = ?`;
                sqlParams.push(identifier[0]);
                sqlCount += ` AND identifier = ?`;
            } else {
                sql += ` AND identifier IN (${identifier.map(() => '?').join(',')})`;
                sqlParams.push(...identifier);
                sqlCount += ` AND identifier IN (${identifier.map(() => '?').join(',')})`;
            }

        }
        sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        
        const [rows, totalData] = await Promise.all([
            db.query(sql, [...sqlParams, `${limit}`, `${offset}`]),
            db.query(sqlCount, sqlParams)
        ])

        const contacts = rows
        return {
            contacts,
            totalData
        };
    }
}