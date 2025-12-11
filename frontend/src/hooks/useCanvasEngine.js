import { useRef, useState, useCallback } from 'react';
import { useStore } from '../state/useStore';
import { nanoid } from 'nanoid';
import throttle from 'lodash/throttle';

/**
 * Manages the drawing engine logic:
 * - Pointer events -> Points
 * - Stroke Lifecycle (Start, Move, End)
 * - Interpolation / Smoothing
 */
export const useCanvasEngine = () => {
    // Access Store
    const {
        toolMode,
        brushColor,
        brushSize,
        addStroke,
        // We might access strokes here if we were doing imperative rendering
        // but Konva handles rendering via props.
    } = useStore();

    const isDrawing = useRef(false);
    const [currentStroke, setCurrentStroke] = useState(null); // { points: [], color, size, tool }

    // Throttled cursor emitter (if we wanted to move it here, but store handles it too)

    const startStroke = useCallback((x, y) => {
        isDrawing.current = true;
        setCurrentStroke({
            points: [x, y],
            color: brushColor,
            strokeWidth: brushSize,
            tool: toolMode
        });
    }, [brushColor, brushSize, toolMode]);

    const moveStroke = useCallback((x, y) => {
        if (!isDrawing.current) return;

        setCurrentStroke(prev => {
            if (!prev) return null;
            // Simple line limit optimization could go here
            return {
                ...prev,
                points: [...prev.points, x, y]
            };
        });
    }, []);

    const endStroke = useCallback(() => {
        if (!isDrawing.current) return;
        isDrawing.current = false;

        setCurrentStroke(prev => {
            if (prev && prev.points.length > 2) {
                // Determine if we need to smooth?
                // For now, commit raw points. 
                // Bezier smoothing is typically done at render time (Konva tension)
                // or via a dedicated smoother algorithm before commit.

                const finalStroke = {
                    id: nanoid(),
                    tool: prev.tool,
                    color: prev.color,
                    strokeWidth: prev.strokeWidth,
                    points: prev.points
                };

                // Commit entire stroke to store
                addStroke(finalStroke);
            }
            return null;
        });
    }, [addStroke]);

    // Helpers for event handlers
    const handleStageMouseDown = (e) => {
        // Only left click
        if (e.evt.button !== 0) return;

        const pos = e.target.getStage().getPointerPosition();
        startStroke(pos.x, pos.y);
    };

    const handleStageMouseMove = (e) => {
        if (!isDrawing.current) return;
        const pos = e.target.getStage().getPointerPosition();
        moveStroke(pos.x, pos.y);
    };

    const handleStageMouseUp = () => {
        endStroke();
    };

    return {
        currentStroke,
        handlers: {
            onMouseDown: handleStageMouseDown,
            onMouseMove: handleStageMouseMove,
            onMouseUp: handleStageMouseUp,
            onMouseLeave: handleStageMouseUp,
            onTouchStart: handleStageMouseDown,
            onTouchMove: handleStageMouseMove,
            onTouchEnd: handleStageMouseUp
        }
    };
};
