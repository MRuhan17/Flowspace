import OpenAI from 'openai';
import { logger } from '../utils/logger.js';

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy_key'
});

/**
 * Smart Suggestions System - Predictive Recommendations
 * 
 * Generates intelligent suggestions for board improvements including
 * missing nodes, next steps, alternative flows, shortcuts, and warnings.
 * Combines heuristics with LLM pattern detection.
 * 
 * @param {object} boardSemanticMap - Semantic map from board interpreter
 * @param {object} options - Suggestion options
 * @returns {Promise<object>} Ranked suggestions by category
 */
export async function generateSmartSuggestions(boardSemanticMap, options = {}) {
    const {
        useLLM = true,
        includeConfidence = true,
        maxSuggestionsPerCategory = 5,
        minConfidence = 0.3
    } = options;

    console.log('💡 Smart Suggestions: Analyzing board...');

    try {
        // Step 1: Generate heuristic suggestions
        const heuristicSuggestions = generateHeuristicSuggestions(boardSemanticMap);

        // Step 2: Enhance with LLM if available
        let enhancedSuggestions = heuristicSuggestions;
        if (useLLM && process.env.OPENAI_API_KEY) {
            enhancedSuggestions = await enhanceLLMSuggestions(
                heuristicSuggestions,
                boardSemanticMap
            );
        }

        // Step 3: Rank and filter suggestions
        const rankedSuggestions = rankSuggestions(
            enhancedSuggestions,
            includeConfidence,
            maxSuggestionsPerCategory,
            minConfidence
        );

        console.log('✅ Generated smart suggestions');
        return {
            timestamp: new Date().toISOString(),
            totalSuggestions: countTotalSuggestions(rankedSuggestions),
            categories: rankedSuggestions,
            summary: generateSummary(rankedSuggestions)
        };

    } catch (error) {
        logger.error('Smart Suggestions Error:', error);
        return getFallbackSuggestions();
    }
}

/**
 * Generate heuristic-based suggestions
 */
function generateHeuristicSuggestions(semanticMap) {
    const suggestions = {
        missingNodes: [],
        nextSteps: [],
        alternativeFlows: [],
        shortcuts: [],
        warnings: [],
        improvements: []
    };

    const { stats, issues, hierarchies, dependencies, topics, clusters, insights } = semanticMap;

    // 1. Missing Nodes Suggestions
    suggestions.missingNodes = detectMissingNodes(semanticMap);

    // 2. Next Steps Suggestions
    suggestions.nextSteps = detectNextSteps(semanticMap);

    // 3. Alternative Flows
    suggestions.alternativeFlows = detectAlternativeFlows(semanticMap);

    // 4. Shortcuts
    suggestions.shortcuts = detectShortcuts(semanticMap);

    // 5. Warnings
    suggestions.warnings = detectWarnings(semanticMap);

    // 6. General Improvements
    suggestions.improvements = detectImprovements(semanticMap);

    return suggestions;
}

/**
 * Detect missing nodes
 */
