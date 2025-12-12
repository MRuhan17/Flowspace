import { useCallback } from 'react';
import { useStore } from '../../state/useStore';
import { nanoid } from 'nanoid';

const HEADER_HEIGHT = 40;
const NODE_WIDTH = 160;

export const useFlowEngine = () => {
    const {
        nodes, edges, connectionDraft,
        updateNode, addEdge, setConnectionDraft
    } = useStore();

    // Helper: Compute absolute port position
    const getPortPosition = useCallback((nodeId, handleId, type) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return { x: 0, y: 0 };

        const list = type === 'input' ? node.inputs : node.outputs;
        const index = list.findIndex(p => p.id === handleId);
        if (index === -1) return { x: 0, y: 0 };

        const yOffset = HEADER_HEIGHT + 20 + index * 30;
        const xOffset = type === 'input' ? 0 : NODE_WIDTH;

        return {
            x: node.x + xOffset,
            y: node.y + yOffset
        };
    }, [nodes]);

    // Handlers
    const handleNodeDragMove = useCallback((id, x, y) => {
        // Optimistic update for smooth lines
        // In a high-perf scenario, we might stick to local state until drag end
        // But for <100 nodes, Zustand updates are likely fine if specific selectors are used.
        // Or we rely on Konva's internal state and only update edges?
        // Updating store will trigger re-render of everything dependent on nodes.
        // We might want to throttle this or just let Konva handle the Node and we manualy update connected edges?

        // For simplicity: Update store. React-Konva is fast.
        updateNode(id, { x, y });
    }, [updateNode]);

    const handleNodeDragEnd = useCallback((id, x, y) => {
        updateNode(id, { x, y });
        // Emit sync event here (TODO)
    }, [updateNode]);

    const handlePortDown = useCallback((nodeId, handleId, absolutePos) => {
        setConnectionDraft({
            sourceId: nodeId,
            sourceHandle: handleId,
            mousePos: absolutePos
        });
    }, [setConnectionDraft]);

    const handlePortUp = useCallback((e, nodeId, handleId, type) => {
        const draft = useStore.getState().connectionDraft;
        if (!draft) return;

        if (draft.sourceId === nodeId) return; // Self connection check (basic)

        // Create Edge
        const newEdge = {
            id: nanoid(),
            source: draft.sourceId,
            sourceHandle: draft.sourceHandle,
            target: nodeId,
            targetHandle: handleId
        };

        addEdge(newEdge);
        setConnectionDraft(null);
    }, [addEdge, setConnectionDraft]);

    const handleMouseMove = useCallback((e) => {
        const draft = useStore.getState().connectionDraft;
        if (!draft) return;

        const stage = e.target.getStage();
        const pos = stage.getPointerPosition();

        // Update draft mouse pos only
        // We avoid full re-render by only updating the Draft object
        // Actually, we need to update state to trigger re-render of the draft line
        setConnectionDraft({ ...draft, mousePos: pos });
    }, [setConnectionDraft]);

    const handleMouseUp = useCallback(() => {
        // If we release mouse anywhere not on a port, cancel draft
        // The PortUp handler stops propagation presumably, or we check if we hit something?
        // PortUp runs BEFORE Stage MouseUp if properly layered.

        // We'll delay clearing to allow PortUp to fire first
        setTimeout(() => {
            if (useStore.getState().connectionDraft) {
                setConnectionDraft(null);
            }
        }, 10);
    }, [setConnectionDraft]);

    return {
        nodes,
        edges,
        connectionDraft,
        getPortPosition,
        handlers: {
            onNodeDragMove: handleNodeDragMove,
            onNodeDragEnd: handleNodeDragEnd,
            onPortDown: handlePortDown,
            onPortUp: handlePortUp,
            onMouseMove: handleMouseMove,
            onMouseUp: handleMouseUp
        }
    };
};
