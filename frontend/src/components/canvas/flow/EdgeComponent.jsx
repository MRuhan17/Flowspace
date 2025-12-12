import React, { useMemo } from 'react';
import { Path, Group, Text, Circle } from 'react-konva';
import { theme } from '../../../utils/theme';

export const EdgeComponent = React.memo(({ edge, sourcePos, targetPos, isSelected, isDraft }) => {

    // Calculate Bézier Path
    const sceneFunc = useMemo(() => {
        return (context, shape) => {
            const sx = sourcePos.x;
            const sy = sourcePos.y;
            const tx = targetPos.x;
            const ty = targetPos.y;

            const dist = Math.abs(tx - sx);
            // Curvature based on distance but capped
            const curvature = Math.min(dist * 0.5, 100) + 20;

            context.beginPath();
            context.moveTo(sx, sy);

            // Cubic Bezier: CP1, CP2, End
            context.bezierCurveTo(
                sx + curvature, sy, // CP1 (Right of source)
                tx - curvature, ty, // CP2 (Left of target)
                tx, ty
            );

            // context.closePath() is NOT used for open paths
            context.fillStrokeShape(shape);
        };
    }, [sourcePos, targetPos]);

    const color = isSelected || isDraft ? theme.colors.primary : '#cbd5e1'; // theme.colors.borderStrong
    const width = isSelected ? 4 : 2;

    return (
        <Group>
            {/* The actual visible edge */}
            <Path
                sceneFunc={sceneFunc}
                stroke={color}
                strokeWidth={width}
                lineCap="round"
                lineJoin="round"
                listening={false} // Main visual doesn't need to listen if we have a larger hit area
            />
            {/* Hit area for easier selection */}
            {!isDraft && (
                <Path
                    sceneFunc={sceneFunc}
                    stroke="transparent"
                    strokeWidth={20} // Fat stroke for hit detection
                    onMouseEnter={e => {
                        const container = e.target.getStage().container();
                        container.style.cursor = 'pointer';
                    }}
                    onMouseLeave={e => {
                        const container = e.target.getStage().container();
                        container.style.cursor = 'default';
                    }}
                    onClick={(e) => {
                        // Select logic would go here
                        // e.cancelBubble = true;
                    }}
                />
            )}
        </Group>
    );
});
