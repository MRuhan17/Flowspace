import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import { useBoardStore } from '../../state/boardStore';
import { nanoid } from 'nanoid';
import { useSocketEvents } from '../../hooks/useSocket';

export const CanvasBoard = () => {
    const {
        tool,
        color,
        strokeWidth,
        strokes,
        addStroke,
        setStrokes,
        receiveStroke,
        roomId
    } = useBoardStore();

    const isDrawing = useRef(false);

    // Connect socket listeners
    useSocketEvents(roomId, {
        onInit: (serverStrokes) => {
            console.log('Board initialized with', serverStrokes.length, 'strokes');
            setStrokes(serverStrokes);
        },
        onDraw: (stroke) => {
            receiveStroke(stroke);
        },
        onSync: (serverStrokes) => {
            console.log('Full sync received');
            setStrokes(serverStrokes);
        }
    });

    const handleMouseDown = (e) => {
        isDrawing.current = true;
        const pos = e.target.getStage().getPointerPosition();

        // Create a new stroke locally immediately (for smoothness)
        // But we won't add it to main "strokes" until mouse up? 
        // Or we add it as a "currentStroke"?
        // For simplicity in this iteration: We add to main state but update point by point?
        // Actually, updating main state 60fps is fine with Konva.

        const newStroke = {
            id: nanoid(),
            tool,
            color,
            strokeWidth,
            points: [pos.x, pos.y],
        };

        addStroke(newStroke);
    };

    const handleMouseMove = (e) => {
        // This is tricky with the simple "addStroke" model which pushes a WHOLE stroke.
        // We need a "current stroke" state that is mutable, then finalized on mouse up.
        // Implementation Plan:
        // 1. MouseDown: Start 'currentStroke' in local state.
        // 2. MouseMove: Append points to 'currentStroke'.
        // 3. MouseUp: Finalize 'currentStroke', push to store (which emits to socket).

        if (!isDrawing.current) return;
        const stage = e.target.getStage();
        const point = stage.getPointerPosition();

        // For this demo, we will mutate the LAST stroke in the store if it matches our session?
        // That gets messy reacting to redux/zustand state updates on every pixel.

        // Better: Local state for drawing, only commit to store on MouseUp.
        // BUT: User wants to see line as they draw.

        // Let's modify the store to support "updateLastStroke"
        // But wait, "addStroke" in store emits to socket. We don't want to emit every pixel.
        // So:
        // 1. MouseDown -> create local `currentLine`.
        // 2. MouseMove -> update local `currentLine`.
        // 3. Render `currentLine` on top of `strokes`.
        // 4. MouseUp -> call `addStroke(currentLine)`.

        setLocalPoints(prev => [...prev, point.x, point.y]);
    };

    // Local ephemeral state for the line currently being drawn
    const [localPoints, setLocalPoints] = useState([]);
    const [isDrawingState, setIsDrawingState] = useState(false);

    const handleStageMouseDown = (e) => {
        isDrawing.current = true;
        setIsDrawingState(true);
        const pos = e.target.getStage().getPointerPosition();
        setLocalPoints([pos.x, pos.y]);
    };

    const handleStageMouseMove = (e) => {
        if (!isDrawing.current) return;
        const stage = e.target.getStage();
        const point = stage.getPointerPosition();
        setLocalPoints(prev => [...prev, point.x, point.y]);
    };

    const handleStageMouseUp = () => {
        if (!isDrawing.current) return;
        isDrawing.current = false;
        setIsDrawingState(false);

        if (localPoints.length > 0) {
            const finalStroke = {
                id: nanoid(),
                tool,
                color,
                strokeWidth,
                points: localPoints
            };
            addStroke(finalStroke);
            setLocalPoints([]);
        }
    };

    return (
        <div className="w-full h-screen bg-gray-50 overflow-hidden">
            <Stage
                width={window.innerWidth}
                height={window.innerHeight}
                onMouseDown={handleStageMouseDown}
                onMouseMove={handleStageMouseMove}
                onMouseUp={handleStageMouseUp}
                onTouchStart={handleStageMouseDown}
                onTouchMove={handleStageMouseMove}
                onTouchEnd={handleStageMouseUp}
            >
                <Layer>
                    {/* Render committed strokes */}
                    {strokes.map((stroke, i) => (
                        <Line
                            key={stroke.id || i}
                            points={stroke.points}
                            stroke={stroke.color}
                            strokeWidth={stroke.strokeWidth}
                            tension={0.5}
                            lineCap="round"
                            lineJoin="round"
                        />
                    ))}

                    {/* Render current stroke being drawn */}
                    {isDrawingState && (
                        <Line
                            points={localPoints}
                            stroke={color}
                            strokeWidth={strokeWidth}
                            tension={0.5}
                            lineCap="round"
                            lineJoin="round"
                        />
                    )}
                </Layer>
            </Stage>
        </div>
    );
};
