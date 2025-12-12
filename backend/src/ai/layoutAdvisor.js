import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger.js';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Layout Advisor - Intelligent layout recommendation system
 * 
 * Analyzes board semantics and structure to recommend optimal layout modes
 * with detailed configuration hints for spacing, grouping, alignment, and colors.
 * 
 * @param {object} boardSemanticMap - Semantic map from board interpreter
 * @param {object} options - Analysis options
 * @returns {Promise<object>} Layout recommendations with configuration
 */
export async function layoutAdvisor(boardSemanticMap, options = {}) {
    const {
        considerDensity = true,
        considerSemantics = true,
        useLLM = true,
        multipleRecommendations = false
    } = options;

    console.log('🎨 Layout Advisor: Analyzing board structure...');

    try {
        // Step 1: Analyze board structure
        const analysis = analyzeBoardStructure(boardSemanticMap);

        // Step 2: Calculate layout scores
        const layoutScores = calculateLayoutScores(analysis, considerDensity, considerSemantics);

        // Step 3: Get LLM recommendations if available
        let llmRecommendation = null;
        if (useLLM && process.env.GEMINI_API_KEY) {
            llmRecommendation = await getLLMRecommendation(boardSemanticMap, analysis);
        }

        // Step 4: Determine best layout(s)
        const recommendations = buildRecommendations(
            layoutScores,
            analysis,
            llmRecommendation,
            multipleRecommendations
        );

        console.log(`✅ Layout recommendation: ${recommendations.primary.type}`);
        return recommendations;

    } catch (error) {
        logger.error('Layout Advisor Error:', error);
        return getFallbackRecommendation();
    }
}

/**
 * Analyze board structure and extract key metrics
 */
function analyzeBoardStructure(semanticMap) {
    const analysis = {
        // Element counts
        nodeCount: 0,
        edgeCount: 0,
        clusterCount: 0,

        // Structure metrics
        density: 0,
        hierarchyDepth: 0,
        hierarchyBreadth: 0,
        hasHierarchy: false,
        hasClusters: false,
        hasTimeline: false,
        hasStages: false,

        // Relationship patterns
        linearFlow: false,
        treeStructure: false,
        networkStructure: false,
        cyclicStructure: false,

        // Content analysis
        topics: [],
        hasDateReferences: false,
        hasStatusReferences: false,
        hasPhaseReferences: false,

        // Spatial metrics
        averageConnections: 0,
        maxConnections: 0,
        isolatedNodes: 0
    };

    // Extract basic counts
    if (semanticMap.stats) {
        analysis.nodeCount = semanticMap.stats.nodeCount || 0;
        analysis.edgeCount = semanticMap.stats.edgeCount || 0;
    }

    // Analyze clusters
    if (semanticMap.clusters) {
        analysis.clusterCount = semanticMap.clusters.length;
        analysis.hasClusters = semanticMap.clusters.length > 1;

        // Calculate density
        if (analysis.nodeCount > 0) {
            const totalArea = semanticMap.clusters.reduce((sum, c) => {
                const width = c.bounds.maxX - c.bounds.minX;
                const height = c.bounds.maxY - c.bounds.minY;
                return sum + (width * height);
            }, 0);
            analysis.density = analysis.nodeCount / (totalArea / 10000); // Normalize
        }
    }

    // Analyze hierarchies
    if (semanticMap.hierarchies && semanticMap.hierarchies.length > 0) {
        analysis.hasHierarchy = true;
        const mainHierarchy = semanticMap.hierarchies[0];
        analysis.hierarchyDepth = mainHierarchy.depth || 0;
        analysis.hierarchyBreadth = mainHierarchy.breadth || 0;

        // Determine if tree structure
        analysis.treeStructure = analysis.hierarchyDepth > 2 && analysis.hierarchyBreadth > 1;
    }

    // Analyze topics for content patterns
    if (semanticMap.topics) {
        analysis.topics = semanticMap.topics.slice(0, 10).map(t => t.keyword.toLowerCase());

        // Check for timeline indicators
        const timelineKeywords = ['date', 'time', 'day', 'week', 'month', 'year', 'phase', 'sprint', 'milestone'];
        analysis.hasTimeline = analysis.topics.some(t =>
            timelineKeywords.some(k => t.includes(k))
        );

        // Check for status indicators
        const statusKeywords = ['todo', 'doing', 'done', 'status', 'progress', 'complete'];
        analysis.hasStatusReferences = analysis.topics.some(t =>
            statusKeywords.some(k => t.includes(k))
        );

        // Check for phase indicators
        const phaseKeywords = ['phase', 'stage', 'step', 'swimlane', 'lane'];
        analysis.hasPhaseReferences = analysis.topics.some(t =>
            phaseKeywords.some(k => t.includes(k))
        );
    }

    // Analyze connection patterns
    if (semanticMap.dependencies) {
        const chains = semanticMap.dependencies.chains || [];

        // Check for linear flow
        analysis.linearFlow = chains.some(c => c.length > 3) && chains.length < 3;

        // Average connections
        analysis.averageConnections = semanticMap.dependencies.averageChainLength || 0;
    }

    // Check for cycles
    if (semanticMap.issues) {
        const circularLogic = semanticMap.issues.find(i => i.type === 'circularLogic');
        analysis.cyclicStructure = circularLogic && circularLogic.length > 0;
    }

    // Determine network structure
    analysis.networkStructure = analysis.averageConnections > 2 && !analysis.treeStructure;

    return analysis;
}

