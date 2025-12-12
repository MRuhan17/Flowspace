import OpenAI from 'openai';
import { logger } from '../utils/logger.js';

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy_key'
});

/**
 * Screenshot Diagram System
 * 
 * Converts images of diagrams (whiteboard photos, screenshots, sketches)
 * into editable Flowspace board structures using AI Vision analysis.
 */

/**
 * Generate a diagram structure from a screenshot
 * @param {string} base64Image - Base64 encoded image string (with or without data URI prefix)
 * @returns {Promise<Object>} - The generated board structure with nodes and edges
 */
export async function generateDiagramFromScreenshot(base64Image) {
    console.log('🖼️ Analyzing screenshot for diagram generation...');

    // Clean base64 string if needed
    const imageContent = base64Image.replace(/^data:image\/\w+;base64,/, '');

    try {
        // Step 1 & 2: Run Vision Analysis (OCR + Visual Feature Detection)
        // We use GPT-4o as our high-fidelity Vision API to detect text, boxes, and connections simultaneously.
        const visualStructure = await analyzeVisualStructure(imageContent);

        console.log(`👁️ Detected ${visualStructure.boxes?.length || 0} boxes and ${visualStructure.arrows?.length || 0} arrows`);

        // Step 3: Semantic Inference & Layout Normalization
        // Convert the raw visual elements into our semantic board format
        const boardData = await inferSemanticBoard(visualStructure);

        return {
            success: true,
            data: boardData,
            metadata: {
                detectedElements: visualStructure.boxes?.length || 0,
                detectedConnections: visualStructure.arrows?.length || 0
            }
        };

    } catch (error) {
        logger.error('Screenshot Diagram Generation Error:', error);
        throw new Error(`Failed to generate diagram from screenshot: ${error.message}`);
    }
}

/**
 * Step 1: Analyze visual structure using Vision Model
 * Extracts raw geometric and textual elements
 */
async function analyzeVisualStructure(base64Image) {
    const prompt = `
    Analyze this diagram/screenshot and extract its visual structure suitable for reconstruction.
    
    I need you to act as an OCR and Object Detection engine.
    
    1. Detect all "boxes" or "nodes" (rectangles, diamonds, circles, text blocks).
       - Extract the text content inside or near them.
       - Estimate their relative position (x, y) on a 1000x1000 grid.
       - Estimate their shape (rectangle, diamond, circle, note).
       - Estimate their approximate width and height.
       - Detect the background color/style if distinct.

    2. Detect all "arrows" or "lines" connecting them.
       - Identify the start and end nodes (by referencing the text or index).
       - Detect any labels on the connecting lines.
       - Determine direction (one-way, bidirectional, non-directional).

    Return ONLY a valid JSON object with this structure:
    {
        "boxes": [
            { "id": "b1", "text": "Start", "shape": "circle", "x": 500, "y": 100, "w": 100, "h": 50, "color": "green" }
        ],
        "arrows": [
            { "from": "b1", "to": "b2", "label": "clicks button", "type": "solid" }
        ]
    }
    `;

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                role: "system",
                content: "You are a specialized Computer Vision system for diagram reconstruction. Output only valid JSON."
            },
            {
                role: "user",
                content: [
                    { type: "text", text: prompt },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:image/jpeg;base64,${base64Image}`,
                            detail: "high"
                        }
                    }
                ]
            }
        ],
        max_tokens: 4096,
        temperature: 0.1, // Low temp for precision
        response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    return JSON.parse(content);
}

/**
 * Step 3: Infer semantic nodes and normalize layout
 * Converts raw visual detection into Flowspace board format
 */
async function inferSemanticBoard(visualData) {
    // If the vision step already gave us good structure, we might just need to normalize it.
    // However, we can perform a second pass if we need deep semantic understanding (e.g. converting "User" box to a User Icon node).

    // For now, we will map the visual structure directly to board nodes with heuristic enhancements.

    const nodes = [];
    const edges = [];
    const idMap = new Map(); // Map visual IDs to UUIDs

    // 1. Process Nodes
    visualData.boxes.forEach((box, index) => {
        const nodeId = `node_${Date.now()}_${index}`;
        idMap.set(box.id, nodeId); // Map 'b1' to uuid

        // Determine type based on shape/text
        let type = 'default';
        let data = { label: box.text || 'Untitled' };

        // Semantic shape mapping
        const shape = (box.shape || '').toLowerCase();
        if (shape.includes('diamond') || shape.includes('decision') || box.text?.includes('?')) {
            type = 'decision';
        } else if (shape.includes('circle') || shape.includes('oval') || shape.includes('start') || shape.includes('end')) {
            type = 'start-end'; // Custom type if exists, else default
        } else if (shape.includes('note') || shape.includes('sticky')) {
            type = 'sticky';
        }

        // Color Inference
        if (box.color) {
            data.backgroundColor = mapColorToHex(box.color);
        }

        nodes.push({
            id: nodeId,
            type: type,
            position: { x: box.x, y: box.y },
            data: data,
            width: box.w || 150,
            height: box.h || 80,
            // Store original visual metadata for debugging
            _visual: { shape: box.shape }
        });
    });

    // 2. Process Edges
    visualData.arrows.forEach((arrow, index) => {
        let sourceId = idMap.get(arrow.from);
        let targetId = idMap.get(arrow.to);

        // Fallback: fuzzy match by text if ID match fails
        if (!sourceId) sourceId = findNodeByText(nodes, arrow.from);
        if (!targetId) targetId = findNodeByText(nodes, arrow.to);

        if (sourceId && targetId) {
            edges.push({
                id: `edge_${Date.now()}_${index}`,
                source: sourceId,
                target: targetId,
                label: arrow.label || '',
                type: 'smoothstep', // Default to nice curves
                animated: false,
                markerEnd: { type: 'arrowclosed' }
            });
        }
    });

    // 3. Normalize Layout (Simple spacing check)
    // Ensure no nodes overlap excessively
    // (A full force-directed layout could go here, but we trust the visual extraction)

    return { nodes, edges };
}

// Helper: Map color names to hex
function mapColorToHex(colorName) {
    const map = {
        'red': '#ef4444',
        'blue': '#3b82f6',
        'green': '#10b981',
        'yellow': '#f59e0b',
        'orange': '#f97316',
        'purple': '#8b5cf6',
        'pink': '#ec4899',
        'grey': '#6b7280',
        'gray': '#6b7280',
        'white': '#ffffff'
    };
    return map[colorName.toLowerCase()] || null;
}

// Helper: Find node by fuzzy text match
function findNodeByText(nodes, text) {
    if (!text) return null;
    const lowerText = text.toLowerCase();

    // Exact match
    const exact = nodes.find(n => n.data.label.toLowerCase() === lowerText);
    if (exact) return exact.id;

    // Partial match
    const partial = nodes.find(n => n.data.label.toLowerCase().includes(lowerText));
    if (partial) return partial.id;

    return null;
}

export default { generateDiagramFromScreenshot };
