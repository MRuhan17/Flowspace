import { GoogleGenerativeAI } from '@google/generative-ai';
import { nanoid } from 'nanoid';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Diagram Validator - Comprehensive flowchart and diagram validation
 * 
 * Detects common issues: dead ends, missing labels, circular logic,
 * unreachable steps, inconsistent terminology, and more.
 * 
 * @param {object} boardSemanticMap - Semantic map from board interpreter
 * @param {object} options - Validation options
 * @returns {Promise<object>} Diagnostics and recommended patches
 */
export async function validateDiagram(boardSemanticMap, options = {}) {
    const {
        strictMode = false,
        checkTerminology = true,
        suggestFixes = true,
        useLLM = true
    } = options;

    console.log('🔍 Diagram Validator: Starting validation...');

    // Step 1: Run heuristic validations (fast, rule-based)
    const heuristicDiagnostics = runHeuristicValidation(boardSemanticMap, strictMode);

    // Step 2: Check terminology consistency
    let terminologyIssues = [];
    if (checkTerminology) {
        terminologyIssues = checkTerminologyConsistency(boardSemanticMap);
    }

    // Step 3: Use LLM for advanced validation (if enabled and API key available)
    let llmDiagnostics = null;
    if (useLLM && process.env.GEMINI_API_KEY) {
        llmDiagnostics = await runLLMValidation(boardSemanticMap, heuristicDiagnostics);
    }

    // Step 4: Generate recommended patches
    const patches = suggestFixes
        ? generatePatches(heuristicDiagnostics, terminologyIssues, llmDiagnostics)
        : [];

    // Step 5: Compile final diagnostics
    const diagnostics = compileDiagnostics(
        heuristicDiagnostics,
        terminologyIssues,
        llmDiagnostics,
        patches
    );

    console.log(`✅ Validation complete: ${diagnostics.issueCount} issues found`);
    return diagnostics;
}

/**
 * Run heuristic-based validation (rule-based, fast)
 */
