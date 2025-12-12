import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import { nanoid } from 'nanoid';

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy_key'
});

/**
 * Board Transformer - Format Conversion System
 * 
 * Restructures board content into different formats (timeline, table,
 * flowchart, mindmap) using AI-powered recategorization and reorganization.
 * 
 * @param {object} boardJSON - Complete board state
 * @param {string} mode - Target format ('timeline' | 'table' | 'flowchart' | 'mindmap')
 * @param {object} options - Transformation options
 * @returns {Promise<object>} Transformed nodes and edges
 */
export async function transformObjects(boardJSON, mode, options = {}) {
    const {
        useLLM = true,
        preserveOriginal = false,
        autoLayout = true,
        groupSimilar = true
    } = options;

    console.log(`🔄 Transformer: Converting to ${mode} format...`);

    try {
        // Step 1: Analyze board content
        const analysis = analyzeBoard(boardJSON);

        // Step 2: Categorize and reorganize
        let categorized;
        if (useLLM && process.env.OPENAI_API_KEY) {
            categorized = await categorizeLLM(analysis, mode);
        } else {
            categorized = categorizeHeuristic(analysis, mode);
        }

        // Step 3: Transform to target format
        const transformed = await transformToFormat(categorized, mode, {
            autoLayout,
            groupSimilar,
            originalBoard: preserveOriginal ? boardJSON : null
        });

        console.log(`✅ Transformed to ${mode} format`);
        return {
            timestamp: new Date().toISOString(),
            mode,
            original: preserveOriginal ? boardJSON : undefined,
            transformed: {
                nodes: transformed.nodes,
                edges: transformed.edges,
                groups: transformed.groups || [],
                metadata: transformed.metadata
            },
            stats: {
                originalNodes: boardJSON.nodes?.length || 0,
                transformedNodes: transformed.nodes.length,
                originalEdges: boardJSON.edges?.length || 0,
                transformedEdges: transformed.edges.length
            }
        };

    } catch (error) {
        logger.error('Transformation Error:', error);
        return getFallbackTransformation(boardJSON, mode);
    }
}

/**
 * Analyze board content
 */
function analyzeBoard(boardJSON) {
    const { nodes = [], edges = [] } = boardJSON;

    const analysis = {
        nodes: nodes.map(node => ({
            id: node.id,
            label: node.data?.label || '',
            type: node.type || 'default',
            position: { x: node.x || 0, y: node.y || 0 },
            metadata: node.data || {}
        })),
        edges: edges.map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            label: edge.label || ''
        })),
        patterns: detectPatterns(nodes, edges),
        categories: extractCategories(nodes),
        temporal: detectTemporal(nodes),
        hierarchical: detectHierarchical(nodes, edges)
    };

    return analysis;
}

/**
 * Detect patterns in board
 */
function detectPatterns(nodes, edges) {
    const patterns = {
        sequential: false,
        hierarchical: false,
        networked: false,
        temporal: false,
        categorical: false
    };

    // Sequential: linear chain
    const avgConnectionsPerNode = edges.length / Math.max(nodes.length, 1);
    if (avgConnectionsPerNode <= 1.5 && edges.length > 0) {
        patterns.sequential = true;
    }

    // Hierarchical: tree structure
    const roots = nodes.filter(n => !edges.some(e => e.target === n.id));
    if (roots.length > 0 && roots.length < nodes.length * 0.3) {
        patterns.hierarchical = true;
    }

    // Networked: many connections
    if (avgConnectionsPerNode > 2) {
        patterns.networked = true;
    }

    // Temporal: date/time keywords
    const temporalKeywords = ['date', 'time', 'when', 'day', 'month', 'year', 'q1', 'q2', 'q3', 'q4'];
    patterns.temporal = nodes.some(n =>
        temporalKeywords.some(kw => (n.data?.label || '').toLowerCase().includes(kw))
    );

    // Categorical: groups or categories
    const categoryKeywords = ['category', 'type', 'group', 'class'];
    patterns.categorical = nodes.some(n =>
        categoryKeywords.some(kw => (n.data?.label || '').toLowerCase().includes(kw))
    );

    return patterns;
}

