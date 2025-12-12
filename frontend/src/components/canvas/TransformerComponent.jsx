import React, { useRef, useEffect } from 'react';
import { Transformer } from 'react-konva';
import { useStore } from '../../state/useStore';

export const TransformerComponent = () => {
    const trRef = useRef(null);
    const selectedObjectIds = useStore(state => state.selectedObjectIds);
    // We need to re-attach transformer whenever selection changes

    useEffect(() => {
        if (!trRef.current) return;

        // Find nodes in the Stage
        const stage = trRef.current.getStage();
        const selectedNodes = selectedObjectIds.map(id => stage.findOne('#' + id)).filter(Boolean);

        trRef.current.nodes(selectedNodes);
        trRef.current.getLayer().batchDraw();

    }, [selectedObjectIds]);

    return (
        <Transformer
            ref={trRef}
            boundBoxFunc={(oldBox, newBox) => {
                // Limit resize logic if needed (e.g. min size)
                if (newBox.width < 5 || newBox.height < 5) {
                    return oldBox;
                }
                return newBox;
            }}
            // Custom styling for Figma look
            borderStroke="#0066FF"
            anchorStroke="#0066FF"
            anchorFill="#FFFFFF"
            anchorCornerRadius={2}
            rotateAnchorOffset={20}
        />
    );
};
