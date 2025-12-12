import OpenAI from 'openai';
import { logger } from '../utils/logger.js';

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy_key'
});

/**
 * Color Palette Generator - AI-powered color theme generation
 * 
 * Analyzes board mood, topic, and density to generate harmonious color palettes
 * with light and dark variants.
 * 
 * @param {object} boardSemanticMap - Semantic map from board interpreter
 * @param {object} options - Generation options
 * @returns {Promise<object>} Color palette with variants
 */
export async function generateColorPalette(boardSemanticMap, options = {}) {
    const {
        preferredMood = 'auto', // 'auto' | 'calm' | 'vibrant' | 'technical' | 'playful'
        useLLM = true,
        includeAccessibility = true
    } = options;

    console.log('🎨 Color Palette Generator: Analyzing board...');

    try {
        // Step 1: Analyze board characteristics
        const analysis = analyzeBoardCharacteristics(boardSemanticMap);

        // Step 2: Determine mood
        const mood = preferredMood === 'auto'
            ? determineMood(analysis)
            : preferredMood;

        // Step 3: Generate palette using LLM + color theory
        let palette;
        if (useLLM && process.env.OPENAI_API_KEY) {
            palette = await generatePaletteWithLLM(analysis, mood);
        } else {
            palette = generatePaletteWithColorTheory(analysis, mood);
        }

        // Step 4: Generate variants
        const paletteWithVariants = generateVariants(palette, mood);

        // Step 5: Add accessibility information
        if (includeAccessibility) {
            addAccessibilityInfo(paletteWithVariants);
        }

        console.log(`✅ Generated ${mood} color palette`);
        return {
            timestamp: new Date().toISOString(),
            mood,
            analysis,
            palette: paletteWithVariants
        };

    } catch (error) {
        logger.error('Color Palette Generation Error:', error);
        return getFallbackPalette();
    }
}

/**
 * Analyze board characteristics for color generation
 */
function analyzeBoardCharacteristics(semanticMap) {
    const analysis = {
        // Content analysis
        topics: semanticMap.topics?.slice(0, 10).map(t => t.keyword) || [],
        elementCount: semanticMap.stats?.totalElements || 0,
        density: 0,

        // Mood indicators
        hasBusinessTerms: false,
        hasTechnicalTerms: false,
        hasCreativeTerms: false,
        hasUrgentTerms: false,

        // Structure
        complexity: 'medium',
        organization: 'moderate'
    };

    // Calculate density
    if (semanticMap.clusters && semanticMap.clusters.length > 0) {
        const avgDensity = semanticMap.clusters.reduce((sum, c) => sum + (c.density || 0), 0) / semanticMap.clusters.length;
        analysis.density = avgDensity;
    }

    // Analyze topics for mood indicators
    const topicsText = analysis.topics.join(' ').toLowerCase();

    const businessKeywords = ['business', 'strategy', 'revenue', 'profit', 'market', 'sales', 'corporate'];
    const technicalKeywords = ['code', 'api', 'database', 'system', 'algorithm', 'function', 'server'];
    const creativeKeywords = ['design', 'creative', 'art', 'brand', 'visual', 'concept', 'idea'];
    const urgentKeywords = ['urgent', 'critical', 'asap', 'emergency', 'deadline', 'priority'];

    analysis.hasBusinessTerms = businessKeywords.some(k => topicsText.includes(k));
    analysis.hasTechnicalTerms = technicalKeywords.some(k => topicsText.includes(k));
    analysis.hasCreativeTerms = creativeKeywords.some(k => topicsText.includes(k));
    analysis.hasUrgentTerms = urgentKeywords.some(k => topicsText.includes(k));

    // Determine complexity
    if (analysis.elementCount > 50 || (semanticMap.hierarchies && semanticMap.hierarchies.length > 3)) {
        analysis.complexity = 'high';
    } else if (analysis.elementCount < 15) {
        analysis.complexity = 'low';
    }

    // Determine organization
    if (semanticMap.insights?.qualityScore > 80) {
        analysis.organization = 'excellent';
    } else if (semanticMap.insights?.qualityScore < 50) {
        analysis.organization = 'poor';
    }

    return analysis;
}

/**
 * Determine mood based on analysis
 */
function determineMood(analysis) {
    // Score each mood
    const scores = {
        calm: 0,
        vibrant: 0,
        technical: 0,
        playful: 0
    };

    // Calm: Business, organized, low density
    if (analysis.hasBusinessTerms) scores.calm += 30;
    if (analysis.organization === 'excellent') scores.calm += 20;
    if (analysis.density < 0.5) scores.calm += 15;
    if (analysis.complexity === 'low') scores.calm += 10;

    // Vibrant: Creative, urgent, high energy
    if (analysis.hasCreativeTerms) scores.vibrant += 30;
    if (analysis.hasUrgentTerms) scores.vibrant += 25;
    if (analysis.density > 0.7) scores.vibrant += 15;

    // Technical: Code, systems, structured
    if (analysis.hasTechnicalTerms) scores.technical += 40;
    if (analysis.organization === 'excellent') scores.technical += 20;
    if (analysis.complexity === 'high') scores.technical += 10;

    // Playful: Creative, low complexity, fun
    if (analysis.hasCreativeTerms) scores.playful += 25;
    if (analysis.complexity === 'low') scores.playful += 20;
    if (!analysis.hasBusinessTerms && !analysis.hasTechnicalTerms) scores.playful += 20;

    // Return highest scoring mood
    return Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
}

