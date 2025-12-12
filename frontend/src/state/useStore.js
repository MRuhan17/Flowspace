import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { socketService } from '../socket/socket';
import { nanoid } from 'nanoid';

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
            isAiAssistantOpen: false,
            stageRef: null, // Konva Stage Ref for Export


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
            toggleAiAssistant: () => set(state => ({ isAiAssistantOpen: !state.isAiAssistantOpen })),
            setStageRef: (ref) => set({ stageRef: ref }),

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
                socketService.sendNodeAdd(activeBoardId, { ...node, type: 'node' });
            },

            addEdge: (edge) => {
                const { activeBoardId } = get();
                set(state => ({ edges: [...state.edges, edge] }));
                socketService.sendConnectorAdd(activeBoardId, { ...edge, type: 'edge' });
            },

            updateNode: (id, updates) => {
                const { activeBoardId, nodes } = get();
                set(state => ({
                    nodes: state.nodes.map(n => n.id === id ? { ...n, ...updates } : n)
                }));
                // Emit update
                // construct full node or partial? Backend addOperation replaces element currently.
                // Optimally we send delta, but let's send full merged object for safety if backend replaces.
                // Or send just updates if we add specific 'node-update' handler that merges.
                // Current backend 'draw-stroke' replaced.
                // New 'node-update' should probably merge.
                // Let's assume we send the updated node object.
                const updatedNode = nodes.find(n => n.id === id); // This is OLD state before set.
                // We need new state.
                const newNode = { ...updatedNode, ...updates };
                socketService.sendNodeUpdate(activeBoardId, newNode);
            },

            updateEdge: (id, updates) => {
                const { activeBoardId, edges } = get();
                set(state => ({
                    edges: state.edges.map(e => e.id === id ? { ...e, ...updates } : e)
                }));
                const updatedEdge = edges.find(e => e.id === id);
                const newEdge = { ...updatedEdge, ...updates };
                socketService.sendConnectorUpdate(activeBoardId, newEdge);
            },

            // --- Structural Actions (Lock, Group, Z-Index) ---

            toggleLock: (ids, lockedState) => {
                const { updateNode, updateEdge } = get(); // reuse existing optimistic+socket logic? 
                // Currently updateNode updates 1 node.
                // We need bulk update?
                // For simplicity, iterate.
                ids.forEach(id => {
                    // Check type?
                    const { nodes, edges, strokes } = get();
                    if (nodes.find(n => n.id === id)) updateNode(id, { locked: lockedState });
                    // Edges/Strokes update logic?
                    // We need generic updateElement or reuse specific ones.
                    // Strokes are in 'strokes' array but valid logic.
                    // Let's implement generic local update for now?
                });
            },

            updateZIndex: (id, direction) => {
                const { nodes, activeBoardId } = get();
                const node = nodes.find(n => n.id === id);
                if (!node) return;

                // Simple logic: sort by zIndex.
                // Front: set zIndex to max + 1
                // Back: set zIndex to min - 1
                const allZ = nodes.map(n => n.zIndex || 0);
                const currentZ = node.zIndex || 0;
                let newZ = currentZ;

                if (direction === 'front') newZ = Math.max(...allZ, 0) + 1;
                else if (direction === 'back') newZ = Math.min(...allZ, 0) - 1;

                get().updateNode(id, { zIndex: newZ });
            },

            groupElements: (ids) => {
                const groupId = nanoid(); // We need to import nanoid
                // Update all items with groupId
                ids.forEach(id => get().updateNode(id, { groupId })); // Only nodes for now?
            },

            // For dragging, we likely use 'layout-update' which is bulk/efficient
            // The DragEnd handler in useFlowEngine should call a sync method.

            receiveElement: (element) => {
                set(state => {
                    if (element.type === 'node') {
                        const exists = state.nodes.some(n => n.id === element.id);
                        return {
                            nodes: exists
                                ? state.nodes.map(n => n.id === element.id ? element : n)
                                : [...state.nodes, element]
                        };
                    }
                    if (element.type === 'edge') {
                        const exists = state.edges.some(e => e.id === element.id);
                        return {
                            edges: exists
                                ? state.edges.map(e => e.id === element.id ? element : e)
                                : [...state.edges, element]
                        };
                    }
                    // Stroke
                    const exists = state.strokes.some(s => s.id === element.id);
                    return {
                        strokes: exists
                            ? state.strokes.map(s => s.id === element.id ? element : s)
                            : [...state.strokes, element]
                    };
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
