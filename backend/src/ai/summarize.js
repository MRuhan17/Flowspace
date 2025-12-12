import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger.js';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Enhanced Board Summarization - Multi-layer comprehensive summaries
 * 
 * Produces structured summaries with multiple layers:
 * - One sentence summary
 * - Key decisions
 * - Open questions
 * - Actionable next steps
 * - Risks or blockers
 * - Suggested improvements
 * - Named sections based on content clusters
 * 
 * @param {object} boardData - Board content or semantic map
 * @param {object} options - Summarization options
 * @returns {Promise<object>} Multi-layer summary in structured format
 */
export async function summarizeBoard(boardData, options = {}) {
    const {
        format = 'json',  // 'json' | 'markdown'
        includeMetadata = true,
        useClusters = true,
        detailLevel = 'comprehensive'  // 'brief' | 'standard' | 'comprehensive'
    } = options;

    console.log('📝 Enhanced Summarization: Generating multi-layer summary...');

    try {
        // Step 1: Extract and prepare board context
        const context = extractBoardContext(boardData);

        // Step 2: Generate multi-layer summary using LLM
        const summary = await generateMultiLayerSummary(context, detailLevel);

        // Step 3: Format output
        const formatted = format === 'markdown'
            ? formatAsMarkdown(summary, includeMetadata)
            : formatAsJSON(summary, includeMetadata);

        console.log('✅ Multi-layer summary generated successfully');
        return formatted;

    } catch (error) {
        logger.error('Enhanced Summarization Failed:', error);
        return generateFallbackSummary(boardData, format);
    }
}

/**
 * Extract comprehensive context from board data
 */