/**
 * Calculate scores for each layout type
 */
function calculateLayoutScores(analysis, considerDensity, considerSemantics) {
    const scores = {
        grid: 0,
        mindmap: 0,
        tree: 0,
        radial: 0,
        swimlane: 0,
        timeline: 0,
        kanban: 0
    };

    // Grid layout scoring
    scores.grid += analysis.hasClusters ? 30 : 0;
    scores.grid += analysis.density > 0.5 ? 20 : 0;
    scores.grid += analysis.nodeCount > 20 ? 15 : 0;
    scores.grid += !analysis.hasHierarchy ? 20 : 0;

    // Mindmap layout scoring
    scores.mindmap += analysis.hasClusters ? 40 : 0;
    scores.mindmap += analysis.networkStructure ? 30 : 0;
    scores.mindmap += analysis.topics.length > 5 ? 20 : 0;
    scores.mindmap += analysis.nodeCount < 50 ? 10 : 0;

    // Tree layout scoring
    scores.tree += analysis.hasHierarchy ? 50 : 0;
    scores.tree += analysis.treeStructure ? 30 : 0;
    scores.tree += analysis.hierarchyDepth > 2 ? 20 : 0;
    scores.tree += analysis.linearFlow ? -20 : 0;

    // Radial layout scoring
    scores.radial += analysis.hasHierarchy ? 30 : 0;
    scores.radial += analysis.nodeCount < 30 ? 25 : 0;
    scores.radial += analysis.hierarchyDepth < 4 ? 20 : 0;
    scores.radial += analysis.networkStructure ? 15 : 0;

    // Swimlane layout scoring
    scores.swimlane += analysis.hasPhaseReferences ? 40 : 0;
    scores.swimlane += analysis.hasClusters ? 30 : 0;
    scores.swimlane += analysis.linearFlow ? 20 : 0;
    scores.swimlane += analysis.hasStatusReferences ? 10 : 0;

    // Timeline layout scoring
    scores.timeline += analysis.hasTimeline ? 50 : 0;
    scores.timeline += analysis.linearFlow ? 30 : 0;
    scores.timeline += analysis.hierarchyDepth < 3 ? 15 : 0;
    scores.timeline += analysis.nodeCount < 40 ? 5 : 0;

    // Kanban layout scoring
    scores.kanban += analysis.hasStatusReferences ? 50 : 0;
    scores.kanban += analysis.hasClusters && analysis.clusterCount < 6 ? 30 : 0;
    scores.kanban += analysis.topics.some(t => t.includes('task') || t.includes('ticket')) ? 20 : 0;

    // Normalize scores
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore > 0) {
        Object.keys(scores).forEach(key => {
            scores[key] = (scores[key] / maxScore) * 100;
        });
    }

    return scores;
}