function runHeuristicValidation(semanticMap, strictMode) {
    const diagnostics = {
        deadEnds: [],
        missingLabels: [],
        circularLogic: [],
        unreachableSteps: [],
        multipleStarts: [],
        noEndPoints: [],
        isolatedNodes: [],
        invalidDecisions: [],
        brokenConnections: []
    };

    // Extract data
    const nodes = extractNodes(semanticMap);
    const edges = extractEdges(semanticMap);
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    // Build adjacency lists
    const outgoing = new Map(); // node -> children
    const incoming = new Map(); // node -> parents

    nodes.forEach(node => {
        outgoing.set(node.id, []);
        incoming.set(node.id, []);
    });

    edges.forEach(edge => {
        if (outgoing.has(edge.source)) {
            outgoing.get(edge.source).push(edge.target);
        }
        if (incoming.has(edge.target)) {
            incoming.get(edge.target).push(edge.source);
        }
    });

    // 1. Check for dead ends (nodes with no outgoing connections)
    nodes.forEach(node => {
        const out = outgoing.get(node.id) || [];
        const isEndNode = node.type === 'end' || node.label?.toLowerCase().includes('end');

        if (out.length === 0 && !isEndNode) {
            diagnostics.deadEnds.push({
                nodeId: node.id,
                label: node.label,
                severity: 'medium',
                message: `Node "${node.label}" has no outgoing connections (dead end)`,
                position: node.position
            });
        }
    });

    // 2. Check for missing or poor labels
    nodes.forEach(node => {
        if (!node.label || node.label.trim().length === 0) {
            diagnostics.missingLabels.push({
                nodeId: node.id,
                severity: 'high',
                message: 'Node has no label',
                position: node.position
            });
        } else if (node.label.trim().length < 3) {
            diagnostics.missingLabels.push({
                nodeId: node.id,
                label: node.label,
                severity: 'low',
                message: `Node label "${node.label}" is too short (< 3 characters)`,
                position: node.position
            });
        } else if (/^(step|node|item)\s*\d+$/i.test(node.label.trim())) {
            diagnostics.missingLabels.push({
                nodeId: node.id,
                label: node.label,
                severity: 'medium',
                message: `Node has generic label "${node.label}" - use descriptive text`,
                position: node.position
            });
        }
    });

    // 3. Check for circular logic (cycles)
    const cycles = detectCycles(nodes, edges);
    cycles.forEach(cycle => {
        const cycleLabels = cycle.map(id => nodeMap.get(id)?.label || id);
        diagnostics.circularLogic.push({
            cycle: cycle,
            cycleLabels: cycleLabels,
            severity: strictMode ? 'high' : 'medium',
            message: `Circular dependency detected: ${cycleLabels.join(' → ')} → ${cycleLabels[0]}`,
            isIntentional: false // Will be refined by LLM
        });
    });

    // 4. Check for unreachable steps
    const startNodes = nodes.filter(n =>
        n.type === 'start' ||
        incoming.get(n.id).length === 0
    );

    if (startNodes.length > 0) {
        const reachable = new Set();
        startNodes.forEach(start => {
            const visited = bfsTraversal(start.id, outgoing);
            visited.forEach(id => reachable.add(id));
        });

        nodes.forEach(node => {
            if (!reachable.has(node.id) && node.type !== 'start') {
                diagnostics.unreachableSteps.push({
                    nodeId: node.id,
                    label: node.label,
                    severity: 'high',
                    message: `Node "${node.label}" is unreachable from start`,
                    position: node.position
                });
            }
        });
    }

    // 5. Check for multiple start nodes
    if (startNodes.length > 1) {
        diagnostics.multipleStarts = startNodes.map(node => ({
            nodeId: node.id,
            label: node.label,
            severity: 'medium',
            message: `Multiple start nodes detected`,
            position: node.position
        }));
    }

    // 6. Check for missing end points
    const endNodes = nodes.filter(n =>
        n.type === 'end' ||
        outgoing.get(n.id).length === 0
    );

    if (endNodes.length === 0) {
        diagnostics.noEndPoints.push({
            severity: 'high',
            message: 'Diagram has no end points - all paths should lead to completion'
        });
    }

    // 7. Check for isolated nodes (no connections at all)
    nodes.forEach(node => {
        const hasIncoming = incoming.get(node.id).length > 0;
        const hasOutgoing = outgoing.get(node.id).length > 0;

        if (!hasIncoming && !hasOutgoing && node.type !== 'start') {
            diagnostics.isolatedNodes.push({
                nodeId: node.id,
                label: node.label,
                severity: 'high',
                message: `Node "${node.label}" is completely isolated (no connections)`,
                position: node.position
            });
        }
    });

    // 8. Check decision nodes
    nodes.filter(n => n.type === 'decision').forEach(node => {
        const out = outgoing.get(node.id) || [];

        if (out.length < 2) {
            diagnostics.invalidDecisions.push({
                nodeId: node.id,
                label: node.label,
                severity: 'high',
                message: `Decision node "${node.label}" has fewer than 2 branches (has ${out.length})`,
                position: node.position
            });
        }

        // Check if decision branches have labels
        const outgoingEdges = edges.filter(e => e.source === node.id);
        const unlabeled = outgoingEdges.filter(e => !e.label || e.label.trim().length === 0);

        if (unlabeled.length > 0) {
            diagnostics.invalidDecisions.push({
                nodeId: node.id,
                label: node.label,
                severity: 'medium',
                message: `Decision node "${node.label}" has ${unlabeled.length} unlabeled branch(es)`,
                position: node.position,
                unlabeledEdges: unlabeled.map(e => e.id)
            });
        }
    });

    // 9. Check for broken connections (edges pointing to non-existent nodes)
    edges.forEach(edge => {
        if (!nodeMap.has(edge.source)) {
            diagnostics.brokenConnections.push({
                edgeId: edge.id,
                severity: 'critical',
                message: `Edge references non-existent source node: ${edge.source}`
            });
        }
        if (!nodeMap.has(edge.target)) {
            diagnostics.brokenConnections.push({
                edgeId: edge.id,
                severity: 'critical',
                message: `Edge references non-existent target node: ${edge.target}`
            });
        }
    });

    return diagnostics;
}

/**
 * Check terminology consistency across the diagram
 */
