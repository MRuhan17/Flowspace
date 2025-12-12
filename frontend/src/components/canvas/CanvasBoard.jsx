import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import { useStore } from '../../state/useStore';
import { nanoid } from 'nanoid';
// import { useSocketEvents } from '../../hooks/useSocket'; // Handled globally in App now
import throttle from 'lodash/throttle';
import Konva from 'konva';
import { useSelectionBehavior } from '../../hooks/useSelectionBehavior';
import { useFlowEngine } from '../../hooks/useFlowEngine';
import { TransformerComponent } from './TransformerComponent';
import { NodeComponent } from './flow/NodeComponent';
import { EdgeComponent } from './flow/EdgeComponent';
import { TOOLS } from '../../utils/constants';

// Optimized Stroke Component
const Stroke = React.memo(({ stroke, isSelected, onDragStart, onDragEnd }) => (
    <Line
        id={stroke.id} // Important for finding node
        points={stroke.points}
        stroke={stroke.color}
        strokeWidth={stroke.strokeWidth}
        tension={0.5}
        lineCap="round"
        lineJoin="round"
        globalCompositeOperation={
            stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
        }

        // Interaction Settings
        draggable={isSelected} // Only draggable if selected
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}

        // Keep hit detection enabled for selection
        hitStrokeWidth={20} // Make it easier to select line

        // Performance settings
        perfectDrawEnabled={false}
        shadowForStrokeEnabled={false}
    />
));

