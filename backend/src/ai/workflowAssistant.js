import { GoogleGenerativeAI } from '@google/generative-ai';
import { nanoid } from 'nanoid';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Workflow Assistant - Transform messy boards into polished workflows
 * 
 * Takes board content or semantic map and generates structured, optimized workflows
 * with proper flow, decision points, and parallel branches.
 * 
 * @param {object} input - Board semantic map or raw board data
 * @param {object} options - Generation options
 * @returns {Promise<object>} Structured workflow with nodes and edges
 */
export async function generateWorkflow(input, options = {}) {
    const {
        mode = 'optimize',  // 'simplify' | 'optimize' | 'expand' | 'convert-to-flowchart' | 'convert-to-timeline'
        style = 'professional',  // 'professional' | 'casual' | 'technical'
        autoLayout = true,
        preserveContent = true
    } = options;

    console.log(`🔄 Workflow Assistant: Generating ${mode} workflow...`);

    if (!process.env.GEMINI_API_KEY) {
        console.warn('⚠️  GEMINI_API_KEY not set, using fallback workflow generation');
        return generateFallbackWorkflow(input, options);
    }

    // Step 1: Extract and prepare context
    const context = prepareWorkflowContext(input);

    // Step 2: Generate workflow using LLM
    const workflowData = await generateWorkflowWithLLM(context, mode, style);

    // Step 3: Structure and validate
    const structuredWorkflow = structureWorkflow(workflowData, options);

    // Step 4: Apply auto-layout if enabled
    if (autoLayout) {
        applyAutoLayout(structuredWorkflow, mode);
    }

    console.log('✅ Workflow generated successfully');
    return structuredWorkflow;
}

/**
 * Prepare context from board data or semantic map
 */
function prepareWorkflowContext(input) {
    // Check if input is a semantic map or raw board data
    const isSemanticMap = input.topics || input.clusters || input.hierarchies;

    if (isSemanticMap) {
        return extractContextFromSemanticMap(input);
    } else {
        return extractContextFromBoardData(input);
    }
}

/**
 * Extract context from semantic map
 */
function extractContextFromSemanticMap(semanticMap) {
    const context = {
        type: 'semantic_map',
        summary: '',
        elements: [],
        relationships: [],
        topics: [],
        issues: []
    };

    // Extract main topics
    if (semanticMap.topics) {
        context.topics = semanticMap.topics.slice(0, 10).map(t => t.keyword);
    }

    // Extract hierarchies as relationships
    if (semanticMap.hierarchies) {
        semanticMap.hierarchies.forEach(hierarchy => {
            context.relationships.push({
                type: 'hierarchy',
                root: hierarchy.rootText,
                depth: hierarchy.depth,
                levels: hierarchy.levels
            });
        });
    }

    // Extract dependency chains
    if (semanticMap.dependencies?.chains) {
        semanticMap.dependencies.chains.forEach(chain => {
            context.relationships.push({
                type: 'sequence',
                steps: chain.steps.map(s => s.text)
            });
        });
    }

    // Extract insights if available
    if (semanticMap.insights) {
        context.summary = semanticMap.insights.summary || '';
        context.themes = semanticMap.insights.mainThemes || [];
        context.missing = semanticMap.insights.missingElements || [];
    }

    // Extract issues
    if (semanticMap.issues) {
        context.issues = semanticMap.issues.map(i => ({
            type: i.type,
            description: i.description
        }));
    }

    return context;
}

/**
 * Extract context from raw board data
 */
function extractContextFromBoardData(boardData) {
    const { nodes = [], edges = [], strokes = [] } = boardData;

    const context = {
        type: 'raw_board',
        elements: [],
        connections: [],
        summary: ''
    };

    // Extract node information
    nodes.forEach(node => {
        context.elements.push({
            id: node.id,
            text: node.data?.label || '',
            type: node.type || 'default',
            position: { x: node.x || 0, y: node.y || 0 }
        });
    });

    // Extract connections
    edges.forEach(edge => {
        const source = nodes.find(n => n.id === edge.source);
        const target = nodes.find(n => n.id === edge.target);

        if (source && target) {
            context.connections.push({
                from: source.data?.label || source.id,
                to: target.data?.label || target.id,
                label: edge.label || ''
            });
        }
    });

    // Create summary
    context.summary = `Board with ${nodes.length} nodes and ${edges.length} connections`;

    return context;
}

/**
 * Generate workflow using LLM
 */
