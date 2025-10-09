import { Pool } from "mysql2/promise";
import { printConsole } from "..";

// Helper function to check if index exists
const checkIndexExists = async (pool: Pool, indexName: string, tableName: string): Promise<boolean> => {
    try {
        const query = `
            SELECT COUNT(*) as count 
            FROM information_schema.statistics 
            WHERE table_schema = DATABASE() 
            AND table_name = ? 
            AND index_name = ?
        `;
        const [result] = await pool.execute(query, [tableName, indexName]);
        return (result as any[])[0].count > 0;
    } catch (error) {
        printConsole.error(`Error checking index ${indexName}: ${(error as Error).message}`);
        return false;
    }
};

// Helper function to create index if it doesn't exist
const createIndexIfNotExists = async (pool: Pool, indexInfo: any): Promise<void> => {
    const exists = await checkIndexExists(pool, indexInfo.name, indexInfo.table);
    if (!exists) {
        try {
            await pool.execute(indexInfo.sql);

            printConsole.success(`Index ${indexInfo.name} created successfully`);
        } catch (error) {
            printConsole.error(`Failed to create index ${indexInfo.name}: ${(error as Error).message}`);
        }
    } else {
        printConsole.info(`Index ${indexInfo.name} already exists, skipping...`);
    }
};

