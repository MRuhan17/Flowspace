import React, { useMemo } from 'react';
import { Path, Group, Text, Circle } from 'react-konva';
import { theme } from '../../../utils/theme';

export const EdgeComponent = React.memo(({ edge, sourcePos, targetPos, isSelected, isDraft }) => {

    // Calculate Path
    const sceneFunc = useMemo(() => {
        return (context, shape) => {
            const sx = sourcePos.x;
            const sy = sourcePos.y;
            const tx = targetPos.x;
            const ty = targetPos.y;

            const routingType = edge.data?.routing || 'bezier'; // 'bezier' | 'orthogonal'

            context.beginPath();
            context.moveTo(sx, sy);

            if (routingType === 'orthogonal') {
                // Simple Manhattan routing (Mid-X)
                // TODO: Smart routing would avoid nodes, but Mid-X is standard for simple flowcharts
                const midX = (sx + tx) / 2;

                context.lineTo(midX, sy);
                context.lineTo(midX, ty);
                context.lineTo(tx, ty);
            } else {
                // Cubic Bezier (Default)
                const dist = Math.abs(tx - sx);
                const curvature = Math.min(dist * 0.5, 100) + 20;

                context.bezierCurveTo(
                    sx + curvature, sy,
                    tx - curvature, ty,
                    tx, ty
                );
            }

            // context.closePath() is NOT used for open paths
            context.fillStrokeShape(shape);
        };
    }, [sourcePos, targetPos, edge.data]);

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