function checkTerminologyConsistency(semanticMap) {
    const issues = [];
    const nodes = extractNodes(semanticMap);

    // Extract all terms
    const terms = new Map(); // normalized term -> original variations

    nodes.forEach(node => {
        if (!node.label) return;

        const words = node.label
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 3); // Only significant words

        words.forEach(word => {
            const normalized = normalizeWord(word);
            if (!terms.has(normalized)) {
                terms.set(normalized, new Set());
            }
            terms.get(normalized).add(word);
        });
    });

    // Find inconsistencies (same concept, different spellings/cases)
    terms.forEach((variations, normalized) => {
        if (variations.size > 1) {
            const variationArray = Array.from(variations);

            // Check if it's just case differences
            const uniqueLowerCase = new Set(variationArray.map(v => v.toLowerCase()));

            if (uniqueLowerCase.size === 1) {
                // Just case inconsistency
                issues.push({
                    type: 'case_inconsistency',
                    term: normalized,
                    variations: variationArray,
                    severity: 'low',
                    message: `Inconsistent capitalization: ${variationArray.join(', ')}`,
                    suggestion: `Use consistent capitalization: "${variationArray[0]}"`
                });
            } else {
                // Different spellings or forms
                issues.push({
                    type: 'terminology_inconsistency',
                    term: normalized,
                    variations: variationArray,
                    severity: 'medium',
                    message: `Inconsistent terminology: ${variationArray.join(', ')}`,
                    suggestion: `Standardize to one term: "${variationArray[0]}"`
                });
            }
        }
    });

    // Check for common abbreviation inconsistencies
    const abbreviationPairs = [
        ['user', 'usr'],
        ['database', 'db'],
        ['authentication', 'auth'],
        ['configuration', 'config'],
        ['information', 'info'],
        ['application', 'app']
    ];

    abbreviationPairs.forEach(([full, abbr]) => {
        const hasFull = Array.from(terms.keys()).some(t => t.includes(full));
        const hasAbbr = Array.from(terms.keys()).some(t => t.includes(abbr));

        if (hasFull && hasAbbr) {
            issues.push({
                type: 'abbreviation_inconsistency',
                terms: [full, abbr],
                severity: 'low',
                message: `Mixed use of "${full}" and "${abbr}"`,
                suggestion: `Use either full term "${full}" or abbreviation "${abbr}" consistently`
            });
        }
    });

    return issues;
}

/**
 * Run LLM-based validation for advanced insights
 */
async function runLLMValidation(semanticMap, heuristicDiagnostics) {
    if (!process.env.GEMINI_API_KEY) {
        return null;
    }

    console.log('🤖 Running LLM validation...');

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = buildValidationPrompt(semanticMap, heuristicDiagnostics);

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean and parse JSON
        const jsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error('LLM Validation Error:', error);
        return null;
    }
}

/**
 * Build validation prompt for LLM
 */
