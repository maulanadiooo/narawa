import mysql, { Pool, PoolConnection } from 'mysql2/promise';
import { DatabaseConfig } from '../Types';
import { printConsole, sessionManager } from '..';
import { ErrorResponse } from '../Helper/ResponseError';
import { initDatabase } from './init_sql';


export class Database {
    private pool: Pool | null = null;
    private txConn: PoolConnection | null = null;
    private config: DatabaseConfig;

    constructor() {
        this.config = {
            host: Bun.env.DB_HOST || 'localhost',
            port: parseInt(Bun.env.DB_PORT || '3306'),
            user: Bun.env.DB_USER || 'root',
            password: Bun.env.DB_PASSWORD || '',
            database: Bun.env.DB_NAME || 'whatsapp_sessions',
            waitForConnections: true,
            connectionLimit: 0,
            queueLimit: 0,
        };
        // this.init();
    }

    async init(): Promise<void> {
        try {
            this.pool = mysql.createPool(this.config);

            // Test connection
            const connection: PoolConnection = await this.pool.getConnection();
            printConsole.success('Database connected successfully');
            connection.release();
            await initDatabase(this.pool);
            // load active sessions
            await sessionManager.loadActiveSessions();
        } catch (error) {
            printConsole.error(`Database connection failed: ${(error as Error).message}`);
            process.exit(1);
        }
    }

    async query(sql: string, params: any[] = []): Promise<any> {
        try {
            if (!this.pool) {
                throw new ErrorResponse(500, 'DATABASE_POOL_NOT_INITIALIZED', 'Database pool not initialized');
            }
            const executor = this.txConn ?? this.pool;
            const [rows] = await executor.execute(sql, params);
            return rows as any[];
        } catch (error) {
            printConsole.error(`Database query error: ${(error as Error).message}`);
            throw new ErrorResponse(500, 'DATABASE_QUERY_ERROR', 'Database query error');
        }
    }

    async getConnection(): Promise<PoolConnection> {
        if (!this.pool) {
            throw new ErrorResponse(500, 'DATABASE_POOL_NOT_INITIALIZED', 'Database pool not initialized');
        }
        return await this.pool.getConnection();
    }

    async close(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
        }
    }

    async beginTransaction(): Promise<void> {
        if (!this.pool) {
            throw new ErrorResponse(500, 'DATABASE_POOL_NOT_INITIALIZED', 'Database pool not initialized');
        }
        if (this.txConn) {
            // already in a transaction
            return;
        }
        this.txConn = await this.pool.getConnection();
        await this.txConn.beginTransaction();
    }
    
    async commitTransaction(): Promise<void> {
        if (!this.txConn) {
            return;
        }
        await this.txConn?.commit();
        this.txConn?.release();
        this.txConn = null;
    }

    async rollbackTransaction(): Promise<void> {
        if (!this.txConn) {
            // nothing to rollback
            return;
        }
        try {
            await this.txConn?.rollback();
        } finally {
            this.txConn?.release();
            this.txConn = null;
        }
    }
}
