import { db } from "..";
import { IGetMessage } from "../App/Message/Message.types";

export class Message {

    getByPagination = async (props: IGetMessage) => {
        const { query, session } = props;
        const { page, limit, from_me, is_media, is_read, ack, ack_string } = query;
        const offset = (page - 1) * limit;
        let sql = `SELECT message_id, from_me, is_read, is_media, media_url, media_type, ack, ack_string, message_text, message_timestamp
                    FROM messages WHERE session_id = ?`;
        let sqlCount = `SELECT COUNT(*) as totalData FROM messages WHERE session_id = ?`;

        let sqlParams: any = [session.id];
        if (from_me !== undefined) {
            sql += ` AND from_me = ?`;
            sqlCount += ` AND from_me = ?`;
            sqlParams.push(from_me ? "1" : "0");
        }
        if (is_media !== undefined) {
            sql += ` AND is_media = ?`;
            sqlCount += ` AND is_media = ?`;
            sqlParams.push(is_media ? "1" : "0");
        }
        if (is_read !== undefined) {
            sql += ` AND is_read = ?`;
            sqlCount += ` AND is_read = ?`;
            sqlParams.push(is_read ? "1" : "0");
        }
        if (ack) {
            sql += ` AND ack = ?`;
            sqlCount += ` AND ack = ?`;
            sqlParams.push(`${ack}`);
        }
        if (ack_string) {
            sql += ` AND ack_string = ?`;
            sqlCount += ` AND ack_string = ?`;
            sqlParams.push(ack_string);
        }

        sql += ` ORDER BY message_timestamp DESC LIMIT ? OFFSET ?`;
        const [messages, totalData] = await Promise.all([
            db.query(sql, [...sqlParams, `${limit}`, `${offset}`]),
            db.query(sqlCount, sqlParams)
        ])

        return { messages, totalData };
    }
}