/**
 * Get LLM-based recommendation
 */
async function getLLMRecommendation(semanticMap, analysis) {
    if (!process.env.GEMINI_API_KEY) {
        return null;
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `You are an expert in information visualization and layout design. Analyze this board and recommend the best layout.

**Board Analysis:**
- Nodes: ${analysis.nodeCount}
- Edges: ${analysis.edgeCount}
- Clusters: ${analysis.clusterCount}
- Has Hierarchy: ${analysis.hasHierarchy}
- Hierarchy Depth: ${analysis.hierarchyDepth}
- Topics: ${analysis.topics.join(', ')}
- Has Timeline References: ${analysis.hasTimeline}
- Has Status References: ${analysis.hasStatusReferences}
- Has Phase References: ${analysis.hasPhaseReferences}
- Structure: ${analysis.treeStructure ? 'Tree' : analysis.networkStructure ? 'Network' : analysis.linearFlow ? 'Linear' : 'Mixed'}

**Available Layouts:**
1. **Grid**: Organized in rows and columns, good for categorized content
2. **Mindmap**: Central topic with radiating branches, good for brainstorming
3. **Tree**: Hierarchical top-to-bottom, good for org charts and decision trees
4. **Radial**: Circular hierarchy, good for small hierarchies with visual appeal
5. **Swimlane**: Horizontal lanes for phases/actors, good for processes
6. **Timeline**: Chronological left-to-right, good for schedules and roadmaps
7. **Kanban**: Vertical columns for status, good for task management

**Output Format (JSON only):**
{
  "recommendedLayout": "tree|grid|mindmap|radial|swimlane|timeline|kanban",
  "confidence": 0-100,
  "reasoning": "Why this layout is best",
  "alternatives": ["layout2", "layout3"],
  "warnings": ["Any potential issues with this layout"]
}

Return ONLY valid JSON.`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonText);
    } catch (error) {
        logger.error('LLM Layout Recommendation Error:', error);
        return null;
    }
}

/**
 * Build final recommendations with configuration
 */
function buildRecommendations(layoutScores, analysis, llmRecommendation, multipleRecommendations) {
    // Determine primary layout
    let primaryType = Object.keys(layoutScores).reduce((a, b) =>
        layoutScores[a] > layoutScores[b] ? a : b
    );

    // Override with LLM if available and confident
    if (llmRecommendation && llmRecommendation.confidence > 70) {
        primaryType = llmRecommendation.recommendedLayout;
    }

    // Build primary recommendation
    const primary = {
        type: primaryType,
        score: layoutScores[primaryType],
        confidence: llmRecommendation?.confidence || layoutScores[primaryType],
        reasoning: llmRecommendation?.reasoning || generateReasoning(primaryType, analysis),
        configuration: generateLayoutConfiguration(primaryType, analysis),
        warnings: llmRecommendation?.warnings || []
    };

    // Build alternatives if requested
    const alternatives = [];
    if (multipleRecommendations) {
        const sortedLayouts = Object.entries(layoutScores)
            .filter(([type]) => type !== primaryType)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 2);

        sortedLayouts.forEach(([type, score]) => {
            alternatives.push({
                type,
                score,
                reasoning: generateReasoning(type, analysis),
                configuration: generateLayoutConfiguration(type, analysis)
            });
        });
    }

    return {
        timestamp: new Date().toISOString(),
        analysis: {
            nodeCount: analysis.nodeCount,
            edgeCount: analysis.edgeCount,
            density: analysis.density,
            structure: analysis.treeStructure ? 'tree' :
                analysis.networkStructure ? 'network' :
                    analysis.linearFlow ? 'linear' : 'mixed'
        },
        primary,
        alternatives,
        allScores: layoutScores
    };
}

