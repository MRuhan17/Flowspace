import OpenAI from 'openai';
import { logger } from '../utils/logger.js';

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy_key'
});

/**
 * Board Query System - Natural Language Q&A
 * 
 * Answers natural language questions about board content by reasoning
 * over the semantic map. Provides direct answers with references to
 * relevant board elements.
 * 
 * @param {string} question - Natural language question
 * @param {object} boardSemanticMap - Semantic map from board interpreter
 * @param {object} options - Query options
 * @returns {Promise<object>} Answer with references and confidence
 */
export async function askBoard(question, boardSemanticMap, options = {}) {
    const {
        includeReferences = true,
        includeConfidence = true,
        useLLM = true,
        maxReferences = 5
    } = options;

    console.log(`❓ Board Query: "${question}"`);

    try {
        // Step 1: Classify question type
        const questionType = classifyQuestion(question);

        // Step 2: Extract relevant context
        const context = extractRelevantContext(boardSemanticMap, questionType);

        // Step 3: Generate answer
        let answer;
        if (useLLM && process.env.OPENAI_API_KEY) {
            answer = await generateAnswerWithLLM(question, context, questionType);
        } else {
            answer = generateAnswerWithHeuristics(question, context, questionType);
        }

        // Step 4: Find references
        const references = includeReferences
            ? findReferences(answer, boardSemanticMap, maxReferences)
            : [];

        // Step 5: Calculate confidence
        const confidence = includeConfidence
            ? calculateConfidence(answer, context, questionType)
            : null;

        console.log('✅ Answer generated');
        return {
            timestamp: new Date().toISOString(),
            question,
            questionType,
            answer: answer.text,
            reasoning: answer.reasoning,
            references,
            confidence,
            suggestedFollowUps: generateFollowUpQuestions(questionType, answer)
        };

    } catch (error) {
        logger.error('Board Query Error:', error);
        return getFallbackAnswer(question);
    }
}

/**
 * Classify question type
 */
function classifyQuestion(question) {
    const q = question.toLowerCase();

    const patterns = {
        missing: /what('s| is)? missing|what('s| is)? incomplete|what do we need|gaps?/,
        nextStep: /next step|what('s| is)? next|what should (we|i) do|follow.?up/,
        bug: /bug|error|issue|problem|wrong|broken|doesn't work/,
        summary: /summarize|summary|overview|explain|describe|what (is|does)/,
        flow: /flow|process|workflow|sequence|steps|how (does|do)/,
        decision: /why|decision|rationale|reason|chose|picked/,
        status: /status|progress|complete|done|finished/,
        comparison: /compare|difference|versus|vs|better/,
        count: /how many|count|number of/,
        location: /where|which|locate|find/
    };

    for (const [type, pattern] of Object.entries(patterns)) {
        if (pattern.test(q)) {
            return type;
        }
    }

    return 'general';
}

/**
 * Extract relevant context based on question type
 */
function extractRelevantContext(semanticMap, questionType) {
    const context = {
        stats: semanticMap.stats || {},
        topics: semanticMap.topics?.slice(0, 10) || [],
        issues: semanticMap.issues || [],
        suggestions: semanticMap.suggestions || [],
        hierarchies: semanticMap.hierarchies || [],
        clusters: semanticMap.clusters || [],
        dependencies: semanticMap.dependencies || {},
        insights: semanticMap.insights || null
    };

    // Add type-specific context
    switch (questionType) {
        case 'missing':
            context.focus = {
                issues: semanticMap.issues?.filter(i => i.type === 'orphaned_nodes' || i.type === 'dead_ends'),
                suggestions: semanticMap.suggestions?.filter(s => s.priority === 'high'),
                missingElements: semanticMap.insights?.missingElements || []
            };
            break;

        case 'nextStep':
            context.focus = {
                suggestions: semanticMap.suggestions?.filter(s => s.priority === 'high'),
                nextSteps: semanticMap.insights?.suggestions?.filter(s => s.priority === 'high') || [],
                deadEnds: semanticMap.issues?.filter(i => i.type === 'dead_ends')
            };
            break;

        case 'bug':
            context.focus = {
                issues: semanticMap.issues?.filter(i => i.severity === 'high' || i.severity === 'medium'),
                contradictions: semanticMap.insights?.contradictions || [],
                circularDeps: semanticMap.issues?.filter(i => i.type === 'circular_dependencies')
            };
            break;

        case 'flow':
            context.focus = {
                hierarchies: semanticMap.hierarchies,
                dependencies: semanticMap.dependencies,
                chains: semanticMap.dependencies?.chains || []
            };
            break;

        case 'summary':
            context.focus = {
                insights: semanticMap.insights,
                mainThemes: semanticMap.insights?.mainThemes || [],
                keyInsights: semanticMap.insights?.keyInsights || []
            };
            break;
    }

    return context;
}

/**
 * Generate answer using LLM
 */
async function generateAnswerWithLLM(question, context, questionType) {
    if (!process.env.OPENAI_API_KEY) {
        return generateAnswerWithHeuristics(question, context, questionType);
    }

    const prompt = buildQueryPrompt(question, context, questionType);

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are an expert at analyzing whiteboards and answering questions about their content. Provide direct, helpful answers with specific references to board elements. Always return valid JSON.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3, // Lower temperature for more focused answers
            response_format: { type: 'json_object' }
        });

        const result = JSON.parse(response.choices[0].message.content);

        return {
            text: result.answer || result.text || 'Unable to generate answer',
            reasoning: result.reasoning || result.explanation || '',
            confidence: result.confidence || 0.8
        };

    } catch (error) {
        logger.error('LLM Answer Generation Error:', error);
        return generateAnswerWithHeuristics(question, context, questionType);
    }
}

