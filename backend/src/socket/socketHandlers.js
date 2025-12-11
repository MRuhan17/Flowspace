import { boardService } from '../services/boardService.js';
import { logger } from '../utils/logger.js';

export const setupSocketHandlers = (io) => {
    io.on('connection', (socket) => {
        logger.info('User connected:', socket.id);

        socket.on('join-room', async (roomId) => {
            socket.join(roomId);
            logger.info(`User ${socket.id} joined room: ${roomId}`);

            // Send current board state to the new user
            const elements = await boardService.getBoardState(roomId);
            socket.emit('load-state', elements);

            socket.to(roomId).emit('user-joined', socket.id);
        });

        socket.on('draw', async (data) => {
            const { roomId, element } = data;
            if (!roomId || !element) return;

            await boardService.addOperation(roomId, { element });
            socket.to(roomId).emit('draw', data.element); // Broadcast just the element
        });

        // Handle explicit board state updates (e.g. from a full sync or after a complex operation)
        socket.on('update-board', async (data) => {
            const { roomId, elements } = data;
            if (!roomId) return;
            await boardService.updateBoardElements(roomId, elements);
            socket.to(roomId).emit('update-board', elements);
        });

        socket.on('undo', async (data) => {
            const { roomId } = data;
            if (!roomId) return;

            const newBoardState = await boardService.undo(roomId);
            if (newBoardState) {
                io.to(roomId).emit('board-state-sync', newBoardState);
            }
        });

        socket.on('redo', async (data) => {
            const { roomId } = data;
            if (!roomId) return;

            const newBoardState = await boardService.redo(roomId);
            if (newBoardState) {
                io.to(roomId).emit('board-state-sync', newBoardState);
            }
        });

        socket.on('clear', async (data) => {
            const { roomId } = data;
            if (!roomId) return;
            await boardService.clearBoard(roomId);
            io.to(roomId).emit('board-state-sync', []);
        });

        socket.on('disconnect', () => {
            logger.info('User disconnected:', socket.id);
        });
    });
};
