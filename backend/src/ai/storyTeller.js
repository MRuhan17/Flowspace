import OpenAI from 'openai';
import { logger } from '../utils/logger.js';

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy_key'
});

/**
 * Story Teller - Narrative Board Explanation
 * 
 * Converts board content into engaging narratives with beginning, challenge,
 * plan, solution, and outcome. Supports multiple storytelling formats and styles.
 * 
 * @param {object} boardSemanticMap - Semantic map from board interpreter
 * @param {object} options - Storytelling options
 * @returns {Promise<object>} Story in multiple formats
 */
export async function storyExplain(boardSemanticMap, options = {}) {
    const {
        style = 'product_manager', // 'product_manager' | 'designer' | 'engineer' | 'executive'
        formats = ['short', 'medium', 'long'],
        tone = 'professional', // 'professional' | 'casual' | 'enthusiastic' | 'technical'
        useLLM = true
    } = options;

    console.log('📖 Story Teller: Creating narrative from board...');

    try {
        // Step 1: Extract story elements from board
        const storyElements = extractStoryElements(boardSemanticMap);

        // Step 2: Generate narrative
        let story;
        if (useLLM && process.env.OPENAI_API_KEY) {
            story = await generateStoryWithLLM(storyElements, style, tone, formats);
        } else {
            story = generateStoryWithTemplate(storyElements, style, tone, formats);
        }

        console.log('✅ Story generated successfully');
        return {
            timestamp: new Date().toISOString(),
            style,
            tone,
            storyElements,
            narratives: story
        };

    } catch (error) {
        logger.error('Story Generation Error:', error);
        return getFallbackStory();
    }
}

/**
 * Extract story elements from semantic map
 */
function extractStoryElements(semanticMap) {
    const elements = {
        // Core narrative components
        beginning: {
            context: '',
            stakeholders: [],
            initialState: ''
        },
        challenge: {
            problem: '',
            painPoints: [],
            constraints: []
        },
        plan: {
            approach: '',
            steps: [],
            resources: []
        },
        solution: {
            implementation: '',
            features: [],
            innovations: []
        },
        outcome: {
            results: '',
            benefits: [],
            nextSteps: []
        },

        // Supporting information
        metadata: {
            topics: semanticMap.topics?.slice(0, 10).map(t => t.keyword) || [],
            elementCount: semanticMap.stats?.totalElements || 0,
            complexity: 'medium',
            hasHierarchy: semanticMap.hierarchies?.length > 0,
            hasClusters: semanticMap.clusters?.length > 0
        }
    };

    // Extract beginning (context and initial state)
    if (semanticMap.hierarchies && semanticMap.hierarchies.length > 0) {
        const rootNodes = semanticMap.hierarchies.map(h => h.rootText).filter(Boolean);
        elements.beginning.context = rootNodes.join(', ');
        elements.beginning.initialState = `Starting with ${rootNodes.length} main area${rootNodes.length > 1 ? 's' : ''}`;
    }

    // Extract challenges from issues
    if (semanticMap.issues && semanticMap.issues.length > 0) {
        elements.challenge.painPoints = semanticMap.issues
            .filter(i => i.severity === 'high' || i.severity === 'medium')
            .map(i => i.description)
            .slice(0, 5);
    }

    // Extract plan from dependencies and hierarchies
    if (semanticMap.dependencies?.chains) {
        const longestChain = semanticMap.dependencies.chains[0];
        if (longestChain) {
            elements.plan.steps = longestChain.steps.map(s => s.text).filter(Boolean);
        }
    }

    // Extract solution from insights
    if (semanticMap.insights) {
        elements.solution.features = semanticMap.insights.keyInsights || [];
        elements.solution.implementation = semanticMap.insights.summary || '';
    }

    // Extract outcome from suggestions
    if (semanticMap.suggestions) {
        elements.outcome.benefits = semanticMap.suggestions
            .filter(s => s.priority === 'high')
            .map(s => s.action)
            .slice(0, 5);
    }

    // Determine complexity
    if (elements.metadata.elementCount > 50) {
        elements.metadata.complexity = 'high';
    } else if (elements.metadata.elementCount < 15) {
        elements.metadata.complexity = 'low';
    }

    return elements;
}

/**
 * Generate story using LLM
 */
