import create from 'zustand';

const useBoardStore = create((set) => ({
  board: [],
  selectedTool: 'pen',
  strokeColor: '#000000',
  strokeWidth: 2,
  
  updateBoard: (newBoard) => set({ board: newBoard }),
  setTool: (tool) => set({ selectedTool: tool }),
  setColor: (color) => set({ strokeColor: color }),
  setWidth: (width) => set({ strokeWidth: width }),
  
  clearBoard: () => set({ board: [] }),
}));

export default useBoardStore;
