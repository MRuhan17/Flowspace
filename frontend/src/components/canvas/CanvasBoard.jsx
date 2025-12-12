import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import { useStore } from '../../state/useStore';
import { nanoid } from 'nanoid';
// import { useSocketEvents } from '../../hooks/useSocket'; // Handled globally in App now
import throttle from 'lodash/throttle';
import Konva from 'konva';
import { useSelectionBehavior } from '../../hooks/useSelectionBehavior';
import { TransformerComponent } from './TransformerComponent';
import { TOOLS } from '../../utils/constants';

// Optimized Stroke Component
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

    const isDrawing = useRef(false);
    const stageRef = useRef(null);
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
            // E.target is just the group leader or individual shape.
            // We typically find all selected nodes and update them.

            // NOTE: Konva modifies the Node's x/y directly. 
            // We need to calculate the Delta and apply to points.

            const node = e.target;
            const x = node.x();
            const y = node.y();

            // Reset node position to 0,0 locally and apply delta to points permanently
            node.x(0);
            node.y(0);

            const delta = { x, y };

            // Update all selected objects (group move)
            // If only one object moved, we still check selectedObjectIds
            const idsToUpdate = selectedObjectIds.includes(node.id()) ? selectedObjectIds : [node.id()];

            // Prepare updates map for store/backend
            const updates = {};
            idsToUpdate.forEach(id => {
                updates[id] = delta;
                // NOTE: If using Transformer group drag, all nodes move by same delta usually.
            });

            // We can reuse the socket service 'sendLayoutUpdate' logic!
            // It updates local store and broadcasts.

            import('../../socket/socket').then(({ socketService }) => {
                socketService.sendLayoutUpdate(activeBoardId, updates);

                // Also update local store immediately?
                // socketService.sendLayoutUpdate already broadcasts, and we have a listener for it?
                // Yes, 'onLayoutUpdate' listener will call `setLayoutAnimation` and then our effect updates store.
                // BUT for the local user, we want immediate update without animation loop if possible.
                // Or we treat it as a layout update.
                // Let's rely on the layout update loop we built!
                // Wait, default loop animates. We don't want to animate our OWN drag result.
                // We just dragged it. It is already there visually.

                // If we reset node.x(0) above, it snaps back visually until update comes.
                // BETTER: Don't animate if valid update.
                // We manually update local store here.

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

        }, [activeBoardId, selectedObjectIds, setStrokes, activeBoardId]);

        // Handle Layout Animations
        useEffect(() => {
            if (!layoutAnimation || !layerRef.current) return;

            const stage = stageRef.current;
            const layer = layerRef.current;
            const animations = [];

            // layoutAnimation is a map: { id: { x, y } } - target absolute positions (top-left)
            // BUT strokes are simplified lines with points.
            // Konva Line 'x' and 'y' are usually 0 relative to parent if points are absolute.
            // We need to tween the `x` and `y` offset of the Line node.

            // Wait, if we just tween X/Y, the points remain same. That works.
            // But we need to calculate the DELTA from *current* position.

            // For simpler logic: We assume the backend calculated TARGET coordinates for the bounding box.
            // But our strokes layout is Point-based.
            // If we move the stroke, we are moving the Node position.
            // The `layoutService` returned new absolute coordinates for top-left.
            // We need to compute: deltaX = targetX - originalBoundingBoxX.

            // Since we don't have bounding box readily available without expensive calculation,
            // let's assume `layoutLayout` *contains* the pre-calculated Delta or absolute Position?

            // In Toolbar.jsx we calculated: 
            // objects were sent as { x: points[0], y: points[1] ... } (APPROXIMATION)
            // So returned Layout is the new position of that anchor point.

            Object.entries(layoutAnimation).forEach(([id, targetPos]) => {
                const node = layer.findOne('#' + id);
                if (node) {
                    // Determine current visual position (could be offset if previously moved)
                    // We want to move it to a specific visual location.

                    // If we want to animate "points" it is hard.
                    // Easiest is to animate Node x/y.

                    // Calculate expected delta based on Toolbar logic?
                    // Toolbar logic was: deltaX = layouted.x - stroke.points[0]
                    // LayoutAnimation data passed from socket/toolbar should be normalized.

                    // Let's assume layoutAnimation contains the TARGET x/y for the Node itself.
                    // Initially Node x/y is 0,0.
                    // If we animate it to 100,100, it stays there visually.

                    // Create tween
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

            // After animation, we should update the actual 'points' in store and reset Node x/y to 0
            // to keep state clean (Source of Truth).
            // But reacting to 'onFinish' of all tweens is tricky. 
            // Simpler: Just rely on the Node offset visuals?
            // NO, if we reload, store still has old points.
            // WE MUST update store.

            // Wait, Toolbar.jsx *already* called setStrokes with updated points!
            // If we setStrokes, the component RE-RENDERS with new points immediately.
            // So animation is skipped because React replaces the props.

            // CORRECT APPROACH for Animation + React State Update:
            // 1. We should NOT update store immediately in Toolbar.
            // 2. Toolbar -> emit 'layout-update' -> Socket -> 'onLayoutUpdate' -> `setLayoutAnimation`.
            // 3. CanvasBoard detects `layoutAnimation`.
            // 4. Runs Tweens.
            // 5. On Finish -> Update Store (commit).

            // But we need the Logic to update Store to be available here.
            // We need the `delta` to update points. 
            // We'll calculate new strokes here.

            let activeTweens = animations.length;
            const checkFinish = () => {
                activeTweens--;
                if (activeTweens <= 0) {
                    // All done. Commit to store.
                    // We need to construct the new strokes set.
                    // We read current strokes from store, apply deltas.
                    // But we need to know the Deltas.
                    // The `layoutAnimation` should probably contain the DELTAS.

                    // Let's rely on stored Data.
                    // For this step, we will dispatch an action "updateStrokePositions" to store
                    // which takes a map of ID -> {x,y} offsets. Use that to permanently change points.

                    // Also reset Node positions to 0,0 since points will be updated.
                    // THIS IS CRITICAL: If we update points, but Node x/y is still shifted, it double-shifts.
                    // We must set Node x/y back to 0.

                    animations.forEach(t => t.node.x(0).y(0)); // Reset visual offset

                    // Dispatch store update
                    import('../../socket/socket').then(({ socketService }) => {
                        // We actually need to update LOCAL store. 
                        // The "layout-update" event should carry the Deltas.
                        // Let's assume layoutAnimation IS the expected Deltas for the NODE.

                        // Helper to update store
                        const updates = {};
                        Object.keys(layoutAnimation).forEach(id => {
                            updates[id] = layoutAnimation[id];
                        });

                        // We need an action 'applyLayoutOffsets'
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

            // Cleanup? 
            return () => {
                // animations.forEach(t => t.destroy()); 
                // Don't destroy immediately if component remounts? 
            };

        }, [layoutAnimation, setStrokes, setLayoutAnimation]);

        // Cleanup throttled function on unmount
        React.useEffect(() => {
            return () => throttledEmitCursor.cancel();
        }, [throttledEmitCursor]);

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
                    {/* Layer 1: Committed Strokes */}
                    <Layer ref={layerRef}>
                        {strokes.map((stroke) => (
                            <Stroke
                                key={stroke.id}
                                stroke={stroke}
                                isSelected={selectedObjectIds.includes(stroke.id)}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                            />
                        ))}
                    </Layer>

                    {/* Layer 2: Active Drawing */}
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

                        {/* Marquee Selection Box */}
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

                        {/* Selection Handles */}
                        <TransformerComponent />
                    </Layer>
                </Stage>
            </div>
        );
    };