/**
 * Generate reasoning for layout choice
 */
function generateReasoning(layoutType, analysis) {
    const reasons = {
        grid: `Grid layout is ideal because ${analysis.hasClusters ? 'the board has distinct clusters' : 'elements are evenly distributed'}. ${analysis.nodeCount > 20 ? 'The large number of elements benefits from organized rows and columns.' : ''}`,

        mindmap: `Mindmap layout works well because ${analysis.networkStructure ? 'the board has a network structure with multiple connections' : 'the content has multiple related topics'}. ${analysis.hasClusters ? 'Clusters can be organized as branches.' : ''}`,

        tree: `Tree layout is recommended because ${analysis.hasHierarchy ? 'the board has a clear hierarchical structure' : 'elements show parent-child relationships'}. ${analysis.hierarchyDepth > 2 ? `With ${analysis.hierarchyDepth} levels, a tree clearly shows the hierarchy.` : ''}`,

        radial: `Radial layout is suitable because ${analysis.hasHierarchy ? 'the hierarchy is relatively shallow' : 'elements radiate from a central concept'}. ${analysis.nodeCount < 30 ? 'The moderate number of elements fits well in a circular layout.' : ''}`,

        swimlane: `Swimlane layout is appropriate because ${analysis.hasPhaseReferences ? 'the board references phases or stages' : 'elements can be grouped by category'}. ${analysis.linearFlow ? 'The linear flow maps well to horizontal lanes.' : ''}`,

        timeline: `Timeline layout is best because ${analysis.hasTimeline ? 'the board contains temporal references' : 'elements follow a chronological sequence'}. ${analysis.linearFlow ? 'The linear progression is perfect for a timeline.' : ''}`,

        kanban: `Kanban layout is ideal because ${analysis.hasStatusReferences ? 'the board tracks status or progress' : 'elements can be organized by workflow stage'}. ${analysis.clusterCount < 6 ? `The ${analysis.clusterCount} clusters map well to kanban columns.` : ''}`
    };

    return reasons[layoutType] || 'This layout provides good organization for the board content.';
}

/**
 * Generate detailed layout configuration
 */