function buildValidationPrompt(semanticMap, heuristicDiagnostics) {
    const nodes = extractNodes(semanticMap);
    const edges = extractEdges(semanticMap);

    return `You are an expert at validating flowcharts and process diagrams. Analyze the following diagram and provide advanced validation insights.

**Diagram Overview:**
- Nodes: ${nodes.length}
- Connections: ${edges.length}

**Node Labels:**
${nodes.slice(0, 30).map(n => `- "${n.label}" (type: ${n.type || 'unknown'})`).join('\n')}

**Heuristic Issues Found:**
${JSON.stringify(heuristicDiagnostics, null, 2)}

**Your Task:**
Provide advanced validation insights that go beyond simple rule-based checks:

1. **Logical Flow**: Does the diagram make logical sense? Are there any logical contradictions?
2. **Completeness**: What important steps or decision points might be missing?
3. **Clarity**: Are labels clear and unambiguous? Any confusing terminology?
4. **Best Practices**: Does it follow flowchart best practices?
5. **Circular Logic**: Are any detected cycles intentional (feedback loops) or errors?
6. **Improvements**: What would make this diagram better?

**Output Format (JSON only, no markdown):**
{
  "logicalIssues": [
    {
      "type": "contradiction|ambiguity|missing_logic",
      "description": "Detailed explanation",
      "affectedNodes": ["node-id-1", "node-id-2"],
      "severity": "low|medium|high",
      "suggestion": "How to fix it"
    }
  ],
  "missingElements": [
    {
      "type": "missing_step|missing_decision|missing_validation",
      "description": "What's missing and why it matters",
      "suggestedLocation": "Where to add it",
      "severity": "low|medium|high"
    }
  ],
  "clarityIssues": [
    {
      "nodeId": "node-id",
      "currentLabel": "Current label",
      "issue": "What's unclear",
      "suggestedLabel": "Better label",
      "reasoning": "Why this is better"
    }
  ],
  "bestPracticeViolations": [
    {
      "practice": "Name of best practice",
      "violation": "How it's violated",
      "impact": "Why it matters",
      "fix": "How to correct it"
    }
  ],
  "circularLogicAnalysis": [
    {
      "cycle": ["node-1", "node-2", "node-3"],
      "isIntentional": true|false,
      "reasoning": "Why this is/isn't a problem",
      "recommendation": "Keep as-is or fix"
    }
  ],
  "overallAssessment": {
    "score": 0-100,
    "strengths": ["strength1", "strength2"],
    "weaknesses": ["weakness1", "weakness2"],
    "priorityFixes": ["fix1", "fix2", "fix3"]
  }
}

Return ONLY valid JSON, no markdown blocks.`;
}

/**
 * Generate recommended patches/fixes
 */
