import { logger } from '../utils/logger.js';
import { persistenceService } from './persistenceService.js';

/**
 * In-memory store for board state. 
 * In a production environment with multiple instances, this should be replaced with Redis.
 */
class BoardService {
    constructor() {
        this.boards = new Map(); // roomId -> { elements: [], undoStack: [], redoStack: [] }
        this.MAX_STACK_SIZE = 50;
    }

    async _getBoard(roomId) {
        if (!this.boards.has(roomId)) {
            const savedElements = await persistenceService.loadBoard(roomId);
            this.boards.set(roomId, {
                elements: savedElements || [], // Array of drawing elements
                undoStack: [], // Array of snapshots of elements
                redoStack: []
            });
        }
        return this.boards.get(roomId);
    }

    async getBoardState(roomId) {
        const board = await this._getBoard(roomId);
        return board.elements;
    }

    /**
     * Updates the board with a new element or modifies existing ones.
     * @param {string} roomId 
     * @param {object} action - { type: 'add'|'update'|'delete', element: ... }
     */
    async addOperation(roomId, operation) {
        const board = await this._getBoard(roomId);

        // Push current state to undo stack before modifying
        const snapshot = JSON.parse(JSON.stringify(board.elements));

        if (board.undoStack.length >= this.MAX_STACK_SIZE) {
            board.undoStack.shift();
        }
        board.undoStack.push(snapshot);
        board.redoStack = []; // Clear redo stack on new operation

        this._applyOperation(board.elements, operation);

        persistenceService.saveBoard(roomId, board.elements);

        return board.elements;
    }

    _applyOperation(elements, operation) {
        if (operation.element) {
            const index = elements.findIndex(e => e.id === operation.element.id);
            if (index !== -1) {
                elements[index] = operation.element;
            } else {
                elements.push(operation.element);
            }
        }
    }

    // Direct update from client (e.g. dragging finished)
    async updateBoardElements(roomId, elements) {
        const board = await this._getBoard(roomId);
        // Snapshot
        if (board.undoStack.length >= this.MAX_STACK_SIZE) {
            board.undoStack.shift();
        }
        board.undoStack.push(JSON.parse(JSON.stringify(board.elements)));
        board.redoStack = [];

        board.elements = elements;

        persistenceService.saveBoard(roomId, board.elements);

        return board.elements;
    }

    async undo(roomId) {
        const board = await this._getBoard(roomId);
        if (board.undoStack.length === 0) return null;

        const currentState = JSON.parse(JSON.stringify(board.elements));
        board.redoStack.push(currentState);

        const previousState = board.undoStack.pop();
        board.elements = previousState;

        persistenceService.saveBoard(roomId, board.elements);

        logger.info(`Undo in room ${roomId}. Stack size: ${board.undoStack.length}`);
        return board.elements;
    }

    async redo(roomId) {
        const board = await this._getBoard(roomId);
        if (board.redoStack.length === 0) return null;

        const currentState = JSON.parse(JSON.stringify(board.elements));
        board.undoStack.push(currentState);

        const nextState = board.redoStack.pop();
        board.elements = nextState;

        persistenceService.saveBoard(roomId, board.elements);

        logger.info(`Redo in room ${roomId}. Stack size: ${board.redoStack.length}`);
        return board.elements;
    }

    async clearBoard(roomId) {
        const board = await this._getBoard(roomId);
        if (board.undoStack.length >= this.MAX_STACK_SIZE) {
            board.undoStack.shift();
        }
        board.undoStack.push(JSON.parse(JSON.stringify(board.elements)));
        board.redoStack = [];
        board.elements = [];

        persistenceService.saveBoard(roomId, []);

        return [];
    }
}

export const boardService = new BoardService();
