import React, { useMemo } from 'react';
import { Path, Group, Arrow } from 'react-konva';
import { theme } from '../../../utils/theme';

export const EdgeComponent = React.memo(({ edge, sourcePos, targetPos, isSelected, isDraft }) => {

    // Config
    const color = isSelected || isDraft ? theme.colors.primary : '#cbd5e1';
    const width = isSelected ? 4 : 2;
    const routingType = edge.data?.routing || 'bezier';
    const cornerRadius = 10;

    // Drawing Logic
    const sceneFunc = useMemo(() => {
        return (context, shape) => {
            const sx = sourcePos.x;
            const sy = sourcePos.y;
            const tx = targetPos.x;
            const ty = targetPos.y;

            context.beginPath();
            context.moveTo(sx, sy);

            if (routingType === 'orthogonal') {
                const midX = (sx + tx) / 2;

                // We draw 3 segments: 
                // 1. sx,sy -> midX,sy
                // 2. midX,sy -> midX,ty
                // 3. midX,ty -> tx,ty

                // To round corners, we use arcTo(x1, y1, x2, y2, radius)
                // Corner 1: at (midX, sy)
                context.lineTo(midX - (sx < midX ? cornerRadius : -cornerRadius), sy);
                context.quadraticCurveTo(midX, sy, midX, sy + (ty > sy ? cornerRadius : -cornerRadius));

                // Corner 2: at (midX, ty)
                context.lineTo(midX, ty - (ty > sy ? cornerRadius : -cornerRadius));
                context.quadraticCurveTo(midX, ty, midX + (tx > midX ? cornerRadius : -cornerRadius), ty);

                context.lineTo(tx, ty);
            } else {
                // Cubic Bezier
                const dist = Math.abs(tx - sx);
                const curvature = Math.min(dist * 0.5, 100) + 20;

                context.bezierCurveTo(
                    sx + curvature, sy,
                    tx - curvature, ty,
                    tx, ty
                );
            }

            context.fillStrokeShape(shape);
        };
    }, [sourcePos, targetPos, routingType]);

    // Calculate Arrow Rotation
    // Assuming Left-to-Right flow mainly, but let's be accurate based on last segment
    // Bezier CP2 is (tx - K, ty). So incoming vector is (K, 0) -> 0 degrees.
    // Orthogonal last segment is (midX, ty) -> (tx, ty). Vector (tx-midX, 0).
    // If tx > midX (normal flow), 0 degrees.
    // If tx < midX (loop back), 180 degrees.
    const arrowAngle = useMemo(() => {
        if (routingType === 'orthogonal') {
            const midX = (sourcePos.x + targetPos.x) / 2;
            return targetPos.x > midX ? 0 : 180;
        } else {
            // Bezier CP2 x is targetPos.x - curvature
            // curvature is positive. So CP2 is to the left.
            // Incoming from left -> 0 deg.
            return 0;
        }
    }, [sourcePos, targetPos, routingType]);


    return (
        <Group>
            {/* The Path */}
            <Path
                sceneFunc={sceneFunc}
                stroke={color}
                strokeWidth={width}
                lineCap="round"
                lineJoin="round"
                listening={false}
            />

            {/* Arrowhead at Target */}
            {!isDraft && (
                <Arrow
                    points={[0, 0, 10, 0]} // Length 10
                    x={targetPos.x}
                    y={targetPos.y}
                    offsetY={0}
                    offsetX={10} // Pivot at tip? No, logic is tricky with Konva Arrow points.
                    // If points=[0,0, 10,0], it draws line from 0,0 to 10,0 and puts head at 10,0.
                    // We want head at targetPos.
                    // Easier: rotation=arrowAngle. Pointersize...
                    // Let's just use a simple Arrow shape with 0 length line.
                    points={[0, 0, 1, 0]}
                    pointerLength={10}
                    pointerWidth={10}
                    fill={color}
                    stroke={color}
                    rotation={arrowAngle}
                    listening={false}
                />
            )}

            {/* Hit Area */}
            {!isDraft && (
                <Path
                    sceneFunc={sceneFunc}
                    stroke="transparent"
                    strokeWidth={20}
                    onMouseEnter={e => {
                        e.target.getStage().container().style.cursor = 'pointer';
                    }}
                    onMouseLeave={e => {
                        e.target.getStage().container().style.cursor = 'default';
                    }}
                />
            )}
        </Group>
    );
});
