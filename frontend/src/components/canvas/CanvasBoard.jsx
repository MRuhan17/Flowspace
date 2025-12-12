import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import { useStore } from '../../state/useStore';
import { nanoid } from 'nanoid';
import throttle from 'lodash/throttle';
import Konva from 'konva';
import { useSelectionBehavior } from '../../hooks/useSelectionBehavior';
import { useFlowEngine } from '../../hooks/useFlowEngine';
import { TransformerComponent } from './TransformerComponent';
import { NodeComponent } from './flow/NodeComponent';
import { EdgeComponent } from './flow/EdgeComponent';
import { TOOLS } from '../../utils/constants';
import { useCRDT, createOperation } from '../../crdt/useCRDT';

// Optimized Stroke Component
const Stroke = React.memo(({ stroke, isSelected, onDragStart, onDragEnd }) => (
    <Line
        id={stroke.id}
        points={stroke.points}
        stroke={stroke.color}
        strokeWidth={stroke.strokeWidth}
        tension={0.5}
        lineCap="round"
        lineJoin="round"
        globalCompositeOperation={
            stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
        }
        draggable={isSelected && !stroke.locked}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        hitStrokeWidth={20}
        perfectDrawEnabled={false}
        shadowForStrokeEnabled={false}
    />
));

export const CanvasBoard = () => {
    // Store state
    const tool = useStore(state => state.toolMode);
    const color = useStore(state => state.brushColor);
    const strokeWidth = useStore(state => state.brushSize);
    const activeBoardId = useStore(state => state.activeBoardId);
    const selectedObjectIds = useStore(state => state.selectedObjectIds);
    const selectOne = useStore(state => state.selectOne);
    const layoutAnimation = useStore(state => state.layoutAnimation);
    const setLayoutAnimation = useStore(state => state.setLayoutAnimation);
    const setStageRef = useStore(state => state.setStageRef);

    // CRDT Engine
    const crdt = useCRDT(activeBoardId);
    const [crdtStrokes, setCrdtStrokes] = useState([]);
    const [forceUpdate, setForceUpdate] = useState(0);

    const isDrawing = useRef(false);
    const stageRef = useRef(null);
    const layerRef = useRef(null);
    const [currentPoints, setCurrentPoints] = useState([]);

    // Register Stage Ref
    useEffect(() => {
        if (stageRef.current) {
            setStageRef(stageRef);
        }
    }, [setStageRef]);

    // Sync CRDT strokes to local state for rendering
    useEffect(() => {
        const strokes = crdt.getElementsByType('stroke');
        setCrdtStrokes(strokes);
    }, [forceUpdate, crdt]);

    // Socket listener for remote CRDT operations
    useEffect(() => {
        import('../../socket/socket').then(({ socketService }) => {
            const handleRemoteCRDTOp = (op) => {
                crdt.applyRemote(op);
                setForceUpdate(prev => prev + 1); // Trigger re-render
            };

            socketService.on('crdt-operation', handleRemoteCRDTOp);

            return () => {
                socketService.socket?.off('crdt-operation', handleRemoteCRDTOp);
            };
        });
    }, [crdt]);

    // Throttled cursor tracking with tool info
    const throttledEmitCursor = useRef(
        throttle((roomId, x, y, toolMode) => {
            import('../../socket/socket').then(({ socketService }) => {
                socketService.socket?.emit('cursor-move', {
                    roomId,
                    x,
                    y,
                    userId: socketService.socket.id,
                    tool: toolMode
                });
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
            if (connectionDraft) {
                flowHandlers.onMouseMove(e);
                return;
            }

            selectionHandlers.onMouseMove(e);
            const stage = e.target.getStage();
            const point = stage.getPointerPosition();
            throttledEmitCursor(activeBoardId, point.x, point.y, tool);
            return;
        }

        const stage = e.target.getStage();
        const point = stage.getPointerPosition();
        throttledEmitCursor(activeBoardId, point.x, point.y, tool);

        if (!isDrawing.current) return;

        setCurrentPoints(prev => prev.concat([point.x, point.y]));
    }, [activeBoardId, throttledEmitCursor, tool, selectionHandlers, connectionDraft, flowHandlers]);

    const handleMouseUp = useCallback((e) => {
        if (tool === TOOLS.SELECT) {
            if (connectionDraft) {
                flowHandlers.onMouseUp(e);
            }
            selectionHandlers.onMouseUp();
            return;
        }

        if (!isDrawing.current) return;
        isDrawing.current = false;

        setCurrentPoints(prevPoints => {
            if (prevPoints.length > 0) {
                const strokeId = nanoid();
                const strokeData = {
                    type: 'stroke',
                    tool,
                    color,
                    strokeWidth,
                    points: prevPoints
                };

                // Apply CRDT insert operation
                const op = crdt.applyLocal(createOperation.insert(strokeId, strokeData));

                // Emit to other clients
                import('../../socket/socket').then(({ socketService }) => {
                    socketService.socket?.emit('crdt-operation', {
                        roomId: activeBoardId,
                        operation: op
                    });
                });

                setForceUpdate(prev => prev + 1);
            }
            return [];
        });
    }, [tool, color, strokeWidth, crdt, activeBoardId, connectionDraft, flowHandlers, selectionHandlers]);

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
            ...crdtStrokes.map(s => ({ ...s, _type: 'stroke', _baseZ: 20 }))
        ];

        return combined.sort((a, b) => {
            const zA = a.zIndex !== undefined ? a.zIndex : a._baseZ;
            const zB = b.zIndex !== undefined ? b.zIndex : b._baseZ;
            return zA - zB;
        });
    }, [edges, nodes, crdtStrokes]);

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
