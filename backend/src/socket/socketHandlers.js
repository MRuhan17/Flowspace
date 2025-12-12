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
            const elements = await boardService.getBoardState(roomId);

            // Emit initialization event with current strokes
            socket.emit('board-init', { elements });

            // Notify others
            socket.to(roomId).emit('presence-join', { userId: socket.id });
        });

        // Draw Stroke (Idempotent addition/update)
        socket.on('draw-stroke', async (payload) => {
            try {
                const { roomId, stroke } = payload;
                if (!roomId || !stroke) return;
                await boardService.addOperation(roomId, { element: stroke });
                socket.to(roomId).emit('draw-stroke', stroke);
            } catch (error) {
                logger.error('Error in draw-stroke:', error);
            }
        });

        // Graph Events
        // Reuse generic addOperation logic but broadcast specific events
        const handleGraphElement = async (event, roomId, element) => {
            try {
                if (!roomId || !element) return;
                await boardService.addOperation(roomId, { element });
                socket.to(roomId).emit(event, element);
            } catch (error) {
                logger.error(`Error in ${event}:`, error);
            }
        };

        socket.on('node-add', ({ roomId, node }) => handleGraphElement('node-add', roomId, node));
        socket.on('node-update', ({ roomId, node }) => handleGraphElement('node-update', roomId, node));
        socket.on('connector-add', ({ roomId, connector }) => handleGraphElement('connector-add', roomId, connector));
        socket.on('connector-update', ({ roomId, connector }) => handleGraphElement('connector-update', roomId, connector));

        // Delete Elements
        socket.on('delete-elements', async (payload) => {
            try {
                const { roomId, ids } = payload;
                if (!roomId || !ids || !ids.length) return;

                const newBoardState = await boardService.removeElements(roomId, ids);
                io.to(roomId).emit('sync-board', { elements: newBoardState });
            } catch (error) {
                logger.error('Error in delete-elements:', error);
            }
        });

        // Cursor Move (Ephemeral) - Sync, no try/catch needed usually, but safe to add if logic expands
        socket.on('cursor-move', (payload) => {
            const { roomId, x, y, userId } = payload;
            if (!roomId) return;
            socket.to(roomId).emit('cursor-move', { userId: userId || socket.id, x, y });
        });

        // Undo
        socket.on('undo', async (payload) => {
            try {
                const { roomId } = payload;
                if (!roomId) return;
                const newBoardState = await boardService.undo(roomId);
                if (newBoardState) {
                    io.to(roomId).emit('sync-board', { elements: newBoardState });
                }
            } catch (error) {
                logger.error('Error in undo:', error);
            }
        });

        // Redo
        socket.on('redo', async (payload) => {
            try {
                const { roomId } = payload;
                if (!roomId) return;
                const newBoardState = await boardService.redo(roomId);
                if (newBoardState) {
                    io.to(roomId).emit('sync-board', { elements: newBoardState });
                }
            } catch (error) {
                logger.error('Error in redo:', error);
            }
        });

        socket.on('layout-update', ({ roomId, updates }) => {
            try {
                boardService.updateElements(roomId, updates);
                socket.to(roomId).emit('onLayoutUpdate', updates);
            } catch (error) {
                logger.error('Error in layout-update:', error);
            }
        });

        // Full Sync Request
        socket.on('sync-request', async (payload) => {
            try {
                const { roomId } = payload;
                if (!roomId) return;
                const elements = await boardService.getBoardState(roomId);
                socket.emit('sync-board', { elements });
            } catch (error) {
                logger.error('Error in sync-request:', error);
            }
        });

        // Disconnect
        socket.on('disconnecting', () => {
            // socket.rooms is a Set. One of them is the socket ID, others are joined rooms.
            for (const room of socket.rooms) {
                if (room !== socket.id) {
                    socket.to(room).emit('presence-leave', { userId: socket.id });
                }
            }
        });

        socket.on('disconnect', () => {
            logger.info(`Socket disconnected: ${socket.id}`);
        });
    });

};
