import { logger } from '../utils/logger.js';

/**
 * Server-side CRDT State Manager
 * Manages collaborative state for each board using LWW-CRDT semantics
 * Handles operation application, broadcasting, and snapshot persistence
 */

class CRDTState {
    constructor(boardId) {
        this.boardId = boardId;
        this.lamportClock = 0;

        // State: Map<elementId, Element>
        this.elements = new Map();

        // Tombstones: Set<elementId>
        this.tombstones = new Set();

        // Operation log (for debugging and potential replay)
        this.opLog = [];

        // Last snapshot time
        this.lastSnapshotTime = Date.now();
        this.snapshotInterval = 60000; // 1 minute
    }

    /**
     * Increment Lamport clock
     */
    tick() {
        this.lamportClock++;
        return this.lamportClock;
    }

    /**
     * Update Lamport clock based on received timestamp
     */
    receive(timestamp) {
        this.lamportClock = Math.max(this.lamportClock, timestamp) + 1;
    }

    /**
     * Apply an operation to the CRDT state
     * @param {object} operation - CRDT operation with metadata
     * @returns {boolean} Whether the operation was applied
     */
    applyOperation(operation) {
        if (!operation || !operation.timestamp || !operation.clientId) {
            logger.warn('Invalid CRDT operation:', operation);
            return false;
        }

        // Update Lamport clock
        this.receive(operation.timestamp);

        const { type, elementId, data } = operation;

        try {
            switch (type) {
                case 'insert':
                    this._handleInsert(elementId, data, operation);
                    break;

                case 'update':
                    this._handleUpdate(elementId, data, operation);
                    break;

                case 'delete':
                    this._handleDelete(elementId, operation);
                    break;

                default:
                    logger.warn(`Unknown CRDT operation type: ${type}`);
                    return false;
            }

            // Add to operation log (keep last 1000 operations)
            this.opLog.push(operation);
            if (this.opLog.length > 1000) {
                this.opLog.shift();
            }

            return true;
        } catch (error) {
            logger.error('Error applying CRDT operation:', error);
            return false;
        }
    }

    /**
     * Handle insert operation
     */
    _handleInsert(elementId, data, op) {
        if (this.elements.has(elementId)) {
            // Conflict: element already exists
            const existing = this.elements.get(elementId);
            if (op.timestamp > existing._timestamp) {
                this.elements.set(elementId, {
                    ...data,
                    id: elementId,
                    _timestamp: op.timestamp,
                    _clientId: op.clientId
                });
            }
        } else {
            // New insert
            this.tombstones.delete(elementId);
            this.elements.set(elementId, {
                ...data,
                id: elementId,
                _timestamp: op.timestamp,
                _clientId: op.clientId
            });
        }
    }

    /**
     * Handle update operation
     */
    _handleUpdate(elementId, data, op) {
        if (this.tombstones.has(elementId)) {
            // Element is deleted, ignore update
            return;
        }

        const existing = this.elements.get(elementId);
        if (!existing) {
            // Element doesn't exist, treat as insert
            this._handleInsert(elementId, data, op);
            return;
        }

        // LWW: Merge updates based on timestamp
        if (op.timestamp > existing._timestamp) {
            this.elements.set(elementId, {
                ...existing,
                ...data,
                id: elementId,
                _timestamp: op.timestamp,
                _clientId: op.clientId
            });
        } else if (op.timestamp === existing._timestamp) {
            // Tie-break by clientId
            if (op.clientId > existing._clientId) {
                this.elements.set(elementId, {
                    ...existing,
                    ...data,
                    id: elementId,
                    _timestamp: op.timestamp,
                    _clientId: op.clientId
                });
            }
        }
    }

    /**
     * Handle delete operation
     */
    _handleDelete(elementId, op) {
        const existing = this.elements.get(elementId);

        if (!existing) {
            this.tombstones.add(elementId);
            return;
        }

        // LWW: Only delete if operation is newer
        if (op.timestamp > existing._timestamp) {
            this.elements.delete(elementId);
            this.tombstones.add(elementId);
        }
    }

    /**
     * Get all active elements
     */
    getElements() {
        return Array.from(this.elements.values()).map(el => {
            const { _timestamp, _clientId, ...clean } = el;
            return clean;
        });
    }

    /**
     * Get elements by type
     */
    getElementsByType(type) {
        return this.getElements().filter(el => el.type === type);
    }

    /**
     * Check if element exists
     */
    hasElement(elementId) {
        return this.elements.has(elementId) && !this.tombstones.has(elementId);
    }

