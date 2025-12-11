import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { socket } from '../socket/socketClient';

export const useStore = create(
    devtools(
        (set, get) => ({
            // --- State ---
            activeBoardId: 'default-room',
            toolMode: 'pen',
            brushColor: '#000000',
            brushSize: 5,
            isDrawing: false,

            strokes: [],
            undoStack: [], // We only track Ids or full snapshots locally? 
            // Note: Our backend handles authoritative undo/redo. 
            // Local stack is nice for optimistic UI, but complex to keep in sync.
            // We'll rely on server events for the main stack, 
            // but can maintain basic history here if needed.
            redoStack: [],

            cursors: {}, // userId -> {x, y, color}

            aiModal: {
                isOpen: false,
                type: null, // 'summarize' | 'rewrite' | 'stickynote'
                data: null
            },

            // --- Actions ---

            setToolMode: (mode) => set({ toolMode: mode }),
            setBrushColor: (color) => set({ brushColor: color }),
            setBrushSize: (size) => set({ brushSize: size }),
            setIsDrawing: (isDrawing) => set({ isDrawing }),

            setActiveBoardId: (id) => set({ activeBoardId: id }),

            // Optimistic Add
            addStroke: (stroke) => {
                const { activeBoardId } = get();

                // Optimistic update
                set((state) => ({ strokes: [...state.strokes, stroke] }));

                // Emit
                socket.emit('draw-stroke', {
                    roomId: activeBoardId,
                    stroke
                });
            },

            // Remote Sync
            setStrokes: (newStrokes) => set({ strokes: newStrokes }),

            receiveStroke: (stroke) => {
                set((state) => {
                    // Prevent duplicates if possible
                    if (state.strokes.some(s => s.id === stroke.id)) return state;
                    return { strokes: [...state.strokes, stroke] };
                });
            },

            // History (Server Authoritative)
            undo: () => {
                socket.emit('undo', { roomId: get().activeBoardId });
            },

            redo: () => {
                socket.emit('redo', { roomId: get().activeBoardId });
            },

            // Cursors
            updateCursor: (userId, position) => {
                set((state) => ({
                    cursors: {
                        ...state.cursors,
                        [userId]: position
                    }
                }));
            },

            // AI UI
            openAIModal: (type, data = null) => set({
                aiModal: { isOpen: true, type, data }
            }),
            closeAIModal: () => set({
                aiModal: { isOpen: false, type: null, data: null }
            }),
        }),
        { name: 'FlowspaceStore' }
    )
);