/**
 * Extract categories from nodes
 */
function extractCategories(nodes) {
    const categories = new Map();

    nodes.forEach(node => {
        const label = (node.data?.label || '').toLowerCase();
        const words = label.split(/\s+/);

        // Simple categorization by first word or type
        const category = node.type || words[0] || 'uncategorized';

        if (!categories.has(category)) {
            categories.set(category, []);
        }
        categories.get(category).push(node.id);
    });

    return Array.from(categories.entries()).map(([name, nodeIds]) => ({
        name,
        nodes: nodeIds,
        count: nodeIds.length
    }));
}

/**
 * Detect temporal information
 */
function detectTemporal(nodes) {
    const temporal = [];

    nodes.forEach(node => {
        const label = node.data?.label || '';

        // Look for dates, months, quarters
        const dateMatch = label.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/);
        const monthMatch = label.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i);
        const quarterMatch = label.match(/q[1-4]/i);

        if (dateMatch || monthMatch || quarterMatch) {
            temporal.push({
                nodeId: node.id,
                label,
                date: dateMatch?.[0],
                month: monthMatch?.[0],
                quarter: quarterMatch?.[0]
            });
        }
    });

    return temporal.sort((a, b) => {
        // Simple chronological sort
        if (a.date && b.date) return a.date.localeCompare(b.date);
        if (a.quarter && b.quarter) return a.quarter.localeCompare(b.quarter);
        if (a.month && b.month) return a.month.localeCompare(b.month);
        return 0;
    });
}

/**
 * Detect hierarchical structure
 */
function detectHierarchical(nodes, edges) {
    const hierarchy = {
        roots: [],
        levels: new Map()
    };

    // Find root nodes (no incoming edges)
    const roots = nodes.filter(n => !edges.some(e => e.target === n.id));
    hierarchy.roots = roots.map(r => r.id);

    // Build levels using BFS
    const visited = new Set();
    const queue = roots.map(r => ({ id: r.id, level: 0 }));

    while (queue.length > 0) {
        const { id, level } = queue.shift();
        if (visited.has(id)) continue;
        visited.add(id);

        if (!hierarchy.levels.has(level)) {
            hierarchy.levels.set(level, []);
        }
        hierarchy.levels.get(level).push(id);

        // Add children
        edges
            .filter(e => e.source === id)
            .forEach(e => queue.push({ id: e.target, level: level + 1 }));
    }

    return hierarchy;
}

/**
 * Categorize using LLM
 */
async function categorizeLLM(analysis, mode) {
    if (!process.env.OPENAI_API_KEY) {
        return categorizeHeuristic(analysis, mode);
    }

    const prompt = buildCategorizationPrompt(analysis, mode);

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: `You are an expert at organizing and restructuring content into ${mode} format. Always return valid JSON.` },
                { role: 'user', content: prompt }
            ],
            temperature: 0.5,
            response_format: { type: 'json_object' }
        });

        const result = JSON.parse(response.choices[0].message.content);
        return result;

    } catch (error) {
        logger.error('LLM Categorization Error:', error);
        return categorizeHeuristic(analysis, mode);
    }
}

/**
 * Build categorization prompt
 */
function buildCategorizationPrompt(analysis, mode) {
    const nodeLabels = analysis.nodes.map(n => n.label).filter(Boolean);

    return `Reorganize these whiteboard elements into ${mode} format.

**Elements:**
${nodeLabels.slice(0, 50).map((label, i) => `${i + 1}. ${label}`).join('\n')}

**Current Patterns:**
- Sequential: ${analysis.patterns.sequential}
- Hierarchical: ${analysis.patterns.hierarchical}
- Temporal: ${analysis.patterns.temporal}

**Target Format:** ${mode}

**Your Task:**
Categorize and reorganize these elements for ${mode} format. 

For ${mode}, provide:
${getFormatInstructions(mode)}

**Output Format (JSON only):**
${getFormatSchema(mode)}

Return ONLY valid JSON.`;
}