async function generateStoryWithLLM(storyElements, style, tone, formats) {
    if (!process.env.OPENAI_API_KEY) {
        return generateStoryWithTemplate(storyElements, style, tone, formats);
    }

    const prompt = buildStoryPrompt(storyElements, style, tone);

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: getSystemPrompt(style, tone) },
                { role: 'user', content: prompt }
            ],
            temperature: 0.8,
            response_format: { type: 'json_object' }
        });

        const result = JSON.parse(response.choices[0].message.content);

        // Ensure all formats are present
        const narratives = {
            short: result.short || result.elevator_pitch || '',
            medium: result.medium || result.pitch || '',
            long: result.long || result.detailed || ''
        };

        // Filter by requested formats
        const filtered = {};
        formats.forEach(format => {
            if (narratives[format]) {
                filtered[format] = narratives[format];
            }
        });

        return filtered;

    } catch (error) {
        logger.error('LLM Story Generation Error:', error);
        return generateStoryWithTemplate(storyElements, style, tone, formats);
    }
}

/**
 * Get system prompt based on style
 */
function getSystemPrompt(style, tone) {
    const prompts = {
        product_manager: `You are an experienced product manager who excels at pitching features and explaining product vision. You tell compelling stories about user problems and solutions. Your narratives are clear, benefit-focused, and persuasive. Use ${tone} tone.`,

        designer: `You are a talented designer explaining your design thinking and prototype. You walk through the user journey, design decisions, and visual solutions. Your narratives are creative, user-centered, and visually descriptive. Use ${tone} tone.`,

        engineer: `You are a skilled engineer explaining technical architecture and implementation. You describe systems, data flows, and technical solutions clearly. Your narratives are precise, logical, and technically sound. Use ${tone} tone.`,

        executive: `You are an executive presenting strategic vision and business value. You focus on impact, ROI, and organizational benefits. Your narratives are concise, strategic, and results-oriented. Use ${tone} tone.`
    };

    return prompts[style] || prompts.product_manager;
}

/**
 * Build story prompt
 */
function buildStoryPrompt(storyElements, style, tone) {
    const { beginning, challenge, plan, solution, outcome, metadata } = storyElements;

    return `Create a compelling narrative from this whiteboard content. Tell it like a ${style.replace('_', ' ')} would.

**Board Context:**
- Topics: ${metadata.topics.join(', ')}
- Elements: ${metadata.elementCount}
- Complexity: ${metadata.complexity}
- Has Structure: ${metadata.hasHierarchy ? 'Yes' : 'No'}

**Story Elements:**

**Beginning:**
- Context: ${beginning.context || 'A new initiative'}
- Initial State: ${beginning.initialState || 'Starting fresh'}

**Challenge:**
- Pain Points: ${challenge.painPoints.join('; ') || 'Identifying opportunities'}

**Plan:**
- Steps: ${plan.steps.join(' → ') || 'Developing strategy'}

**Solution:**
- Implementation: ${solution.implementation || 'Creating solution'}
- Features: ${solution.features.join(', ') || 'Key capabilities'}

**Outcome:**
- Benefits: ${outcome.benefits.join(', ') || 'Expected results'}

**Your Task:**
Create THREE narrative formats that tell this story:

1. **Short (Elevator Pitch)**: 2-3 sentences. Hook them in 30 seconds.
2. **Medium (Standard Pitch)**: 1-2 paragraphs. 2-minute explanation.
3. **Long (Detailed Story)**: 3-4 paragraphs. Complete narrative with all elements.

Use the classic story arc: Beginning → Challenge → Plan → Solution → Outcome

**Output Format (JSON only):**
{
  "short": "2-3 sentence elevator pitch",
  "medium": "1-2 paragraph pitch",
  "long": "3-4 paragraph detailed narrative"
}

Return ONLY valid JSON. Make it compelling and ${tone}.`;
}

/**
 * Generate story using templates (fallback)
 */
