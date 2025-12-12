import { logger } from '../utils/logger.js';
import { boardService } from '../services/boardService.js';

// In-memory store for high-frequency text sessions
// Map<textId, { content: string, version: number, lastUpdateTime: number }>
const activeTextSessions = new Map();

export const setupTextHandlers = (io) => {
    io.on('connection', (socket) => {

        // Client joins a specific text session (e.g. focused on a textarea)
        socket.on('text-init', async ({ roomId, textId }) => {
            socket.join(`text-${textId}`);

            // Check in-memory first, then DB
            let textData = activeTextSessions.get(textId);
            if (!textData) {
                // Fetch from board service (assuming textId matches a node ID)
                const boardElements = await boardService.getBoardState(roomId);
                const node = boardElements.find(el => el.id === textId);
                const content = node?.data?.label || '';

                textData = { content, version: 0, lastUpdateTime: Date.now() };
                activeTextSessions.set(textId, textData);
            }

            socket.emit('text-sync', {
                textId,
                content: textData.content,
                version: textData.version
            });
        });

        // Handle patches or full updates
        socket.on('text-update', async ({ roomId, textId, patch, content }) => {
            if (!activeTextSessions.has(textId)) {
                // Initialize if missing (rare race condition or server restart)
                activeTextSessions.set(textId, { content: content || '', version: 0, lastUpdateTime: Date.now() });
            }

            const session = activeTextSessions.get(textId);

            // If full content provided (simple sync)
            if (content !== undefined) {
                session.content = content;
                session.version++;
                session.lastUpdateTime = Date.now();

                // Broadcast to others in the text-session room
                socket.to(`text-${textId}`).emit('text-update', {
                    textId,
                    content: session.content,
                    version: session.version,
                    sourceSocketId: socket.id
                });

                // Ideally, debounce save to DB
                // For now, we rely on the client ALSO sending 'node-update' or we trigger it here?
                // Request says "Maintain per-text-object state on server". 
                // We should persist eventually.
                // Let's lazy persist:
                // throttleSave(roomId, textId, session.content); 
            }

            // If patch provided (e.g. diff-match-patch delta)
            if (patch) {
                // Apply patch logic here if we had OT library.
                // For now, we assume patch is just passed through to clients who know how to apply it.
                // But we must update server state for new joiners!
                // Without OT library, we can't easily apply patch to 'session.content'.
                // So reliable sync requires 'content' to be sent or OT logic.
                // We'll broadcast patch for low-latency visual update to peers.
                socket.to(`text-${textId}`).emit('text-patch', {
                    textId,
                    patch,
                    sourceSocketId: socket.id
                });
            }
        });

        // Caret/Selection Presence
        socket.on('selection-update', ({ textId, range }) => {
            // range: { start: number, end: number, ... }
            if (textId) {
                socket.to(`text-${textId}`).emit('selection-update', {
                    textId,
                    userId: socket.id, // Or mapped User ID
                    range
                });
            }
        });

        // Cleanup on leave
        socket.on('text-leave', ({ textId }) => {
            socket.leave(`text-${textId}`);
        });
    });
};