async function generateWorkflowWithLLM(context, mode, style) {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = buildWorkflowPrompt(context, mode, style);

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean and parse JSON
        const jsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error('LLM Workflow Generation Error:', error);
        throw new Error('Failed to generate workflow with AI');
    }
}

/**
 * Build prompt based on mode
 */
function buildWorkflowPrompt(context, mode, style) {
    const basePrompt = `You are an expert workflow designer. Your task is to create a polished, professional workflow diagram.

**Context:**
${JSON.stringify(context, null, 2)}

**Style:** ${style}
**Mode:** ${mode}

`;

    const modeInstructions = {
        'simplify': `
**Task: SIMPLIFY**
Take the existing workflow and simplify it by:
1. Removing redundant steps
2. Merging similar actions
3. Eliminating unnecessary complexity
4. Keeping only essential elements
5. Creating a clear, linear flow where possible

Output a streamlined workflow with 30-50% fewer nodes than the original.
`,

        'optimize': `
**Task: OPTIMIZE**
Improve the workflow by:
1. Reorganizing steps for better efficiency
2. Identifying and removing bottlenecks
3. Adding missing critical steps
4. Improving decision point clarity
5. Ensuring logical flow and dependencies
6. Adding parallel processing where beneficial

Output an optimized workflow that maintains all functionality but improves structure.
`,

        'expand': `
**Task: EXPAND**
Elaborate the workflow by:
1. Breaking down high-level steps into detailed sub-steps
2. Adding error handling and edge cases
3. Including validation and verification steps
4. Adding decision points for different scenarios
5. Documenting prerequisites and outputs
6. Including alternative paths

Output a comprehensive, detailed workflow with 2-3x more nodes.
`,

        'convert-to-flowchart': `
**Task: CONVERT TO FLOWCHART**
Transform the content into a proper flowchart with:
1. Clear start and end points
2. Process boxes (rectangles)
3. Decision diamonds (yes/no branches)
4. Input/Output parallelograms
5. Proper flow arrows
6. Swim lanes if multiple actors involved

Use standard flowchart conventions and symbols.
`,

        'convert-to-timeline': `
**Task: CONVERT TO TIMELINE**
Transform the content into a timeline with:
1. Chronological ordering of events
2. Time estimates or phases
3. Milestones and deliverables
4. Dependencies between timeline items
5. Parallel tracks if multiple streams exist
6. Clear start and end dates/phases

Output a linear or multi-track timeline structure.
`
    };

    const outputFormat = `
**Output Format (JSON only, no markdown):**
{
  "title": "Workflow Title",
  "description": "Brief description of what this workflow does",
  "metadata": {
    "estimatedDuration": "time estimate",
    "complexity": "low|medium|high",
    "actors": ["actor1", "actor2"],
    "tags": ["tag1", "tag2"]
  },
  "nodes": [
    {
      "id": "unique-id",
      "type": "start|process|decision|input|output|end|milestone",
      "label": "Node label",
      "description": "Detailed description",
      "data": {
        "duration": "optional time",
        "actor": "who performs this",
        "prerequisites": ["prereq1"],
        "outputs": ["output1"]
      },
      "style": {
        "color": "#hex",
        "shape": "rectangle|diamond|circle|parallelogram"
      }
    }
  ],
  "edges": [
    {
      "id": "edge-id",
      "source": "source-node-id",
      "target": "target-node-id",
      "label": "optional label (e.g., 'Yes', 'No', 'Next')",
      "type": "normal|conditional|parallel",
      "data": {
        "condition": "optional condition description"
      }
    }
  ],
  "groups": [
    {
      "id": "group-id",
      "label": "Group/Phase name",
      "nodeIds": ["node1", "node2"],
      "color": "#hex"
    }
  ],
  "annotations": [
    {
      "nodeId": "node-id",
      "text": "Important note or tip",
      "type": "info|warning|tip"
    }
  ]
}

**Requirements:**
1. Every workflow must have exactly ONE start node and at least ONE end node
2. All nodes must be connected (no orphans)
3. Decision nodes must have at least 2 outgoing edges with clear labels
4. Use descriptive labels (not just "Step 1", "Step 2")
5. Ensure logical flow (no circular dependencies unless intentional loops)
6. Include realistic time estimates where applicable
7. Use appropriate node types for each step

Return ONLY valid JSON, no markdown blocks or explanations.
`;

    return basePrompt + modeInstructions[mode] + outputFormat;
}

/**
 * Structure and validate workflow
 */
