import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';

class PersistenceService {
    constructor() {
        // Assuming running from backend directory
        this.snapshotsDir = path.resolve(process.cwd(), '../snapshots');
        this.ensureDir();
    }

    async ensureDir() {
        try {
            await fs.mkdir(this.snapshotsDir, { recursive: true });
        } catch (error) {
            logger.error('Failed to create snapshots directory', error);
        }
    }

    async saveBoard(roomId, elements) {
        try {
            const filePath = path.join(this.snapshotsDir, `${roomId}.json`);
            await fs.writeFile(filePath, JSON.stringify(elements, null, 2));
            logger.debug(`Saved snapshot for room ${roomId}`);
        } catch (error) {
            logger.error(`Failed to save board ${roomId}`, error);
        }
    }

    async loadBoard(roomId) {
        try {
            const filePath = path.join(this.snapshotsDir, `${roomId}.json`);
            const data = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return null; // File not found, new board
            }
            logger.error(`Failed to load board ${roomId}`, error);
            return null;
        }
    }
}

export const persistenceService = new PersistenceService();
