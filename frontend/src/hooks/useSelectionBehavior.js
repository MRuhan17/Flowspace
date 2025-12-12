import { useRef, useState, useCallback, useEffect } from 'react';
import { useStore } from '../state/useStore';
import { TOOLS } from '../utils/constants';

/**
 * Hook for managing selection interactions (Click, Drag Marquee, Shift+Click)
 */
export const useSelectionBehavior = (stageRef) => {
    const isSelecting = useRef(false);
    const selectionStart = useRef({ x: 0, y: 0 });
    const [selectionBox, setSelectionBox] = useState(null); // { x, y, width, height }

    const {
        toolMode,
        selectOne,
        selectMultiple,
        toggleSelection,
        clearSelection,
        strokes,
        selectedObjectIds
    } = useStore();

    // Helper: Check if stroke is inside selection box
    const isStrokeInBox = (stroke, box) => {
        // Simple bounding box check
        const xs = stroke.points.filter((_, i) => i % 2 === 0);
        const ys = stroke.points.filter((_, i) => i % 2 !== 0);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        return (
            minX >= box.x &&
            maxX <= box.x + box.width &&
            minY >= box.y &&
            maxY <= box.y + box.height
        );
    };

    const handleMouseDown = useCallback((e) => {
        if (toolMode !== TOOLS.SELECT) return;

        // If clicked on empty stage vs object
        const clickedOnEmpty = e.target === e.target.getStage();
        const pos = e.target.getStage().getPointerPosition();

        // 1. Check if we hit an object (Konva handles hit detection)
        // If we clicked a Shape (not Stage), select it.
        if (!clickedOnEmpty) {
            // Find the parent Node (Stroke) ID
            // Ideally shapes have ID. 
            // e.target is the Line shape. Its ID is the stroke ID.
            const targetId = e.target.id();

            if (targetId) {
                if (e.evt.shiftKey) {
                    toggleSelection(targetId);
                } else {
                    // If already selected, do nothing (to allow drag start later)
                    if (!selectedObjectIds.includes(targetId)) {
                        selectOne(targetId);
                    }
                }
                return; // Don't start marquee box if we clicked an object
            }
        }

        // 2. Start Marquee Selection (Empty space click)
        isSelecting.current = true;
        selectionStart.current = pos;

        if (!e.evt.shiftKey) {
            clearSelection();
        }
    }, [toolMode, toggleSelection, selectOne, clearSelection, selectedObjectIds]);

    const handleMouseMove = useCallback((e) => {
        if (!isSelecting.current || toolMode !== TOOLS.SELECT) return;

        const stage = e.target.getStage();
        const pointer = stage.getPointerPosition();

        const x = Math.min(selectionStart.current.x, pointer.x);
        const y = Math.min(selectionStart.current.y, pointer.y);
        const width = Math.abs(pointer.x - selectionStart.current.x);
        const height = Math.abs(pointer.y - selectionStart.current.y);

        setSelectionBox({ x, y, width, height });
    }, [toolMode]);

    const handleMouseUp = useCallback(() => {
        if (isSelecting.current && toolMode === TOOLS.SELECT && selectionBox) {
            // Calculate final selection
            const foundIds = strokes.filter(s => isStrokeInBox(s, selectionBox)).map(s => s.id);

            // If shift held, merge? The current logic is basic replacement or add?
            // Let's implement ADDitive if shift was held (we cleared on start if not)
            // But we already cleared on Mousedown if no shift.
            // So foundIds is the new set to add.

            if (foundIds.length > 0) {
                // We need to act differently based on Shift, but let's assume replacement for marquee for now
                // or merge if we want Figma style.
                // Since we cleared on MouseDown (if no shift), we can just set these.
                // Actually, if Shift WAS held, we didn't clear. So we should ADD foundIds.
                // We don't have access to 'shiftKey' state here easily without the event.
                // So we assume additive if selectedObjectIds > 0 ? No.
                // Let's stick to: Marquee selects whatever is inside.
                selectMultiple(foundIds);
            }
        }

        isSelecting.current = false;
        setSelectionBox(null);
    }, [toolMode, selectionBox, strokes, selectMultiple]);

    return {
        selectionHandlers: {
            onMouseDown: handleMouseDown,
            onMouseMove: handleMouseMove,
            onMouseUp: handleMouseUp,
        },
        selectionBox
    };
};