function structureWorkflow(workflowData, options) {
    const workflow = {
        id: nanoid(),
        timestamp: new Date().toISOString(),
        mode: options.mode || 'optimize',
        title: workflowData.title || 'Generated Workflow',
        description: workflowData.description || '',
        metadata: workflowData.metadata || {},
        nodes: [],
        edges: [],
        groups: workflowData.groups || [],
        annotations: workflowData.annotations || [],
        stats: {
            nodeCount: 0,
            edgeCount: 0,
            decisionPoints: 0,
            parallelBranches: 0
        }
    };

    // Validate and structure nodes
    if (workflowData.nodes) {
        workflowData.nodes.forEach(node => {
            const structuredNode = {
                id: node.id || nanoid(),
                type: node.type || 'process',
                label: node.label || 'Untitled Step',
                description: node.description || '',
                data: {
                    ...node.data,
                    workflowType: node.type
                },
                style: node.style || getDefaultNodeStyle(node.type),
                position: { x: 0, y: 0 } // Will be set by auto-layout
            };

            workflow.nodes.push(structuredNode);

            // Update stats
            if (node.type === 'decision') {
                workflow.stats.decisionPoints++;
            }
        });

        workflow.stats.nodeCount = workflow.nodes.length;
    }

    // Validate and structure edges
    if (workflowData.edges) {
        workflowData.edges.forEach(edge => {
            const structuredEdge = {
                id: edge.id || nanoid(),
                source: edge.source,
                target: edge.target,
                label: edge.label || '',
                type: edge.type || 'normal',
                data: edge.data || {},
                style: getDefaultEdgeStyle(edge.type)
            };

            workflow.edges.push(structuredEdge);

            // Update stats
            if (edge.type === 'parallel') {
                workflow.stats.parallelBranches++;
            }
        });

        workflow.stats.edgeCount = workflow.edges.length;
    }

    // Validate workflow structure
    validateWorkflowStructure(workflow);

    return workflow;
}

/**
 * Get default node style based on type
 */
function getDefaultNodeStyle(type) {
    const styles = {
        'start': {
            color: '#10b981',
            shape: 'circle',
            backgroundColor: '#d1fae5',
            borderColor: '#10b981',
            borderWidth: 2
        },
        'end': {
            color: '#ef4444',
            shape: 'circle',
            backgroundColor: '#fee2e2',
            borderColor: '#ef4444',
            borderWidth: 2
        },
        'process': {
            color: '#3b82f6',
            shape: 'rectangle',
            backgroundColor: '#dbeafe',
            borderColor: '#3b82f6',
            borderWidth: 2
        },
        'decision': {
            color: '#f59e0b',
            shape: 'diamond',
            backgroundColor: '#fef3c7',
            borderColor: '#f59e0b',
            borderWidth: 2
        },
        'input': {
            color: '#8b5cf6',
            shape: 'parallelogram',
            backgroundColor: '#ede9fe',
            borderColor: '#8b5cf6',
            borderWidth: 2
        },
        'output': {
            color: '#8b5cf6',
            shape: 'parallelogram',
            backgroundColor: '#ede9fe',
            borderColor: '#8b5cf6',
            borderWidth: 2
        },
        'milestone': {
            color: '#ec4899',
            shape: 'hexagon',
            backgroundColor: '#fce7f3',
            borderColor: '#ec4899',
            borderWidth: 2
        }
    };

    return styles[type] || styles['process'];
}

/**
 * Get default edge style based on type
 */
function getDefaultEdgeStyle(type) {
    const styles = {
        'normal': {
            strokeWidth: 2,
            stroke: '#64748b',
            animated: false
        },
        'conditional': {
            strokeWidth: 2,
            stroke: '#f59e0b',
            strokeDasharray: '5,5',
            animated: false
        },
        'parallel': {
            strokeWidth: 3,
            stroke: '#8b5cf6',
            animated: true
        }
    };

    return styles[type] || styles['normal'];
}

/**
 * Validate workflow structure
 */