/**
 * Get format-specific instructions
 */
function getFormatInstructions(mode) {
    const instructions = {
        timeline: `- Chronological events with dates/periods
- Milestones and phases
- Sequential progression`,

        table: `- Row and column structure
- Categories and attributes
- Organized data`,

        flowchart: `- Process steps in sequence
- Decision points
- Flow direction`,

        mindmap: `- Central topic
- Main branches (themes)
- Sub-branches (details)`
    };

    return instructions[mode] || 'Organized structure';
}

/**
 * Get format-specific schema
 */
function getFormatSchema(mode) {
    const schemas = {
        timeline: `{
  "events": [
    { "id": "node_id", "label": "event name", "date": "YYYY-MM-DD or period", "phase": "phase name" }
  ],
  "phases": ["phase1", "phase2"]
}`,

        table: `{
  "columns": ["col1", "col2", "col3"],
  "rows": [
    { "id": "node_id", "values": { "col1": "value1", "col2": "value2" } }
  ],
  "categories": ["category1", "category2"]
}`,

        flowchart: `{
  "steps": [
    { "id": "node_id", "label": "step name", "type": "process|decision|start|end", "order": 1 }
  ],
  "connections": [
    { "from": "id1", "to": "id2", "condition": "yes/no/default" }
  ]
}`,

        mindmap: `{
  "central": { "id": "node_id", "label": "main topic" },
  "branches": [
    { "id": "node_id", "label": "branch name", "children": ["child_id1", "child_id2"] }
  ]
}`
    };

    return schemas[mode] || '{}';
}

/**
 * Categorize using heuristics
 */
function categorizeHeuristic(analysis, mode) {
    switch (mode) {
        case 'timeline':
            return categorizeTimeline(analysis);
        case 'table':
            return categorizeTable(analysis);
        case 'flowchart':
            return categorizeFlowchart(analysis);
        case 'mindmap':
            return categorizeMindmap(analysis);
        default:
            return { nodes: analysis.nodes, edges: analysis.edges };
    }
}

/**
 * Categorize for timeline
 */
function categorizeTimeline(analysis) {
    const events = [];
    const phases = new Set();

    // Use temporal detection
    if (analysis.temporal.length > 0) {
        analysis.temporal.forEach((temp, index) => {
            const node = analysis.nodes.find(n => n.id === temp.nodeId);
            if (node) {
                const phase = temp.quarter || temp.month || `Event ${Math.floor(index / 5) + 1}`;
                phases.add(phase);

                events.push({
                    id: node.id,
                    label: node.label,
                    date: temp.date || temp.month || temp.quarter || `T${index}`,
                    phase
                });
            }
        });
    } else {
        // Fallback: use order
        analysis.nodes.forEach((node, index) => {
            const phase = `Phase ${Math.floor(index / 5) + 1}`;
            phases.add(phase);

            events.push({
                id: node.id,
                label: node.label,
                date: `T${index}`,
                phase
            });
        });
    }

    return {
        events,
        phases: Array.from(phases)
    };
}

/**
 * Categorize for table
 */
function categorizeTable(analysis) {
    const columns = ['Name', 'Type', 'Category'];
    const rows = [];
    const categories = new Set();

    analysis.nodes.forEach(node => {
        const category = node.type || 'default';
        categories.add(category);

        rows.push({
            id: node.id,
            values: {
                'Name': node.label,
                'Type': node.type || 'default',
                'Category': category
            }
        });
    });

    return {
        columns,
        rows,
        categories: Array.from(categories)
    };
}

/**
 * Categorize for flowchart
 */
function categorizeFlowchart(analysis) {
    const steps = [];
    const connections = [];

    // Determine step types based on connections
    analysis.nodes.forEach((node, index) => {
        const outgoing = analysis.edges.filter(e => e.source === node.id).length;
        const incoming = analysis.edges.filter(e => e.target === node.id).length;

        let type = 'process';
        if (incoming === 0) type = 'start';
        else if (outgoing === 0) type = 'end';
        else if (outgoing > 1) type = 'decision';

        steps.push({
            id: node.id,
            label: node.label,
            type,
            order: index
        });
    });

    // Map connections
    analysis.edges.forEach(edge => {
        connections.push({
            from: edge.source,
            to: edge.target,
            condition: edge.label || 'default'
        });
    });

    return {
        steps,
        connections
    };
}

