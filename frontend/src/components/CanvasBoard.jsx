import React from 'react';
import { Stage, Layer, Text, Rect } from 'react-konva';

const CanvasBoard = () => {
    return (
        <Stage width={window.innerWidth} height={window.innerHeight}>
            <Layer>
                <Text text="CanvasBoard Placeholder" fontSize={24} x={50} y={50} />
                <Rect
                    x={20}
                    y={20}
                    width={window.innerWidth - 40}
                    height={window.innerHeight - 40}
                    stroke="gray"
                    strokeWidth={2}
                />
            </Layer>
        </Stage>
    );
};

export default CanvasBoard;