/**
 * Build query prompt
 */
function buildQueryPrompt(question, context, questionType) {
    const { stats, topics, issues, suggestions, focus } = context;

    let contextText = `**Board Statistics:**
- Total Elements: ${stats.totalElements || 0}
- Nodes: ${stats.nodeCount || 0}
- Connections: ${stats.edgeCount || 0}

**Main Topics:**
${topics.map(t => `- ${t.keyword} (${t.frequency} occurrences)`).join('\n') || 'None'}

**Issues Found:**
${issues.map(i => `- ${i.description} (${i.severity})`).join('\n') || 'None'}

**Suggestions:**
${suggestions.slice(0, 5).map(s => `- [${s.priority}] ${s.action}`).join('\n') || 'None'}
`;

    // Add type-specific context
    if (focus) {
        contextText += '\n**Relevant Information:**\n';

        if (focus.missingElements?.length > 0) {
            contextText += `Missing: ${focus.missingElements.join(', ')}\n`;
        }
        if (focus.nextSteps?.length > 0) {
            contextText += `Next Steps: ${focus.nextSteps.map(s => s.action).join('; ')}\n`;
        }
        if (focus.contradictions?.length > 0) {
            contextText += `Contradictions: ${focus.contradictions.map(c => c.description).join('; ')}\n`;
        }
        if (focus.chains?.length > 0) {
            const mainChain = focus.chains[0];
            contextText += `Main Flow: ${mainChain.steps?.map(s => s.text).join(' → ') || 'N/A'}\n`;
        }
        if (focus.mainThemes?.length > 0) {
            contextText += `Main Themes: ${focus.mainThemes.join(', ')}\n`;
        }
    }

    return `You are analyzing a whiteboard and need to answer this question:

**Question:** ${question}

**Question Type:** ${questionType}

**Board Context:**
${contextText}

**Your Task:**
Provide a direct, helpful answer to the question. Be specific and reference actual board elements when possible.

**Output Format (JSON only):**
{
  "answer": "Direct answer to the question (2-3 sentences)",
  "reasoning": "Brief explanation of how you arrived at this answer",
  "confidence": 0.0-1.0,
  "keyPoints": ["point1", "point2", "point3"]
}

Return ONLY valid JSON. Be concise and specific.`;
}

/**
 * Generate answer using heuristics (fallback)
 */
