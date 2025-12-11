import { create } from 'zustand';

const useStore = create((set) => ({
    brushColor: '#000000',
    brushSize: 5,
    selectedTool: 'brush', // Options: 'brush', 'eraser', 'select', etc.

    setBrushColor: (color) => set({ brushColor: color }),
    setBrushSize: (size) => set({ brushSize: size }),
    setSelectedTool: (tool) => set({ selectedTool: tool }),
}));

export default useStore;
