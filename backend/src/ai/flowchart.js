import { GoogleGenerativeAI } from "@google/generative-ai";
import { nanoid } from 'nanoid';

// Initialize Gemini
// Ensure process.env.GEMINI_API_KEY is set
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_API_KEY");

/**
 * generateFlowchart
 * 
 * Generates a structured flowchart (nodes/edges) from a text description using LLM.
 * Includes basic layout heuristics.
 * 
 * @param {string} text - User description of the process
 * @returns {Promise<{nodes: Array, edges: Array}>}
 */
export const generateFlowchart = async (text) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `
        You are a process visualization expert. Convert the following text description into a structured Flowchart.
        
        Text: "${text}"
        
        Output strictly valid JSON with the following structure:
        {
          "nodes": [ { "id": "unique_string", "label": "Step Description", "type": "process" | "decision" | "start" | "end" } ],
          "edges": [ { "from": "id_source", "to": "id_target", "label": "yes/no/next" } ]
        }
        
        Rules:
        1. Identify the logical flow.
        2. Assign "start" and "end" nodes appropriately.
        3. For questions or branches, use "decision" nodes (Diamond shape logic).
        4. "process" is for actions (Rect logic).
        5. Ensure all IDs are unique.
        6. Do NOT include markdown formatting (like \`\`\`json). Just the JSON string.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const rawText = response.text();

        // Clean cleanup markdown if LLM adds it
        const jsonString = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

        const data = JSON.parse(jsonString);

        // --- Layout Heuristics ---
        // Simple DAG layout: Top-to-Bottom
        // We'll organize by "levels". Start node is level 0. Children are level + 1.

        const nodesMap = new Map();
        data.nodes.forEach(n => {
            nodesMap.set(n.id, { ...n, level: 0, x: 0, y: 0 });
        });

        const adj = new Map(); // id -> [child_id]
        data.edges.forEach(e => {
            if (!adj.has(e.from)) adj.set(e.from, []);
            adj.get(e.from).push(e.to);
        });

        // Compute levels (BFS)
        // Find Start nodes (in-degree 0 ideally, or type 'start')
        // Usually LLM marks 'start'.
        let startNodes = data.nodes.filter(n => n.type === 'start');
        if (startNodes.length === 0) startNodes = [data.nodes[0]]; // Fallback

        const queue = startNodes.map(n => ({ id: n.id, lvl: 0 }));
        const visited = new Set();

        // simple BFS for levels
        while (queue.length > 0) {
            const { id, lvl } = queue.shift();
            if (visited.has(id)) continue;
            visited.add(id);

            const n = nodesMap.get(id);
            if (n) n.level = Math.max(n.level, lvl);

            const children = adj.get(id) || [];
            children.forEach(childId => {
                queue.push({ id: childId, lvl: lvl + 1 });
            });
        }

        // Assign XY based on levels
        // Group by level
        const levels = [];
        nodesMap.forEach(n => {
            if (!levels[n.level]) levels[n.level] = [];
            levels[n.level].push(n);
        });

        const LEVEL_HEIGHT = 150;
        const NODE_SPACING = 200;

        levels.forEach((lvlNodes, lvlIndex) => {
            if (!lvlNodes) return;
            const totalWidth = lvlNodes.length * NODE_SPACING;
            const startX = -(totalWidth / 2) + (NODE_SPACING / 2); // Center align

            lvlNodes.forEach((node, nodeIndex) => {
                node.x = 400 + startX + (nodeIndex * NODE_SPACING); // 400 is center of screen offset
                node.y = 100 + lvlIndex * LEVEL_HEIGHT;

                // Assign Flowspace specific props
                node.w = 160;
                node.h = 80;
                if (node.type === 'decision') {
                    // Maybe visual helper later
                }
            });
        });

        // Prepare finalized structure
        const finalNodes = Array.from(nodesMap.values());

        // Map edges to Flowspace format if needed? 
        // Flowspace edges: { id, source, target, sourceHandle, targetHandle }
        // Our simplified generator: { from, to }
        const finalEdges = data.edges.map(e => ({
            id: nanoid(),
            source: e.from,
            target: e.to,
            label: e.label,
            // Logic to assign handles (bottom of source, top of target)
            // For now simple default.
            sourceHandle: 'bottom',
            targetHandle: 'top'
        }));

        return {
            nodes: finalNodes,
            edges: finalEdges
        };

    } catch (error) {
        console.error("AI Flowchart Generation Failed:", error);
        throw new Error("Failed to generate flowchart");
    }
};
