import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Semantic Board Interpreter - The "Brain" of Flowspace
 * 
 * Analyzes board content to understand relationships, identify patterns,
 * detect issues, and provide intelligent suggestions.
 * 
 * @param {object} boardJSON - Complete board state { nodes, edges, strokes, metadata }
 * @param {object} options - Analysis options { depth: 'quick' | 'deep', focus: string[] }
 * @returns {Promise<object>} Semantic map with topics, connections, hierarchies, issues, suggestions
 */
export async function analyzeBoard(boardJSON, options = {}) {
    const {
        depth = 'deep',
        focus = ['all'] // 'topics', 'connections', 'issues', 'suggestions'
    } = options;

    console.log('🧠 Board Interpreter: Starting semantic analysis...');

    // Step 1: Extract and normalize board elements
    const extractedData = extractBoardElements(boardJSON);

    // Step 2: Apply heuristic analysis (fast, rule-based)
    const heuristicResults = await applyHeuristics(extractedData);

    // Step 3: Use LLM for deep semantic understanding (if deep mode)
    let llmResults = null;
    if (depth === 'deep' && process.env.GEMINI_API_KEY) {
        llmResults = await analyzeBoardWithLLM(extractedData, heuristicResults);
    }

    // Step 4: Merge and structure results
    const semanticMap = buildSemanticMap(heuristicResults, llmResults, focus);

    console.log('✅ Board Interpreter: Analysis complete');
    return semanticMap;
}

/**
 * Extract and normalize all board elements
 */
function extractBoardElements(boardJSON) {
    const { nodes = [], edges = [], strokes = [], metadata = {} } = boardJSON;

    // Extract text content from all sources
    const textElements = [];
    const visualElements = [];
    const connections = [];

    // Process nodes
    nodes.forEach(node => {
        const element = {
            id: node.id,
            type: 'node',
            text: node.data?.label || '',
            position: { x: node.x || 0, y: node.y || 0 },
            metadata: {
                nodeType: node.type || 'default',
                ports: node.data?.ports || {},
                color: node.data?.backgroundColor,
                locked: node.locked || false
            }
        };

        if (element.text) {
            textElements.push(element);
        }
        visualElements.push(element);
    });

    // Process edges (connections)
    edges.forEach(edge => {
        connections.push({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: 'edge',
            label: edge.label || '',
            metadata: {
                sourceHandle: edge.sourceHandle,
                targetHandle: edge.targetHandle,
                color: edge.color
            }
        });
    });

    // Process strokes (drawings/sketches)
    strokes.forEach(stroke => {
        visualElements.push({
            id: stroke.id,
            type: 'stroke',
            position: getStrokeCenter(stroke.points),
            metadata: {
                color: stroke.color,
                strokeWidth: stroke.strokeWidth,
                tool: stroke.tool,
                pointCount: stroke.points?.length / 2 || 0
            }
        });
    });

    return {
        textElements,
        visualElements,
        connections,
        metadata,
        stats: {
            nodeCount: nodes.length,
            edgeCount: edges.length,
            strokeCount: strokes.length,
            totalElements: nodes.length + edges.length + strokes.length
        }
    };
}

/**
 * Apply heuristic analysis (rule-based, fast)
 */
async function applyHeuristics(extractedData) {
    const { textElements, visualElements, connections, stats } = extractedData;

    console.log('🔍 Applying heuristic analysis...');

    // Analyze spatial clusters
    const clusters = identifySpatialClusters(visualElements);

    // Analyze text for topics
    const topics = extractTopics(textElements);

    // Analyze connection patterns
    const hierarchies = analyzeHierarchies(connections, textElements);

    // Detect potential issues
    const issues = detectIssues(extractedData);

    // Identify duplicates
    const duplicates = findDuplicates(textElements);

    // Analyze dependencies
    const dependencies = analyzeDependencies(connections, textElements);

    return {
        clusters,
        topics,
        hierarchies,
        issues,
        duplicates,
        dependencies,
        stats
    };
}

/**
 * Identify spatial clusters using distance-based grouping
 */
