import { boardService } from '../services/boardService.js';
import { logger } from '../utils/logger.js';
import { registerTextHandlers } from './textHandlers.js';
import { crdtStateManager } from '../crdt/crdtState.js';

// In-memory presence roster: Map<roomId, Set<userId>>
const roomUsers = new Map();

export const setupSocketHandlers = (io) => {
    io.on('connection', (socket) => {
        logger.info(`Socket connected: ${socket.id}`);

        // Register Text Collaboration Handlers
        registerTextHandlers(io, socket);

        // Join Room & Init
        socket.on('join-room', async (roomId) => {
            if (!roomId) return;

            await socket.join(roomId);
            logger.info(`Socket ${socket.id} joined room ${roomId}`);

            // Update roster
            if (!roomUsers.has(roomId)) {
                roomUsers.set(roomId, new Set());
            }
            roomUsers.get(roomId).add(socket.id);

            // Load CRDT state (try snapshot first, then fallback)
            try {
                // Try loading CRDT snapshot from persistence
                const snapshot = await boardService.loadCRDTSnapshot(roomId);
                if (snapshot) {
                    crdtStateManager.loadSnapshot(roomId, snapshot);
                    logger.info(`Loaded CRDT snapshot for room ${roomId}`);
                }

                // Get current CRDT elements
                const crdtElements = crdtStateManager.getElements(roomId);

                if (crdtElements.length > 0) {
                    // Send CRDT state
                    socket.emit('board-init', {
                        elements: crdtElements,
                        snapshot: crdtStateManager.dumpSnapshot(roomId)
                    });
                } else {
                    // Fallback to traditional board service
                    const elements = await boardService.getBoardState(roomId);
                    socket.emit('board-init', { elements });

                    // Initialize CRDT with existing data
                    elements.forEach(el => {
                        crdtStateManager.applyOperation(roomId, {
                            id: `init-${el.id}`,
                            type: 'insert',
                            elementId: el.id,
                            data: el,
                            timestamp: Date.now(),
                            clientId: 'server'
                        });
                    });
                }
            } catch (error) {
                logger.error('Error loading board state:', error);
                socket.emit('board-init', { elements: [] });
            }

            // Broadcast join to others
            socket.to(roomId).emit('presence-join', { userId: socket.id });

            // Send current roster to the new user
            const users = Array.from(roomUsers.get(roomId));
            socket.emit('presence-roster', { users });
        });

        /**
         * Validate CRDT operation
         */
        const validateCRDTOperation = (operation) => {
            if (!operation) return false;
            if (!operation.id || !operation.timestamp || !operation.clientId) return false;
            if (!operation.type || !['insert', 'update', 'delete'].includes(operation.type)) return false;
            if (!operation.elementId) return false;
            return true;
        };

        // CRDT Operation Handler (primary)
        socket.on('crdt-operation', async ({ roomId, operation }) => {
            try {
                if (!roomId || !operation) {
                    logger.warn('Invalid CRDT operation: missing roomId or operation');
                    return;
                }

                // Validate operation structure
                if (!validateCRDTOperation(operation)) {
                    logger.warn('Invalid CRDT operation structure:', operation);
                    socket.emit('crdt-error', {
                        error: 'Invalid operation structure',
                        operation
                    });
                    return;
                }

                // Apply operation to CRDT state
                const applied = crdtStateManager.applyOperation(roomId, operation);

                if (applied) {
                    // Broadcast to other clients in the room
                    socket.to(roomId).emit('crdt-operation', operation);

                    // Periodic snapshot to persistence
                    if (crdtStateManager.shouldSnapshot(roomId)) {
                        const snapshot = crdtStateManager.dumpSnapshot(roomId);
                        // Persist snapshot asynchronously (don't block)
                        boardService.saveCRDTSnapshot(roomId, snapshot).catch(err => {
                            logger.error('Failed to save CRDT snapshot:', err);
                        });
                    }
                } else {
                    logger.warn('CRDT operation not applied:', operation);
                }
            } catch (error) {
                logger.error('Error handling CRDT operation:', error);
                socket.emit('crdt-error', {
                    error: error.message,
                    operation
                });
            }
        });

        // CRDT Operation Handler (alias: crdt-op)
        socket.on('crdt-op', async ({ roomId, operation }) => {
            // Delegate to main handler
            socket.emit('crdt-operation', { roomId, operation });
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

        // Cursor Move (Ephemeral) - Throttled to ~30fps
        socket.on('cursor-move', (payload) => {
            const { roomId, x, y, userId } = payload;
            if (!roomId) return;

            // Throttle: limit broadcast rate to prevent flooding (33ms = ~30fps)
            const now = Date.now();
            const last = socket._lastCursorTime || 0;
            if (now - last < 33) return;

            socket._lastCursorTime = now;
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

        // Structural Updates (Lock, Group, Z-Index)
        const handleStructuralUpdate = async (event, roomId, updates) => {
            try {
                if (!roomId || !updates) return;
                // Apply updates to persistence
                await boardService.updateElements(roomId, updates);
                // Broadcast to others
                socket.to(roomId).emit(event, updates);
            } catch (error) {
                logger.error(`Error in ${event}:`, error);
            }
        };

        socket.on('object-lock', ({ roomId, updates }) => handleStructuralUpdate('object-lock', roomId, updates));
        socket.on('object-unlock', ({ roomId, updates }) => handleStructuralUpdate('object-unlock', roomId, updates));
        socket.on('object-group', ({ roomId, updates }) => handleStructuralUpdate('object-group', roomId, updates));
        socket.on('object-ungroup', ({ roomId, updates }) => handleStructuralUpdate('object-ungroup', roomId, updates));
        socket.on('zindex-update', ({ roomId, updates }) => handleStructuralUpdate('zindex-update', roomId, updates));

        // Disconnect logic with Roster cleaning
        socket.on('disconnecting', () => {
            for (const room of socket.rooms) {
                if (room !== socket.id) {
                    // Update roster
                    if (roomUsers.has(room)) {
                        const users = roomUsers.get(room);
                        users.delete(socket.id);
                        if (users.size === 0) {
                            roomUsers.delete(room);
                        }
                    }
                    socket.to(room).emit('presence-leave', { userId: socket.id });
                }
            }
        });

        socket.on('disconnect', () => {
            logger.info(`Socket disconnected: ${socket.id}`);
        });
    });
};