function validateWorkflowStructure(workflow) {
    const issues = [];

    // Check for start node
    const startNodes = workflow.nodes.filter(n => n.type === 'start');
    if (startNodes.length === 0) {
        issues.push('Warning: No start node found');
    } else if (startNodes.length > 1) {
        issues.push('Warning: Multiple start nodes found');
    }

    // Check for end node
    const endNodes = workflow.nodes.filter(n => n.type === 'end');
    if (endNodes.length === 0) {
        issues.push('Warning: No end node found');
    }

    // Check for orphaned nodes
    const connectedNodes = new Set();
    workflow.edges.forEach(edge => {
        connectedNodes.add(edge.source);
        connectedNodes.add(edge.target);
    });

    const orphanedNodes = workflow.nodes.filter(n =>
        !connectedNodes.has(n.id) && n.type !== 'start' && n.type !== 'end'
    );

    if (orphanedNodes.length > 0) {
        issues.push(`Warning: ${orphanedNodes.length} orphaned node(s) found`);
    }

    // Check decision nodes have multiple outputs
    workflow.nodes.filter(n => n.type === 'decision').forEach(decision => {
        const outgoing = workflow.edges.filter(e => e.source === decision.id);
        if (outgoing.length < 2) {
            issues.push(`Warning: Decision node "${decision.label}" has fewer than 2 outgoing edges`);
        }
    });

    if (issues.length > 0) {
        console.warn('Workflow validation issues:', issues);
        workflow.validationIssues = issues;
    }

    return issues.length === 0;
}

/**
 * Apply auto-layout to workflow
 */
function applyAutoLayout(workflow, mode) {
    const layout = mode === 'convert-to-timeline'
        ? applyTimelineLayout(workflow)
        : applyHierarchicalLayout(workflow);

    // Apply calculated positions
    workflow.nodes.forEach(node => {
        const position = layout.positions.get(node.id);
        if (position) {
            node.position = position;
        }
    });

    workflow.layoutMetadata = {
        type: layout.type,
        bounds: layout.bounds,
        appliedAt: new Date().toISOString()
    };
}

/**
 * Apply hierarchical layout (top-to-bottom flow)
 */
function applyHierarchicalLayout(workflow) {
    const positions = new Map();
    const levels = new Map();

    // Find start node
    const startNode = workflow.nodes.find(n => n.type === 'start') || workflow.nodes[0];

    if (!startNode) {
        return { positions, type: 'hierarchical', bounds: {} };
    }

    // Build adjacency list
    const adjacency = new Map();
    workflow.edges.forEach(edge => {
        if (!adjacency.has(edge.source)) {
            adjacency.set(edge.source, []);
        }
        adjacency.get(edge.source).push(edge.target);
    });

    // BFS to assign levels
    const queue = [{ id: startNode.id, level: 0 }];
    const visited = new Set();

    while (queue.length > 0) {
        const { id, level } = queue.shift();

        if (visited.has(id)) continue;
        visited.add(id);

        if (!levels.has(level)) {
            levels.set(level, []);
        }
        levels.get(level).push(id);

        const neighbors = adjacency.get(id) || [];
        neighbors.forEach(neighborId => {
            if (!visited.has(neighborId)) {
                queue.push({ id: neighborId, level: level + 1 });
            }
        });
    }

    // Calculate positions
    const LEVEL_HEIGHT = 150;
    const NODE_WIDTH = 200;
    const HORIZONTAL_SPACING = 100;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    levels.forEach((nodeIds, level) => {
        const y = level * LEVEL_HEIGHT;
        const totalWidth = nodeIds.length * (NODE_WIDTH + HORIZONTAL_SPACING) - HORIZONTAL_SPACING;
        const startX = -totalWidth / 2;

        nodeIds.forEach((nodeId, index) => {
            const x = startX + index * (NODE_WIDTH + HORIZONTAL_SPACING);
            positions.set(nodeId, { x, y });

            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x + NODE_WIDTH);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y + 100);
        });
    });

    // Handle unvisited nodes (orphans)
    workflow.nodes.forEach(node => {
        if (!positions.has(node.id)) {
            positions.set(node.id, {
                x: maxX + HORIZONTAL_SPACING,
                y: minY
            });
        }
    });

    return {
        positions,
        type: 'hierarchical',
        bounds: { minX, maxX, minY, maxY }
    };
}

/**
 * Apply timeline layout (left-to-right chronological)
 */
function applyTimelineLayout(workflow) {
    const positions = new Map();

    // Sort nodes by dependencies (topological sort)
    const sorted = topologicalSort(workflow);

    const HORIZONTAL_SPACING = 250;
    const VERTICAL_SPACING = 150;
    const TRACK_HEIGHT = 120;

    // Assign to tracks (parallel items go on different tracks)
    const tracks = assignToTracks(workflow, sorted);

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    tracks.forEach((nodeIds, trackIndex) => {
        const y = trackIndex * (TRACK_HEIGHT + VERTICAL_SPACING);

        nodeIds.forEach((nodeId, index) => {
            const x = index * HORIZONTAL_SPACING;
            positions.set(nodeId, { x, y });

            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x + 200);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y + TRACK_HEIGHT);
        });
    });

    return {
        positions,
        type: 'timeline',
        bounds: { minX, maxX, minY, maxY }
    };
}

