import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDatabase, queryAll, runQuery, saveDatabase, closeDatabase } from './database/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;

const isDev = !app.isPackaged;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        title: 'Structura',
        icon: path.join(__dirname, '../public/icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            sandbox: true,
            contextIsolation: true,
            nodeIntegration: false,
        },
        frame: true,
        titleBarStyle: 'default',
        backgroundColor: '#0a0f1c',
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Initialize
app.whenReady().then(async () => {
    try {
        await initDatabase();
    } catch (error) {
        console.error('Failed to initialize database:', error);
    }
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    closeDatabase();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// ==================== IPC Handlers ====================

// Dialogs
ipcMain.handle('dialog:selectDirectory', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
        properties: ['openDirectory'],
        title: 'Выберите папку с актами'
    });
    return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('shell:openPath', async (_, filePath: string) => {
    return shell.openPath(filePath);
});

// Network check
ipcMain.handle('network:isOnline', async () => {
    const dns = await import('dns');
    return new Promise((resolve) => {
        dns.lookup('google.com', (err) => {
            resolve(!err);
        });
    });
});

// ==================== Folder Scanning ====================

// Scan folder for PDF files
ipcMain.handle('folder:scanPDFs', async (_, folderPath: string) => {
    const results: Array<{
        id: string;
        number: string;
        file_path: string;
        work_type: string;
        folder_name: string;
    }> = [];

    function scanDir(dirPath: string, parentFolder: string = '') {
        try {
            const items = fs.readdirSync(dirPath);
            for (const item of items) {
                const fullPath = path.join(dirPath, item);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    // Рекурсивно сканируем подпапки
                    scanDir(fullPath, item);
                } else if (item.toLowerCase().endsWith('.pdf')) {
                    // Извлекаем номер акта из имени файла
                    // Пример: "АОСР-001.pdf" -> "АОСР-001"
                    const fileName = path.basename(item, '.pdf');
                    const id = `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                    results.push({
                        id,
                        number: fileName,
                        file_path: fullPath,
                        work_type: parentFolder || 'Не указан',
                        folder_name: parentFolder
                    });
                }
            }
        } catch (error) {
            console.error(`Error scanning directory ${dirPath}:`, error);
        }
    }

    scanDir(folderPath);

    // Сохраняем в БД
    for (const act of results) {
        runQuery(`
            INSERT INTO acts (id, number, file_path, work_type, act_date, start_date, end_date, ks, ks2)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(number) DO UPDATE SET
                file_path = excluded.file_path,
                work_type = excluded.work_type
        `, [act.id, act.number, act.file_path, act.work_type, null, null, null, null, null]);
    }

    return {
        success: true,
        count: results.length,
        acts: results
    };
});

// ==================== Database IPC ====================

// Projects
ipcMain.handle('db:projects:getAll', () => {
    return queryAll('SELECT * FROM projects ORDER BY cached_at DESC');
});

ipcMain.handle('db:projects:upsert', (_, project) => {
    runQuery(`
        INSERT INTO projects (id, speckle_stream_id, name, cached_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            cached_at = excluded.cached_at
    `, [project.id, project.speckle_stream_id, project.name, project.cached_at]);
    return { success: true };
});

// Elements
ipcMain.handle('db:elements:getByProject', (_, projectId: string) => {
    return queryAll('SELECT * FROM elements WHERE project_id = ?', [projectId]);
});

ipcMain.handle('db:elements:upsert', (_, element) => {
    runQuery(`
        INSERT INTO elements (guid, project_id, position, name, material, level, volume, axes, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(guid) DO UPDATE SET
            position = excluded.position,
            name = excluded.name,
            material = excluded.material,
            level = excluded.level,
            volume = excluded.volume,
            axes = excluded.axes,
            status = excluded.status
    `, [element.guid, element.project_id, element.position, element.name,
    element.material, element.level, element.volume, element.axes, element.status]);
    return { success: true };
});

ipcMain.handle('db:elements:updateStatus', (_, guid: string, status: string) => {
    runQuery('UPDATE elements SET status = ? WHERE guid = ?', [status, guid]);
    return { success: true };
});

// Acts
ipcMain.handle('db:acts:getAll', () => {
    return queryAll('SELECT * FROM acts ORDER BY act_date DESC');
});

ipcMain.handle('db:acts:insert', (_, act) => {
    runQuery(`
        INSERT INTO acts (id, number, file_path, work_type, act_date, start_date, end_date, ks, ks2)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(number) DO UPDATE SET
            file_path = excluded.file_path,
            work_type = excluded.work_type,
            act_date = excluded.act_date
    `, [act.id, act.number, act.file_path, act.work_type, act.act_date,
    act.start_date, act.end_date, act.ks, act.ks2]);
    return { success: true };
});

// Element-Act links
ipcMain.handle('db:elementActs:getByElement', (_, elementGuid: string) => {
    return queryAll(`
        SELECT ea.*, a.number, a.file_path, a.work_type
        FROM element_acts ea
        JOIN acts a ON ea.act_id = a.id
        WHERE ea.element_guid = ?
    `, [elementGuid]);
});

ipcMain.handle('db:elementActs:link', (_, elementGuid: string, actId: string) => {
    const id = `${elementGuid}_${actId}`;
    runQuery(`
        INSERT OR IGNORE INTO element_acts (id, element_guid, act_id)
        VALUES (?, ?, ?)
    `, [id, elementGuid, actId]);
    return { success: true };
});

ipcMain.handle('db:elementActs:unlink', (_, elementGuid: string, actId: string) => {
    runQuery('DELETE FROM element_acts WHERE element_guid = ? AND act_id = ?', [elementGuid, actId]);
    return { success: true };
});

// Sync queue
ipcMain.handle('db:sync:getPending', () => {
    return queryAll('SELECT * FROM sync_queue WHERE synced = 0 ORDER BY timestamp ASC');
});

ipcMain.handle('db:sync:markSynced', (_, ids: string[]) => {
    const placeholders = ids.map(() => '?').join(',');
    runQuery(`UPDATE sync_queue SET synced = 1 WHERE id IN (${placeholders})`, ids);
    return { success: true };
});