export const CanvasBoard = () => {
    // Select strictly necessary state to minimize re-renders
    const tool = useStore(state => state.toolMode);
    const color = useStore(state => state.brushColor);
    const strokeWidth = useStore(state => state.brushSize);
    const strokes = useStore(state => state.strokes);
    const addStroke = useStore(state => state.addStroke);
    const setStrokes = useStore(state => state.setStrokes);
    const activeBoardId = useStore(state => state.activeBoardId);

    // Selection State
    const selectedObjectIds = useStore(state => state.selectedObjectIds);
    const selectOne = useStore(state => state.selectOne);

    // Animation state from store
    const layoutAnimation = useStore(state => state.layoutAnimation);
    const setLayoutAnimation = useStore(state => state.setLayoutAnimation);
    const setStageRef = useStore(state => state.setStageRef);

    const isDrawing = useRef(false);
    const stageRef = useRef(null);

    // Register Stage Ref
    useEffect(() => {
        if (stageRef.current) {
            setStageRef(stageRef);
        }
    }, [setStageRef]);

    const layerRef = useRef(null);

    // Local state for the stroke currently being drawn
    const [currentPoints, setCurrentPoints] = useState([]);

    // Throttled cursor tracking
    const throttledEmitCursor = useRef(
        throttle((roomId, x, y) => {
            // Lazy load socket service
            import('../../socket/socket').then(({ socketService }) => {
                socketService.sendCursor(roomId, x, y);
            });
        }, 100)
    ).current;

    // Selection Hook
    const { selectionHandlers, selectionBox } = useSelectionBehavior(stageRef);

    // Flow Engine Hook
    const {
        nodes, edges, connectionDraft,
        getPortPosition,
        handlers: flowHandlers
    } = useFlowEngine();

    const handleMouseDown = useCallback((e) => {
        // Handle Selection Logic First if in SELECT mode
        if (tool === TOOLS.SELECT) {
            selectionHandlers.onMouseDown(e);
            return;
        }

        isDrawing.current = true;
        const pos = e.target.getStage().getPointerPosition();
        setCurrentPoints([pos.x, pos.y]);
    }, [tool, selectionHandlers]);

    const handleMouseMove = useCallback((e) => {
        if (tool === TOOLS.SELECT) {
            // Check if we are interacting with flow?
            // If dragging a node, Konva handles it.
            // If dragging a connection, flowHandlers.onMouseMove handles it?
            if (connectionDraft) {
                flowHandlers.onMouseMove(e);
                return;
            }

            selectionHandlers.onMouseMove(e);
            // Also emit cursor
            const stage = e.target.getStage();
            const point = stage.getPointerPosition();
            throttledEmitCursor(activeBoardId, point.x, point.y);
            return;
        }

        const stage = e.target.getStage();
        const point = stage.getPointerPosition();

        // Emit cursor
        throttledEmitCursor(activeBoardId, point.x, point.y);

        if (!isDrawing.current) return;

        setCurrentPoints(prev => prev.concat([point.x, point.y]));
    }, [activeBoardId, throttledEmitCursor, tool, selectionHandlers]);

    const handleMouseUp = useCallback(() => {
        if (tool === TOOLS.SELECT) {
            if (connectionDraft) {
                flowHandlers.onMouseUp(e); // Pass Event? E is generic here
                // flowHandlers might expect event object or rely on stage pointer
            }
            selectionHandlers.onMouseUp();
            return;
        }

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
                addStroke(finalStroke);
            }
            return [];
        });
    }, [isDrawing, tool, color, strokeWidth, addStroke, connectionDraft, flowHandlers, selectionHandlers]);

    // Interaction Handlers
    const handleDragStart = useCallback((e) => {
        const id = e.target.id();
        // If dragging an unselected object, select it first
        if (!selectedObjectIds.includes(id)) {
            selectOne(id);
        }
    }, [selectedObjectIds, selectOne]);

    const handleDragEnd = useCallback((e) => {
        // When drag ends, we need to update the STORE with new positions.
        const node = e.target;
        const x = node.x();
        const y = node.y();

        // Reset node position to 0,0 locally and apply delta to points permanently
        node.x(0);
        node.y(0);

        const delta = { x, y };

        // Update all selected objects (group move)
        const idsToUpdate = selectedObjectIds.includes(node.id()) ? selectedObjectIds : [node.id()];

        // Prepare updates map for store/backend
        const updates = {};
        idsToUpdate.forEach(id => {
            updates[id] = delta;
        });

        // We can reuse the socket service 'sendLayoutUpdate' logic!
        import('../../socket/socket').then(({ socketService }) => {
            socketService.sendLayoutUpdate(activeBoardId, updates);

            const currentStrokes = useStore.getState().strokes;
            const nextStrokes = currentStrokes.map(s => {
                if (updates[s.id]) {
                    return {
                        ...s,
                        points: s.points.map((v, i) => i % 2 === 0 ? v + delta.x : v + delta.y)
                    };
                }
                return s;
            });
            setStrokes(nextStrokes);
        });

    }, [activeBoardId, selectedObjectIds, setStrokes]);

    // Handle Layout Animations
    useEffect(() => {
        if (!layoutAnimation || !layerRef.current) return;

        const layer = layerRef.current;
        const animations = [];

        Object.entries(layoutAnimation).forEach(([id, targetPos]) => {
            const node = layer.findOne('#' + id);
            if (node) {
                const tween = new Konva.Tween({
                    node: node,
                    x: targetPos.x,
                    y: targetPos.y,
                    duration: 0.6,
                    easing: Konva.Easings.EaseInOut,
                });

                animations.push(tween);
                tween.play();
            }
        });

        let activeTweens = animations.length;
        const checkFinish = () => {
            activeTweens--;
            if (activeTweens <= 0) {
                // All done. Commit to store.
                animations.forEach(t => t.node.x(0).y(0)); // Reset visual offset

                // Dispatch store update
                import('../../socket/socket').then(({ socketService }) => {
                    const updates = {};
                    Object.keys(layoutAnimation).forEach(id => {
                        updates[id] = layoutAnimation[id];
                    });

                    const currentStrokes = useStore.getState().strokes;
                    const nextStrokes = currentStrokes.map(s => {
                        if (updates[s.id]) {
                            const { x, y } = updates[s.id];
                            return {
                                ...s,
                                points: s.points.map((v, i) => i % 2 === 0 ? v + x : v + y)
                            };
                        }
                        return s;
                    });

                    setStrokes(nextStrokes);
                    setLayoutAnimation(null); // Clear animation state
                });
            }
        };

        animations.forEach(t => t.onFinish = checkFinish);

        return () => {
            // cleanup if needed
        };

    }, [layoutAnimation, setStrokes, setLayoutAnimation]);

    // Cleanup throttled function on unmount
    React.useEffect(() => {
        return () => throttledEmitCursor.cancel();
    }, [throttledEmitCursor]);

    // Z-Index Sorting
    const sortedElements = useMemo(() => {
        // Assign default z-indexes to maintain base stacking context if not specified
        // Edges (0) < Nodes (10) < Strokes (20)
        const combined = [
            ...edges.map(e => ({ ...e, _type: 'edge', _baseZ: 0 })),
            ...nodes.map(n => ({ ...n, _type: 'node', _baseZ: 10 })),
            ...strokes.map(s => ({ ...s, _type: 'stroke', _baseZ: 20 }))
        ];

        return combined.sort((a, b) => {
            const zA = a.zIndex !== undefined ? a.zIndex : a._baseZ;
            const zB = b.zIndex !== undefined ? b.zIndex : b._baseZ;
            return zA - zB;
        });
    }, [edges, nodes, strokes]);

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
                {/* Unified Render Layer */}
                <Layer ref={layerRef}>
                    {sortedElements.map(el => {
                        if (el._type === 'edge') {
                            const sourcePos = getPortPosition(el.source, el.sourceHandle, 'output');
                            const targetPos = getPortPosition(el.target, el.targetHandle, 'input');
                            if (!sourcePos || !targetPos) return null;
                            return (
                                <EdgeComponent
                                    key={el.id}
                                    edge={el}
                                    sourcePos={sourcePos}
                                    targetPos={targetPos}
                                    isSelected={selectedObjectIds.includes(el.id)}
                                    locked={el.locked}
                                />
                            );
                        }

                        if (el._type === 'node') {
                            return (
                                <NodeComponent
                                    key={el.id}
                                    node={el}
                                    draggable={!el.locked}
                                    onDragMove={el.locked ? undefined : flowHandlers.onNodeDragMove}
                                    onDragEnd={el.locked ? undefined : flowHandlers.onNodeDragEnd}
                                    onPortDown={flowHandlers.onPortDown}
                                    onPortUp={flowHandlers.onPortUp}
                                    locked={el.locked}
                                />
                            );
                        }

                        if (el._type === 'stroke') {
                            return (
                                <Stroke
                                    key={el.id}
                                    stroke={el}
                                    isSelected={selectedObjectIds.includes(el.id)}
                                    onDragStart={el.locked ? undefined : handleDragStart}
                                    onDragEnd={el.locked ? undefined : handleDragEnd}
                                />
                            );
                        }
                        return null;
                    })}

                    {/* Draft Connection */}
                    {connectionDraft && (
                        <EdgeComponent
                            isDraft={true}
                            edge={{}}
                            sourcePos={getPortPosition(connectionDraft.sourceId, connectionDraft.sourceHandle, 'output')}
                            targetPos={connectionDraft.mousePos}
                        />
                    )}
                </Layer>

                {/* Active Drawing & Selection Overlays */}
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

                    {selectionBox && (
                        <Konva.Rect
                            x={selectionBox.x}
                            y={selectionBox.y}
                            width={selectionBox.width}
                            height={selectionBox.height}
                            fill="rgba(0, 161, 255, 0.3)"
                            stroke="#00A1FF"
                            strokeWidth={1}
                            listening={false}
                        />
                    )}

                    <TransformerComponent />
                </Layer>
            </Stage>
        </div>
    );
};
