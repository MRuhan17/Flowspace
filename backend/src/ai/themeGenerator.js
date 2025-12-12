import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Analyzes board content and generates AI-driven color theme palettes
 * @param {object} boardContent - Current board state (nodes, edges, strokes, text content)
 * @param {string} context - Optional user context/description for theme generation
 * @returns {Promise<object>} Theme palette suggestions with metadata
 */
export async function generateTheme(boardContent, context = '') {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not set');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Extract meaningful content from board
    const contentSummary = extractBoardContext(boardContent);

    const prompt = `
You are an expert color theory and design AI. Analyze the following whiteboard content and generate beautiful, harmonious color theme palettes.

**Board Context:**
${contentSummary}

**User Context:** ${context || 'General purpose whiteboard'}

**Task:**
Generate 4 distinct, professional color theme palettes. Each palette should:
1. Have a clear design philosophy (e.g., "Modern Tech", "Warm Creative", "Professional Corporate", "Nature Inspired")
2. Include 6 colors: primary, secondary, accent, background, text, and highlight
3. Be accessible (good contrast ratios)
4. Work well together visually

**Output Format (JSON only, no markdown):**
{
  "palettes": [
    {
      "name": "Theme Name",
      "description": "Brief description of the theme's mood and use case",
      "philosophy": "Design philosophy behind color choices",
      "colors": {
        "primary": "#HEX",
        "secondary": "#HEX",
        "accent": "#HEX",
        "background": "#HEX",
        "text": "#HEX",
        "highlight": "#HEX"
      },
      "tags": ["tag1", "tag2", "tag3"]
    }
  ],
  "recommendation": "Brief explanation of which palette might work best and why",
  "boardAnalysis": "Quick analysis of the current board content and color needs"
}

Ensure all colors are valid hex codes. Make palettes visually distinct from each other.
Return ONLY valid JSON, no markdown blocks or extra text.
`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean markdown if present
        const jsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(jsonText);

        // Validate structure
        if (!parsed.palettes || !Array.isArray(parsed.palettes)) {
            throw new Error('Invalid palette structure');
        }

        return parsed;
    } catch (error) {
        console.error('AI Theme Generation Error:', error);
        // Return fallback themes
        return getFallbackThemes();
    }
}

/**
 * Extract meaningful context from board content for AI analysis
 */
function extractBoardContext(boardContent) {
    if (!boardContent) return 'Empty board';

    const parts = [];

    // Count elements
    const nodeCount = boardContent.nodes?.length || 0;
    const edgeCount = boardContent.edges?.length || 0;
    const strokeCount = boardContent.strokes?.length || 0;

    parts.push(`Elements: ${nodeCount} nodes, ${edgeCount} connections, ${strokeCount} drawings`);

    // Extract text content from nodes (limit to avoid token overflow)
    const textContent = [];
    if (boardContent.nodes) {
        boardContent.nodes.slice(0, 10).forEach(node => {
            if (node.data?.label) {
                textContent.push(node.data.label);
            }
        });
    }

    if (textContent.length > 0) {
        parts.push(`Content keywords: ${textContent.join(', ').substring(0, 200)}`);
    }

    // Analyze current colors if available
    const currentColors = new Set();
    if (boardContent.strokes) {
        boardContent.strokes.forEach(stroke => {
            if (stroke.color) currentColors.add(stroke.color);
        });
    }

    if (currentColors.size > 0) {
        parts.push(`Current colors in use: ${Array.from(currentColors).join(', ')}`);
    }

    return parts.join('\n');
}

/**
 * Fallback themes if AI generation fails
 */
function getFallbackThemes() {
    return {
        palettes: [
            {
                name: 'Modern Professional',
                description: 'Clean, professional palette for business and productivity',
                philosophy: 'Balanced blues with warm accents for trust and energy',
                colors: {
                    primary: '#2563EB',
                    secondary: '#7C3AED',
                    accent: '#F59E0B',
                    background: '#F8FAFC',
                    text: '#1E293B',
                    highlight: '#FEF3C7'
                },
                tags: ['professional', 'business', 'clean']
            },
            {
                name: 'Creative Vibrant',
                description: 'Bold, energetic colors for creative brainstorming',
                philosophy: 'High contrast with playful accents to inspire creativity',
                colors: {
                    primary: '#EC4899',
                    secondary: '#8B5CF6',
                    accent: '#10B981',
                    background: '#FEFCE8',
                    text: '#27272A',
                    highlight: '#FDE047'
                },
                tags: ['creative', 'vibrant', 'energetic']
            },
            {
                name: 'Nature Calm',
                description: 'Earthy, calming tones inspired by nature',
                philosophy: 'Natural greens and browns for peaceful, focused work',
                colors: {
                    primary: '#059669',
                    secondary: '#0D9488',
                    accent: '#F97316',
                    background: '#F0FDF4',
                    text: '#14532D',
                    highlight: '#FEF9C3'
                },
                tags: ['nature', 'calm', 'organic']
            },
            {
                name: 'Dark Mode Elite',
                description: 'Sophisticated dark theme with neon accents',
                philosophy: 'Dark backgrounds with vibrant highlights for modern aesthetics',
                colors: {
                    primary: '#3B82F6',
                    secondary: '#A855F7',
                    accent: '#06B6D4',
                    background: '#0F172A',
                    text: '#F1F5F9',
                    highlight: '#FCD34D'
                },
                tags: ['dark', 'modern', 'tech']
            }
        ],
        recommendation: 'Modern Professional works well for most use cases. Try Creative Vibrant for brainstorming sessions.',
        boardAnalysis: 'Fallback themes provided due to AI service unavailability.'
    };
}

/**
 * Apply a theme to board elements
 * @param {object} boardContent - Current board state
 * @param {object} palette - Selected color palette
 * @param {string} applyTo - What to apply theme to: 'all', 'selected', 'new'
 * @returns {object} Updated board content with theme applied
 */
export function applyThemeToBoard(boardContent, palette, applyTo = 'all') {
    const updated = JSON.parse(JSON.stringify(boardContent)); // Deep clone

    const colors = palette.colors;
    const colorArray = [
        colors.primary,
        colors.secondary,
        colors.accent,
        colors.highlight
    ];

    // Apply to strokes
    if (updated.strokes && applyTo === 'all') {
        updated.strokes = updated.strokes.map((stroke, index) => ({
            ...stroke,
            color: colorArray[index % colorArray.length]
        }));
    }

    // Apply to nodes
    if (updated.nodes && applyTo === 'all') {
        updated.nodes = updated.nodes.map((node, index) => ({
            ...node,
            data: {
                ...node.data,
                backgroundColor: colorArray[index % colorArray.length],
                textColor: colors.text
            }
        }));
    }

    // Apply to edges
    if (updated.edges && applyTo === 'all') {
        updated.edges = updated.edges.map(edge => ({
            ...edge,
            color: colors.primary
        }));
    }

    return updated;
}
