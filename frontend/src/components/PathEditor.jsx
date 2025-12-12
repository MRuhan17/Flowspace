import React, { useEffect, useMemo } from 'react';
import { Group, Path, Circle, Line } from 'react-konva';
import { usePathEditor } from '../vector/usePathEditor';
import { theme } from '../utils/theme';

/**
 * PathEditor
 * 
 * A UI component for editing vector paths using Konva.
 * It visualizes the path, anchors, and Bézier handles.
 * 
 * Props:
 * - onFinish: (pathData) => void
 * - initialStartPos: {x, y} (Optional) to auto-start path
 */
export const PathEditor = ({ onFinish, initialStartPos }) => {
    const {
        pathPoints,
        startPath,
        addPoint,
        updateHandle,
        moveAnchor,
        selectAnchor,
        finishPath,
        getSvgPathData,
        activePointId,
        isDrawing
    } = usePathEditor();

    // Auto-start if requested
    useEffect(() => {
        if (initialStartPos && pathPoints.length === 0) {
            startPath(initialStartPos.x, initialStartPos.y);
        }
    }, [initialStartPos, startPath, pathPoints.length]);

    // Handle Global Key Events (e.g. Enter to finish)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                const d = getSvgPathData();
                const isClosed = false; // logic to detect close? or just finish open
                const data = finishPath(isClosed);
                if (onFinish) onFinish({ d, ...data });
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [finishPath, getSvgPathData, onFinish]);

    // Derived Path Data
    const pathData = useMemo(() => getSvgPathData(), [getSvgPathData]);

    const activePoint = pathPoints.find(p => p.id === activePointId);

    // Render Logic
    return (
        <Group>
            {/* The Vector Path */}
            <Path
                data={pathData}
                stroke={theme.colors.primary}
                strokeWidth={2}
                fill="transparent"
                lineCap="round"
                lineJoin="round"
            />

            {/* Anchors & Handles */}
            {pathPoints.map((point) => {
                const isActive = point.id === activePointId;

                return (
                    <Group key={point.id}>
                        {/* Control Handles (Only show for active point or if curve) */}
                        {/* Actually, Pen tool usually shows handles for active point */}
                        {isActive && (
                            <>
                                {/* Handle In Line */}
                                <Line
                                    points={[point.handleIn.x, point.handleIn.y, point.x, point.y]}
                                    stroke={theme.colors.textSubtle}
                                    strokeWidth={1}
                                />
                                {/* Handle Out Line */}
                                <Line
                                    points={[point.x, point.y, point.handleOut.x, point.handleOut.y]}
                                    stroke={theme.colors.textSubtle}
                                    strokeWidth={1}
                                />
                                {/* Handle In Knob */}
                                <Circle
                                    x={point.handleIn.x}
                                    y={point.handleIn.y}
                                    radius={4}
                                    fill={theme.colors.bg}
                                    stroke={theme.colors.primary}
                                    draggable
                                    onDragMove={(e) => {
                                        updateHandle(point.id, { x: e.target.x(), y: e.target.y() }, 'in');
                                    }}
                                />
                                {/* Handle Out Knob */}
                                <Circle
                                    x={point.handleOut.x}
                                    y={point.handleOut.y}
                                    radius={4}
                                    fill={theme.colors.bg}
                                    stroke={theme.colors.primary}
                                    draggable
                                    onDragMove={(e) => {
                                        updateHandle(point.id, { x: e.target.x(), y: e.target.y() }, 'symmetric');
                                    }}
                                />
                            </>
                        )}

                        {/* Anchor Point */}
                        <Circle
                            x={point.x}
                            y={point.y}
                            radius={isActive ? 6 : 4}
                            fill={isActive ? theme.colors.primary : theme.colors.bg}
                            stroke={theme.colors.primary}
                            strokeWidth={2}
                            draggable
                            onDragMove={(e) => {
                                const dx = e.target.x() - point.x;
                                const dy = e.target.y() - point.y;
                                moveAnchor(point.id, dx, dy);
                            }}
                            onClick={(e) => {
                                e.cancelBubble = true;
                                selectAnchor(point.id);
                            }}
                        />
                    </Group>
                );
            })}

            {/* Click Stage to Add Point (Handled by parent Board usually?) */}
            {/* If PathEditor is active, it should probably capture clicks? */}
            {/* Implemented as an invisible rect overlay or handled by parent interaction */}

        </Group>
    );
};
