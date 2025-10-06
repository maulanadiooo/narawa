import { createConnection } from 'mysql2/promise'
import { BufferJSON, initAuthCreds, fromObject } from './utils'
import { MySQLConfig, sqlData, sqlConnection, AuthenticationCreds, AuthenticationState, SignalDataTypeMap } from './types.mysqlauth'
import { db } from '..'

/**
 * Stores the full authentication state in mysql
 * Far more efficient than file
 * @param {string} host - The hostname of the database you are connecting to. (Default: localhost)
 * @param {number} port - The port number to connect to. (Default: 3306)
 * @param {string} user - The MySQL user to authenticate as. (Default: root)
 * @param {string} password - The password of that MySQL user
 * @param {string} password1 - Alias for the MySQL user password. Makes a bit more sense in a multifactor authentication setup (see "password2" and "password3")
 * @param {string} password2 - 2nd factor authentication password. Mandatory when the authentication policy for the MySQL user account requires an additional authentication method that needs a password.
 * @param {string} password3 - 3rd factor authentication password. Mandatory when the authentication policy for the MySQL user account requires two additional authentication methods and the last one needs a password.
 * @param {string} database - Name of the database to use for this connection. (Default: base)
 * @param {string} tableName - MySql table name. (Default: auth)
 * @param {number} retryRequestDelayMs - Retry the query at each interval if it fails. (Default: 200ms)
 * @param {number} maxRetries - Maximum attempts if the query fails. (Default: 10)
 * @param {string} session - Session name to identify the connection, allowing multisessions with mysql.
 * @param {string} localAddress - The source IP address to use for TCP connection.
 * @param {string} socketPath - The path to a unix domain socket to connect to. When used host and port are ignored.
 * @param {boolean} insecureAuth - Allow connecting to MySQL instances that ask for the old (insecure) authentication method. (Default: false)
 * @param {boolean} isServer - If your connection is a server. (Default: false)
 */

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
        const data = await query(`SELECT value FROM ${tableName} WHERE id = ? AND session_id = ?`, [id, session_id])
        if (!data[0]?.value) {
            return null
        }
        const creds = typeof data[0].value === 'object' ? JSON.stringify(data[0].value) : data[0].value
        const credsParsed = JSON.parse(creds, BufferJSON.reviver)
        return credsParsed
    }

    const writeData = async (id: string, value: object) => {
        const valueFixed = typeof value === 'object' ? JSON.stringify(value, BufferJSON.replacer) : value
        await query(`INSERT INTO ${tableName} (session_id, id, value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = ?`, [session_id, id, valueFixed, valueFixed])
    }

    const removeData = async (id: string) => {
        await query(`DELETE FROM ${tableName} WHERE id = ? AND session_id = ?`, [id, session_id])
    }

    const clearAll = async () => {
        await query(`DELETE FROM ${tableName} WHERE id != 'creds' AND session_id = ?`, [session_id])
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