function identifySpatialClusters(visualElements, threshold = 300) {
    const clusters = [];
    const visited = new Set();

    visualElements.forEach((element, index) => {
        if (visited.has(element.id)) return;

        const cluster = {
            id: `cluster-${clusters.length}`,
            elements: [element],
            center: { ...element.position },
            bounds: {
                minX: element.position.x,
                maxX: element.position.x,
                minY: element.position.y,
                maxY: element.position.y
            }
        };

        visited.add(element.id);

        // Find nearby elements
        visualElements.forEach((other, otherIndex) => {
            if (index === otherIndex || visited.has(other.id)) return;

            const distance = Math.sqrt(
                Math.pow(element.position.x - other.position.x, 2) +
                Math.pow(element.position.y - other.position.y, 2)
            );

            if (distance < threshold) {
                cluster.elements.push(other);
                visited.add(other.id);

                // Update bounds
                cluster.bounds.minX = Math.min(cluster.bounds.minX, other.position.x);
                cluster.bounds.maxX = Math.max(cluster.bounds.maxX, other.position.x);
                cluster.bounds.minY = Math.min(cluster.bounds.minY, other.position.y);
                cluster.bounds.maxY = Math.max(cluster.bounds.maxY, other.position.y);
            }
        });

        // Update center
        cluster.center = {
            x: (cluster.bounds.minX + cluster.bounds.maxX) / 2,
            y: (cluster.bounds.minY + cluster.bounds.maxY) / 2
        };

        if (cluster.elements.length > 1) {
            clusters.push(cluster);
        }
    });

    return clusters.map(cluster => ({
        ...cluster,
        size: cluster.elements.length,
        density: cluster.elements.length / (
            (cluster.bounds.maxX - cluster.bounds.minX) *
            (cluster.bounds.maxY - cluster.bounds.minY) / 10000
        )
    }));
}

/**
 * Extract topics from text elements using keyword analysis
 */
function extractTopics(textElements) {
    const topics = new Map();
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'being']);

    textElements.forEach(element => {
        const words = element.text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word));

        words.forEach(word => {
            if (!topics.has(word)) {
                topics.set(word, {
                    keyword: word,
                    frequency: 0,
                    elements: [],
                    positions: []
                });
            }

            const topic = topics.get(word);
            topic.frequency++;
            topic.elements.push(element.id);
            topic.positions.push(element.position);
        });
    });

    // Convert to array and sort by frequency
    return Array.from(topics.values())
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 20) // Top 20 topics
        .map(topic => ({
            ...topic,
            avgPosition: {
                x: topic.positions.reduce((sum, p) => sum + p.x, 0) / topic.positions.length,
                y: topic.positions.reduce((sum, p) => sum + p.y, 0) / topic.positions.length
            }
        }));
}

/**
 * Analyze hierarchies and flow patterns
 */
function analyzeHierarchies(connections, textElements) {
    const nodeMap = new Map(textElements.map(el => [el.id, el]));
    const hierarchies = [];

    // Build adjacency lists
    const outgoing = new Map(); // node -> children
    const incoming = new Map(); // node -> parents

    connections.forEach(conn => {
        if (!outgoing.has(conn.source)) outgoing.set(conn.source, []);
        if (!incoming.has(conn.target)) incoming.set(conn.target, []);

        outgoing.get(conn.source).push(conn.target);
        incoming.get(conn.target).push(conn.source);
    });

    // Find root nodes (no incoming connections)
    const roots = textElements
        .filter(el => !incoming.has(el.id) && outgoing.has(el.id))
        .map(el => el.id);

    // Build hierarchy trees
    roots.forEach(rootId => {
        const hierarchy = {
            root: rootId,
            rootText: nodeMap.get(rootId)?.text || '',
            levels: [],
            depth: 0,
            breadth: 0
        };

        const visited = new Set();
        const queue = [{ id: rootId, level: 0 }];

        while (queue.length > 0) {
            const { id, level } = queue.shift();
            if (visited.has(id)) continue;
            visited.add(id);

            if (!hierarchy.levels[level]) {
                hierarchy.levels[level] = [];
            }

            hierarchy.levels[level].push({
                id,
                text: nodeMap.get(id)?.text || '',
                children: outgoing.get(id) || []
            });

            hierarchy.depth = Math.max(hierarchy.depth, level + 1);
            hierarchy.breadth = Math.max(hierarchy.breadth, hierarchy.levels[level].length);

            // Add children to queue
            (outgoing.get(id) || []).forEach(childId => {
                queue.push({ id: childId, level: level + 1 });
            });
        }

        hierarchies.push(hierarchy);
    });

    return hierarchies;
}

/**
 * Detect potential issues in the board
 */