function detectMissingNodes(semanticMap) {
    const missing = [];
    const { issues, hierarchies, topics, dependencies } = semanticMap;

    // Missing from orphaned nodes
    const orphanedIssue = issues?.find(i => i.type === 'orphaned_nodes');
    if (orphanedIssue && orphanedIssue.count > 0) {
        missing.push({
            type: 'connection',
            title: 'Connect Orphaned Nodes',
            description: `${orphanedIssue.count} node(s) have no connections. Consider linking them to the main flow.`,
            confidence: 0.8,
            priority: 'medium',
            action: 'connect',
            elements: orphanedIssue.elements || []
        });
    }

    // Missing from dead ends
    const deadEndIssue = issues?.find(i => i.type === 'dead_ends');
    if (deadEndIssue && deadEndIssue.count > 0) {
        missing.push({
            type: 'continuation',
            title: 'Add Next Steps to Dead Ends',
            description: `${deadEndIssue.count} node(s) are dead ends. Add follow-up steps or outcomes.`,
            confidence: 0.75,
            priority: 'high',
            action: 'extend',
            elements: deadEndIssue.elements?.map(e => e.id) || []
        });
    }

    // Missing error handling
    const hasErrorKeywords = topics?.some(t =>
        ['error', 'exception', 'fail', 'invalid'].includes(t.keyword.toLowerCase())
    );
    if (!hasErrorKeywords && hierarchies?.length > 0) {
        missing.push({
            type: 'error_handling',
            title: 'Add Error Handling',
            description: 'No error handling paths detected. Consider adding error cases and fallbacks.',
            confidence: 0.65,
            priority: 'medium',
            action: 'add',
            suggestedNodes: ['Error Handler', 'Fallback', 'Retry Logic']
        });
    }

    // Missing documentation
    const hasDocKeywords = topics?.some(t =>
        ['doc', 'documentation', 'readme', 'guide'].includes(t.keyword.toLowerCase())
    );
    if (!hasDocKeywords && (semanticMap.stats?.totalElements || 0) > 15) {
        missing.push({
            type: 'documentation',
            title: 'Add Documentation',
            description: 'Complex board without documentation. Add notes or a README node.',
            confidence: 0.6,
            priority: 'low',
            action: 'add',
            suggestedNodes: ['README', 'Documentation', 'Notes']
        });
    }

    // Missing validation
    const hasValidation = topics?.some(t =>
        ['validate', 'validation', 'check', 'verify'].includes(t.keyword.toLowerCase())
    );
    if (!hasValidation && hierarchies?.some(h => h.depth > 2)) {
        missing.push({
            type: 'validation',
            title: 'Add Input Validation',
            description: 'No validation steps detected. Consider adding input checks.',
            confidence: 0.7,
            priority: 'medium',
            action: 'add',
            suggestedNodes: ['Validate Input', 'Check Parameters', 'Verify Data']
        });
    }

    return missing;
}

/**
 * Detect next steps
 */
function detectNextSteps(semanticMap) {
    const nextSteps = [];
    const { issues, insights, dependencies } = semanticMap;

    // From high-priority suggestions
    if (insights?.suggestions) {
        insights.suggestions
            .filter(s => s.priority === 'high')
            .slice(0, 3)
            .forEach(suggestion => {
                nextSteps.push({
                    type: 'action',
                    title: suggestion.action,
                    description: suggestion.reason || 'High priority action item',
                    confidence: 0.85,
                    priority: 'high',
                    action: 'implement'
                });
            });
    }

    // From incomplete chains
    if (dependencies?.chains) {
        const incompleteChains = dependencies.chains.filter(c => c.length < 3);
        if (incompleteChains.length > 0) {
            nextSteps.push({
                type: 'completion',
                title: 'Complete Workflow Chains',
                description: `${incompleteChains.length} workflow(s) seem incomplete. Add more steps.`,
                confidence: 0.7,
                priority: 'medium',
                action: 'extend'
            });
        }
    }

    // From missing elements
    if (insights?.missingElements && insights.missingElements.length > 0) {
        nextSteps.push({
            type: 'missing',
            title: 'Add Missing Elements',
            description: `Consider adding: ${insights.missingElements.slice(0, 3).join(', ')}`,
            confidence: 0.75,
            priority: 'high',
            action: 'add',
            suggestedNodes: insights.missingElements
        });
    }

    // Quality improvement
    if (insights?.qualityScore && insights.qualityScore < 70) {
        nextSteps.push({
            type: 'quality',
            title: 'Improve Board Quality',
            description: `Current quality score: ${insights.qualityScore}%. Focus on organization and completeness.`,
            confidence: 0.8,
            priority: 'medium',
            action: 'improve'
        });
    }

    return nextSteps;
}

/**
 * Detect alternative flows
 */
