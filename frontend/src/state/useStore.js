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
            nodes: [],
            edges: [],
            connectionDraft: null,

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

            // Unified State Setter
            setBoardElements: (elements) => {
                const strokes = [];
                const nodes = [];
                const edges = [];

                elements.forEach(el => {
                    if (el.type === 'node') nodes.push(el);
                    else if (el.type === 'edge') edges.push(el);
                    else strokes.push(el); // Default to stroke
                });

                set({ strokes, nodes, edges });
            },

            addNode: (node) => {
                const { activeBoardId } = get();
                // Optimistic
                set(state => ({ nodes: [...state.nodes, node] }));
                // Emit
                socketService.sendStroke(activeBoardId, { ...node, type: 'node' });
            },

            addEdge: (edge) => {
                const { activeBoardId } = get();
                set(state => ({ edges: [...state.edges, edge] }));
                socketService.sendStroke(activeBoardId, { ...edge, type: 'edge' });
            },

            updateNode: (id, updates) => {
                set(state => ({
                    nodes: state.nodes.map(n => n.id === id ? { ...n, ...updates } : n)
                }));
                // We don't emit continuously here (handled by DragEnd usually), 
                // but for non-drag updates we might want to.
            },

            // For dragging, we likely use 'layout-update' which is bulk/efficient
            // The DragEnd handler in useFlowEngine should call a sync method.

            receiveElement: (element) => {
                set(state => {
                    if (element.type === 'node') {
                        if (state.nodes.some(n => n.id === element.id)) return state;
                        return { nodes: [...state.nodes, element] };
                    }
                    if (element.type === 'edge') {
                        if (state.edges.some(e => e.id === element.id)) return state;
                        return { edges: [...state.edges, element] };
                    }
                    // Stroke
                    if (state.strokes.some(s => s.id === element.id)) return state;
                    return { strokes: [...state.strokes, element] };
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
            // State initialization moved to top or kept here (valid but messy).
            // Let's remove duplicates.

            // Actions
            setNodes: (nodes) => set({ nodes }),
            setEdges: (edges) => set({ edges }),

            removeNode: (id) => set(state => ({
                nodes: state.nodes.filter(n => n.id !== id),
                edges: state.edges.filter(e => e.source !== id && e.target !== id) // Cascade delete edges
            })),

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