function extractBoardContext(boardData) {
    const context = {
        elements: [],
        connections: [],
        clusters: [],
        topics: [],
        stats: {}
    };

    // Check if it's a semantic map or raw board data
    const isSemanticMap = boardData.topics || boardData.clusters || boardData.hierarchies;

    if (isSemanticMap) {
        // Extract from semantic map
        context.topics = boardData.topics?.slice(0, 15).map(t => t.keyword) || [];
        context.clusters = boardData.clusters || [];

        // Extract text from hierarchies
        if (boardData.hierarchies) {
            boardData.hierarchies.forEach(hierarchy => {
                hierarchy.levels?.forEach(level => {
                    level.forEach(node => {
                        context.elements.push({
                            text: node.text,
                            type: 'hierarchy_node'
                        });
                    });
                });
            });
        }

        // Extract stats
        context.stats = boardData.stats || {};

        // Extract insights if available
        if (boardData.insights) {
            context.insights = {
                themes: boardData.insights.mainThemes || [],
                summary: boardData.insights.summary || '',
                missing: boardData.insights.missingElements || []
            };
        }

    } else {
        // Extract from raw board data
        const { nodes = [], edges = [], strokes = [] } = boardData;

        // Extract text from nodes
        nodes.forEach(node => {
            if (node.data?.label) {
                context.elements.push({
                    text: node.data.label,
                    type: node.type || 'node',
                    id: node.id
                });
            }
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

        // Basic stats
        context.stats = {
            nodeCount: nodes.length,
            edgeCount: edges.length,
            strokeCount: strokes.length,
            totalElements: nodes.length + edges.length + strokes.length
        };
    }

    return context;
}

/**
 * Generate multi-layer summary using LLM
 */
async function generateMultiLayerSummary(context, detailLevel) {
    if (!process.env.GEMINI_API_KEY) {
        logger.warn('GEMINI_API_KEY not found, using fallback summary');
        return generateBasicSummary(context);
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = buildSummaryPrompt(context, detailLevel);

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean and parse JSON
        const jsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonText);

    } catch (error) {
        logger.error('LLM Summary Generation Error:', error);
        return generateBasicSummary(context);
    }
}

/**
 * Build comprehensive summary prompt
 */
function buildSummaryPrompt(context, detailLevel) {
    const elementTexts = context.elements.map(e => e.text).filter(Boolean);
    const topicList = context.topics.join(', ');
    const insights = context.insights?.summary || '';

    const detailInstructions = {
        'brief': 'Keep all sections concise and to the point. Maximum 3 items per list.',
        'standard': 'Provide balanced detail. Maximum 5 items per list.',
        'comprehensive': 'Provide thorough analysis. Include all relevant items.'
    };

    return `You are an expert at analyzing collaborative whiteboards and creating comprehensive summaries.

**Board Context:**
- Total Elements: ${context.stats.totalElements || context.elements.length}
- Nodes: ${context.stats.nodeCount || 0}
- Connections: ${context.stats.edgeCount || context.connections.length}
- Key Topics: ${topicList || 'Not available'}

**Content:**
${elementTexts.slice(0, 50).map(text => `- ${text}`).join('\n')}

${insights ? `\n**Initial Analysis:**\n${insights}` : ''}

**Connections:**
${context.connections.slice(0, 20).map(c => `- ${c.from} → ${c.to}${c.label ? ` (${c.label})` : ''}`).join('\n')}

**Your Task:**
Create a comprehensive multi-layer summary of this board. ${detailInstructions[detailLevel]}

**Output Format (JSON only, no markdown):**
{
  "oneSentenceSummary": "A single, clear sentence capturing the essence of this board",
  
  "overview": {
    "purpose": "What this board is about",
    "scope": "What areas it covers",
    "audience": "Who this is for (if discernible)"
  },
  
  "keyDecisions": [
    {
      "decision": "What was decided",
      "rationale": "Why this decision was made",
      "impact": "What this affects"
    }
  ],
  
  "openQuestions": [
    {
      "question": "Unanswered question or uncertainty",
      "context": "Why this matters",
      "priority": "high|medium|low"
    }
  ],
  
  "actionableNextSteps": [
    {
      "step": "Specific action to take",
      "owner": "Who should do this (if mentioned)",
      "priority": "high|medium|low",
      "timeframe": "When this should happen"
    }
  ],
  
  "risksAndBlockers": [
    {
      "risk": "Potential problem or blocker",
      "severity": "high|medium|low",
      "mitigation": "How to address this",
      "status": "identified|being_addressed|resolved"
    }
  ],
  
  "suggestedImprovements": [
    {
      "area": "What could be improved",
      "suggestion": "Specific improvement",
      "benefit": "Why this would help",
      "effort": "low|medium|high"
    }
  ],
  
  "namedSections": [
    {
      "name": "Section name based on content cluster",
      "summary": "What this section covers",
      "keyPoints": ["point1", "point2", "point3"],
      "status": "complete|in_progress|planned|unclear"
    }
  ],
  
  "metadata": {
    "totalElements": ${context.stats.totalElements || context.elements.length},
    "mainTopics": ["topic1", "topic2", "topic3"],
    "completeness": 0-100,
    "clarity": 0-100,
    "complexity": "low|medium|high"
  }
}

**Important Guidelines:**
1. Be specific and actionable - avoid vague statements
2. Base everything on actual board content
3. If a section has no relevant content, use an empty array []
4. Prioritize items by importance
5. Use professional, clear language
6. Identify patterns and themes
7. Note what's missing or unclear

Return ONLY valid JSON, no markdown blocks or explanations.`;
}

/**
 * Generate basic summary (fallback when LLM unavailable)
 */
function generateBasicSummary(context) {
    const elementCount = context.elements.length;
    const connectionCount = context.connections.length;
    const topics = context.topics.slice(0, 5);

    return {
        oneSentenceSummary: `Board contains ${elementCount} elements covering ${topics.length > 0 ? topics.join(', ') : 'various topics'}`,

        overview: {
            purpose: 'Collaborative whiteboard session',
            scope: `${elementCount} elements with ${connectionCount} connections`,
            audience: 'Team members'
        },

        keyDecisions: [],
        openQuestions: [],
        actionableNextSteps: [],
        risksAndBlockers: [],
        suggestedImprovements: [
            {
                area: 'AI Analysis',
                suggestion: 'Configure GEMINI_API_KEY for detailed AI-powered summaries',
                benefit: 'Get comprehensive insights, decisions, and recommendations',
                effort: 'low'
            }
        ],

        namedSections: context.clusters.map((cluster, index) => ({
            name: `Cluster ${index + 1}`,
            summary: `Group of ${cluster.size} related elements`,
            keyPoints: [],
            status: 'unclear'
        })),

        metadata: {
            totalElements: elementCount,
            mainTopics: topics,
            completeness: 50,
            clarity: 50,
            complexity: 'medium'
        }
    };
}

/**
 * Format summary as JSON
 */
function formatAsJSON(summary, includeMetadata) {
    const output = {
        timestamp: new Date().toISOString(),
        format: 'json',
        summary: summary
    };

    if (!includeMetadata) {
        delete output.summary.metadata;
    }

    return output;
}

/**
 * Format summary as Markdown
 */
function formatAsMarkdown(summary, includeMetadata) {
    let markdown = '';

    // Title and one-sentence summary
    markdown += `# Board Summary\n\n`;
    markdown += `> ${summary.oneSentenceSummary}\n\n`;
    markdown += `*Generated on ${new Date().toLocaleString()}*\n\n`;
    markdown += `---\n\n`;

    // Overview
    if (summary.overview) {
        markdown += `## Overview\n\n`;
        markdown += `**Purpose:** ${summary.overview.purpose}\n\n`;
        markdown += `**Scope:** ${summary.overview.scope}\n\n`;
        if (summary.overview.audience) {
            markdown += `**Audience:** ${summary.overview.audience}\n\n`;
        }
    }

    // Named Sections
    if (summary.namedSections && summary.namedSections.length > 0) {
        markdown += `## Content Sections\n\n`;
        summary.namedSections.forEach((section, index) => {
            markdown += `### ${index + 1}. ${section.name}\n\n`;
            markdown += `${section.summary}\n\n`;

            if (section.keyPoints && section.keyPoints.length > 0) {
                markdown += `**Key Points:**\n`;
                section.keyPoints.forEach(point => {
                    markdown += `- ${point}\n`;
                });
                markdown += `\n`;
            }

            markdown += `**Status:** ${formatStatus(section.status)}\n\n`;
        });
    }

    // Key Decisions
    if (summary.keyDecisions && summary.keyDecisions.length > 0) {
        markdown += `## 🎯 Key Decisions\n\n`;
        summary.keyDecisions.forEach((decision, index) => {
            markdown += `### ${index + 1}. ${decision.decision}\n\n`;
            markdown += `**Rationale:** ${decision.rationale}\n\n`;
            markdown += `**Impact:** ${decision.impact}\n\n`;
        });
    }

    // Actionable Next Steps
    if (summary.actionableNextSteps && summary.actionableNextSteps.length > 0) {
        markdown += `## ✅ Actionable Next Steps\n\n`;

        // Group by priority
        const highPriority = summary.actionableNextSteps.filter(s => s.priority === 'high');
        const mediumPriority = summary.actionableNextSteps.filter(s => s.priority === 'medium');
        const lowPriority = summary.actionableNextSteps.filter(s => s.priority === 'low');

        if (highPriority.length > 0) {
            markdown += `### 🔴 High Priority\n\n`;
            highPriority.forEach((step, index) => {
                markdown += `${index + 1}. **${step.step}**\n`;
                if (step.owner) markdown += `   - Owner: ${step.owner}\n`;
                if (step.timeframe) markdown += `   - Timeframe: ${step.timeframe}\n`;
                markdown += `\n`;
            });
        }

        if (mediumPriority.length > 0) {
            markdown += `### 🟡 Medium Priority\n\n`;
            mediumPriority.forEach((step, index) => {
                markdown += `${index + 1}. **${step.step}**\n`;
                if (step.owner) markdown += `   - Owner: ${step.owner}\n`;
                if (step.timeframe) markdown += `   - Timeframe: ${step.timeframe}\n`;
                markdown += `\n`;
            });
        }

        if (lowPriority.length > 0) {
            markdown += `### 🟢 Low Priority\n\n`;
            lowPriority.forEach((step, index) => {
                markdown += `${index + 1}. **${step.step}**\n`;
                if (step.owner) markdown += `   - Owner: ${step.owner}\n`;
                if (step.timeframe) markdown += `   - Timeframe: ${step.timeframe}\n`;
                markdown += `\n`;
            });
        }
    }

    // Open Questions
    if (summary.openQuestions && summary.openQuestions.length > 0) {
        markdown += `## ❓ Open Questions\n\n`;
        summary.openQuestions.forEach((q, index) => {
            const priorityEmoji = q.priority === 'high' ? '🔴' : q.priority === 'medium' ? '🟡' : '🟢';
            markdown += `${index + 1}. ${priorityEmoji} **${q.question}**\n`;
            markdown += `   - Context: ${q.context}\n\n`;
        });
    }

    // Risks and Blockers
    if (summary.risksAndBlockers && summary.risksAndBlockers.length > 0) {
        markdown += `## ⚠️ Risks & Blockers\n\n`;
        summary.risksAndBlockers.forEach((risk, index) => {
            const severityEmoji = risk.severity === 'high' ? '🔴' : risk.severity === 'medium' ? '🟡' : '🟢';
            const statusBadge = formatStatusBadge(risk.status);

            markdown += `### ${index + 1}. ${severityEmoji} ${risk.risk} ${statusBadge}\n\n`;
            markdown += `**Mitigation:** ${risk.mitigation}\n\n`;
        });
    }

    // Suggested Improvements
    if (summary.suggestedImprovements && summary.suggestedImprovements.length > 0) {
        markdown += `## 💡 Suggested Improvements\n\n`;
        summary.suggestedImprovements.forEach((improvement, index) => {
            const effortBadge = improvement.effort === 'low' ? '🟢 Low Effort' :
                improvement.effort === 'medium' ? '🟡 Medium Effort' :
                    '🔴 High Effort';

            markdown += `### ${index + 1}. ${improvement.area} (${effortBadge})\n\n`;
            markdown += `**Suggestion:** ${improvement.suggestion}\n\n`;
            markdown += `**Benefit:** ${improvement.benefit}\n\n`;
        });
    }

    // Metadata
    if (includeMetadata && summary.metadata) {
        markdown += `---\n\n`;
        markdown += `## 📊 Metadata\n\n`;
        markdown += `- **Total Elements:** ${summary.metadata.totalElements}\n`;
        markdown += `- **Main Topics:** ${summary.metadata.mainTopics.join(', ')}\n`;
        markdown += `- **Completeness:** ${summary.metadata.completeness}%\n`;
        markdown += `- **Clarity:** ${summary.metadata.clarity}%\n`;
        markdown += `- **Complexity:** ${summary.metadata.complexity}\n`;
    }

    return {
        timestamp: new Date().toISOString(),
        format: 'markdown',
        content: markdown
    };
}

/**
 * Helper: Format status with emoji
 */
function formatStatus(status) {
    const statusMap = {
        'complete': '✅ Complete',
        'in_progress': '🔄 In Progress',
        'planned': '📅 Planned',
        'unclear': '❓ Unclear'
    };
    return statusMap[status] || status;
}

/**
 * Helper: Format status badge
 */
function formatStatusBadge(status) {
    const badgeMap = {
        'identified': '`🔍 Identified`',
        'being_addressed': '`🔧 Being Addressed`',
        'resolved': '`✅ Resolved`'
    };
    return badgeMap[status] || '';
}

/**
 * Generate fallback summary
 */
function generateFallbackSummary(boardData, format) {
    const fallback = {
        oneSentenceSummary: 'Board summary unavailable - please configure AI service',
        overview: {
            purpose: 'Collaborative whiteboard',
            scope: 'Multiple elements',
            audience: 'Team'
        },
        keyDecisions: [],
        openQuestions: [],
        actionableNextSteps: [{
            step: 'Configure GEMINI_API_KEY for AI-powered summaries',
            priority: 'high',
            timeframe: 'ASAP'
        }],
        risksAndBlockers: [],
        suggestedImprovements: [],
        namedSections: [],
        metadata: {
            totalElements: 0,
            mainTopics: [],
            completeness: 0,
            clarity: 0,
            complexity: 'unknown'
        }
    };

    return format === 'markdown'
        ? formatAsMarkdown(fallback, true)
        : formatAsJSON(fallback, true);
}

/**
 * Quick summary function (brief version)
 */
export async function quickSummary(boardData) {
    return summarizeBoard(boardData, {
        format: 'json',
        detailLevel: 'brief',
        includeMetadata: false
    });
}

/**
 * Export for backward compatibility
 */
export const summarize = summarizeBoard;
