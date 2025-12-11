import OpenAI from 'openai';
import { logger } from '../utils/logger.js';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy_key'
});

/**
 * Calculates a layout for a set of board objects using AI and heuristics.
 * @param {Array} objects - Array of objects { id, type, text, x, y, width, height }
 * @param {string} strategy - 'smart', 'grid', 'vertical', 'horizontal'
 * @returns {Promise<Array>} - Array of objects with updated x, y
 */
export const calculateLayout = async (objects, strategy = 'smart') => {
    if (!objects || objects.length === 0) return [];

    // Fallback/Standard layouts
    if (strategy !== 'smart') {
        return applyHeuristicLayout(objects, strategy);
    }

    // AI Semantic Layout
    try {
        if (!process.env.OPENAI_API_KEY) {
            logger.warn('Missing OpenAI Key, falling back to grid layout');
            return applyHeuristicLayout(objects, 'grid');
        }

        // 1. Analyze Semantic Relationships
        // We send just the textual/type content to save tokens
        const simplifiedObjects = objects.map(obj => ({
            id: obj.id,
            text: obj.text || (obj.type === 'image' ? 'Image' : 'Shape'),
            type: obj.type
        }));

        const prompt = `
        Analyze the following whiteboard items and group them semantically.
        Return a JSON object where keys are "clusters" and values are arrays of item IDs.
        Also assign an "importance" score (1-10) to each item.
        
        Items: ${JSON.stringify(simplifiedObjects)}
        
        Output Format (JSON only):
        {
            "clusters": [
                { "name": "Topic A", "items": ["id1", "id2"] },
                ...
            ],
            "importance": { "id1": 10, "id2": 5 }
        }
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a layout engine assistant." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2
        });

        const result = JSON.parse(response.choices[0].message.content);

        // 2. Map AI result to physical coordinates
        return applySemanticLayout(objects, result);

    } catch (error) {
        logger.error('Smart Layout failed:', error);
        return applyHeuristicLayout(objects, 'grid');
    }
};

// --- Layout Strategies ---

const applyHeuristicLayout = (objects, type) => {
    const PADDING = 20;
    const items = [...objects];

    // Simple Grid Packer
    if (type === 'grid') {
        const cols = Math.ceil(Math.sqrt(items.length));
        let x = 0;
        let y = 0;
        let maxHeightInRow = 0;

        return items.map((item, index) => {
            if (index > 0 && index % cols === 0) {
                x = 0;
                y += maxHeightInRow + PADDING;
                maxHeightInRow = 0;
            }

            const newItem = { ...item, x, y };

            x += (item.width || 200) + PADDING;
            maxHeightInRow = Math.max(maxHeightInRow, item.height || 200);

            return newItem;
        });
    }

    return items;
};

const applySemanticLayout = (objects, aiResult) => {
    const { clusters } = aiResult;
    const CLUSTER_PADDING = 100;
    const ITEM_PADDING = 20;

    let clusterY = 0;
    let finalObjects = [];

    // Map needed for quick lookup
    const objMap = new Map(objects.map(o => [o.id, o]));

    // Iterate through semantic clusters
    for (const cluster of clusters) {
        const clusterItems = cluster.items
            .map(id => objMap.get(id))
            .filter(Boolean); // Filter out any missing ids

        if (clusterItems.length === 0) continue;

        // Layout items within this cluster (Simulate a row or grid)
        let x = 0;
        let maxHeight = 0;

        // Improve: Use grid for large clusters
        const cols = Math.ceil(Math.sqrt(clusterItems.length));

        clusterItems.forEach((item, index) => {
            if (index > 0 && index % cols === 0) {
                x = 0;
                clusterY += maxHeight + ITEM_PADDING;
                maxHeight = 0;
            }

            // Assign Pos
            const updated = {
                ...item,
                x: x,
                y: clusterY
            };

            finalObjects.push(updated);

            // Advance X
            x += (item.width || 200) + ITEM_PADDING;
            maxHeight = Math.max(maxHeight, item.height || 200);
        });

        // Advance Y for next cluster
        clusterY += maxHeight + CLUSTER_PADDING;
    }

    // Handle any orphans (items not in clusters)
    const placedIds = new Set(finalObjects.map(o => o.id));
    const orphans = objects.filter(o => !placedIds.has(o.id));

    if (orphans.length > 0) {
        clusterY += CLUSTER_PADDING;
        orphans.forEach(item => {
            finalObjects.push({ ...item, x: 0, y: clusterY });
            clusterY += (item.height || 200) + ITEM_PADDING;
        });
    }

    return finalObjects;
};
