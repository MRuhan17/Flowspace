// In-memory board state placeholder
const boardState = {
    elements: []
};

export const getBoardState = () => boardState;
export const updateBoardState = (newState) => {
    boardState.elements = newState.elements;
};
