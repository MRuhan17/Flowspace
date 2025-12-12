import React, { useMemo } from 'react';
import { Group, Rect, Text, Circle } from 'react-konva';
import { theme } from '../../../utils/theme';

const PORT_RADIUS = 5;
const NODE_WIDTH = 160;
const HEADER_HEIGHT = 40;

export const NodeComponent = React.memo(({ node, onDragMove, onDragEnd, onPortDown, onPortUp }) => {

    // Calculate total height based on inputs/outputs
    const maxPorts = Math.max(node.inputs.length, node.outputs.length);
    const bodyHeight = Math.max(60, maxPorts * 30 + 10);
    const totalHeight = HEADER_HEIGHT + bodyHeight;

    return (
        <Group
            id={node.id}
            x={node.x}
            y={node.y}
            draggable
            onDragMove={(e) => {
                onDragMove(node.id, e.target.x(), e.target.y());
            }}
            onDragEnd={(e) => {
                onDragEnd(node.id, e.target.x(), e.target.y());
            }}
        >
            {/* Shadow */}
            <Rect
                width={NODE_WIDTH}
                height={totalHeight}
                cornerRadius={8}
                fill={theme.colors.panelBG}
                shadowColor="black"
                shadowBlur={10}
                shadowOpacity={0.1}
                shadowOffset={{ x: 0, y: 4 }}
            />

            {/* Header */}
            <Rect
                width={NODE_WIDTH}
                height={HEADER_HEIGHT}
                cornerRadius={[8, 8, 0, 0]}
                fill={node.data?.color || theme.colors.primary}
            />
            <Text
                x={10}
                y={HEADER_HEIGHT / 2 - 7}
                width={NODE_WIDTH - 20}
                text={node.data?.label || 'Node'}
                fill="white"
                fontFamily={theme.typography.fontFamily.sans}
                fontSize={14}
                fontStyle="bold"
                ellipsis={true}
                listening={false}
            />

            {/* Body Background (for hits) */}
            <Rect
                y={HEADER_HEIGHT}
                width={NODE_WIDTH}
                height={bodyHeight}
                fill="transparent"
            />

            {/* Inputs (Left Side) */}
            {node.inputs.map((input, index) => {
                const y = HEADER_HEIGHT + 20 + index * 30;
                return (
                    <Group key={input.id} x={0} y={y}>
                        {/* Port Hit Area */}
                        <Circle
                            x={0}
                            y={0}
                            radius={PORT_RADIUS * 3}
                            fill="transparent"
                            onMouseUp={(e) => onPortUp(e, node.id, input.id, 'input')}
                        />
                        {/* Visible Port */}
                        <Circle
                            x={0}
                            y={0}
                            radius={PORT_RADIUS}
                            fill="white"
                            stroke={theme.colors.borderStrong}
                            strokeWidth={2}
                        />
                        {/* Label */}
                        <Text
                            x={10}
                            y={-5}
                            text={input.label}
                            fontSize={11}
                            fill={theme.colors.textSecondary}
                            verticalAlign="middle"
                        />
                    </Group>
                );
            })}

            {/* Outputs (Right Side) */}
            {node.outputs.map((output, index) => {
                const y = HEADER_HEIGHT + 20 + index * 30;
                return (
                    <Group key={output.id} x={NODE_WIDTH} y={y}>
                        {/* Port Hit Area */}
                        <Circle
                            x={0}
                            y={0}
                            radius={PORT_RADIUS * 3}
                            fill="transparent"
                            onMouseDown={(e) => {
                                e.cancelBubble = true;
                                onPortDown(node.id, output.id, { x: node.x + NODE_WIDTH, y: node.y + y });
                            }}
                        />
                        {/* Visible Port */}
                        <Circle
                            x={0}
                            y={0}
                            radius={PORT_RADIUS}
                            fill="white"
                            stroke={theme.colors.borderStrong}
                            strokeWidth={2}
                        />
                        {/* Label */}
                        <Text
                            x={-10 - (output.label?.length * 6 || 30)}
                            y={-5}
                            width={50} // Rough width
                            text={output.label}
                            fontSize={11}
                            fill={theme.colors.textSecondary}
                            align="right"
                            verticalAlign="middle"
                        />
                    </Group>
                );
            })}
        </Group>
    );
});