/**
 * Topological sort for timeline ordering
 */
function topologicalSort(workflow) {
    const inDegree = new Map();
    const adjacency = new Map();

    // Initialize
    workflow.nodes.forEach(node => {
        inDegree.set(node.id, 0);
        adjacency.set(node.id, []);
    });

    // Build graph
    workflow.edges.forEach(edge => {
        adjacency.get(edge.source).push(edge.target);
        inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });

    // Kahn's algorithm
    const queue = [];
    const sorted = [];

    inDegree.forEach((degree, nodeId) => {
        if (degree === 0) {
            queue.push(nodeId);
        }
    });

    while (queue.length > 0) {
        const nodeId = queue.shift();
        sorted.push(nodeId);

        adjacency.get(nodeId).forEach(neighbor => {
            inDegree.set(neighbor, inDegree.get(neighbor) - 1);
            if (inDegree.get(neighbor) === 0) {
                queue.push(neighbor);
            }
        });
    }

    return sorted;
}

/**
 * Assign nodes to parallel tracks
 */
function assignToTracks(workflow, sortedNodes) {
    const tracks = [[]];
    const nodeToTrack = new Map();

    sortedNodes.forEach(nodeId => {
        // Find dependencies
        const dependencies = workflow.edges
            .filter(e => e.target === nodeId)
            .map(e => e.source);

        // Find the highest track among dependencies
        let minTrack = 0;
        dependencies.forEach(depId => {
            if (nodeToTrack.has(depId)) {
                minTrack = Math.max(minTrack, nodeToTrack.get(depId) + 1);
            }
        });

        // Assign to track
        if (!tracks[minTrack]) {
            tracks[minTrack] = [];
        }
        tracks[minTrack].push(nodeId);
        nodeToTrack.set(nodeId, minTrack);
    });

    return tracks;
}

/**
 * Fallback workflow generation (when LLM is not available)
 */
function generateFallbackWorkflow(input, options) {
    console.log('Using fallback workflow generation');

    const workflow = {
        id: nanoid(),
        timestamp: new Date().toISOString(),
        mode: options.mode || 'optimize',
        title: 'Generated Workflow (Fallback)',
        description: 'Basic workflow structure generated without AI',
        metadata: {
            complexity: 'low',
            fallback: true
        },
        nodes: [],
        edges: [],
        groups: [],
        annotations: [],
        stats: {
            nodeCount: 0,
            edgeCount: 0,
            decisionPoints: 0,
            parallelBranches: 0
        }
    };

    // Create basic linear workflow
    const startNode = {
        id: 'start',
        type: 'start',
        label: 'Start',
        description: 'Workflow begins',
        data: {},
        style: getDefaultNodeStyle('start'),
        position: { x: 0, y: 0 }
    };

    const endNode = {
        id: 'end',
        type: 'end',
        label: 'End',
        description: 'Workflow completes',
        data: {},
        style: getDefaultNodeStyle('end'),
        position: { x: 0, y: 300 }
    };

    workflow.nodes.push(startNode, endNode);

    // Add edge
    workflow.edges.push({
        id: 'start-to-end',
        source: 'start',
        target: 'end',
        label: '',
        type: 'normal',
        data: {},
        style: getDefaultEdgeStyle('normal')
    });

    workflow.stats.nodeCount = 2;
    workflow.stats.edgeCount = 1;

    return workflow;
}

/**
 * Export utility functions for specific workflow types
 */
export async function simplifyWorkflow(boardData) {
    return generateWorkflow(boardData, { mode: 'simplify' });
}

export async function optimizeWorkflow(boardData) {
    return generateWorkflow(boardData, { mode: 'optimize' });
}

export async function expandWorkflow(boardData) {
    return generateWorkflow(boardData, { mode: 'expand' });
}

export async function convertToFlowchart(boardData) {
    return generateWorkflow(boardData, { mode: 'convert-to-flowchart' });
}

export async function convertToTimeline(boardData) {
    return generateWorkflow(boardData, { mode: 'convert-to-timeline' });
}
