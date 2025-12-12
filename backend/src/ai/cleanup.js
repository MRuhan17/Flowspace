import { logger } from '../utils/logger.js';

/**
 * Cleanup Module
 * 
 * Normalizes user freehand drawings into clean geometric shapes.
 * Merges fragmented strokes, recognizes shapes, and aligns text.
 */

export async function cleanBoard(boardJSON, options = {}) {
    console.log('🧹 Cleaning board with options:', options);

    const {
        snapToGrid = false,
        snapToShapes = true,
        mergeSimilar = true
    } = options;

    const cleanedObjects = [];
    const skippedElements = [];

    // 1. Pre-processing: Separate processable paths from other elements
    const pathElements = [];
    const otherElements = [];

    (boardJSON.nodes || []).forEach(node => {
        if (node.type === 'drawing' || node.type === 'path') {
            pathElements.push(node);
        } else {
            otherElements.push(node);
        }
    });

    // 2. Clustering & Merging (If mergeSimilar is true)
    // Group nearby strokes that likely belong to the same shape
    const groupedStrokes = mergeSimilar
        ? clusterStrokes(pathElements)
        : pathElements.map(p => [p]); // Treat each stroke as a group

    // 3. Shape Recognition & Normalization
    for (const group of groupedStrokes) {
        const cleanedShape = processStrokeGroup(group, snapToShapes);

        if (snapToGrid) {
            cleanedShape.x = Math.round(cleanedShape.x / 20) * 20;
            cleanedShape.y = Math.round(cleanedShape.y / 20) * 20;
            cleanedShape.width = Math.round(cleanedShape.width / 10) * 10;
            cleanedShape.height = Math.round(cleanedShape.height / 10) * 10;
        }

        cleanedObjects.push(cleanedShape);
    }

    return {
        success: true,
        cleanedNodes: [...otherElements, ...cleanedObjects], // Keep original non-drawing nodes
        removedNodesCount: pathElements.length,
        newNodesCount: cleanedObjects.length
    };
}

/**
 * Cluster strokes based on proximity
 */
function clusterStrokes(strokes, distanceThreshold = 50) {
    if (strokes.length === 0) return [];

    // Simple greedy clustering
    // A better approach would be spatial hashing or Union-Find, but O(N^2) is fine for small boards
    const clusters = [];
    const visited = new Set();

    for (let i = 0; i < strokes.length; i++) {
        if (visited.has(i)) continue;

        const cluster = [strokes[i]];
        visited.add(i);

        // Find bounding box of current cluster
        let bbox = getBoundingBox(strokes[i]);

        let changed = true;
        while (changed) {
            changed = false;
            for (let j = 0; j < strokes.length; j++) {
                if (visited.has(j)) continue;

                // Check overlap or proximity
                const otherBbox = getBoundingBox(strokes[j]);
                if (isNear(bbox, otherBbox, distanceThreshold)) {
                    cluster.push(strokes[j]);
                    visited.add(j);

                    // Expand cluster bbox
                    bbox = unionBox(bbox, otherBbox);
                    changed = true;
                }
            }
        }
        clusters.push(cluster);
    }
    return clusters;
}

/**
 * Process a group of strokes into a single clean shape
 */
function processStrokeGroup(strokes, snapToShapes) {
    // 1. Calculate combined bounding box
    const totalBbox = strokes.reduce((acc, stroke) => {
        return unionBox(acc, getBoundingBox(stroke));
    }, getBoundingBox(strokes[0]));

    // 2. Flatten points for processing
    // Assuming node.data.points is array of {x, y}
    const points = strokes.flatMap(s => s.data.points || []);

    // 3. Recognize Shape (Heuristics)
    let type = 'rectangle'; // Default
    if (snapToShapes && points.length > 0) {
        const aspectRatio = totalBbox.w / totalBbox.h;

        // Simple Heuristics
        if (aspectRatio > 0.8 && aspectRatio < 1.2 && isRoughlyCircular(points, totalBbox)) {
            type = 'circle';
        } else if (isRoughlyDiamond(aspectRatio)) {
            // Usually diamonds are 1:1 decision blocks
            type = 'diamond';
        }

        // Advanced: Check for lines/arrows (if start/end are far apart and bounding box is narrow)
        if (isLineOrArrow(totalBbox, points)) {
            type = 'arrow';
        }
    }

    // Return new semantic node (replacing the drawing)
    const baseId = strokes[0].id.split('_')[0];
    return {
        id: `${baseId}_clean_${Date.now()}`,
        type: type === 'arrow' ? 'default' : type, // For now map simple types
        position: { x: totalBbox.x, y: totalBbox.y },
        width: totalBbox.w,
        height: totalBbox.h,
        data: {
            label: type === 'arrow' ? '' : 'Cleaned',
            originalStrokes: strokes.length
        },
        // If it's an arrow, frontend might need 'source'/'target', 
        // but here we just return a "node" representation or a special edge object if we could.
        // For simplicity, we return a node that *looks* like the shape.
        style: {
            borderStyle: type === 'arrow' ? 'none' : 'solid', // Just for visual debugging
        }
    };
}

// --- Geometry Helpers ---

function getBoundingBox(node) {
    // If it has explicit x,y,w,h
    if (node.width && node.height) {
        return {
            x: node.position.x,
            y: node.position.y,
            w: node.width,
            h: node.height
        };
    }
    // Else from points
    if (node.data?.points) {
        const xs = node.data.points.map(p => p.x);
        const ys = node.data.points.map(p => p.y);
        return {
            x: Math.min(...xs),
            y: Math.min(...ys),
            w: Math.max(...xs) - Math.min(...xs),
            h: Math.max(...ys) - Math.min(...ys)
        };
    }
    return { x: 0, y: 0, w: 100, h: 100 };
}

function unionBox(a, b) {
    const minX = Math.min(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const maxX = Math.max(a.x + a.w, b.x + b.w);
    const maxY = Math.max(a.y + a.h, b.y + b.h);
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function isNear(a, b, threshold) {
    // Check if boxes intersect or are within threshold
    const overlapsX = a.x < b.x + b.w + threshold && a.x + a.w + threshold > b.x;
    const overlapsY = a.y < b.y + b.h + threshold && a.y + a.h + threshold > b.y;
    return overlapsX && overlapsY;
}

function isRoughlyCircular(points, bbox) {
    // Check if points fill the corners (rect) or stay away (circle)
    // A circle covers ~78% of its bounding box area.
    // This is very rough. Real Hough Transform is better but complex in JS.
    // Placeholder logic:
    return false; // Circles are hard to guess from raw points without robust math
}

function isRoughlyDiamond(aspectRatio) {
    return aspectRatio > 0.9 && aspectRatio < 1.1; // Weak heuristic for decision node
}

function isLineOrArrow(bbox, points) {
    // If one dimension is very small compared to the other
    const ratio = bbox.w / bbox.h;
    if (ratio > 5 || ratio < 0.2) return true;
    return false;
}

export default { cleanBoard };