/**
 * Categorize for mindmap
 */
function categorizeMindmap(analysis) {
    // Find central node (most connected or first root)
    const connectionCounts = new Map();
    analysis.edges.forEach(edge => {
        connectionCounts.set(edge.source, (connectionCounts.get(edge.source) || 0) + 1);
        connectionCounts.set(edge.target, (connectionCounts.get(edge.target) || 0) + 1);
    });

    const centralId = analysis.hierarchical.roots[0] ||
        Array.from(connectionCounts.entries())
            .sort((a, b) => b[1] - a[1])[0]?.[0] ||
        analysis.nodes[0]?.id;

    const central = analysis.nodes.find(n => n.id === centralId);

    // Build branches
    const branches = [];
    const visited = new Set([centralId]);

    analysis.edges
        .filter(e => e.source === centralId)
        .forEach(edge => {
            const branchNode = analysis.nodes.find(n => n.id === edge.target);
            if (branchNode) {
                const children = findChildren(edge.target, analysis.edges, analysis.nodes, visited);
                branches.push({
                    id: branchNode.id,
                    label: branchNode.label,
                    children: children.map(c => c.id)
                });
            }
        });

    return {
        central: {
            id: central?.id || 'central',
            label: central?.label || 'Main Topic'
        },
        branches
    };
}

/**
 * Find children recursively
 */
function findChildren(nodeId, edges, nodes, visited) {
    const children = [];
    visited.add(nodeId);

    edges
        .filter(e => e.source === nodeId && !visited.has(e.target))
        .forEach(edge => {
            const child = nodes.find(n => n.id === edge.target);
            if (child) {
                children.push(child);
                children.push(...findChildren(edge.target, edges, nodes, visited));
            }
        });

    return children;
}

/**
 * Transform to target format
 */
async function transformToFormat(categorized, mode, options) {
    switch (mode) {
        case 'timeline':
            return transformTimeline(categorized, options);
        case 'table':
            return transformTable(categorized, options);
        case 'flowchart':
            return transformFlowchart(categorized, options);
        case 'mindmap':
            return transformMindmap(categorized, options);
        default:
            return { nodes: [], edges: [] };
    }
}

/**
 * Transform to timeline
 */
function transformTimeline(categorized, options) {
    const nodes = [];
    const edges = [];
    const groups = [];

    // Create phase groups
    categorized.phases.forEach((phase, phaseIndex) => {
        groups.push({
            id: `phase-${phaseIndex}`,
            label: phase,
            type: 'phase'
        });
    });

    // Create event nodes
    categorized.events.forEach((event, index) => {
        const phaseIndex = categorized.phases.indexOf(event.phase);

        nodes.push({
            id: event.id || `event-${index}`,
            type: 'timeline-event',
            x: index * 200,
            y: phaseIndex * 100,
            data: {
                label: event.label,
                date: event.date,
                phase: event.phase
            }
        });

        // Connect sequential events
        if (index > 0) {
            edges.push({
                id: `edge-${index}`,
                source: categorized.events[index - 1].id || `event-${index - 1}`,
                target: event.id || `event-${index}`,
                type: 'timeline-arrow'
            });
        }
    });

    return {
        nodes,
        edges,
        groups,
        metadata: {
            format: 'timeline',
            phases: categorized.phases,
            eventCount: categorized.events.length
        }
    };
}

/**
 * Transform to table
 */
