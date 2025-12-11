// In-memory board state manager
const boards = new Map();

const getBoard = (roomId = 'default') => {
    if (!boards.has(roomId)) {
        boards.set(roomId, {
            strokes: [],
            redoStack: []
        });
    }
    return boards.get(roomId);
};

export const applyStroke = (roomId, stroke) => {
    const board = getBoard(roomId);
    board.strokes.push(stroke);
    board.redoStack = []; // Reset redo stack on new action
    return board.strokes;
};

export const undo = (roomId) => {
    const board = getBoard(roomId);
    if (board.strokes.length > 0) {
        const stroke = board.strokes.pop();
        board.redoStack.push(stroke);
        return true; // Indicates change occurred
    }
    return false;
};

export const redo = (roomId) => {
    const board = getBoard(roomId);
    if (board.redoStack.length > 0) {
        const stroke = board.redoStack.pop();
        board.strokes.push(stroke);
        return true;
    }
    return false;
};

export const getState = (roomId) => {
    return getBoard(roomId).strokes;
};

export const reset = (roomId) => {
    const board = getBoard(roomId);
    board.strokes = [];
    board.redoStack = [];
};