function generateStoryWithTemplate(storyElements, style, tone, formats) {
    const { beginning, challenge, plan, solution, outcome, metadata } = storyElements;

    // Build narrative components
    const components = {
        beginning: beginning.context || 'We started with a vision to improve our workflow',
        challenge: challenge.painPoints[0] || 'We identified opportunities for enhancement',
        plan: plan.steps.length > 0
            ? `Our approach involved ${plan.steps.length} key steps`
            : 'We developed a strategic plan',
        solution: solution.implementation || 'We implemented a comprehensive solution',
        outcome: outcome.benefits.length > 0
            ? `This resulted in ${outcome.benefits.length} key benefits`
            : 'We achieved significant improvements'
    };

    const narratives = {};

    // Short format (elevator pitch)
    if (formats.includes('short')) {
        narratives.short = templates.short[style](components, tone);
    }

    // Medium format (standard pitch)
    if (formats.includes('medium')) {
        narratives.medium = templates.medium[style](components, tone);
    }

    // Long format (detailed story)
    if (formats.includes('long')) {
        narratives.long = templates.long[style](components, tone, storyElements);
    }

    return narratives;
}

/**
 * Story templates by style and format
 */
const templates = {
    short: {
        product_manager: (c, tone) =>
            `${c.beginning}. ${c.challenge}. ${c.solution}, delivering ${c.outcome}.`,

        designer: (c, tone) =>
            `We discovered that ${c.challenge}. Through thoughtful design, ${c.solution}, creating ${c.outcome}.`,

        engineer: (c, tone) =>
            `${c.beginning}. To address ${c.challenge}, we built ${c.solution}, achieving ${c.outcome}.`,

        executive: (c, tone) =>
            `${c.beginning}. By solving ${c.challenge}, we ${c.solution} and ${c.outcome}.`
    },

    medium: {
        product_manager: (c, tone) => {
            return `${c.beginning}. We quickly identified a critical challenge: ${c.challenge}. This was impacting our ability to deliver value to users.

To tackle this, ${c.plan}. ${c.solution}. The results speak for themselves: ${c.outcome}. This positions us perfectly for the next phase of growth.`;
        },

        designer: (c, tone) => {
            return `${c.beginning}. Through user research and observation, we uncovered an important insight: ${c.challenge}. This was creating friction in the user experience.

Our design process led us through ${c.plan}. ${c.solution}, with careful attention to usability and aesthetics. ${c.outcome}, creating a delightful experience that users love.`;
        },

        engineer: (c, tone) => {
            return `${c.beginning}. The technical challenge was clear: ${c.challenge}. This required a robust architectural solution.

We designed a system where ${c.plan}. ${c.solution}, ensuring scalability and maintainability. ${c.outcome}, with clean code and solid performance.`;
        },

        executive: (c, tone) => {
            return `${c.beginning}. The business imperative was evident: ${c.challenge}. This represented both a risk and an opportunity.

Our strategic approach involved ${c.plan}. ${c.solution}, aligning with our core objectives. ${c.outcome}, driving measurable business value and competitive advantage.`;
        }
    },

    long: {
        product_manager: (c, tone, elements) => {
            const topics = elements.metadata.topics.slice(0, 5).join(', ');
            return `${c.beginning}. As we dove deeper into ${topics}, we recognized this was more than just a feature request—it was a fundamental user need.

The challenge became apparent through user feedback and data: ${c.challenge}. Users were struggling, and it was affecting adoption and satisfaction. We knew we had to act, but the solution wasn't obvious. We needed to balance user needs with technical constraints and business goals.

${c.plan}. We brought together product, design, and engineering to collaborate on the solution. ${c.solution}. Every decision was guided by user research and validated through testing. We iterated rapidly, learning and improving with each cycle.

The impact has been remarkable. ${c.outcome}. But more importantly, we've learned valuable lessons that will guide future development. This isn't just about one feature—it's about building a better product and serving our users more effectively. The journey continues, and we're excited about what comes next.`;
        },

        designer: (c, tone, elements) => {
            const topics = elements.metadata.topics.slice(0, 5).join(', ');
            return `${c.beginning}. The design challenge centered around ${topics}, and it required us to think deeply about the user experience from multiple angles.

Through extensive user research, we discovered ${c.challenge}. This wasn't just a usability issue—it was affecting how users perceived and interacted with the entire system. We observed users struggling, getting frustrated, and sometimes giving up entirely. The emotional impact was clear, and it drove our determination to find a better solution.

Our design process was thorough and collaborative. ${c.plan}. We sketched, prototyped, tested, and refined. ${c.solution}. Every visual element, every interaction, every transition was carefully considered. We balanced aesthetics with functionality, ensuring the design was both beautiful and practical.

The transformation has been incredible. ${c.outcome}. Users have responded with enthusiasm, and the metrics confirm what we're seeing qualitatively. The interface now feels intuitive, responsive, and delightful. This project has elevated our design standards and shown what's possible when we truly put users first.`;
        },

        engineer: (c, tone, elements) => {
            const topics = elements.metadata.topics.slice(0, 5).join(', ');
            return `${c.beginning}. The technical scope encompassed ${topics}, requiring careful architectural planning and implementation.

The engineering challenge was multifaceted: ${c.challenge}. We needed to solve this while maintaining system stability, performance, and code quality. The existing architecture had limitations, and we had to work within real-world constraints of time, resources, and backward compatibility.

Our technical approach was methodical. ${c.plan}. We designed the system with modularity, testability, and scalability in mind. ${c.solution}. The implementation followed best practices, with comprehensive testing at every level. We documented thoroughly, ensuring future maintainability.

The technical outcomes have exceeded expectations. ${c.outcome}. The system is more robust, performant, and maintainable than before. Code quality metrics have improved, and the architecture is better positioned for future enhancements. This project demonstrates the value of solid engineering principles and thoughtful technical design.`;
        },

        executive: (c, tone, elements) => {
            const topics = elements.metadata.topics.slice(0, 5).join(', ');
            return `${c.beginning}. This strategic initiative around ${topics} represents a significant investment in our future capabilities and market position.

The business challenge was clear and pressing: ${c.challenge}. This was impacting our competitive position, customer satisfaction, and bottom line. The cost of inaction was high, but the path forward required careful strategic planning and resource allocation.

Our strategic approach balanced short-term wins with long-term value. ${c.plan}. We aligned cross-functional teams, secured necessary resources, and established clear success metrics. ${c.solution}, with governance and oversight ensuring alignment with corporate objectives.

The business impact has been substantial. ${c.outcome}. We've strengthened our market position, improved operational efficiency, and created new opportunities for growth. The ROI is tracking ahead of projections, and stakeholder satisfaction is high. This success validates our strategic direction and positions us well for continued growth and innovation.`;
        }
    }
};

