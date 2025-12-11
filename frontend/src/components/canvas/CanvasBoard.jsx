import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import { useBoardStore } from '../../state/boardStore';
import { nanoid } from 'nanoid';
import { useSocketEvents } from '../../hooks/useSocket';
import throttle from 'lodash/throttle';

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
    const stageRef = useRef(null);
    const [currentPoints, setCurrentPoints] = useState([]);

    // Optimistic cursor tracking (throttled)
    const emitCursorMove = useCallback(throttle((x, y) => {
        // Future: emit 'cursor-move' via socket
    }, 50), []);

    // Socket Integration
    useSocketEvents(roomId, {
        onInit: (serverStrokes) => {
            setStrokes(serverStrokes);
        },
        onDraw: (stroke) => {
            receiveStroke(stroke);
        },
        onSync: (serverStrokes) => {
            setStrokes(serverStrokes);
        }
    });

    const handleMouseDown = (e) => {
        isDrawing.current = true;
        const pos = e.target.getStage().getPointerPosition();
        setCurrentPoints([pos.x, pos.y]);
    };

    const handleMouseMove = (e) => {
        // Emit cursor position independent of drawing
        const stage = e.target.getStage();
        const point = stage.getPointerPosition();
        emitCursorMove(point.x, point.y);

        if (!isDrawing.current) return;

        // Append points to local buffer
        setCurrentPoints(prev => [...prev, point.x, point.y]);
    };

    const handleMouseUp = () => {
        if (!isDrawing.current) return;
        isDrawing.current = false;

        if (currentPoints.length > 0) {
            const finalStroke = {
                id: nanoid(),
                tool,
                color,
                strokeWidth,
                points: currentPoints
            };

            // Commit to store (and emit to server)
            addStroke(finalStroke);

            // Clear local buffer
            setCurrentPoints([]);
        }
    };

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
                  Optimization: Split into two layers.
                  Layer 1: Committed strokes (Static-ish). React-Konva handles diffing.
                  Layer 2: Active drawing (Dynamic, frequent updates).
                */}
                <Layer>
                    {strokes.map((stroke, i) => (
                        <Line
                            key={stroke.id || i}
                            points={stroke.points}
                            stroke={stroke.color}
                            strokeWidth={stroke.strokeWidth}
                            tension={0.5}
                            lineCap="round"
                            lineJoin="round"
                            globalCompositeOperation={
                                stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
                            }
                        />
                    ))}
                </Layer>

                <Layer>
                    {currentPoints.length > 0 && (
                        <Line
                            points={currentPoints}
                            stroke={tool === 'eraser' ? '#ffffff' : color} // Eraser preview as white or outline? 
                            // Actual eraser logic needs destination-out, but that requires being on the same layer to erase.
                            // For preview, we might just draw white or a specific indicator.
                            // If we want true erasure during draw, we need to put this Line in the main Layer with composite usage.
                            // For simplicity in preview: Use color or gray for eraser path.
                            strokeWidth={strokeWidth}
                            tension={0.5}
                            lineCap="round"
                            lineJoin="round"
                            opacity={tool === 'eraser' ? 0.5 : 1}
                        />
                    )}
                </Layer>
            </Stage>
        </div>
    );
};