function detectIssues(extractedData) {
    const { textElements, visualElements, connections, stats } = extractedData;
    const issues = [];

    // Issue 1: Orphaned nodes (no connections)
    const connectedNodes = new Set();
    connections.forEach(conn => {
        connectedNodes.add(conn.source);
        connectedNodes.add(conn.target);
    });

    const orphanedNodes = textElements.filter(el => !connectedNodes.has(el.id));
    if (orphanedNodes.length > 0) {
        issues.push({
            type: 'orphaned_nodes',
            severity: 'low',
            count: orphanedNodes.length,
            description: `${orphanedNodes.length} node(s) have no connections`,
            elements: orphanedNodes.map(el => el.id),
            suggestion: 'Consider connecting these nodes or removing them if not needed'
        });
    }

    // Issue 2: Circular dependencies
    const cycles = detectCycles(connections);
    if (cycles.length > 0) {
        issues.push({
            type: 'circular_dependencies',
            severity: 'medium',
            count: cycles.length,
            description: `${cycles.length} circular dependency path(s) detected`,
            cycles: cycles,
            suggestion: 'Review these cycles - they may indicate logical issues or valid feedback loops'
        });
    }

    // Issue 3: Dead ends (nodes with only incoming connections)
    const deadEnds = textElements.filter(el => {
        const hasIncoming = connections.some(conn => conn.target === el.id);
        const hasOutgoing = connections.some(conn => conn.source === el.id);
        return hasIncoming && !hasOutgoing;
    });

    if (deadEnds.length > 0) {
        issues.push({
            type: 'dead_ends',
            severity: 'low',
            count: deadEnds.length,
            description: `${deadEnds.length} node(s) are dead ends (no outgoing connections)`,
            elements: deadEnds.map(el => ({ id: el.id, text: el.text })),
            suggestion: 'These might be final outcomes or missing next steps'
        });
    }

    // Issue 4: Overlapping elements
    const overlaps = detectOverlaps(visualElements);
    if (overlaps.length > 0) {
        issues.push({
            type: 'overlapping_elements',
            severity: 'low',
            count: overlaps.length,
            description: `${overlaps.length} pair(s) of overlapping elements detected`,
            overlaps: overlaps,
            suggestion: 'Consider reorganizing layout for better clarity'
        });
    }

    // Issue 5: Empty or very short text
    const emptyOrShort = textElements.filter(el => el.text.trim().length < 3);
    if (emptyOrShort.length > 0) {
        issues.push({
            type: 'incomplete_labels',
            severity: 'low',
            count: emptyOrShort.length,
            description: `${emptyOrShort.length} node(s) have very short or empty labels`,
            elements: emptyOrShort.map(el => el.id),
            suggestion: 'Add descriptive labels for better understanding'
        });
    }

    return issues;
}

/**
 * Detect cycles in the graph using DFS
 */
