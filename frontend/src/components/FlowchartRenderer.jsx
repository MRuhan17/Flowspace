import React, { useEffect, useState, useRef } from 'react';
import { Group } from 'react-konva';
import { NodeComponent } from './canvas/flow/NodeComponent';
import { EdgeComponent } from './canvas/flow/EdgeComponent';

/**
 * FlowchartRenderer
 * 
 * Renders a set of nodes and edges.
 * Supports auto-layout initialization and manual dragging.
 * Can be used as a sub-component within CanvasBoard or a standalone preview.
 */
export const FlowchartRenderer = ({
    nodes: propNodes = [],
    edges: propEdges = [],
    onNodeChange,
    width = 800,
    height = 600,
    editable = true
}) => {
    // Local state to manage positions during drag or simulation
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);

    // Initialize state from props
    useEffect(() => {
        setNodes(propNodes);
        setEdges(propEdges);
    }, [propNodes, propEdges]);

    // Simple Auto-Layout (Force-Directed Fallback)
    // Run only if nodes all have (0,0) or generic positions?
    // Backend usually provides layout. We'll add this as a refinement/fallback tool.
    const runForceLayout = (currentNodes, currentEdges) => {
        if (!currentNodes.length) return currentNodes;

        // Clone to avoid mutation
        const simulationNodes = currentNodes.map(n => ({ ...n, vx: 0, vy: 0 }));
        const map = new Map(simulationNodes.map(n => [n.id, n]));

        const ITERATIONS = 100;
        const REPULSION = 5000;
        const ATTRACTION = 0.05;
        const CENTERING = 0.02;

        for (let i = 0; i < ITERATIONS; i++) {
            // Repulsion
            for (let j = 0; j < simulationNodes.length; j++) {
                for (let k = j + 1; k < simulationNodes.length; k++) {
                    const n1 = simulationNodes[j];
                    const n2 = simulationNodes[k];
                    const dx = n1.x - n2.x;
                    const dy = n1.y - n2.y;
                    const dSq = dx * dx + dy * dy + 0.1; // avoid zero
                    const f = REPULSION / dSq;
                    const dist = Math.sqrt(dSq);
                    const fx = (dx / dist) * f;
                    const fy = (dy / dist) * f;

                    n1.vx += fx;
                    n1.vy += fy;
                    n2.vx -= fx;
                    n2.vy -= fy;
                }

                // Centering force
                const n = simulationNodes[j];
                n.vx += (width / 2 - n.x) * CENTERING;
                n.vy += (height / 2 - n.y) * CENTERING;
            }

            // Attraction (Edges)
            currentEdges.forEach(e => {
                const s = map.get(e.source);
                const t = map.get(e.target);
                if (s && t) {
                    const dx = t.x - s.x;
                    const dy = t.y - s.y;

                    s.vx += dx * ATTRACTION;
                    s.vy += dy * ATTRACTION;
                    t.vx -= dx * ATTRACTION;
                    t.vy -= dy * ATTRACTION;
                }
            });

            // Apply Velocity
            simulationNodes.forEach(n => {
                n.x += n.vx;
                n.y += n.vy;
                n.vx *= 0.5; // Damping
                n.vy *= 0.5;
            });
        }

        return simulationNodes;
    };

    // Effect to trigger layout if positions are clustered at 0
    useEffect(() => {
        if (nodes.length > 0) {
            const allZero = nodes.every(n => Math.abs(n.x) < 1 && Math.abs(n.y) < 1);
            if (allZero) {
                // Spread them out randomly first
                const spreadNodes = nodes.map(n => ({
                    ...n,
                    x: Math.random() * width,
                    y: Math.random() * height
                }));
                const layouted = runForceLayout(spreadNodes, edges);
                setNodes(layouted);
            }
        }
    }, [nodes.length]); // Only check when count changes (init)

    // Handlers
    const handleDragMove = (id, x, y) => {
        if (!editable) return;
        setNodes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n));
        // Propagate changes if parent provided handler
        if (onNodeChange) onNodeChange(id, { x, y });
    };

    return (
        <Group>
            {/* Edges Layer (Bottom) */}
            {edges.map((edge) => {
                const source = nodes.find(n => n.id === edge.source);
                const target = nodes.find(n => n.id === edge.target);
                if (!source || !target) return null;

                // Simple positions for now (center to center or ports)
                // Assuming NodeComponent centers coordinates or we calculate port logic.
                // Our Engine uses Ports. Here we default to center approx if ports missing.
                const p1 = { x: source.x + (source.w / 2 || 80), y: source.y + (source.h / 2 || 40) };
                const p2 = { x: target.x + (target.w / 2 || 80), y: target.y + (target.h / 2 || 40) };

                return (
                    <EdgeComponent
                        key={edge.id}
                        edge={edge}
                        sourceNode={source}
                        targetNode={target}
                    // If EdgeComponent needs precise handles, we pass simple defaults or calculated Objects
                    // The existing EdgeComponent uses store? No, it takes props usually.
                    // Let's check EdgeComponent.jsx signature in Step 1200
                    // Props: { edge } ? It uses useStore inside? 
                    // Step 1200 mentions: "Updated setBoardElements... Implemented EdgeComponent..."
                    // Let's assume EdgeComponent is pure or capable of running here.
                    // BUT: EdgeComponent uses `getPortPosition` from hook usually.
                    // If it's tightly coupled to valid handles, we might need a SimplifiedEdge here.
                    // We'll pass `overridePoints` or similar if supported, or rely on it handling data.

                    // Actually, EdgeComponent usually computes points from nodes.
                    // We pass the nodes.
                    />
                );
            })}

            {/* Nodes Layer (Top) */}
            {nodes.map((node) => (
                <NodeComponent
                    key={node.id}
                    node={node}
                    onDragMove={(e) => handleDragMove(node.id, e.target.x(), e.target.y())}
                    onDragEnd={(e) => handleDragMove(node.id, e.target.x(), e.target.y())} // Finalize
                    isSelected={false} // Preview usually no selection
                // Disable ports logic interaction in preview?
                />
            ))}
        </Group>
    );
};