function detectAlternativeFlows(semanticMap) {
    const alternatives = [];
    const { hierarchies, dependencies, topics } = semanticMap;

    // Suggest parallel paths
    if (hierarchies && hierarchies.length > 0) {
        hierarchies.forEach(hierarchy => {
            if (hierarchy.breadth === 1 && hierarchy.depth > 3) {
                alternatives.push({
                    type: 'parallel',
                    title: 'Add Parallel Processing',
                    description: `Linear flow detected in "${hierarchy.rootText}". Consider parallel paths for efficiency.`,
                    confidence: 0.6,
                    priority: 'low',
                    action: 'branch',
                    element: hierarchy.root
                });
            }
        });
    }

    // Suggest alternative error paths
    const hasErrorHandling = topics?.some(t => t.keyword.toLowerCase().includes('error'));
    if (hasErrorHandling && hierarchies?.length > 0) {
        alternatives.push({
            type: 'error_path',
            title: 'Add Alternative Error Paths',
            description: 'Consider multiple error handling strategies (retry, fallback, alert).',
            confidence: 0.65,
            priority: 'medium',
            action: 'add',
            suggestedNodes: ['Retry', 'Fallback', 'Alert User']
        });
    }

    // Suggest optimization paths
    if (dependencies?.chains && dependencies.chains.some(c => c.length > 7)) {
        alternatives.push({
            type: 'optimization',
            title: 'Consider Optimization Paths',
            description: 'Long workflow detected. Consider shortcuts or caching strategies.',
            confidence: 0.55,
            priority: 'low',
            action: 'optimize'
        });
    }

    return alternatives;
}

/**
 * Detect shortcuts
 */
function detectShortcuts(semanticMap) {
    const shortcuts = [];
    const { dependencies, hierarchies, clusters } = semanticMap;

    // Suggest grouping
    if (clusters && clusters.length > 5) {
        shortcuts.push({
            type: 'grouping',
            title: 'Group Related Elements',
            description: `${clusters.length} clusters detected. Use groups to organize related items.`,
            confidence: 0.75,
            priority: 'medium',
            action: 'group'
        });
    }

    // Suggest templates
    if (hierarchies && hierarchies.filter(h => h.depth > 2).length > 2) {
        shortcuts.push({
            type: 'template',
            title: 'Create Reusable Templates',
            description: 'Multiple similar hierarchies detected. Create templates for efficiency.',
            confidence: 0.6,
            priority: 'low',
            action: 'template'
        });
    }

    // Suggest keyboard shortcuts
    if ((semanticMap.stats?.totalElements || 0) > 30) {
        shortcuts.push({
            type: 'productivity',
            title: 'Use Keyboard Shortcuts',
            description: 'Large board detected. Use keyboard shortcuts for faster editing.',
            confidence: 0.5,
            priority: 'low',
            action: 'learn',
            tip: 'Press ? to see available shortcuts'
        });
    }

    // Suggest auto-layout
    if (clusters && clusters.some(c => c.density > 0.8)) {
        shortcuts.push({
            type: 'layout',
            title: 'Use Auto-Layout',
            description: 'Dense clusters detected. Auto-layout can improve organization.',
            confidence: 0.7,
            priority: 'medium',
            action: 'auto_layout'
        });
    }

    return shortcuts;
}

/**
 * Detect warnings
 */
function detectWarnings(semanticMap) {
    const warnings = [];
    const { issues, stats, dependencies } = semanticMap;

    // Circular dependency warning
    const circularIssue = issues?.find(i => i.type === 'circular_dependencies');
    if (circularIssue && circularIssue.count > 0) {
        warnings.push({
            type: 'circular_dependency',
            title: 'Circular Dependencies Detected',
            description: `${circularIssue.count} circular path(s) found. This may indicate logical issues.`,
            confidence: 0.9,
            priority: 'high',
            severity: 'warning',
            action: 'review',
            cycles: circularIssue.cycles
        });
    }

    // Complexity warning
    if ((stats?.totalElements || 0) > 100) {
        warnings.push({
            type: 'complexity',
            title: 'Board Complexity High',
            description: `${stats.totalElements} elements. Consider splitting into multiple boards.`,
            confidence: 0.8,
            priority: 'medium',
            severity: 'info',
            action: 'split'
        });
    }

    // Overlapping elements warning
    const overlapIssue = issues?.find(i => i.type === 'overlapping_elements');
    if (overlapIssue && overlapIssue.count > 5) {
        warnings.push({
            type: 'overlap',
            title: 'Many Overlapping Elements',
            description: `${overlapIssue.count} overlaps detected. Use auto-layout to fix.`,
            confidence: 0.85,
            priority: 'medium',
            severity: 'warning',
            action: 'reorganize'
        });
    }

    // Incomplete labels warning
    const labelIssue = issues?.find(i => i.type === 'incomplete_labels');
    if (labelIssue && labelIssue.count > 10) {
        warnings.push({
            type: 'labels',
            title: 'Many Incomplete Labels',
            description: `${labelIssue.count} elements have very short labels. Add descriptive text.`,
            confidence: 0.75,
            priority: 'low',
            severity: 'info',
            action: 'label'
        });
    }

    // Performance warning
    if ((stats?.totalElements || 0) > 200) {
        warnings.push({
            type: 'performance',
            title: 'Performance May Be Affected',
            description: 'Very large board. Performance may degrade. Consider optimization.',
            confidence: 0.7,
            priority: 'low',
            severity: 'info',
            action: 'optimize'
        });
    }

    return warnings;
}