function detectCycles(connections) {
    const graph = new Map();
    connections.forEach(conn => {
        if (!graph.has(conn.source)) graph.set(conn.source, []);
        graph.get(conn.source).push(conn.target);
    });

    const cycles = [];
    const visited = new Set();
    const recStack = new Set();

    function dfs(node, path = []) {
        if (recStack.has(node)) {
            // Found a cycle
            const cycleStart = path.indexOf(node);
            cycles.push(path.slice(cycleStart).concat(node));
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

    graph.forEach((_, node) => {
        if (!visited.has(node)) {
            dfs(node);
        }
    });

    return cycles;
}

/**
 * Detect overlapping elements
 */
function detectOverlaps(visualElements, threshold = 50) {
    const overlaps = [];

    for (let i = 0; i < visualElements.length; i++) {
        for (let j = i + 1; j < visualElements.length; j++) {
            const el1 = visualElements[i];
            const el2 = visualElements[j];

            const distance = Math.sqrt(
                Math.pow(el1.position.x - el2.position.x, 2) +
                Math.pow(el1.position.y - el2.position.y, 2)
            );

            if (distance < threshold) {
                overlaps.push({
                    elements: [el1.id, el2.id],
                    distance: Math.round(distance)
                });
            }
        }
    }

    return overlaps;
}

/**
 * Find duplicate or very similar text elements
 */
function findDuplicates(textElements) {
    const duplicates = [];
    const seen = new Map();

    textElements.forEach(element => {
        const normalized = element.text.toLowerCase().trim();
        if (normalized.length < 3) return;

        if (seen.has(normalized)) {
            const existing = seen.get(normalized);
            duplicates.push({
                text: element.text,
                elements: [existing.id, element.id],
                positions: [existing.position, element.position]
            });
        } else {
            seen.set(normalized, element);
        }
    });

    // Also check for similar (not exact) duplicates using Levenshtein-like comparison
    const similar = [];
    const texts = Array.from(seen.values());

    for (let i = 0; i < texts.length; i++) {
        for (let j = i + 1; j < texts.length; j++) {
            const similarity = calculateSimilarity(texts[i].text, texts[j].text);
            if (similarity > 0.8) {
                similar.push({
                    elements: [texts[i].id, texts[j].id],
                    texts: [texts[i].text, texts[j].text],
                    similarity: Math.round(similarity * 100)
                });
            }
        }
    }

    return {
        exact: duplicates,
        similar: similar
    };
}

/**
 * Calculate text similarity (simple approach)
 */
function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

/**
 * Levenshtein distance calculation
 */
function levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[str2.length][str1.length];
}

/**
 * Analyze dependencies and relationships
 */
function analyzeDependencies(connections, textElements) {
    const nodeMap = new Map(textElements.map(el => [el.id, el]));
    const dependencies = [];

    // Build dependency chains
    const chains = [];
    const visited = new Set();

    connections.forEach(conn => {
        if (visited.has(conn.id)) return;

        const chain = {
            id: `chain-${chains.length}`,
            steps: [],
            length: 0
        };

        let current = conn.source;
        const chainVisited = new Set();

        while (current && !chainVisited.has(current)) {
            chainVisited.add(current);
            const node = nodeMap.get(current);

            if (node) {
                chain.steps.push({
                    id: current,
                    text: node.text,
                    position: node.position
                });
            }

            // Find next in chain
            const next = connections.find(c => c.source === current && !chainVisited.has(c.target));
            current = next?.target;
            if (next) visited.add(next.id);
        }

        if (chain.steps.length > 1) {
            chain.length = chain.steps.length;
            chains.push(chain);
        }
    });

    return {
        chains: chains.sort((a, b) => b.length - a.length),
        totalConnections: connections.length,
        averageChainLength: chains.length > 0
            ? chains.reduce((sum, c) => sum + c.length, 0) / chains.length
            : 0
    };
}

/**
 * Use LLM for deep semantic analysis
 */
async function analyzeBoardWithLLM(extractedData, heuristicResults) {
    if (!process.env.GEMINI_API_KEY) {
        console.log('⚠️  Gemini API key not found, skipping LLM analysis');
        return null;
    }

    console.log('🤖 Running LLM semantic analysis...');

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Prepare context for LLM
    const context = prepareLLMContext(extractedData, heuristicResults);

    const prompt = `You are an expert at analyzing visual boards, flowcharts, and mind maps. Analyze the following board data and provide deep semantic insights.

**Board Context:**
${context}

**Your Task:**
Analyze this board and provide:

1. **Main Topics & Themes**: What are the primary subjects or themes?
2. **Relationships & Patterns**: What meaningful relationships exist between elements?
3. **Missing Elements**: What important steps, connections, or information might be missing?
4. **Contradictions**: Are there any logical contradictions or conflicts?
5. **Quality Assessment**: How well-organized and complete is this board?
6. **Actionable Suggestions**: What specific improvements would make this board more effective?

**Output Format (JSON only, no markdown):**
{
  "mainThemes": ["theme1", "theme2", ...],
  "keyInsights": ["insight1", "insight2", ...],
  "relationships": [
    { "type": "causal|hierarchical|associative", "description": "..." }
  ],
  "missingElements": ["element1", "element2", ...],
  "contradictions": [
    { "description": "...", "elements": ["id1", "id2"] }
  ],
  "qualityScore": 0-100,
  "suggestions": [
    { "priority": "high|medium|low", "action": "...", "reason": "..." }
  ],
  "summary": "Overall assessment in 2-3 sentences"
}

Return ONLY valid JSON, no markdown blocks.`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean and parse JSON
        const jsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error('LLM Analysis Error:', error);
        return null;
    }
}

/**
 * Prepare context for LLM analysis
 */
