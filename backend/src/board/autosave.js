import fs from 'fs/promises';
import path from 'path';
import { boardStateManager } from './boardState.js';
import { logger } from '../utils/logger.js';

const SNAPSHOTS_DIR = path.resolve('snapshots');
const AUTOSAVE_INTERVAL_MS = 10000;

class AutosaveService {
    constructor() {
        this.isRunning = false;
        this.interval = null;
    }

    async init() {
        try {
            await fs.mkdir(SNAPSHOTS_DIR, { recursive: true });
            logger.info(`Autosave: Initialized snapshots directory at ${SNAPSHOTS_DIR}`);

            await this.restoreBoards();
            this.start();
        } catch (error) {
            logger.error('Autosave: Initialization failed', error);
        }
    }

    async restoreBoards() {
        try {
            const files = await fs.readdir(SNAPSHOTS_DIR);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const boardId = path.basename(file, '.json');
                    try {
                        const content = await fs.readFile(path.join(SNAPSHOTS_DIR, file), 'utf-8');
                        const data = JSON.parse(content);

                        // Hydrate the board state manager
                        // We assume the stored JSON is the strokes array
                        const board = boardStateManager._getBoard(boardId);
                        board.strokes = Array.isArray(data) ? data : [];

                        logger.info(`Autosave: Restored board ${boardId} (${board.strokes.length} strokes)`);
                    } catch (readError) {
                        logger.error(`Autosave: Failed to restore board ${boardId}`, readError);
                    }
                }
            }
        } catch (error) {
            logger.error('Autosave: Failed to list snapshots', error);
        }
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;

        this.interval = setInterval(() => this.saveAllBoards(), AUTOSAVE_INTERVAL_MS);
        logger.info('Autosave: Service started');
    }

    stop() {
        if (!this.isRunning) return;
        this.isRunning = false;
        if (this.interval) clearInterval(this.interval);
        logger.info('Autosave: Service stopped');
    }

    async saveAllBoards() {
        // Iterate over all boards in memory
        for (const [boardId, boardData] of boardStateManager.boards.entries()) {
            if (boardData.strokes.length === 0) continue; // Skip empty boards? Or maybe save them to clear storage?

            await this.saveBoard(boardId, boardData.strokes);
        }
    }

    async saveBoard(boardId, strokes) {
        const fileName = `${boardId}.json`;
        const filePath = path.join(SNAPSHOTS_DIR, fileName);
        const tempPath = `${filePath}.tmp`;

        try {
            // Atomic write: Write to temp file first
            await fs.writeFile(tempPath, JSON.stringify(strokes, null, 2));

            // Rename to overwrite original
            await fs.rename(tempPath, filePath);

            logger.debug(`Autosave: Saved board ${boardId}`);
        } catch (error) {
            logger.error(`Autosave: Failed to save board ${boardId}`, error);
            // Attempt to clean up temp file
            try { await fs.unlink(tempPath); } catch (e) { }
        }
    }
}

export const autosaveService = new AutosaveService();
