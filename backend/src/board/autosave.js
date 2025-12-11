import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getState } from './boardState.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SNAPSHOTS_DIR = path.resolve(__dirname, '../../../snapshots');

export const startAutosave = (roomId) => {
    // Ensure snapshots directory exists
    if (!fs.existsSync(SNAPSHOTS_DIR)) {
        fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
    }

    console.log(`Starting autosave for room: ${roomId}`);

    // Return the interval ID so it can be cleared if needed
    return setInterval(() => {
        const state = getState(roomId);
        if (state && state.length > 0) {
            const filePath = path.join(SNAPSHOTS_DIR, `${roomId}.json`);
            try {
                fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
                console.log(`Autosaved snapshot for ${roomId} to ${filePath}`);
            } catch (err) {
                console.error(`Failed to autosave ${roomId}:`, err);
            }
        }
    }, 10000); // 10 seconds
};
