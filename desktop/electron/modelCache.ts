/**
 * Model Cache Manager
 * Handles downloading, caching, and serving 3D models locally for offline use
 */

import path from 'path';
import fs from 'fs';
import { app, ipcMain } from 'electron';
import express from 'express';
import cors from 'cors';
import { queryAll, runQuery, getDatabase, saveDatabase } from './database/db';

const MODELS_DIR = 'models';
const LOCAL_SERVER_PORT = 3333;

let localServer: any = null;

/**
 * Get the models cache directory path
 */
export function getModelsCachePath(): string {
    const userDataPath = app.getPath('userData');
    const modelsPath = path.join(userDataPath, MODELS_DIR);

    // Ensure directory exists
    if (!fs.existsSync(modelsPath)) {
        fs.mkdirSync(modelsPath, { recursive: true });
    }

    return modelsPath;
}

/**
 * Get path to cached model file
 */
export function getModelFilePath(streamId: string, objectId: string): string {
    const modelsPath = getModelsCachePath();
    return path.join(modelsPath, `${streamId}_${objectId}.json`);
}

/**
 * Check if model is cached locally
 */
export function isModelCached(streamId: string, objectId: string): boolean {
    const filePath = getModelFilePath(streamId, objectId);
    return fs.existsSync(filePath);
}

/**
 * Get cache info for a model
 */
export function getCacheInfo(streamId: string, objectId: string): any | null {
    const results = queryAll(
        'SELECT * FROM model_cache WHERE stream_id = ? AND commit_id = ?',
        [streamId, objectId]
    );
    return results.length > 0 ? results[0] : null;
}

/**
 * Get all cached models
 */
export function getAllCachedModels(): any[] {
    return queryAll('SELECT * FROM model_cache ORDER BY cached_at DESC');
}

/**
 * Download and cache a model from Speckle server
 */
export async function downloadAndCacheModel(
    serverUrl: string,
    token: string,
    streamId: string,
    objectId: string,
    onProgress?: (progress: number) => void
): Promise<{ success: boolean; error?: string; sizeBytes?: number }> {
    try {
        const objectUrl = `${serverUrl}/streams/${streamId}/objects/${objectId}`;

        console.log(`[ModelCache] Downloading model from: ${objectUrl}`);

        // Fetch the model data
        const response = await fetch(objectUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
        }

        // Get content as text (Speckle returns newline-delimited JSON)
        const data = await response.text();
        const sizeBytes = Buffer.byteLength(data, 'utf8');

        console.log(`[ModelCache] Downloaded ${(sizeBytes / 1024 / 1024).toFixed(2)} MB`);

        // Save to file
        const filePath = getModelFilePath(streamId, objectId);
        fs.writeFileSync(filePath, data, 'utf8');

        // Update database
        const id = `${streamId}_${objectId}`;
        const now = Date.now();

        // Check if already exists
        const existing = getCacheInfo(streamId, objectId);
        if (existing) {
            runQuery(
                'UPDATE model_cache SET cached_at = ?, size_bytes = ? WHERE id = ?',
                [now, sizeBytes, id]
            );
        } else {
            runQuery(
                'INSERT INTO model_cache (id, stream_id, commit_id, cached_at, size_bytes) VALUES (?, ?, ?, ?, ?)',
                [id, streamId, objectId, now, sizeBytes]
            );
        }

        console.log(`[ModelCache] Model cached successfully: ${id}`);

        return { success: true, sizeBytes };
    } catch (error: any) {
        console.error('[ModelCache] Download failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete cached model
 */
export function deleteCachedModel(streamId: string, objectId: string): boolean {
    try {
        const filePath = getModelFilePath(streamId, objectId);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        runQuery(
            'DELETE FROM model_cache WHERE stream_id = ? AND commit_id = ?',
            [streamId, objectId]
        );

        return true;
    } catch (error) {
        console.error('[ModelCache] Delete failed:', error);
        return false;
    }
}

/**
 * Start local HTTP server to serve cached models
 * SpeckleLoader requires HTTP URLs, so we serve files locally
 */
export function startLocalServer(): Promise<number> {
    return new Promise((resolve, reject) => {
        if (localServer) {
            console.log('[ModelCache] Local server already running');
            resolve(LOCAL_SERVER_PORT);
            return;
        }

        const app_express = express();

        // Enable CORS for Speckle viewer
        app_express.use(cors());

        // Serve model files
        // URL format: /streams/{streamId}/objects/{objectId}
        app_express.get('/streams/:streamId/objects/:objectId', (req, res) => {
            const { streamId, objectId } = req.params;
            const filePath = getModelFilePath(streamId, objectId);

            console.log(`[LocalServer] Request for: ${streamId}/${objectId}`);

            if (!fs.existsSync(filePath)) {
                console.log(`[LocalServer] File not found: ${filePath}`);
                res.status(404).json({ error: 'Model not cached' });
                return;
            }

            // Send file with proper headers
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');

            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
        });

        // Health check
        app_express.get('/health', (_req, res) => {
            res.json({ status: 'ok', port: LOCAL_SERVER_PORT });
        });

        localServer = app_express.listen(LOCAL_SERVER_PORT, () => {
            console.log(`[ModelCache] Local server started on port ${LOCAL_SERVER_PORT}`);
            resolve(LOCAL_SERVER_PORT);
        });

        localServer.on('error', (error: any) => {
            console.error('[ModelCache] Failed to start local server:', error);
            localServer = null;
            reject(error);
        });
    });
}

/**
 * Stop local server
 */
export function stopLocalServer(): void {
    if (localServer) {
        localServer.close();
        localServer = null;
        console.log('[ModelCache] Local server stopped');
    }
}

/**
 * Get local server URL for a cached model
 */
export function getLocalModelUrl(streamId: string, objectId: string): string {
    return `http://localhost:${LOCAL_SERVER_PORT}/streams/${streamId}/objects/${objectId}`;
}

/**
 * Register IPC handlers for model cache operations
 */
export function registerModelCacheIPC(): void {
    // Check if model is cached
    ipcMain.handle('model-cache:is-cached', async (_event, streamId: string, objectId: string) => {
        return isModelCached(streamId, objectId);
    });

    // Get cache info
    ipcMain.handle('model-cache:get-info', async (_event, streamId: string, objectId: string) => {
        return getCacheInfo(streamId, objectId);
    });

    // Get all cached models
    ipcMain.handle('model-cache:get-all', async () => {
        return getAllCachedModels();
    });

    // Download and cache model
    ipcMain.handle('model-cache:download', async (_event, serverUrl: string, token: string, streamId: string, objectId: string) => {
        return await downloadAndCacheModel(serverUrl, token, streamId, objectId);
    });

    // Delete cached model
    ipcMain.handle('model-cache:delete', async (_event, streamId: string, objectId: string) => {
        return deleteCachedModel(streamId, objectId);
    });

    // Get local URL for cached model
    ipcMain.handle('model-cache:get-local-url', async (_event, streamId: string, objectId: string) => {
        if (isModelCached(streamId, objectId)) {
            return getLocalModelUrl(streamId, objectId);
        }
        return null;
    });

    // Get cache directory path
    ipcMain.handle('model-cache:get-path', async () => {
        return getModelsCachePath();
    });

    console.log('[ModelCache] IPC handlers registered');
}