/**
 * Detect general improvements
 */
function detectImprovements(semanticMap) {
    const improvements = [];
    const { topics, hierarchies, insights, stats } = semanticMap;

    // Naming consistency
    if (topics && topics.length > 10) {
        const hasInconsistentNaming = topics.some(t =>
            t.keyword.includes('_') || t.keyword.includes('-') || /[A-Z]/.test(t.keyword)
        );
        if (hasInconsistentNaming) {
            improvements.push({
                type: 'naming',
                title: 'Improve Naming Consistency',
                description: 'Use consistent naming convention (camelCase, snake_case, or kebab-case).',
                confidence: 0.6,
                priority: 'low',
                action: 'rename'
            });
        }
    }

    // Add colors
    if ((stats?.totalElements || 0) > 20 && !insights?.hasColors) {
        improvements.push({
            type: 'visual',
            title: 'Add Color Coding',
            description: 'Use colors to categorize elements and improve visual hierarchy.',
            confidence: 0.7,
            priority: 'medium',
            action: 'colorize'
        });
    }

    // Add hierarchy
    if (hierarchies?.length === 0 && (stats?.totalElements || 0) > 10) {
        improvements.push({
            type: 'structure',
            title: 'Add Hierarchical Structure',
            description: 'Organize elements into a hierarchy for better clarity.',
            confidence: 0.65,
            priority: 'medium',
            action: 'organize'
        });
    }

    // Add descriptions
    if ((stats?.totalElements || 0) > 15) {
        improvements.push({
            type: 'documentation',
            title: 'Add Element Descriptions',
            description: 'Add descriptions to complex nodes for better understanding.',
            confidence: 0.55,
            priority: 'low',
            action: 'document'
        });
    }

    return improvements;
}

/**
 * Enhance suggestions with LLM
 */
async function enhanceLLMSuggestions(heuristicSuggestions, semanticMap) {
    if (!process.env.OPENAI_API_KEY) {
        return heuristicSuggestions;
    }

    const prompt = buildEnhancementPrompt(heuristicSuggestions, semanticMap);

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are an expert at analyzing whiteboards and providing intelligent suggestions for improvement. Always return valid JSON.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            response_format: { type: 'json_object' }
        });

        const llmSuggestions = JSON.parse(response.choices[0].message.content);

        // Merge LLM suggestions with heuristic ones
        return mergeSuggestions(heuristicSuggestions, llmSuggestions);

    } catch (error) {
        logger.error('LLM Enhancement Error:', error);
        return heuristicSuggestions;
    }
}

/**
 * Build enhancement prompt
 */
function buildEnhancementPrompt(heuristicSuggestions, semanticMap) {
    const { topics, stats, insights } = semanticMap;

    return `Analyze this whiteboard and enhance the suggestions with AI insights.

**Board Context:**
- Topics: ${topics?.slice(0, 10).map(t => t.keyword).join(', ') || 'None'}
- Elements: ${stats?.totalElements || 0}
- Quality Score: ${insights?.qualityScore || 'N/A'}

**Current Heuristic Suggestions:**
- Missing Nodes: ${heuristicSuggestions.missingNodes.length}
- Next Steps: ${heuristicSuggestions.nextSteps.length}
- Warnings: ${heuristicSuggestions.warnings.length}

**Your Task:**
Provide additional intelligent suggestions that the heuristics might have missed. Focus on:
1. Pattern-based recommendations
2. Best practice suggestions
3. Domain-specific improvements
4. Creative enhancements

**Output Format (JSON only):**
{
  "additionalMissingNodes": [
    {
      "title": "suggestion title",
      "description": "detailed description",
      "confidence": 0.0-1.0,
      "priority": "high|medium|low",
      "suggestedNodes": ["node1", "node2"]
    }
  ],
  "additionalNextSteps": [...],
  "additionalImprovements": [...],
  "insights": "Overall assessment and key recommendations"
}

Return ONLY valid JSON. Be specific and actionable.`;
}

