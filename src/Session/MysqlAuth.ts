import { createConnection } from 'mysql2/promise'
import { BufferJSON, initAuthCreds, fromObject } from './utils'
import { MySQLConfig, sqlData, sqlConnection, AuthenticationCreds, AuthenticationState, SignalDataTypeMap } from './types.mysqlauth'
import { db } from '..'
import { UuidV7 } from '../Helper/uuid'

export const useMySQLAuthState = async (session_id: string): Promise<{ state: AuthenticationState, saveCreds: () => Promise<void>, clear: () => Promise<void>, removeCreds: () => Promise<void>, query: (sql: string, values: string[]) => Promise<sqlData> }> => {

    const tableName = 'session_details'
    const retryRequestDelayMs = 200
    const maxRetries = 10

    const query = async (sql: string, values: string[]) => {
        for (let x = 0; x < maxRetries; x++) {
            try {
                const result = await db.query(sql, values)
                return result as sqlData
            } catch (e) {
                await new Promise(r => setTimeout(r, retryRequestDelayMs))
            }
        }
        return [] as sqlData
    }

    const readData = async (id: string) => {
        const data = await query(`SELECT value FROM ${tableName} WHERE name = ? AND session_id = ?`, [id, session_id])
        if (!data[0]?.value) {
            return null
        }
        const creds = typeof data[0].value === 'object' ? JSON.stringify(data[0].value) : data[0].value
        const credsParsed = JSON.parse(creds, BufferJSON.reviver)
        return credsParsed
    }

    const writeData = async (id: string, value: object) => {
        const valueFixed = typeof value === 'object' ? JSON.stringify(value, BufferJSON.replacer) : value
        await query(`INSERT INTO ${tableName} (id, session_id, name, value) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE value = ?, name = ?`, [UuidV7(), session_id, id, valueFixed, valueFixed, id])
    }

    const removeData = async (id: string) => {
        await query(`DELETE FROM ${tableName} WHERE name = ? AND session_id = ?`, [id, session_id])
    }

    const clearAll = async () => {
        await query(`DELETE FROM ${tableName} WHERE name != 'creds' AND session_id = ?`, [session_id])
    }

    const removeAll = async () => {
        await query(`DELETE FROM ${tableName} WHERE session_id = ?`, [session_id])
    }

    const creds: AuthenticationCreds = await readData('creds') || initAuthCreds()

    return {
        state: {
            creds: creds,
            keys: {
				get: async (type, ids) => {
					const data: { [id: string]: any } = {}
                    for (const id of ids) {
                        let value = await readData(`${type}-${id}`)
                        if (type === 'app-state-sync-key' && value) {
                            value = fromObject(value)
                        }
                        data[id] = value
                    }
                    return data
                },
                set: async (data) => {
                    const categories = data as Record<string, Record<string, unknown> | undefined>
                    for (const category in categories) {
                        const group = categories[category] as Record<string, unknown> | undefined
                        if (!group) continue
                        for (const id in group) {
                            const value = group[id] as unknown
                            const name = `${category}-${id}`
                            if (value !== null && value !== undefined) {
                                await writeData(name, value as object)
                            } else {
                                await removeData(name)
                            }
                        }
                    }
                }
            }
        },
        saveCreds: async () => {
            await writeData('creds', creds)
        },
        clear: async () => {
            await clearAll()
        },
        removeCreds: async () => {
            await removeAll()
        },
        query: async (sql: string, values: string[]) => {
            return await query(sql, values)
        }
    }
}