function generateLayoutConfiguration(layoutType, analysis) {
    const configs = {
        grid: {
            spacing: {
                horizontal: analysis.density > 0.5 ? 80 : 120,
                vertical: analysis.density > 0.5 ? 80 : 120,
                padding: 40
            },
            grouping: {
                enabled: analysis.hasClusters,
                method: 'cluster',
                clusterPadding: 60
            },
            alignment: {
                horizontal: 'center',
                vertical: 'top',
                snapToGrid: true
            },
            colorCoding: {
                enabled: true,
                method: analysis.hasClusters ? 'by-cluster' : 'by-type',
                palette: 'pastel'
            },
            columns: Math.ceil(Math.sqrt(analysis.nodeCount)),
            autoResize: true
        },

        mindmap: {
            spacing: {
                radialDistance: 150,
                branchSpacing: 100,
                levelSpacing: 200
            },
            grouping: {
                enabled: true,
                method: 'topic',
                maxBranchesPerLevel: 8
            },
            alignment: {
                centerNode: 'auto',
                branchAngle: 'auto',
                balanceBranches: true
            },
            colorCoding: {
                enabled: true,
                method: 'by-branch',
                palette: 'vibrant',
                fadeWithDepth: true
            },
            centerPosition: { x: 0, y: 0 },
            maxLevels: 4
        },

        tree: {
            spacing: {
                horizontal: 150,
                vertical: 100,
                levelGap: 120
            },
            grouping: {
                enabled: true,
                method: 'hierarchy',
                siblingGrouping: true
            },
            alignment: {
                horizontal: 'center',
                vertical: 'top',
                balanceSubtrees: true
            },
            colorCoding: {
                enabled: true,
                method: 'by-level',
                palette: 'gradient',
                rootColor: '#4F46E5'
            },
            direction: 'top-to-bottom',
            compactMode: analysis.nodeCount > 30
        },

        radial: {
            spacing: {
                radius: 200,
                radiusIncrement: 150,
                angleSpacing: 'auto'
            },
            grouping: {
                enabled: true,
                method: 'hierarchy',
                sectorGrouping: true
            },
            alignment: {
                centerNode: 'auto',
                distributeEvenly: true,
                avoidOverlap: true
            },
            colorCoding: {
                enabled: true,
                method: 'by-sector',
                palette: 'rainbow',
                centerHighlight: true
            },
            centerPosition: { x: 0, y: 0 },
            maxRadius: 600
        },

        swimlane: {
            spacing: {
                laneHeight: 200,
                laneGap: 40,
                elementSpacing: 100
            },
            grouping: {
                enabled: true,
                method: 'phase',
                lanesCount: analysis.clusterCount || 3
            },
            alignment: {
                horizontal: 'left',
                vertical: 'center',
                snapToLane: true
            },
            colorCoding: {
                enabled: true,
                method: 'by-lane',
                palette: 'professional',
                alternateRows: true
            },
            direction: 'horizontal',
            laneLabels: true
        },

        timeline: {
            spacing: {
                horizontal: 200,
                vertical: 120,
                trackGap: 100
            },
            grouping: {
                enabled: true,
                method: 'chronological',
                parallelTracks: analysis.clusterCount > 1
            },
            alignment: {
                horizontal: 'left',
                vertical: 'center',
                snapToTimeline: true
            },
            colorCoding: {
                enabled: true,
                method: 'by-phase',
                palette: 'timeline',
                milestoneHighlight: true
            },
            direction: 'left-to-right',
            showAxis: true,
            trackCount: Math.min(analysis.clusterCount, 4)
        },

        kanban: {
            spacing: {
                columnWidth: 250,
                columnGap: 30,
                cardSpacing: 20
            },
            grouping: {
                enabled: true,
                method: 'status',
                columnsCount: analysis.clusterCount || 4
            },
            alignment: {
                horizontal: 'center',
                vertical: 'top',
                snapToColumn: true
            },
            colorCoding: {
                enabled: true,
                method: 'by-column',
                palette: 'kanban',
                statusColors: {
                    todo: '#94A3B8',
                    inProgress: '#3B82F6',
                    done: '#10B981'
                }
            },
            columnLabels: ['To Do', 'In Progress', 'Review', 'Done'],
            swimlanes: false
        }
    };

    return configs[layoutType];
}

/**
 * Get fallback recommendation
 */
function getFallbackRecommendation() {
    return {
        timestamp: new Date().toISOString(),
        analysis: {
            nodeCount: 0,
            edgeCount: 0,
            density: 0,
            structure: 'unknown'
        },
        primary: {
            type: 'grid',
            score: 50,
            confidence: 50,
            reasoning: 'Grid layout is a safe default for general content organization.',
            configuration: generateLayoutConfiguration('grid', {
                nodeCount: 10,
                density: 0.3,
                hasClusters: false
            }),
            warnings: ['Limited analysis available - using default recommendation']
        },
        alternatives: [],
        allScores: {}
    };
}

/**
 * Quick layout recommendation (heuristic only)
 */
export async function quickLayoutRecommendation(boardSemanticMap) {
    return await layoutAdvisor(boardSemanticMap, {
        considerDensity: true,
        considerSemantics: true,
        useLLM: false,
        multipleRecommendations: false
    });
}

/**
 * Get multiple layout options
 */
export async function getLayoutOptions(boardSemanticMap) {
    return await layoutAdvisor(boardSemanticMap, {
        considerDensity: true,
        considerSemantics: true,
        useLLM: true,
        multipleRecommendations: true
    });
}

export default layoutAdvisor;
