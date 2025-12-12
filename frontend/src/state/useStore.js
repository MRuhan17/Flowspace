import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { socketService } from '../socket/socket';

export const useStore = create(
    devtools(
        (set, get) => ({
            // --- State ---
            activeBoardId: 'default-room',
            toolMode: 'pen',
            brushColor: '#000000',
            brushSize: 5,
            isDrawing: false,
            isBoardLoading: true,
            layoutAnimation: null, // Holds { [id]: {x, y} }

            selectedObjectIds: [], // Currently selected element IDs

            strokes: [],
            undoStack: [], // We only track Ids or full snapshots locally? 
            // Note: Our backend handles authoritative undo/redo. 
            // Local stack is nice for optimistic UI, but complex to keep in sync.
            // We'll rely on server events for the main stack, 
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
            setIsBoardLoading: (isLoading) => set({ isBoardLoading: isLoading }),
            setLayoutAnimation: (data) => set({ layoutAnimation: data }),

            // Selection Actions
            selectOne: (id) => set({ selectedObjectIds: [id] }),
            selectMultiple: (ids) => set({ selectedObjectIds: ids }),
            toggleSelection: (id) => set((state) => {
                const isSelected = state.selectedObjectIds.includes(id);
                return {
                    selectedObjectIds: isSelected
                        ? state.selectedObjectIds.filter(sid => sid !== id)
                        : [...state.selectedObjectIds, id]
                };
            }),
            clearSelection: () => set({ selectedObjectIds: [] }),

            setActiveBoardId: (id) => set({ activeBoardId: id }),

            // Optimistic Add
            addStroke: (stroke) => {
                const { activeBoardId } = get();

                // Optimistic update
                set((state) => ({ strokes: [...state.strokes, stroke] }));

                // Emit
                socketService.sendStroke(activeBoardId, stroke);
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
                socketService.sendUndo(get().activeBoardId);
            },

            redo: () => {
                socketService.sendRedo(get().activeBoardId);
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
            // --- Node Graph Engine State ---
            nodes: [], // { id, type, x, y, w, h, data: {}, ports: { in:[], out:[] } }
            edges: [], // { id, source, sourceHandle, target, targetHandle }

            // Interaction State (Flow)
            connectionDraft: null, // { sourceId, sourceHandleId, mousePos: {x,y} }

            // Actions
            setNodes: (nodes) => set({ nodes }),
            setEdges: (edges) => set({ edges }),

            addNode: (node) => set(state => ({ nodes: [...state.nodes, node] })),

            updateNode: (id, updates) => set(state => ({
                nodes: state.nodes.map(n => n.id === id ? { ...n, ...updates } : n)
            })),

            removeNode: (id) => set(state => ({
                nodes: state.nodes.filter(n => n.id !== id),
                edges: state.edges.filter(e => e.source !== id && e.target !== id) // Cascade delete edges
            })),

            addEdge: (edge) => set(state => ({ edges: [...state.edges, edge] })),

            removeEdge: (id) => set(state => ({
                edges: state.edges.filter(e => e.id !== id)
            })),

            setConnectionDraft: (draft) => set({ connectionDraft: draft }),

            // Helper to get exact port coordinates (would typically need component refs, 
            // but we can compute relative to node if strict layout)
            // For now, visual components handle rendering.
        }),
        { name: 'FlowspaceStore' }
    )
);