function generateAnswerWithHeuristics(question, context, questionType) {
    const { stats, issues, suggestions, focus } = context;

    let text = '';
    let reasoning = '';

    switch (questionType) {
        case 'missing':
            const missingCount = issues.filter(i => i.type === 'orphaned_nodes' || i.type === 'dead_ends').length;
            const highPrioritySuggestions = suggestions.filter(s => s.priority === 'high');

            if (missingCount > 0 || highPrioritySuggestions.length > 0) {
                text = `There are ${missingCount} potential gaps (orphaned nodes or dead ends). `;
                if (highPrioritySuggestions.length > 0) {
                    text += `High priority suggestions include: ${highPrioritySuggestions.slice(0, 3).map(s => s.action).join(', ')}.`;
                }
            } else {
                text = 'The board appears complete with no major gaps identified.';
            }
            reasoning = 'Based on orphaned nodes, dead ends, and high-priority suggestions';
            break;

        case 'nextStep':
            const nextSteps = suggestions.filter(s => s.priority === 'high').slice(0, 3);
            if (nextSteps.length > 0) {
                text = `The next steps should be: ${nextSteps.map((s, i) => `${i + 1}) ${s.action}`).join('; ')}.`;
            } else {
                text = 'No immediate next steps identified. Consider reviewing the board for completion.';
            }
            reasoning = 'Based on high-priority suggestions and incomplete elements';
            break;

        case 'bug':
            const bugs = issues.filter(i => i.severity === 'high' || i.severity === 'medium');
            if (bugs.length > 0) {
                text = `Found ${bugs.length} potential issue(s): ${bugs.map(b => b.description).join('; ')}.`;
            } else {
                text = 'No critical bugs or issues detected in the board structure.';
            }
            reasoning = 'Based on structural issues and contradictions';
            break;

        case 'flow':
            if (context.dependencies?.chains && context.dependencies.chains.length > 0) {
                const mainChain = context.dependencies.chains[0];
                text = `The main flow has ${mainChain.length} steps: ${mainChain.steps?.slice(0, 5).map(s => s.text).join(' → ') || 'N/A'}.`;
            } else {
                text = 'No clear flow or sequence detected in the board.';
            }
            reasoning = 'Based on dependency chains and hierarchies';
            break;

        case 'summary':
            const topTopics = context.topics.slice(0, 5).map(t => t.keyword).join(', ');
            text = `This board covers ${topTopics} with ${stats.totalElements} elements. `;
            if (context.insights?.summary) {
                text += context.insights.summary;
            }
            reasoning = 'Based on topics, elements, and overall structure';
            break;

        case 'status':
            const completeness = context.insights?.qualityScore || 50;
            text = `The board is approximately ${completeness}% complete. `;
            if (completeness < 70) {
                text += 'Several areas need attention.';
            } else {
                text += 'Most areas are well-defined.';
            }
            reasoning = 'Based on quality score and completeness metrics';
            break;

        default:
            text = `Based on the board content covering ${context.topics.slice(0, 3).map(t => t.keyword).join(', ')}, `;
            text += `there are ${stats.totalElements} elements with ${issues.length} issues identified.`;
            reasoning = 'General analysis of board structure and content';
    }

    return {
        text,
        reasoning,
        confidence: 0.7
    };
}

/**
 * Find references to board elements
 */
function findReferences(answer, semanticMap, maxReferences) {
    const references = [];
    const answerText = answer.text.toLowerCase();

    // Find referenced topics
    if (semanticMap.topics) {
        semanticMap.topics.slice(0, maxReferences).forEach(topic => {
            if (answerText.includes(topic.keyword.toLowerCase())) {
                references.push({
                    type: 'topic',
                    keyword: topic.keyword,
                    frequency: topic.frequency,
                    elements: topic.elements?.slice(0, 3) || []
                });
            }
        });
    }

    // Find referenced issues
    if (semanticMap.issues) {
        semanticMap.issues.slice(0, maxReferences).forEach(issue => {
            if (answerText.includes(issue.type.replace('_', ' '))) {
                references.push({
                    type: 'issue',
                    issueType: issue.type,
                    severity: issue.severity,
                    description: issue.description,
                    elements: issue.elements?.slice(0, 3) || []
                });
            }
        });
    }

    // Find referenced hierarchies
    if (semanticMap.hierarchies) {
        semanticMap.hierarchies.slice(0, 2).forEach((hierarchy, index) => {
            if (answerText.includes('flow') || answerText.includes('hierarchy') || answerText.includes(hierarchy.rootText?.toLowerCase())) {
                references.push({
                    type: 'hierarchy',
                    root: hierarchy.rootText,
                    depth: hierarchy.depth,
                    breadth: hierarchy.breadth
                });
            }
        });
    }

    return references.slice(0, maxReferences);
}

