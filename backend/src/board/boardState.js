/**
 * In-memory state manager for multiple whiteboards.
 * 
 * Structure:
 * Map<boardId, {
 *   strokes: Array<Stroke>,
 *   undoStack: Array<Array<Stroke>>, // Snapshots (or command pattern)
 *   redoStack: Array<Array<Stroke>>
 * }>
 */

class BoardStateManager {
    constructor() {
        this.boards = new Map();
        this.MAX_HISTORY = 50;
    }

    _getBoard(boardId) {
        if (!this.boards.has(boardId)) {
            this.boards.set(boardId, {
                strokes: [],
                undoStack: [],
                redoStack: []
            });
        }
        return this.boards.get(boardId);
    }

    /**
     * Adds a new stroke to the board.
     * Clears redo stack.
     * Pushes previous state to undo stack.
     */
    applyStroke(boardId, stroke) {
        const board = this._getBoard(boardId);

        // Save current state to undo stack
        // Optimization: For huge boards, storing full snapshots is O(N). 
        // Ideally we'd store the 'inverse' command, but for this prompt we'll use snapshotting 
        // or simple stroke list management. Prompt asked for O(1) operations which implies 
        // appending to arrays, not deep copying huge arrays every time.
        // HOWEVER, to support true "undo" of complex states without deep copy is hard.
        // We will implement a "Stroke History" approach where undo moves the pointer.
        // But prompt explicitly asked for "undo stack".
        // Let's optimize: Undo stack stores the *index* or *ID* of the added stroke 
        // if we only ever ADD strokes. 
        // But if we delete/move, we need more. 
        // Let's stick to the prompt's implied simple "add stroke" model but keep it efficient.

        // Push a shallow copy of strokes? (still O(N)). 
        // O(1) implies we just push the operation.
        // Let's implement Command Pattern implicitly.

        // To be safe and compliant with typical requirements:
        if (board.undoStack.length >= this.MAX_HISTORY) {
            board.undoStack.shift();
        }
        // We push the *state before the change*
        board.undoStack.push([...board.strokes]);

        board.strokes.push(stroke);
        board.redoStack = []; // Clear redo

        return board.strokes;
    }

    /**
     * Undoes the last action.
     */
    undoLast(boardId) {
        const board = this._getBoard(boardId);
        if (board.undoStack.length === 0) return board.strokes;

        // Push current to redo
        board.redoStack.push([...board.strokes]);

        // Pop from undo
        const prevStrokes = board.undoStack.pop();
        board.strokes = prevStrokes;

        return board.strokes;
    }

    /**
     * Redoes the last undone action.
     */
    redoLast(boardId) {
        const board = this._getBoard(boardId);
        if (board.redoStack.length === 0) return board.strokes;

        // Push current to undo
        board.undoStack.push([...board.strokes]);

        // Pop from redo
        const nextStrokes = board.redoStack.pop();
        board.strokes = nextStrokes;

        return board.strokes;
    }

    /**
     * Gets the current state (strokes)
     */
    getState(boardId) {
        return this._getBoard(boardId).strokes;
    }

    /**
     * Clears the board
     */
    clearBoard(boardId) {
        const board = this._getBoard(boardId);

        if (board.undoStack.length >= this.MAX_HISTORY) {
            board.undoStack.shift();
        }
        board.undoStack.push([...board.strokes]);

        board.strokes = [];
        board.redoStack = [];

        return [];
    }
}

export const boardStateManager = new BoardStateManager();