    /**
     * Get element by ID
     */
    getElement(elementId) {
        const el = this.elements.get(elementId);
        if (!el) return null;
        const { _timestamp, _clientId, ...clean } = el;
        return clean;
    }

    /**
     * Create a snapshot of current state
     * @returns {object} Serializable snapshot
     */
    dumpSnapshot() {
        const snapshot = {
            boardId: this.boardId,
            timestamp: Date.now(),
            lamportClock: this.lamportClock,
            elements: Array.from(this.elements.entries()),
            tombstones: Array.from(this.tombstones),
            opLog: this.opLog.slice(-100) // Keep last 100 ops
        };

        this.lastSnapshotTime = Date.now();
        return snapshot;
    }

    /**
     * Load state from a snapshot
     * @param {object} snapshot - Previously saved snapshot
     */
    loadFromSnapshot(snapshot) {
        if (!snapshot) {
            logger.warn('Attempted to load null snapshot');
            return;
        }

        try {
            this.boardId = snapshot.boardId || this.boardId;
            this.lamportClock = snapshot.lamportClock || 0;
            this.elements = new Map(snapshot.elements || []);
            this.tombstones = new Set(snapshot.tombstones || []);
            this.opLog = snapshot.opLog || [];
            this.lastSnapshotTime = snapshot.timestamp || Date.now();

            logger.info(`Loaded CRDT snapshot for board ${this.boardId}: ${this.elements.size} elements`);
        } catch (error) {
            logger.error('Error loading CRDT snapshot:', error);
        }
    }

    /**
     * Merge operations from another CRDT state
     * Useful for conflict resolution when reconnecting
     */
    mergeOperations(operations) {
        if (!Array.isArray(operations)) {
            logger.warn('mergeOperations expects an array');
            return;
        }

        let appliedCount = 0;
        operations.forEach(op => {
            if (this.applyOperation(op)) {
                appliedCount++;
            }
        });

        logger.info(`Merged ${appliedCount}/${operations.length} operations for board ${this.boardId}`);
        return appliedCount;
    }

    /**
     * Check if snapshot should be persisted
     */
    shouldSnapshot() {
        return Date.now() - this.lastSnapshotTime > this.snapshotInterval;
    }

    /**
     * Clear all state (for testing/cleanup)
     */
    clear() {
        this.elements.clear();
        this.tombstones.clear();
        this.opLog = [];
        this.lamportClock = 0;
    }

    /**
     * Get statistics about current state
     */
    getStats() {
        return {
            boardId: this.boardId,
            elementCount: this.elements.size,
            tombstoneCount: this.tombstones.size,
            lamportClock: this.lamportClock,
            opLogSize: this.opLog.length,
            lastSnapshotAge: Date.now() - this.lastSnapshotTime
        };
    }
}

/**
 * CRDT State Manager - Manages multiple board states
 */
class CRDTStateManager {
    constructor() {
        // Map<boardId, CRDTState>
        this.boards = new Map();
    }

    /**
     * Get or create CRDT state for a board
     */
    getBoard(boardId) {
        if (!this.boards.has(boardId)) {
            this.boards.set(boardId, new CRDTState(boardId));
        }
        return this.boards.get(boardId);
    }

    /**
     * Apply operation to a board
     */
    applyOperation(boardId, operation) {
        const board = this.getBoard(boardId);
        return board.applyOperation(operation);
    }

    /**
     * Get elements for a board
     */
    getElements(boardId) {
        const board = this.getBoard(boardId);
        return board.getElements();
    }

    /**
     * Load snapshot for a board
     */
    loadSnapshot(boardId, snapshot) {
        const board = this.getBoard(boardId);
        board.loadFromSnapshot(snapshot);
    }

    /**
     * Dump snapshot for a board
     */
    dumpSnapshot(boardId) {
        const board = this.getBoard(boardId);
        return board.dumpSnapshot();
    }

    /**
     * Check if board should be snapshotted
     */
    shouldSnapshot(boardId) {
        const board = this.boards.get(boardId);
        return board ? board.shouldSnapshot() : false;
    }

    /**
     * Remove board from memory (cleanup)
     */
    removeBoard(boardId) {
        this.boards.delete(boardId);
        logger.info(`Removed CRDT state for board ${boardId}`);
    }

    /**
     * Get stats for all boards
     */
    getAllStats() {
        const stats = {};
        this.boards.forEach((board, boardId) => {
            stats[boardId] = board.getStats();
        });
        return stats;
    }
}

// Singleton instance
const crdtStateManager = new CRDTStateManager();

export { CRDTState, CRDTStateManager, crdtStateManager };