/**
 * Calculate confidence score
 */
function calculateConfidence(answer, context, questionType) {
    let confidence = answer.confidence || 0.7;

    // Adjust based on context availability
    if (context.insights) confidence += 0.1;
    if (context.stats.totalElements > 20) confidence += 0.05;
    if (context.issues.length > 0) confidence += 0.05;

    // Adjust based on question type
    const highConfidenceTypes = ['count', 'status', 'summary'];
    if (highConfidenceTypes.includes(questionType)) {
        confidence += 0.1;
    }

    // Cap at 0.95
    return Math.min(0.95, confidence);
}

/**
 * Generate follow-up questions
 */
function generateFollowUpQuestions(questionType, answer) {
    const followUps = {
        missing: [
            "What should be added first?",
            "Are there any critical gaps?",
            "How can we fill these gaps?"
        ],
        nextStep: [
            "What's the priority order?",
            "Who should handle these steps?",
            "What are the dependencies?"
        ],
        bug: [
            "How can we fix these issues?",
            "What's the root cause?",
            "Are there any workarounds?"
        ],
        flow: [
            "What are the alternative paths?",
            "Where are the bottlenecks?",
            "Can this be simplified?"
        ],
        summary: [
            "What are the key takeaways?",
            "What's missing from this overview?",
            "How does this compare to our goals?"
        ],
        general: [
            "Can you elaborate on that?",
            "What else should I know?",
            "Are there any concerns?"
        ]
    };

    return followUps[questionType] || followUps.general;
}

/**
 * Get fallback answer
 */
function getFallbackAnswer(question) {
    return {
        timestamp: new Date().toISOString(),
        question,
        questionType: 'general',
        answer: 'I apologize, but I need more information to answer that question accurately. Could you please rephrase or provide more context?',
        reasoning: 'Unable to process question with available information',
        references: [],
        confidence: 0.3,
        suggestedFollowUps: [
            "Can you be more specific?",
            "What aspect are you most interested in?",
            "Would you like a general overview instead?"
        ]
    };
}

/**
 * Batch query - answer multiple questions
 */
export async function batchAskBoard(questions, boardSemanticMap, options = {}) {
    const answers = [];

    for (const question of questions) {
        const answer = await askBoard(question, boardSemanticMap, options);
        answers.push(answer);
    }

    return {
        timestamp: new Date().toISOString(),
        totalQuestions: questions.length,
        answers
    };
}

/**
 * Quick answer (heuristic only)
 */
export async function quickAsk(question, boardSemanticMap) {
    return await askBoard(question, boardSemanticMap, {
        includeReferences: false,
        includeConfidence: false,
        useLLM: false
    });
}

/**
 * Suggest questions based on board content
 */
export function suggestQuestions(boardSemanticMap) {
    const suggestions = [];

    // Based on issues
    if (boardSemanticMap.issues && boardSemanticMap.issues.length > 0) {
        suggestions.push("What issues were found?");
        suggestions.push("How can we fix these problems?");
    }

    // Based on hierarchies
    if (boardSemanticMap.hierarchies && boardSemanticMap.hierarchies.length > 0) {
        suggestions.push("What's the main flow?");
        suggestions.push("Explain the process step by step");
    }

    // Based on topics
    if (boardSemanticMap.topics && boardSemanticMap.topics.length > 5) {
        const mainTopic = boardSemanticMap.topics[0].keyword;
        suggestions.push(`What does this board say about ${mainTopic}?`);
    }

    // Based on suggestions
    if (boardSemanticMap.suggestions && boardSemanticMap.suggestions.length > 0) {
        suggestions.push("What are the next steps?");
        suggestions.push("What's missing?");
    }

    // Always include these
    suggestions.push("Summarize this board");
    suggestions.push("What's the current status?");

    return suggestions.slice(0, 6);
}

export default askBoard;