/**
 * Generate palette using LLM
 */
async function generatePaletteWithLLM(analysis, mood) {
    if (!process.env.OPENAI_API_KEY) {
        return generatePaletteWithColorTheory(analysis, mood);
    }

    const prompt = `You are an expert in color theory and UI design. Generate a harmonious color palette for a digital whiteboard.

**Board Analysis:**
- Topics: ${analysis.topics.join(', ')}
- Element Count: ${analysis.elementCount}
- Density: ${analysis.density.toFixed(2)}
- Complexity: ${analysis.complexity}
- Mood: ${mood}

**Mood Characteristics:**
${getMoodDescription(mood)}

**Requirements:**
1. Generate a cohesive color palette that matches the ${mood} mood
2. Ensure good contrast ratios for accessibility
3. Use hex color codes
4. Consider color psychology and harmony
5. Make colors work well together

**Output Format (JSON only):**
{
  "primary": "#hexcode",
  "secondary": "#hexcode",
  "accent": "#hexcode",
  "surface": "#hexcode",
  "border": "#hexcode",
  "emphasis": "#hexcode",
  "reasoning": "Brief explanation of color choices"
}

Return ONLY valid JSON.`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are an expert in color theory and design. Always return valid JSON with hex color codes.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.8,
            response_format: { type: 'json_object' }
        });

        const result = JSON.parse(response.choices[0].message.content);

        // Validate hex codes
        Object.keys(result).forEach(key => {
            if (key !== 'reasoning' && typeof result[key] === 'string') {
                if (!result[key].match(/^#[0-9A-Fa-f]{6}$/)) {
                    result[key] = '#808080'; // Fallback to gray
                }
            }
        });

        return result;

    } catch (error) {
        logger.error('LLM Palette Generation Error:', error);
        return generatePaletteWithColorTheory(analysis, mood);
    }
}

/**
 * Get mood description for LLM
 */
function getMoodDescription(mood) {
    const descriptions = {
        calm: 'Calm: Soothing, professional, balanced. Use muted tones, soft blues, greens, and neutrals. Avoid harsh contrasts.',
        vibrant: 'Vibrant: Energetic, bold, attention-grabbing. Use saturated colors, warm tones, strong contrasts.',
        technical: 'Technical: Clean, precise, modern. Use cool tones, blues, grays, with high contrast. Monochromatic or analogous schemes.',
        playful: 'Playful: Fun, creative, approachable. Use bright colors, varied hues, complementary schemes. Avoid overly serious tones.'
    };
    return descriptions[mood] || descriptions.calm;
}

/**
 * Generate palette using color theory rules (fallback)
 */
function generatePaletteWithColorTheory(analysis, mood) {
    const palettes = {
        calm: {
            primary: '#4A90E2',      // Soft blue
            secondary: '#7ED321',    // Calm green
            accent: '#F5A623',       // Warm orange
            surface: '#F8F9FA',      // Light gray
            border: '#E1E4E8',       // Border gray
            emphasis: '#5856D6',     // Purple
            reasoning: 'Calm palette with soft blues and greens for a professional, soothing feel'
        },
        vibrant: {
            primary: '#FF6B6B',      // Vibrant red
            secondary: '#4ECDC4',    // Bright teal
            accent: '#FFE66D',       // Bright yellow
            surface: '#FFFFFF',      // Pure white
            border: '#2C3E50',       // Dark border
            emphasis: '#A8E6CF',     // Mint green
            reasoning: 'Vibrant palette with bold, saturated colors for energy and attention'
        },
        technical: {
            primary: '#2C3E50',      // Dark blue-gray
            secondary: '#3498DB',    // Tech blue
            accent: '#1ABC9C',       // Teal accent
            surface: '#ECF0F1',      // Light gray
            border: '#BDC3C7',       // Medium gray
            emphasis: '#E74C3C',     // Red emphasis
            reasoning: 'Technical palette with cool tones and high contrast for clarity'
        },
        playful: {
            primary: '#FF6F91',      // Pink
            secondary: '#845EC2',    // Purple
            accent: '#FFC75F',       // Yellow
            surface: '#FFF8E7',      // Cream
            border: '#D5AAFF',       // Light purple
            emphasis: '#00D2FC',     // Cyan
            reasoning: 'Playful palette with bright, varied colors for a fun, creative feel'
        }
    };

    return palettes[mood] || palettes.calm;
}

/**
 * Generate light and dark variants
 */