function prepareLLMContext(extractedData, heuristicResults) {
    const { textElements, stats } = extractedData;
    const { topics, clusters, hierarchies, issues } = heuristicResults;

    const context = [];

    // Stats
    context.push(`**Statistics:**`);
    context.push(`- Total Elements: ${stats.totalElements}`);
    context.push(`- Nodes: ${stats.nodeCount}`);
    context.push(`- Connections: ${stats.edgeCount}`);
    context.push(`- Drawings: ${stats.strokeCount}`);
    context.push('');

    // Text content (limited)
    context.push(`**Node Labels (sample):**`);
    textElements.slice(0, 20).forEach(el => {
        context.push(`- "${el.text}"`);
    });
    context.push('');

    // Top topics
    if (topics.length > 0) {
        context.push(`**Top Keywords:**`);
        topics.slice(0, 10).forEach(topic => {
            context.push(`- ${topic.keyword} (${topic.frequency} occurrences)`);
        });
        context.push('');
    }

    // Clusters
    if (clusters.length > 0) {
        context.push(`**Spatial Clusters:**`);
        context.push(`- Found ${clusters.length} distinct groups of elements`);
        context.push('');
    }

    // Hierarchies
    if (hierarchies.length > 0) {
        context.push(`**Flow Hierarchies:**`);
        hierarchies.slice(0, 3).forEach((h, i) => {
            context.push(`- Hierarchy ${i + 1}: ${h.depth} levels, starting from "${h.rootText}"`);
        });
        context.push('');
    }

    // Issues
    if (issues.length > 0) {
        context.push(`**Detected Issues:**`);
        issues.forEach(issue => {
            context.push(`- ${issue.description}`);
        });
    }

    return context.join('\n');
}

/**
 * Build final semantic map
 */
function buildSemanticMap(heuristicResults, llmResults, focus) {
    const semanticMap = {
        timestamp: new Date().toISOString(),
        analysisType: llmResults ? 'deep' : 'heuristic',

        // Core analysis results
        topics: heuristicResults.topics,
        clusters: heuristicResults.clusters,
        hierarchies: heuristicResults.hierarchies,
        dependencies: heuristicResults.dependencies,

        // Issues and quality
        issues: heuristicResults.issues,
        duplicates: heuristicResults.duplicates,

        // Statistics
        stats: heuristicResults.stats,

        // LLM insights (if available)
        insights: llmResults ? {
            mainThemes: llmResults.mainThemes || [],
            keyInsights: llmResults.keyInsights || [],
            relationships: llmResults.relationships || [],
            missingElements: llmResults.missingElements || [],
            contradictions: llmResults.contradictions || [],
            qualityScore: llmResults.qualityScore || 0,
            summary: llmResults.summary || ''
        } : null,

        // Suggestions
        suggestions: buildSuggestions(heuristicResults, llmResults)
    };

    // Filter by focus if specified
    if (!focus.includes('all')) {
        const filtered = { timestamp: semanticMap.timestamp, analysisType: semanticMap.analysisType };
        focus.forEach(key => {
            if (semanticMap[key]) {
                filtered[key] = semanticMap[key];
            }
        });
        return filtered;
    }

    return semanticMap;
}

/**
 * Build actionable suggestions
 */
function buildSuggestions(heuristicResults, llmResults) {
    const suggestions = [];

    // Add LLM suggestions if available
    if (llmResults?.suggestions) {
        suggestions.push(...llmResults.suggestions);
    }

    // Add heuristic-based suggestions
    if (heuristicResults.issues.length > 0) {
        heuristicResults.issues.forEach(issue => {
            if (issue.suggestion) {
                suggestions.push({
                    priority: issue.severity === 'high' ? 'high' : 'medium',
                    action: issue.suggestion,
                    reason: issue.description,
                    category: 'issue_resolution'
                });
            }
        });
    }

    // Suggest clustering if elements are scattered
    if (heuristicResults.clusters.length < 2 && heuristicResults.stats.totalElements > 10) {
        suggestions.push({
            priority: 'low',
            action: 'Group related elements into clusters for better organization',
            reason: 'Elements appear scattered without clear grouping',
            category: 'organization'
        });
    }

    // Suggest adding connections if many orphaned nodes
    const orphanedIssue = heuristicResults.issues.find(i => i.type === 'orphaned_nodes');
    if (orphanedIssue && orphanedIssue.count > 3) {
        suggestions.push({
            priority: 'medium',
            action: 'Connect isolated nodes to show relationships',
            reason: `${orphanedIssue.count} nodes have no connections`,
            category: 'connectivity'
        });
    }

    return suggestions;
}

/**
 * Helper: Get center point of a stroke
 */
function getStrokeCenter(points) {
    if (!points || points.length === 0) return { x: 0, y: 0 };

    let sumX = 0, sumY = 0, count = 0;

    for (let i = 0; i < points.length; i += 2) {
        sumX += points[i];
        sumY += points[i + 1];
        count++;
    }

    return {
        x: sumX / count,
        y: sumY / count
    };
}

/**
 * Export additional utility for quick analysis
 */
export async function quickAnalyze(boardJSON) {
    return analyzeBoard(boardJSON, { depth: 'quick', focus: ['topics', 'issues'] });
}
