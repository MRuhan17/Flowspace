import { boardService } from '../services/boardService.js';
import { logger } from '../utils/logger.js';

export const setupSocketHandlers = (io) => {
    io.on('connection', (socket) => {
        logger.info(`Socket connected: ${socket.id}`);

        // Join Room & Init
        socket.on('join-room', async (roomId) => {
            if (!roomId) return;

            await socket.join(roomId);
            logger.info(`Socket ${socket.id} joined room ${roomId}`);

            // Fetch current board state
            const strokes = await boardService.getBoardState(roomId);

            // Emit initialization event with current strokes
            socket.emit('board-init', { strokes });

            // Notify others
            socket.to(roomId).emit('user-joined', { userId: socket.id });
        });

        // Draw Stroke (Idempotent addition/update)
        socket.on('draw-stroke', async (payload) => {
            const { roomId, stroke } = payload;
            if (!roomId || !stroke) return;

            // Update server state
            // We treat 'stroke' as the element to add/update
            await boardService.addOperation(roomId, { element: stroke });

            // Broadcast to others (exclude sender)
            socket.to(roomId).emit('draw-stroke', stroke);
        });

        // Cursor Move (Ephemeral)
        socket.on('cursor-move', (payload) => {
            const { roomId, x, y, userId } = payload;
            if (!roomId) return;

            // Broadcast cursor position directly
            socket.to(roomId).emit('cursor-move', { userId: userId || socket.id, x, y });
        });

        // Undo
        socket.on('undo', async (payload) => {
            const { roomId } = payload;
            if (!roomId) return;

            const newBoardState = await boardService.undo(roomId);
            if (newBoardState) {
                // Broadcast FULL sync to ensure consistency after undo
                io.to(roomId).emit('sync-board', { strokes: newBoardState });
            }
        });

        // Redo
        socket.on('redo', async (payload) => {
            const { roomId } = payload;
            if (!roomId) return;

            const newBoardState = await boardService.redo(roomId);
            if (newBoardState) {
                // Broadcast FULL sync to ensure consistency after redo
                io.to(roomId).emit('sync-board', { strokes: newBoardState });
            }
        });

        socket.on('layout-update', ({ roomId, updates }) => {
            // updates: { [id]: { x, y } } - Deltas
            // We need to apply these deltas to the board service
            boardService.updateElements(roomId, updates);

            // Broadcast to others to animate
            socket.to(roomId).emit('onLayoutUpdate', updates);
        });

        // Full Sync Request (Client asks for latest state)
        socket.on('sync-request', async (payload) => {
            const { roomId } = payload;
            if (!roomId) return;

            const strokes = await boardService.getBoardState(roomId);
            socket.emit('sync-board', { strokes });
        });

        // Disconnect
        socket.on('disconnect', () => {
            logger.info(`Socket disconnected: ${socket.id}`);
        });
    });
};
