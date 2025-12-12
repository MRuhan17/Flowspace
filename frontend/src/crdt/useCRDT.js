import React from 'react';
import { nanoid } from 'nanoid';

/**
 * CRDT Engine for Flowspace
 * Implements Last-Write-Wins (LWW) semantics with tombstones for collaborative editing
 * 
 * Each operation has:
 * - id: unique operation ID
 * - timestamp: Lamport timestamp for ordering
 * - clientId: originating client
 * - type: 'insert' | 'update' | 'delete'
 * - elementId: target element
 * - data: payload
 */

class CRDTEngine {
    constructor(clientId) {
        this.clientId = clientId || nanoid();
        this.lamportClock = 0;

        // State: Map<elementId, Element>
        this.elements = new Map();

        // Tombstones: Set<elementId> for deleted elements
        this.tombstones = new Set();

        // Operation log for debugging/sync
        this.opLog = [];
    }

    /**
     * Increments Lamport clock and returns new timestamp
     */
    tick() {
        this.lamportClock++;
        return this.lamportClock;
    }

    /**
     * Updates Lamport clock based on received timestamp
     */
    receive(timestamp) {
        this.lamportClock = Math.max(this.lamportClock, timestamp) + 1;
    }

    /**
     * Apply a local operation (optimistic)
     * @param {object} op - { type, elementId, data }
     * @returns {object} Full operation with metadata
     */
    applyLocal(op) {
        const fullOp = {
            id: nanoid(),
            timestamp: this.tick(),
            clientId: this.clientId,
            ...op
        };

        this._applyOperation(fullOp);
        this.opLog.push(fullOp);

        return fullOp;
    }

    /**
     * Apply a remote operation (from network)
     * @param {object} op - Full operation with metadata
     */
    applyRemote(op) {
        if (!op.timestamp || !op.clientId) {
            console.error('Invalid remote operation:', op);
            return;
        }

        this.receive(op.timestamp);
        this._applyOperation(op);
        this.opLog.push(op);
    }

    /**
     * Internal: Apply operation to state
     */
    _applyOperation(op) {
        const { type, elementId, data } = op;

        switch (type) {
            case 'insert':
                this._handleInsert(elementId, data, op);
                break;

            case 'update':
                this._handleUpdate(elementId, data, op);
                break;

            case 'delete':
                this._handleDelete(elementId, op);
                break;

            default:
                console.warn('Unknown operation type:', type);
        }
    }

    /**
     * Insert a new element
     */
    _handleInsert(elementId, data, op) {
        // Check if already exists or tombstoned
        if (this.elements.has(elementId)) {
            // Conflict: element already exists
            // LWW: Keep newer timestamp
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
            this.tombstones.delete(elementId); // Resurrect if tombstoned
            this.elements.set(elementId, {
                ...data,
                id: elementId,
                _timestamp: op.timestamp,
                _clientId: op.clientId
            });
        }
    }

    /**
     * Update an existing element
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
            // Tie-break by clientId (lexicographic)
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
        // Else: existing is newer, ignore this update
    }

    /**
     * Delete an element (tombstone)
     */
    _handleDelete(elementId, op) {
        const existing = this.elements.get(elementId);

        if (!existing) {
            // Element doesn't exist, just add tombstone
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
     * Get all active elements (excluding tombstones)
     * @returns {Array} Array of elements
     */
    getElements() {
        return Array.from(this.elements.values()).map(el => {
            // Remove CRDT metadata for clean output
            const { _timestamp, _clientId, ...clean } = el;
            return clean;
        });
    }

    /**
     * Get elements by type
     * @param {string} type - 'node' | 'edge' | 'stroke'
     */
    getElementsByType(type) {
        return this.getElements().filter(el => el.type === type);
    }

    /**
     * Export state to JSON
     * @returns {object} Serializable state
     */
    toJSON() {
        return {
            clientId: this.clientId,
            lamportClock: this.lamportClock,
            elements: Array.from(this.elements.entries()),
            tombstones: Array.from(this.tombstones),
            opLog: this.opLog.slice(-100) // Keep last 100 ops for debugging
        };
    }

    /**
     * Import state from JSON
     * @param {object} json - Serialized state
     */
    fromJSON(json) {
        if (!json) return;

        this.clientId = json.clientId || this.clientId;
        this.lamportClock = json.lamportClock || 0;
        this.elements = new Map(json.elements || []);
        this.tombstones = new Set(json.tombstones || []);
        this.opLog = json.opLog || [];
    }

    /**
     * Clear all state (for testing/reset)
     */
    clear() {
        this.elements.clear();
        this.tombstones.clear();
        this.opLog = [];
        this.lamportClock = 0;
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
     * Check if element exists
     */
    hasElement(elementId) {
        return this.elements.has(elementId) && !this.tombstones.has(elementId);
    }
}

/**
 * React Hook for CRDT integration
 */
export const useCRDT = (clientId) => {
    const engineRef = React.useRef(null);

    if (!engineRef.current) {
        engineRef.current = new CRDTEngine(clientId);
    }

    const engine = engineRef.current;

    return {
        // Core API
        applyLocal: (op) => engine.applyLocal(op),
        applyRemote: (op) => engine.applyRemote(op),

        // State access
        getElements: () => engine.getElements(),
        getElementsByType: (type) => engine.getElementsByType(type),
        getElement: (id) => engine.getElement(id),
        hasElement: (id) => engine.hasElement(id),

        // Serialization
        toJSON: () => engine.toJSON(),
        fromJSON: (json) => engine.fromJSON(json),

        // Utility
        clear: () => engine.clear(),

        // Metadata
        clientId: engine.clientId,
        lamportClock: engine.lamportClock
    };
};

// Export class for direct use
export { CRDTEngine };

// Helper: Create operation objects
export const createOperation = {
    insert: (elementId, data) => ({
        type: 'insert',
        elementId,
        data
    }),

    update: (elementId, data) => ({
        type: 'update',
        elementId,
        data
    }),

    delete: (elementId) => ({
        type: 'delete',
        elementId,
        data: null
    })
};