/**
 * Merge LLM suggestions with heuristic ones
 */
function mergeSuggestions(heuristic, llm) {
    const merged = { ...heuristic };

    if (llm.additionalMissingNodes) {
        merged.missingNodes = [...merged.missingNodes, ...llm.additionalMissingNodes];
    }
    if (llm.additionalNextSteps) {
        merged.nextSteps = [...merged.nextSteps, ...llm.additionalNextSteps];
    }
    if (llm.additionalImprovements) {
        merged.improvements = [...merged.improvements, ...llm.additionalImprovements];
    }
    if (llm.additionalAlternatives) {
        merged.alternativeFlows = [...merged.alternativeFlows, ...llm.additionalAlternatives];
    }

    return merged;
}

/**
 * Rank and filter suggestions
 */
function rankSuggestions(suggestions, includeConfidence, maxPerCategory, minConfidence) {
    const ranked = {};

    Object.keys(suggestions).forEach(category => {
        let items = suggestions[category];

        // Filter by minimum confidence
        if (includeConfidence) {
            items = items.filter(s => (s.confidence || 0.5) >= minConfidence);
        }

        // Sort by confidence and priority
        items.sort((a, b) => {
            const priorityWeight = { high: 3, medium: 2, low: 1 };
            const aScore = (a.confidence || 0.5) * 10 + (priorityWeight[a.priority] || 1);
            const bScore = (b.confidence || 0.5) * 10 + (priorityWeight[b.priority] || 1);
            return bScore - aScore;
        });

        // Limit per category
        ranked[category] = items.slice(0, maxPerCategory);
    });

    return ranked;
}

/**
 * Count total suggestions
 */
function countTotalSuggestions(suggestions) {
    return Object.values(suggestions).reduce((sum, arr) => sum + arr.length, 0);
}

/**
 * Generate summary
 */
function generateSummary(suggestions) {
    const total = countTotalSuggestions(suggestions);
    const highPriority = Object.values(suggestions)
        .flat()
        .filter(s => s.priority === 'high').length;

    const categories = Object.entries(suggestions)
        .filter(([_, items]) => items.length > 0)
        .map(([category, items]) => `${items.length} ${category.replace(/([A-Z])/g, ' $1').toLowerCase()}`)
        .join(', ');

    return {
        total,
        highPriority,
        categories,
        message: `Found ${total} suggestion(s) including ${highPriority} high priority item(s).`
    };
}

/**
 * Get fallback suggestions
 */
function getFallbackSuggestions() {
    return {
        timestamp: new Date().toISOString(),
        totalSuggestions: 1,
        categories: {
            missingNodes: [],
            nextSteps: [],
            alternativeFlows: [],
            shortcuts: [],
            warnings: [],
            improvements: [{
                type: 'general',
                title: 'Review Board Content',
                description: 'Review and organize board content for better clarity.',
                confidence: 0.5,
                priority: 'low',
                action: 'review'
            }]
        },
        summary: {
            total: 1,
            highPriority: 0,
            categories: '1 improvements',
            message: 'Found 1 suggestion(s) including 0 high priority item(s).'
        }
    };
}

/**
 * Quick suggestions (heuristic only)
 */
export async function quickSuggestions(boardSemanticMap) {
    return await generateSmartSuggestions(boardSemanticMap, {
        useLLM: false,
        includeConfidence: false,
        maxSuggestionsPerCategory: 3,
        minConfidence: 0.5
    });
}

/**
 * Get high priority suggestions only
 */
export function getHighPrioritySuggestions(boardSemanticMap) {
    const allSuggestions = generateHeuristicSuggestions(boardSemanticMap);

    const highPriority = {};
    Object.keys(allSuggestions).forEach(category => {
        highPriority[category] = allSuggestions[category]
            .filter(s => s.priority === 'high')
            .slice(0, 3);
    });

    return {
        timestamp: new Date().toISOString(),
        categories: highPriority,
        total: countTotalSuggestions(highPriority)
    };
}

export default generateSmartSuggestions;
