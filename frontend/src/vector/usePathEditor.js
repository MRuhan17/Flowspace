import { useState, useCallback } from 'react';
import { nanoid } from 'nanoid';

/**
 * usePathEditor
 * 
 * Logic hook for Vector Path Editing (Pen Tool).
 * Manages a list of anchor points with Bézier handles.
 */
export const usePathEditor = () => {
    const [points, setPoints] = useState([]);
    const [activePointId, setActivePointId] = useState(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isClosed, setIsClosed] = useState(false);

    // --- Helpers ---

    const createPoint = (x, y) => ({
        id: nanoid(),
        x, y,
        handleIn: { x, y },  // Default to same position (no curve)
        handleOut: { x, y }, // Default to same position (no curve)
        isCurve: false       // Corner by default until handles dragged
    });

    // --- Core Actions ---

    /**
     * Start a new path at x, y
     */
    const startPath = useCallback((x, y) => {
        const firstPoint = createPoint(x, y);
        setPoints([firstPoint]);
        setActivePointId(firstPoint.id);
        setIsDrawing(true);
        setIsClosed(false);
        return firstPoint.id;
    }, []);

    /**
     * Add a new point to the path. 
     * If currently drawing, appends to end.
     * Use this on MouseDown.
     */
    const addPoint = useCallback((x, y) => {
        const newPoint = createPoint(x, y);
        setPoints(prev => [...prev, newPoint]);
        setActivePointId(newPoint.id);
        return newPoint.id;
    }, []);

    /**
     * Update handles for smoothing/curving.
     * Typically used during "drag to curve" interaction.
     * @param {string} pointId 
     * @param {object} pos {x,y} - New handle position (usually handleOut)
     * @param {string} type 'in' | 'out' | 'symmetric' (mirrors other handle)
     */
    const updateHandle = useCallback((pointId, { x, y }, type = 'symmetric') => {
        setPoints(prev => prev.map(p => {
            if (p.id !== pointId) return p;

            const main = { x: p.x, y: p.y };
            let newHandleIn = { ...p.handleIn };
            let newHandleOut = { ...p.handleOut };

            // Logic for symmetric mirroring
            // If we move HandleOut, HandleIn moves opposite relative to Anchor
            if (type === 'symmetric' || type === 'out') {
                newHandleOut = { x, y }; // Set absolute pos
                if (type === 'symmetric') {
                    // Mirror handleIn
                    // dx = main.x - handleOut.x
                    // dy = main.y - handleOut.y
                    // handleIn = main + d
                    const dx = main.x - x;
                    const dy = main.y - y;
                    newHandleIn = { x: main.x + dx, y: main.y + dy };
                }
            } else if (type === 'in') {
                newHandleIn = { x, y };
                // Mirror handleOut if needed? Usually we break symmetry if updating specifically 'in' unless stated
                // But for "drag to curve" on creation, we usually want symmetry.
            }

            return {
                ...p,
                handleIn: newHandleIn,
                handleOut: newHandleOut,
                isCurve: type === 'symmetric' // Mark as curve
            };
        }));
    }, []);

    /**
     * Move the main anchor point (and handles follow).
     */
    const moveAnchor = useCallback((pointId, dx, dy) => {
        setPoints(prev => prev.map(p => {
            if (p.id !== pointId) return p;
            return {
                ...p,
                x: p.x + dx,
                y: p.y + dy,
                handleIn: { x: p.handleIn.x + dx, y: p.handleIn.y + dy },
                handleOut: { x: p.handleOut.x + dx, y: p.handleOut.y + dy }
            };
        }));
    }, []);

    /**
     * Select a specific anchor point for editing.
     */
    const selectAnchor = useCallback((id) => {
        setActivePointId(id);
    }, []);

    /**
     * Finish path creation.
     * @param {boolean} closePath - Whether to connect last point to first
     */
    const finishPath = useCallback((closePath = false) => {
        setIsDrawing(false);
        setIsClosed(closePath);

        // Return export data immediately if needed
        return {
            points,
            isClosed: closePath
        };
    }, [points]);

    /**
     * Export current path to SVG path data string (d attribute).
     */
    const getSvgPathData = useCallback(() => {
        if (points.length === 0) return '';

        let d = `M ${points[0].x} ${points[0].y}`;

        for (let i = 1; i < points.length; i++) {
            const p1 = points[i - 1]; // Previous point
            const p2 = points[i];     // Current point

            // Cubic Bezier: C cp1x cp1y, cp2x cp2y, x y
            // Control Point 1 is p1.handleOut
            // Control Point 2 is p2.handleIn
            d += ` C ${p1.handleOut.x} ${p1.handleOut.y}, ${p2.handleIn.x} ${p2.handleIn.y}, ${p2.x} ${p2.y}`;
        }

        if (isClosed) {
            // Close loop: C last.handleOut, first.handleIn, first.x first.y
            const last = points[points.length - 1];
            const first = points[0];
            d += ` C ${last.handleOut.x} ${last.handleOut.y}, ${first.handleIn.x} ${first.handleIn.y}, ${first.x} ${first.y} Z`;
        }

        return d;
    }, [points, isClosed]);

    return {
        pathPoints: points,
        activePointId,
        isDrawing,
        startPath,
        addPoint,
        updateHandle,
        moveAnchor,
        selectAnchor,
        finishPath,
        getSvgPathData
    };
};