export const initDatabase = async (pool: Pool) => {
    const sqlSession = `CREATE DATABASE IF NOT EXISTS ${Bun.env.DB_NAME};`
    const sqlSessionTable = `CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(36) PRIMARY KEY,
        session_name VARCHAR(100) NOT NULL UNIQUE,
        phone_number VARCHAR(20),
        status ENUM('connecting', 'connected', 'disconnected', 'qr_required') DEFAULT 'qr_required',
        qr_code TEXT,
        auth_state LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_seen TIMESTAMP NULL,
        is_active BOOLEAN DEFAULT TRUE,
        webhook_url TEXT DEFAULT NULL
    );`
    // const sqlTableMessage = `CREATE TABLE IF NOT EXISTS messages (
    //     id VARCHAR(36) PRIMARY KEY,
    //     session_id VARCHAR(36) NOT NULL,
    //     message_id VARCHAR(100),
    //     to_number VARCHAR(20) NOT NULL,
    //     message_type ENUM('text', 'image', 'document', 'audio', 'video') NOT NULL,
    //     content TEXT,
    //     file_path VARCHAR(500),
    //     status ENUM('pending', 'sent', 'delivered', 'read', 'failed') DEFAULT 'pending',
    //     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    //     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    //     FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    // );`

    const sqlTableWebhook = `CREATE TABLE IF NOT EXISTS webhook_events (
        id VARCHAR(36) PRIMARY KEY,
        session_id VARCHAR(36) NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        event_data LONGTEXT NOT NULL,
        webhook_url VARCHAR(500),
        status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
        retry_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );`

    const sqlTableSessionDetail = `CREATE TABLE IF NOT EXISTS session_details (
        id VARCHAR(256) PRIMARY KEY,
        session_id VARCHAR(36) NOT NULL,
        name VARCHAR(256) NOT NULL,
        value JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )`

    const sqlTableMessages = `CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(36) PRIMARY KEY,
        session_id VARCHAR(36) NOT NULL,
        from_me BOOLEAN NOT NULL,
        message_id VARCHAR(100) NOT NULL,
        is_read BOOLEAN NOT NULL,
        is_media BOOLEAN DEFAULT FALSE,
        media_url VARCHAR(500) DEFAULT NULL,
        media_type VARCHAR(100) DEFAULT NULL,
        ack INT DEFAULT NULL,
        ack_string VARCHAR(100) DEFAULT NULL,
        event VARCHAR(100) NOT NULL,
        data JSON NULL,
        message_text TEXT DEFAULT NULL,
        message_timestamp BIGINT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );`



    const indexing = [
        {
            name: 'idx_sessions_status',
            table: 'sessions',
            column: 'status',
            sql: `CREATE INDEX idx_sessions_status ON sessions(status);`
        },
        {
            name: 'idx_sessions_phone',
            table: 'sessions',
            column: 'phone_number',
            sql: `CREATE INDEX idx_sessions_phone ON sessions(phone_number);`
        },
        {
            name: 'idx_messages_session',
            table: 'messages',
            column: 'session_id',
            sql: `CREATE INDEX idx_messages_session ON messages(session_id);`
        },
        // {
        //     name: 'idx_messages_status',
        //     table: 'messages',
        //     column: 'status',
        //     sql: `CREATE INDEX idx_messages_status ON messages(status);`
        // },
        {
            name: 'idx_webhook_events_session',
            table: 'webhook_events',
            column: 'session_id',
            sql: `CREATE INDEX idx_webhook_events_session ON webhook_events(session_id);`
        },
        {
            name: 'idx_webhook_events_status',
            table: 'webhook_events',
            column: 'status',
            sql: `CREATE INDEX idx_webhook_events_status ON webhook_events(status);`
        },
        {
            name: 'idx_webhook_messages_from_me',
            table: 'messages',
            column: 'from_me',
            sql: `CREATE INDEX idx_webhook_messages_from_me ON messages(from_me);`
        },
        {
            name: 'idx_webhook_messages_message_id',
            table: 'messages',
            column: 'message_id',
            sql: `CREATE INDEX idx_webhook_messages_message_id ON messages(message_id);`
        },
        {
            name: 'idx_webhook_messages_is_read',
            table: 'messages',
            column: 'is_read',
            sql: `CREATE INDEX idx_webhook_messages_is_read ON messages(is_read);`
        },
        {
            name: 'idx_webhook_messages_session_id',
            table: 'messages',
            column: 'session_id',
            sql: `CREATE INDEX idx_webhook_messages_session_id ON messages(session_id);`
        },
        {
            name: 'idx_webhook_messages_created_at',
            table: 'messages',
            column: 'created_at',
            sql: `CREATE INDEX idx_webhook_messages_created_at ON messages(created_at);`
        },
        {
            name: 'idx_webhook_messages_ack_string',
            table: 'messages',
            column: 'ack_string',
            sql: `CREATE INDEX idx_webhook_messages_ack_string ON messages(ack_string);`
        },
        {
            name: 'idx_webhook_session_details_name',
            table: 'session_details',
            column: 'name',
            sql: `CREATE INDEX idx_webhook_session_details_name ON session_details(name);`
        },
        {
            name: 'unique_session_name',
            table: 'session_details',
            column: 'name',
            sql: `ALTER TABLE session_details ADD UNIQUE KEY unique_session_name (session_id, name);`
        },
        {
            name: 'idx_webhook_messages_message_timestamp',
            table: 'messages',
            column: 'message_timestamp',
            sql: `CREATE INDEX idx_webhook_messages_message_timestamp ON messages(message_timestamp);`
        },
    ]

    try {
        // Create database if not exists
        await pool.execute(sqlSession);
        printConsole.success(`Database ${Bun.env.DB_NAME} ready`);

        // Create tables
        await pool.execute(sqlSessionTable);
        printConsole.success('Sessions table ready');

        // await pool.execute(sqlTableMessage);
        // printConsole.success('Messages table ready');

        await pool.execute(sqlTableWebhook);
        printConsole.success('Webhook events table ready');

        await pool.execute(sqlTableSessionDetail);
        printConsole.success('Session details table ready');

        await pool.execute(sqlTableMessages);
        printConsole.success('Messages table ready');

        // Create indexes if they don't exist
        printConsole.info('Checking and creating indexes...');
        for (const indexInfo of indexing) {
            await createIndexIfNotExists(pool, indexInfo);
        }

        printConsole.success('Database initialization completed');
    } catch (error) {
        printConsole.error(`Database initialization failed: ${(error as Error).message}`);
        throw error;
    }
}