import React, { useRef, useState, useCallback, useMemo } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import { useStore } from '../../state/useStore';
import { nanoid } from 'nanoid';
// import { useSocketEvents } from '../../hooks/useSocket'; // Handled globally in App now
import throttle from 'lodash/throttle';

// Optimized Stroke Component
const Stroke = React.memo(({ stroke }) => (
    <Line
        points={stroke.points}
        stroke={stroke.color}
        strokeWidth={stroke.strokeWidth}
        tension={0.5}
        lineCap="round"
        lineJoin="round"
        globalCompositeOperation={
            stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
        }
        // Performance settings
        perfectDrawEnabled={false}
        shadowForStrokeEnabled={false}
        hitStrokeWidth={0} // Disable hit detection for drawing strokes (performance)
        listening={false} // Don't listen to events on individual lines
    />
));

export const CanvasBoard = () => {
    // Select strictly necessary state to minimize re-renders
    const tool = useStore(state => state.toolMode);
    const color = useStore(state => state.brushColor);
    const strokeWidth = useStore(state => state.brushSize);
    const strokes = useStore(state => state.strokes);
    const addStroke = useStore(state => state.addStroke);
    const updateCursor = useStore(state => state.updateCursor);
    const activeBoardId = useStore(state => state.activeBoardId); // Used for cursor emission context

    const isDrawing = useRef(false);
    const stageRef = useRef(null);

    // Local state for the stroke currently being drawn
    // We keep this local to avoid global store thrashing during 60fps drawing
    const [currentPoints, setCurrentPoints] = useState([]);

    // Throttled cursor tracking
    // Using useRef to persist the throttled function across renders
    const throttledEmitCursor = useRef(
        throttle((roomId, x, y) => {
            // In a real app, we emit via socket here.
            // Since useSocketListeners handles incoming, we need a way to emit outgoing.
            // For now, we update local store for self-cursor or strictly emit.
            // To keep this component clean, we assume the 'socketService' is imported if we want direct emit,
            // or we use a store action `updateMyCursor`.
            // Let's use the store action if it existed, or direct socket import.
            // For now, minimal overhead:
            import('../../socket/socket').then(({ socketService }) => {
                socketService.sendCursor(roomId, x, y);
            });
        }, 100) // 100ms throttle is sufficient for cursors
    ).current;


    const handleMouseDown = useCallback((e) => {
        isDrawing.current = true;
        const pos = e.target.getStage().getPointerPosition();
        setCurrentPoints([pos.x, pos.y]);
    }, []);

    const handleMouseMove = useCallback((e) => {
        const stage = e.target.getStage();
        const point = stage.getPointerPosition();

        // Emit cursor
        throttledEmitCursor(activeBoardId, point.x, point.y);

        if (!isDrawing.current) return;

        // Append points to local state
        // Functional update is safer for frequent updates
        setCurrentPoints(prev => prev.concat([point.x, point.y]));
    }, [activeBoardId, throttledEmitCursor]);

    const handleMouseUp = useCallback(() => {
        if (!isDrawing.current) return;
        isDrawing.current = false;

        setCurrentPoints(prevPoints => {
            if (prevPoints.length > 0) {
                const finalStroke = {
                    id: nanoid(),
                    tool,
                    color,
                    strokeWidth,
                    points: prevPoints
                };

                // Commit to store
                addStroke(finalStroke);
            }
            return [];
        });
    }, [tool, color, strokeWidth, addStroke]);

    // Cleanup throttled function on unmount
    React.useEffect(() => {
        return () => throttledEmitCursor.cancel();
    }, [throttledEmitCursor]);

    // Memoize the strokes layer to prevent re-rendering all lines when only `currentPoints` changes.
    // However, `strokes` array changes when we add a stroke.
    // React.memo on Stroke component handles efficient diffing.

    return (
        <div className="w-full h-screen bg-gray-50 overflow-hidden">
            <Stage
                ref={stageRef}
                width={window.innerWidth}
                height={window.innerHeight}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchMove={handleMouseMove}
                onTouchEnd={handleMouseUp}
            >
                {/* 
                   Layer 1: Committed Strokes 
                   This layer updates only when `strokes` array changes.
                */}
                <Layer>
                    {strokes.map((stroke) => (
                        <Stroke key={stroke.id} stroke={stroke} />
                    ))}
                </Layer>

                {/* 
                   Layer 2: Active Drawing
                   This layer updates on every mouse move during drawing.
                   Separating it keeps the static strokes from re-rendering/re-painting.
                */}
                <Layer>
                    {currentPoints.length > 0 && (
                        <Line
                            points={currentPoints}
                            stroke={tool === 'eraser' ? '#999' : color}
                            strokeWidth={strokeWidth}
                            tension={0.5}
                            lineCap="round"
                            lineJoin="round"
                            opacity={tool === 'eraser' ? 0.5 : 1}
                            listening={false}
                            perfectDrawEnabled={false}
                        />
                    )}
                </Layer>
            </Stage>
        </div>
    );
};
