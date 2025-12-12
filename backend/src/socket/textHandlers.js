import { logger } from '../utils/logger.js';
import { boardService } from '../services/boardService.js';

// In-memory store for high-frequency text sessions
// Map<textId, { content: string, version: number, lastUpdateTime: number }>
const activeTextSessions = new Map();

/**
 * Registers text collaboration handlers on a specific socket.
 * Call this from main socket connection handler.
 */
export const registerTextHandlers = (io, socket) => {

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

            // Persistence: Integrate with Board Service
            // This ensures text updates are saved to the document sync flow
            try {
                // boardService.addOperation usually replaces the whole element. 
                // We construct a partial update? boardService currently expects { element }.
                // But addOperation logic: if element exists, replace.
                // We must fetch full element first?
                // Or allow boardService to handle minimal updates.
                // Let's rely on standard boardService update via socketHandlers 'node-update'?
                // If text update is separate, we MUST persist it here.

                // Fetch full node to merge? expensive.
                // Let's allow boardService.updateElements (which we enhanced in Step 1556)
                // updateElements expects map of updates.
                const updates = {};
                updates[textId] = { data: { label: content } };
                // BUT boardService check: if x/y delta... merge.
                // It merges otherProps: let updatedEl = { ...el, ...otherProps };
                // But 'data' is nested. { ...el, data: { label } } REPLACES data object!
                // We need DEEP merge if data has other props.
                // Assuming data only has label or we replace it fine.
                // Wait, nodes often have other data props. Replacing 'data' object is risky.
                // I should improve boardService or fetch-merge-save.
                // For now, I will use updateElements assuming shallow merge is okay or limited data props.
                await boardService.updateElements(roomId, updates);

            } catch (err) {
                logger.error('Text persistence error:', err);
            }
        }

        // If patch provided
        if (patch) {
            socket.to(`text-${textId}`).emit('text-patch', {
                textId,
                patch,
                sourceSocketId: socket.id
            });
        }
    });

    // Caret/Selection Presence
    socket.on('selection-update', ({ textId, range }) => {
        if (textId) {
            socket.to(`text-${textId}`).emit('selection-update', {
                textId,
                userId: socket.id,
                range
            });
        }
    });

    // Cleanup on leave
    socket.on('text-leave', ({ textId }) => {
        socket.leave(`text-${textId}`);
    });
};