function generatePatches(heuristicDiagnostics, terminologyIssues, llmDiagnostics) {
    const patches = [];

    // Patch 1: Fix dead ends by adding end nodes
    heuristicDiagnostics.deadEnds.forEach(issue => {
        patches.push({
            id: nanoid(),
            type: 'add_end_node',
            priority: 'medium',
            targetNodeId: issue.nodeId,
            action: {
                type: 'add_node',
                nodeType: 'end',
                label: 'End',
                connectFrom: issue.nodeId
            },
            reasoning: `Node "${issue.label}" has no continuation. Adding an end node to properly terminate this path.`,
            autoApplicable: true
        });
    });

    // Patch 2: Add labels to unlabeled nodes
    heuristicDiagnostics.missingLabels.forEach(issue => {
        if (!issue.label || issue.label.trim().length === 0) {
            patches.push({
                id: nanoid(),
                type: 'add_label',
                priority: 'high',
                targetNodeId: issue.nodeId,
                action: {
                    type: 'update_node',
                    property: 'label',
                    value: 'Unnamed Step'
                },
                reasoning: 'All nodes should have descriptive labels for clarity.',
                autoApplicable: false,
                requiresUserInput: true
            });
        }
    });

    // Patch 3: Fix isolated nodes by suggesting connections
    heuristicDiagnostics.isolatedNodes.forEach(issue => {
        patches.push({
            id: nanoid(),
            type: 'connect_isolated_node',
            priority: 'high',
            targetNodeId: issue.nodeId,
            action: {
                type: 'suggest_connection',
                message: `Node "${issue.label}" is isolated. Consider connecting it to the main flow or removing it.`
            },
            reasoning: 'Isolated nodes serve no purpose in the workflow and should be connected or removed.',
            autoApplicable: false
        });
    });

    // Patch 4: Fix invalid decision nodes
    heuristicDiagnostics.invalidDecisions.forEach(issue => {
        if (issue.message.includes('fewer than 2 branches')) {
            patches.push({
                id: nanoid(),
                type: 'fix_decision_branches',
                priority: 'high',
                targetNodeId: issue.nodeId,
                action: {
                    type: 'add_edge',
                    message: `Decision node "${issue.label}" needs at least 2 outgoing branches (Yes/No, True/False, etc.)`
                },
                reasoning: 'Decision nodes must have multiple branches to represent different outcomes.',
                autoApplicable: false
            });
        }

        if (issue.unlabeledEdges) {
            patches.push({
                id: nanoid(),
                type: 'label_decision_branches',
                priority: 'medium',
                targetNodeId: issue.nodeId,
                targetEdgeIds: issue.unlabeledEdges,
                action: {
                    type: 'update_edges',
                    property: 'label',
                    suggestions: ['Yes', 'No', 'True', 'False', 'Success', 'Failure']
                },
                reasoning: 'Decision branches should be clearly labeled to show which path is taken under what condition.',
                autoApplicable: false,
                requiresUserInput: true
            });
        }
    });

    // Patch 5: Fix terminology inconsistencies
    terminologyIssues.forEach(issue => {
        if (issue.type === 'terminology_inconsistency' || issue.type === 'case_inconsistency') {
            patches.push({
                id: nanoid(),
                type: 'standardize_terminology',
                priority: 'low',
                action: {
                    type: 'find_and_replace',
                    find: issue.variations,
                    replace: issue.variations[0]
                },
                reasoning: issue.suggestion,
                autoApplicable: true
            });
        }
    });

    // Patch 6: Add missing end node if none exists
    if (heuristicDiagnostics.noEndPoints.length > 0) {
        patches.push({
            id: nanoid(),
            type: 'add_missing_end_node',
            priority: 'high',
            action: {
                type: 'add_node',
                nodeType: 'end',
                label: 'End',
                message: 'Add an end node to properly terminate the workflow'
            },
            reasoning: 'Every workflow should have clear end points to show completion.',
            autoApplicable: false
        });
    }

    // Patch 7: Merge multiple start nodes
    if (heuristicDiagnostics.multipleStarts.length > 1) {
        patches.push({
            id: nanoid(),
            type: 'merge_start_nodes',
            priority: 'medium',
            targetNodeIds: heuristicDiagnostics.multipleStarts.map(s => s.nodeId),
            action: {
                type: 'merge_nodes',
                message: 'Consider merging multiple start nodes into a single entry point'
            },
            reasoning: 'Workflows typically have one clear starting point. Multiple starts can be confusing.',
            autoApplicable: false
        });
    }

    // Add LLM-suggested patches
    if (llmDiagnostics) {
        // Add patches for missing elements
        if (llmDiagnostics.missingElements) {
            llmDiagnostics.missingElements.forEach(missing => {
                patches.push({
                    id: nanoid(),
                    type: 'add_missing_element',
                    priority: missing.severity,
                    action: {
                        type: 'add_node',
                        suggestion: missing.description,
                        location: missing.suggestedLocation
                    },
                    reasoning: missing.description,
                    autoApplicable: false,
                    llmGenerated: true
                });
            });
        }

        // Add patches for clarity issues
        if (llmDiagnostics.clarityIssues) {
            llmDiagnostics.clarityIssues.forEach(clarity => {
                patches.push({
                    id: nanoid(),
                    type: 'improve_label_clarity',
                    priority: 'medium',
                    targetNodeId: clarity.nodeId,
                    action: {
                        type: 'update_node',
                        property: 'label',
                        currentValue: clarity.currentLabel,
                        suggestedValue: clarity.suggestedLabel
                    },
                    reasoning: clarity.reasoning,
                    autoApplicable: false,
                    llmGenerated: true
                });
            });
        }
    }

    // Sort patches by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    patches.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return patches;
}

/**
 * Compile final diagnostics report
 */
function compileDiagnostics(heuristicDiagnostics, terminologyIssues, llmDiagnostics, patches) {
    // Count total issues
    let issueCount = 0;
    Object.values(heuristicDiagnostics).forEach(issues => {
        if (Array.isArray(issues)) {
            issueCount += issues.length;
        }
    });
    issueCount += terminologyIssues.length;

    // Calculate severity distribution
    const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };

    const countSeverity = (issues) => {
        issues.forEach(issue => {
            if (issue.severity) {
                severityCounts[issue.severity] = (severityCounts[issue.severity] || 0) + 1;
            }
        });
    };

    Object.values(heuristicDiagnostics).forEach(issues => {
        if (Array.isArray(issues)) countSeverity(issues);
    });
    countSeverity(terminologyIssues);

    // Compile report
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            totalIssues: issueCount,
            criticalIssues: severityCounts.critical,
            highSeverity: severityCounts.high,
            mediumSeverity: severityCounts.medium,
            lowSeverity: severityCounts.low,
            patchesAvailable: patches.length,
            autoApplicablePatches: patches.filter(p => p.autoApplicable).length
        },

        heuristicIssues: heuristicDiagnostics,
        terminologyIssues: terminologyIssues,
        llmInsights: llmDiagnostics,

        recommendedPatches: patches,

        overallAssessment: llmDiagnostics?.overallAssessment || {
            score: calculateHealthScore(issueCount, severityCounts),
            strengths: [],
            weaknesses: [],
            priorityFixes: patches.slice(0, 5).map(p => p.reasoning)
        },

        issueCount: issueCount
    };

    return report;
}

