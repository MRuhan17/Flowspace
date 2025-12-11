import { create } from 'zustand';
import { socket } from '../socket/socketClient';
import debounce from 'lodash/debounce';

export const useBoardStore = create((set, get) => ({
    tool: 'pen',
    color: '#000000',
    strokeWidth: 3,
    strokes: [], // Array of stroke objects
    roomId: 'default-room',
    scale: 1,
    history: [], // For local undo/redo preview or optimistic updates

    // Actions
    setTool: (tool) => set({ tool }),
    setColor: (color) => set({ color }),
    setStrokeWidth: (width) => set({ strokeWidth: width }),

    // Add local stroke (optimistic)
    addStroke: (stroke) => {
        set((state) => ({ strokes: [...state.strokes, stroke] }));

        // Emit to server (fire and forget for now, but really should be robust)
        socket.emit('draw-stroke', {
            roomId: get().roomId,
            stroke
        });
    },

    // Sync from server (replace whole state)
    setStrokes: (newStrokes) => set({ strokes: newStrokes }),

    // Single stroke incoming from peer
    receiveStroke: (stroke) => {
        set((state) => {
            // Deduplicate if needed?
            // For now simply append
            return { strokes: [...state.strokes, stroke] };
        });
    },

    undo: () => {
        socket.emit('undo', { roomId: get().roomId });
    },

    redo: () => {
        socket.emit('redo', { roomId: get().roomId });
    }
}));