function transformTable(categorized, options) {
    const nodes = [];
    const edges = [];

    // Create header nodes
    categorized.columns.forEach((col, colIndex) => {
        nodes.push({
            id: `header-${colIndex}`,
            type: 'table-header',
            x: colIndex * 200,
            y: 0,
            data: {
                label: col,
                column: colIndex
            }
        });
    });

    // Create data nodes
    categorized.rows.forEach((row, rowIndex) => {
        categorized.columns.forEach((col, colIndex) => {
            nodes.push({
                id: `cell-${rowIndex}-${colIndex}`,
                type: 'table-cell',
                x: colIndex * 200,
                y: (rowIndex + 1) * 80,
                data: {
                    label: row.values[col] || '',
                    row: rowIndex,
                    column: colIndex,
                    originalId: row.id
                }
            });
        });
    });

    return {
        nodes,
        edges,
        metadata: {
            format: 'table',
            columns: categorized.columns,
            rows: categorized.rows.length,
            categories: categorized.categories
        }
    };
}

/**
 * Transform to flowchart
 */
function transformFlowchart(categorized, options) {
    const nodes = [];
    const edges = [];

    // Create flowchart nodes
    categorized.steps.forEach((step, index) => {
        nodes.push({
            id: step.id || `step-${index}`,
            type: `flowchart-${step.type}`,
            x: (index % 3) * 250,
            y: Math.floor(index / 3) * 150,
            data: {
                label: step.label,
                flowType: step.type,
                order: step.order
            }
        });
    });

    // Create connections
    categorized.connections.forEach((conn, index) => {
        edges.push({
            id: `flow-${index}`,
            source: conn.from,
            target: conn.to,
            label: conn.condition !== 'default' ? conn.condition : '',
            type: 'flowchart-arrow'
        });
    });

    return {
        nodes,
        edges,
        metadata: {
            format: 'flowchart',
            stepCount: categorized.steps.length,
            decisionPoints: categorized.steps.filter(s => s.type === 'decision').length
        }
    };
}

/**
 * Transform to mindmap
 */
function transformMindmap(categorized, options) {
    const nodes = [];
    const edges = [];

    // Central node
    nodes.push({
        id: categorized.central.id,
        type: 'mindmap-central',
        x: 0,
        y: 0,
        data: {
            label: categorized.central.label
        }
    });

    // Branch nodes
    categorized.branches.forEach((branch, branchIndex) => {
        const angle = (branchIndex / categorized.branches.length) * 2 * Math.PI;
        const radius = 300;

        nodes.push({
            id: branch.id,
            type: 'mindmap-branch',
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
            data: {
                label: branch.label
            }
        });

        edges.push({
            id: `branch-${branchIndex}`,
            source: categorized.central.id,
            target: branch.id,
            type: 'mindmap-curve'
        });

        // Children
        branch.children.forEach((childId, childIndex) => {
            const childAngle = angle + (childIndex - branch.children.length / 2) * 0.3;
            const childRadius = radius + 150;

            nodes.push({
                id: childId,
                type: 'mindmap-leaf',
                x: Math.cos(childAngle) * childRadius,
                y: Math.sin(childAngle) * childRadius,
                data: {
                    label: childId
                }
            });

            edges.push({
                id: `child-${branchIndex}-${childIndex}`,
                source: branch.id,
                target: childId,
                type: 'mindmap-curve'
            });
        });
    });

    return {
        nodes,
        edges,
        metadata: {
            format: 'mindmap',
            central: categorized.central.label,
            branches: categorized.branches.length
        }
    };
}

/**
 * Get fallback transformation
 */
function getFallbackTransformation(boardJSON, mode) {
    return {
        timestamp: new Date().toISOString(),
        mode,
        transformed: {
            nodes: boardJSON.nodes || [],
            edges: boardJSON.edges || [],
            groups: [],
            metadata: {
                format: mode,
                fallback: true
            }
        },
        stats: {
            originalNodes: boardJSON.nodes?.length || 0,
            transformedNodes: boardJSON.nodes?.length || 0,
            originalEdges: boardJSON.edges?.length || 0,
            transformedEdges: boardJSON.edges?.length || 0
        }
    };
}

/**
 * Quick transform (heuristic only)
 */
export async function quickTransform(boardJSON, mode) {
    return await transformObjects(boardJSON, mode, {
        useLLM: false,
        preserveOriginal: false,
        autoLayout: true,
        groupSimilar: false
    });
}

export default transformObjects;