/**
 * Calculate diagram health score (0-100)
 */
function calculateHealthScore(issueCount, severityCounts) {
    let score = 100;

    score -= severityCounts.critical * 20;
    score -= severityCounts.high * 10;
    score -= severityCounts.medium * 5;
    score -= severityCounts.low * 2;

    return Math.max(0, score);
}

/**
 * Helper: Extract nodes from semantic map
 */
function extractNodes(semanticMap) {
    // Check if it's a semantic map or raw board data
    if (semanticMap.nodes && Array.isArray(semanticMap.nodes)) {
        return semanticMap.nodes;
    }

    // Try to extract from hierarchies or other structures
    const nodes = [];

    if (semanticMap.hierarchies) {
        semanticMap.hierarchies.forEach(hierarchy => {
            hierarchy.levels?.forEach(level => {
                level.forEach(node => {
                    nodes.push({
                        id: node.id,
                        label: node.text,
                        type: 'process',
                        position: { x: 0, y: 0 }
                    });
                });
            });
        });
    }

    return nodes;
}

/**
 * Helper: Extract edges from semantic map
 */
function extractEdges(semanticMap) {
    if (semanticMap.edges && Array.isArray(semanticMap.edges)) {
        return semanticMap.edges;
    }

    if (semanticMap.connections && Array.isArray(semanticMap.connections)) {
        return semanticMap.connections.map(conn => ({
            id: conn.id || nanoid(),
            source: conn.source,
            target: conn.target,
            label: conn.label || ''
        }));
    }

    return [];
}

/**
 * Helper: Detect cycles using DFS
 */
function detectCycles(nodes, edges) {
    const graph = new Map();
    nodes.forEach(node => graph.set(node.id, []));
    edges.forEach(edge => {
        if (graph.has(edge.source)) {
            graph.get(edge.source).push(edge.target);
        }
    });

    const cycles = [];
    const visited = new Set();
    const recStack = new Set();

    function dfs(node, path = []) {
        if (recStack.has(node)) {
            const cycleStart = path.indexOf(node);
            if (cycleStart !== -1) {
                cycles.push(path.slice(cycleStart));
            }
            return;
        }

        if (visited.has(node)) return;

        visited.add(node);
        recStack.add(node);
        path.push(node);

        const neighbors = graph.get(node) || [];
        neighbors.forEach(neighbor => dfs(neighbor, [...path]));

        recStack.delete(node);
    }

    nodes.forEach(node => {
        if (!visited.has(node.id)) {
            dfs(node.id);
        }
    });

    return cycles;
}

/**
 * Helper: BFS traversal
 */
function bfsTraversal(startId, adjacencyMap) {
    const visited = new Set();
    const queue = [startId];

    while (queue.length > 0) {
        const nodeId = queue.shift();
        if (visited.has(nodeId)) continue;

        visited.add(nodeId);

        const neighbors = adjacencyMap.get(nodeId) || [];
        neighbors.forEach(neighbor => {
            if (!visited.has(neighbor)) {
                queue.push(neighbor);
            }
        });
    }

    return visited;
}

/**
 * Helper: Normalize word for consistency checking
 */
function normalizeWord(word) {
    return word
        .toLowerCase()
        .replace(/s$/, '') // Remove plural 's'
        .replace(/ing$/, '') // Remove 'ing'
        .replace(/ed$/, ''); // Remove 'ed'
}

/**
 * Export quick validation function
 */
export async function quickValidate(boardSemanticMap) {
    return validateDiagram(boardSemanticMap, {
        strictMode: false,
        checkTerminology: false,
        suggestFixes: true,
        useLLM: false
    });
}
