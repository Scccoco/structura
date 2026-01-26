// @ts-ignore - sql.js lacks type declarations
import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

let db: any = null;
let dbPath: string = '';

const DB_NAME = 'structura.db';

export function getDBPath(): string {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, DB_NAME);
}

export async function initDatabase(): Promise<void> {
    dbPath = getDBPath();

    console.log(`Initializing database at: ${dbPath}`);

    // Initialize SQL.js with WASM file
    const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm');
    console.log('WASM path:', wasmPath);

    const SQL = await initSqlJs({
        locateFile: () => wasmPath
    });

    // Check if database file exists
    if (fs.existsSync(dbPath)) {
        const fileBuffer = fs.readFileSync(dbPath);
        db = new SQL.Database(fileBuffer);
        console.log('Loaded existing database');
    } else {
        db = new SQL.Database();
        console.log('Created new database');
    }

    // Create tables
    db.run(`
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            speckle_stream_id TEXT,
            name TEXT NOT NULL,
            cached_at INTEGER
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS elements (
            guid TEXT PRIMARY KEY,
            project_id TEXT,
            position TEXT,
            name TEXT,
            material TEXT,
            level TEXT,
            volume REAL,
            axes TEXT,
            status TEXT DEFAULT 'Не закрыт'
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS acts (
            id TEXT PRIMARY KEY,
            number TEXT UNIQUE,
            file_path TEXT,
            work_type TEXT,
            act_date TEXT,
            start_date TEXT,
            end_date TEXT,
            ks TEXT,
            ks2 TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS element_acts (
            id TEXT PRIMARY KEY,
            element_guid TEXT,
            act_id TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS sync_queue (
            id TEXT PRIMARY KEY,
            table_name TEXT,
            operation TEXT,
            data TEXT,
            timestamp INTEGER,
            synced INTEGER DEFAULT 0
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS model_cache (
            id TEXT PRIMARY KEY,
            stream_id TEXT,
            commit_id TEXT,
            cached_at INTEGER,
            size_bytes INTEGER
        )
    `);

    // Save
    saveDatabase();
    console.log('Database initialized successfully');
}

export function getDatabase(): any {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}

export function saveDatabase(): void {
    if (db && dbPath) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
    }
}

export function closeDatabase(): void {
    if (db) {
        saveDatabase();
        db.close();
        db = null;
    }
}

// Query helpers
export function queryAll(sql: string, params: any[] = []): any[] {
    const database = getDatabase();
    const stmt = database.prepare(sql);
    if (params.length > 0) {
        stmt.bind(params);
    }

    const results: any[] = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

export function runQuery(sql: string, params: any[] = []): void {
    const database = getDatabase();
    database.run(sql, params);
    saveDatabase();
}

export function addToSyncQueue(tableName: string, operation: string, data: any): void {
    const id = `${tableName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    runQuery(
        `INSERT INTO sync_queue (id, table_name, operation, data, timestamp, synced) VALUES (?, ?, ?, ?, ?, 0)`,
        [id, tableName, operation, JSON.stringify(data), Date.now()]
    );
}