function generateVariants(basePalette, mood) {
    const palette = {
        mood,
        reasoning: basePalette.reasoning,
        light: {
            primary: basePalette.primary,
            secondary: basePalette.secondary,
            accent: basePalette.accent,
            surface: basePalette.surface,
            border: basePalette.border,
            emphasis: basePalette.emphasis,
            background: '#FFFFFF',
            text: '#1A1A1A',
            textSecondary: '#666666'
        },
        dark: {
            primary: adjustBrightness(basePalette.primary, 1.2),
            secondary: adjustBrightness(basePalette.secondary, 1.2),
            accent: adjustBrightness(basePalette.accent, 1.1),
            surface: '#1E1E1E',
            border: '#3A3A3A',
            emphasis: adjustBrightness(basePalette.emphasis, 1.3),
            background: '#121212',
            text: '#E0E0E0',
            textSecondary: '#A0A0A0'
        }
    };

    return palette;
}

/**
 * Adjust color brightness
 */
function adjustBrightness(hexColor, factor) {
    // Convert hex to RGB
    const hex = hexColor.replace('#', '');
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    // Adjust brightness
    r = Math.min(255, Math.floor(r * factor));
    g = Math.min(255, Math.floor(g * factor));
    b = Math.min(255, Math.floor(b * factor));

    // Convert back to hex
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

/**
 * Add accessibility information
 */
function addAccessibilityInfo(palette) {
    // Calculate contrast ratios
    palette.accessibility = {
        light: {
            primaryOnSurface: calculateContrastRatio(palette.light.primary, palette.light.surface),
            textOnSurface: calculateContrastRatio(palette.light.text, palette.light.surface),
            accentOnSurface: calculateContrastRatio(palette.light.accent, palette.light.surface)
        },
        dark: {
            primaryOnSurface: calculateContrastRatio(palette.dark.primary, palette.dark.surface),
            textOnSurface: calculateContrastRatio(palette.dark.text, palette.dark.surface),
            accentOnSurface: calculateContrastRatio(palette.dark.accent, palette.dark.surface)
        },
        wcagCompliance: {
            light: checkWCAGCompliance(palette.light),
            dark: checkWCAGCompliance(palette.dark)
        }
    };
}

/**
 * Calculate contrast ratio between two colors
 */
function calculateContrastRatio(color1, color2) {
    const l1 = getRelativeLuminance(color1);
    const l2 = getRelativeLuminance(color2);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return ((lighter + 0.05) / (darker + 0.05)).toFixed(2);
}

/**
 * Get relative luminance of a color
 */
function getRelativeLuminance(hexColor) {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const [rs, gs, bs] = [r, g, b].map(c => {
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Check WCAG compliance
 */
function checkWCAGCompliance(colorScheme) {
    const textContrast = calculateContrastRatio(colorScheme.text, colorScheme.surface);
    const primaryContrast = calculateContrastRatio(colorScheme.primary, colorScheme.surface);

    return {
        AA: textContrast >= 4.5 && primaryContrast >= 3,
        AAA: textContrast >= 7 && primaryContrast >= 4.5,
        textContrast: parseFloat(textContrast),
        primaryContrast: parseFloat(primaryContrast)
    };
}

/**
 * Get fallback palette
 */
function getFallbackPalette() {
    return {
        timestamp: new Date().toISOString(),
        mood: 'calm',
        analysis: {
            topics: [],
            elementCount: 0,
            density: 0,
            complexity: 'medium'
        },
        palette: {
            mood: 'calm',
            reasoning: 'Default calm palette',
            light: {
                primary: '#4A90E2',
                secondary: '#7ED321',
                accent: '#F5A623',
                surface: '#F8F9FA',
                border: '#E1E4E8',
                emphasis: '#5856D6',
                background: '#FFFFFF',
                text: '#1A1A1A',
                textSecondary: '#666666'
            },
            dark: {
                primary: '#5AA5FF',
                secondary: '#8FE836',
                accent: '#FFB938',
                surface: '#1E1E1E',
                border: '#3A3A3A',
                emphasis: '#6D6BEB',
                background: '#121212',
                text: '#E0E0E0',
                textSecondary: '#A0A0A0'
            }
        }
    };
}

/**
 * Quick palette generation (uses color theory only)
 */
export async function quickColorPalette(boardSemanticMap, mood = 'auto') {
    return await generateColorPalette(boardSemanticMap, {
        preferredMood: mood,
        useLLM: false,
        includeAccessibility: true
    });
}

/**
 * Generate palette from specific colors
 */
export function generatePaletteFromColor(baseColor, mood = 'calm') {
    // Generate harmonious palette from a single base color
    const hsl = hexToHSL(baseColor);

    const palette = {
        primary: baseColor,
        secondary: hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l), // Triadic
        accent: hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l),    // Complementary
        surface: hslToHex(hsl.h, hsl.s * 0.1, 0.97),            // Very light
        border: hslToHex(hsl.h, hsl.s * 0.2, 0.85),             // Light
        emphasis: hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l)    // Analogous
    };

    return generateVariants(palette, mood);
}

/**
 * Convert hex to HSL
 */
function hexToHSL(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }

    return { h: h * 360, s: s, l: l };
}

/**
 * Convert HSL to hex
 */
function hslToHex(h, s, l) {
    h = h / 360;

    const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };

    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    const toHex = x => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export default generateColorPalette;