/**
 * Get fallback story
 */
function getFallbackStory() {
    return {
        timestamp: new Date().toISOString(),
        style: 'product_manager',
        tone: 'professional',
        storyElements: {
            beginning: { context: 'A new project', initialState: 'Getting started', stakeholders: [] },
            challenge: { problem: 'Identifying opportunities', painPoints: [], constraints: [] },
            plan: { approach: 'Strategic planning', steps: [], resources: [] },
            solution: { implementation: 'Implementing solution', features: [], innovations: [] },
            outcome: { results: 'Achieving goals', benefits: [], nextSteps: [] },
            metadata: { topics: [], elementCount: 0, complexity: 'medium' }
        },
        narratives: {
            short: 'We embarked on a new initiative to improve our processes. Through careful planning and execution, we implemented effective solutions that delivered meaningful results.',
            medium: 'We embarked on a new initiative to improve our processes. Through careful analysis, we identified key opportunities for enhancement. Our team developed and implemented effective solutions, delivering meaningful results that exceeded expectations.',
            long: 'We embarked on a new initiative to improve our processes and capabilities. Through careful analysis and stakeholder engagement, we identified key opportunities for enhancement. Our team collaborated to develop a comprehensive plan, bringing together diverse perspectives and expertise. We implemented effective solutions with attention to quality and user needs. The results have been meaningful, delivering value to stakeholders and positioning us well for future success.'
        }
    };
}

/**
 * Quick story generation (template-based)
 */
export async function quickStory(boardSemanticMap, style = 'product_manager') {
    return await storyExplain(boardSemanticMap, {
        style,
        formats: ['short', 'medium'],
        tone: 'professional',
        useLLM: false
    });
}

/**
 * Generate elevator pitch only
 */
export async function elevatorPitch(boardSemanticMap, style = 'product_manager') {
    const result = await storyExplain(boardSemanticMap, {
        style,
        formats: ['short'],
        tone: 'enthusiastic',
        useLLM: true
    });

    return result.narratives.short;
}

/**
 * Generate detailed narrative only
 */
export async function detailedNarrative(boardSemanticMap, style = 'product_manager') {
    const result = await storyExplain(boardSemanticMap, {
        style,
        formats: ['long'],
        tone: 'professional',
        useLLM: true
    });

    return result.narratives.long;
}

export default storyExplain;
