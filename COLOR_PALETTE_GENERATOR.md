# Color Palette Generator - AI-Powered Color Themes

## Overview

The Color Palette Generator analyzes board content, mood, and density to create harmonious color themes. It combines AI-powered analysis with color theory rules to generate professional palettes with light and dark variants, complete with accessibility information.

## Supported Moods

### 1. **Calm** 🌊
**Characteristics**: Soothing, professional, balanced

**Colors**: Muted tones, soft blues, greens, neutrals

**Best for**:
- Business presentations
- Professional documentation
- Organized workflows
- Low-stress environments

**Example Palette**:
- Primary: `#4A90E2` (Soft blue)
- Secondary: `#7ED321` (Calm green)
- Accent: `#F5A623` (Warm orange)

### 2. **Vibrant** ⚡
**Characteristics**: Energetic, bold, attention-grabbing

**Colors**: Saturated colors, warm tones, strong contrasts

**Best for**:
- Creative brainstorming
- Marketing materials
- Urgent/important boards
- High-energy projects

**Example Palette**:
- Primary: `#FF6B6B` (Vibrant red)
- Secondary: `#4ECDC4` (Bright teal)
- Accent: `#FFE66D` (Bright yellow)

### 3. **Technical** 💻
**Characteristics**: Clean, precise, modern

**Colors**: Cool tones, blues, grays, high contrast

**Best for**:
- Code documentation
- System architecture
- Technical diagrams
- Engineering projects

**Example Palette**:
- Primary: `#2C3E50` (Dark blue-gray)
- Secondary: `#3498DB` (Tech blue)
- Accent: `#1ABC9C` (Teal accent)

### 4. **Playful** 🎨
**Characteristics**: Fun, creative, approachable

**Colors**: Bright colors, varied hues, complementary schemes

**Best for**:
- Creative projects
- Educational content
- Fun team activities
- Informal brainstorming

**Example Palette**:
- Primary: `#FF6F91` (Pink)
- Secondary: `#845EC2` (Purple)
- Accent: `#FFC75F` (Yellow)

## API Endpoints

### 1. Generate Color Palette

```http
POST /api/ai/color/generate
Content-Type: application/json

{
  "boardSemanticMap": {
    "topics": [...],
    "stats": {...},
    "clusters": [...],
    "insights": {...}
  },
  "options": {
    "preferredMood": "auto",  // "auto" | "calm" | "vibrant" | "technical" | "playful"
    "useLLM": true,
    "includeAccessibility": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-12-12T16:03:52.000Z",
    "mood": "calm",
    "analysis": {
      "topics": ["business", "strategy", "planning"],
      "elementCount": 24,
      "density": 0.65,
      "hasBusinessTerms": true,
      "hasTechnicalTerms": false,
      "hasCreativeTerms": false,
      "hasUrgentTerms": false,
      "complexity": "medium",
      "organization": "excellent"
    },
    "palette": {
      "mood": "calm",
      "reasoning": "Calm palette with soft blues and greens for a professional, soothing feel",
      "light": {
        "primary": "#4A90E2",
        "secondary": "#7ED321",
        "accent": "#F5A623",
        "surface": "#F8F9FA",
        "border": "#E1E4E8",
        "emphasis": "#5856D6",
        "background": "#FFFFFF",
        "text": "#1A1A1A",
        "textSecondary": "#666666"
      },
      "dark": {
        "primary": "#5AA5FF",
        "secondary": "#8FE836",
        "accent": "#FFB938",
        "surface": "#1E1E1E",
        "border": "#3A3A3A",
        "emphasis": "#6D6BEB",
        "background": "#121212",
        "text": "#E0E0E0",
        "textSecondary": "#A0A0A0"
      },
      "accessibility": {
        "light": {
          "primaryOnSurface": "4.52",
          "textOnSurface": "12.63",
          "accentOnSurface": "3.89"
        },
        "dark": {
          "primaryOnSurface": "5.12",
          "textOnSurface": "11.24",
          "accentOnSurface": "4.23"
        },
        "wcagCompliance": {
          "light": {
            "AA": true,
            "AAA": true,
            "textContrast": 12.63,
            "primaryContrast": 4.52
          },
          "dark": {
            "AA": true,
            "AAA": true,
            "textContrast": 11.24,
            "primaryContrast": 5.12
          }
        }
      }
    }
  }
}
```

### 2. Quick Color Palette (Color Theory Only)

```http
POST /api/ai/color/generate/quick
Content-Type: application/json

{
  "boardSemanticMap": {...},
  "mood": "vibrant"  // Optional, defaults to "auto"
}
```

**Response**: Same structure but generated using color theory rules only (faster, no LLM).

### 3. Generate Palette from Specific Color

```http
POST /api/ai/color/from-color
Content-Type: application/json

{
  "baseColor": "#4A90E2",
  "mood": "calm"  // Optional, defaults to "calm"
}
```

**Response**: Harmonious palette generated from the base color using color theory.

## Palette Structure

### Light Variant
```javascript
{
  primary: "#4A90E2",        // Main brand color
  secondary: "#7ED321",      // Supporting color
  accent: "#F5A623",         // Highlight/CTA color
  surface: "#F8F9FA",        // Card/panel backgrounds
  border: "#E1E4E8",         // Borders and dividers
  emphasis: "#5856D6",       // Special emphasis
  background: "#FFFFFF",     // Page background
  text: "#1A1A1A",          // Primary text
  textSecondary: "#666666"   // Secondary text
}
```

### Dark Variant
```javascript
{
  primary: "#5AA5FF",        // Brighter version of primary
  secondary: "#8FE836",      // Brighter version of secondary
  accent: "#FFB938",         // Brighter version of accent
  surface: "#1E1E1E",        // Dark card backgrounds
  border: "#3A3A3A",         // Dark borders
  emphasis: "#6D6BEB",       // Bright emphasis
  background: "#121212",     // Dark page background
  text: "#E0E0E0",          // Light text
  textSecondary: "#A0A0A0"   // Dimmer text
}
```

## Usage Examples

### Frontend Integration

```javascript
import { aiService } from './api/aiService';

// Generate palette for current board
async function generateBoardColors() {
  // First, analyze board
  const semanticMap = await aiService.interpretBoard(boardData);
  
  // Generate color palette
  const result = await aiService.generateColorPalette(semanticMap, {
    preferredMood: 'auto',
    useLLM: true,
    includeAccessibility: true
  });
  
  console.log('Mood:', result.mood);
  console.log('Light palette:', result.palette.light);
  console.log('Dark palette:', result.palette.dark);
  console.log('WCAG AA compliant:', result.palette.accessibility.wcagCompliance.light.AA);
  
  // Apply palette
  applyPalette(result.palette);
}

// Quick palette generation
async function quickColors() {
  const semanticMap = await aiService.quickAnalyze(boardData);
  const result = await aiService.quickColorPalette(semanticMap, 'vibrant');
  
  applyPalette(result.palette);
}

// Generate from user's favorite color
async function colorsFromFavorite(favoriteColor) {
  const result = await aiService.generatePaletteFromColor(favoriteColor, 'calm');
  
  applyPalette(result);
}

// Apply palette to board
function applyPalette(palette) {
  const isDark = document.body.classList.contains('dark-mode');
  const colors = isDark ? palette.dark : palette.light;
  
  // Apply CSS variables
  document.documentElement.style.setProperty('--color-primary', colors.primary);
  document.documentElement.style.setProperty('--color-secondary', colors.secondary);
  document.documentElement.style.setProperty('--color-accent', colors.accent);
  document.documentElement.style.setProperty('--color-surface', colors.surface);
  document.documentElement.style.setProperty('--color-border', colors.border);
  document.documentElement.style.setProperty('--color-emphasis', colors.emphasis);
  document.documentElement.style.setProperty('--color-background', colors.background);
  document.documentElement.style.setProperty('--color-text', colors.text);
  document.documentElement.style.setProperty('--color-text-secondary', colors.textSecondary);
}
```

### Backend Usage

```javascript
import { generateColorPalette, quickColorPalette, generatePaletteFromColor } from './ai/colorSuggest.js';

// Full AI-powered generation
const result = await generateColorPalette(semanticMap, {
  preferredMood: 'auto',
  useLLM: true,
  includeAccessibility: true
});

// Quick color theory generation
const quick = await quickColorPalette(semanticMap, 'technical');

// From specific color
const fromColor = generatePaletteFromColor('#FF6B6B', 'vibrant');
```

## Mood Detection Algorithm

The system automatically detects mood based on board characteristics:

```javascript
// Calm scoring
if (hasBusinessTerms) score += 30;
if (wellOrganized) score += 20;
if (lowDensity) score += 15;

// Vibrant scoring
if (hasCreativeTerms) score += 30;
if (hasUrgentTerms) score += 25;
if (highDensity) score += 15;

// Technical scoring
if (hasTechnicalTerms) score += 40;
if (wellOrganized) score += 20;
if (highComplexity) score += 10;

// Playful scoring
if (hasCreativeTerms) score += 25;
if (lowComplexity) score += 20;
if (noBusinessOrTech) score += 20;
```

## Color Theory Rules

### Harmonious Color Generation

**From Base Color**:
1. **Triadic**: +120° on color wheel (secondary)
2. **Complementary**: +180° on color wheel (accent)
3. **Analogous**: +30° on color wheel (emphasis)
4. **Tints**: Reduced saturation for surface/border

**HSL Adjustments**:
- Surface: 10% saturation, 97% lightness
- Border: 20% saturation, 85% lightness
- Dark variants: 1.2x brightness increase

## Accessibility Features

### WCAG Compliance Checking

**AA Level** (Minimum):
- Text contrast: ≥ 4.5:1
- Large text: ≥ 3:1
- UI components: ≥ 3:1

**AAA Level** (Enhanced):
- Text contrast: ≥ 7:1
- Large text: ≥ 4.5:1

### Contrast Ratio Calculation

```javascript
// Relative luminance formula
L = 0.2126 * R + 0.7152 * G + 0.0722 * B

// Contrast ratio
CR = (L1 + 0.05) / (L2 + 0.05)
```

### Accessibility Information Included

```javascript
{
  accessibility: {
    light: {
      primaryOnSurface: "4.52",  // Contrast ratio
      textOnSurface: "12.63",
      accentOnSurface: "3.89"
    },
    wcagCompliance: {
      light: {
        AA: true,   // Meets AA standard
        AAA: true,  // Meets AAA standard
        textContrast: 12.63,
        primaryContrast: 4.52
      }
    }
  }
}
```

## Best Practices

### When to Use Each Mood

**Calm**:
- ✅ Business presentations
- ✅ Professional documentation
- ✅ Long reading sessions
- ✅ Formal meetings

**Vibrant**:
- ✅ Creative brainstorming
- ✅ Marketing campaigns
- ✅ Urgent announcements
- ✅ Team motivation

**Technical**:
- ✅ Code documentation
- ✅ System diagrams
- ✅ Data visualization
- ✅ Engineering specs

**Playful**:
- ✅ Creative projects
- ✅ Team building
- ✅ Educational content
- ✅ Informal sessions

### Customizing Palettes

```javascript
// Start with generated palette
const result = await generateColorPalette(semanticMap);
const palette = result.palette.light;

// Adjust specific colors
palette.primary = '#YOUR_BRAND_COLOR';

// Regenerate harmonious colors from your brand color
const customPalette = generatePaletteFromColor('#YOUR_BRAND_COLOR', result.mood);
```

### Testing Accessibility

```javascript
// Check if palette meets WCAG AA
if (result.palette.accessibility.wcagCompliance.light.AA) {
  console.log('✅ Palette is accessible');
} else {
  console.log('⚠️ Palette may have accessibility issues');
  console.log('Text contrast:', result.palette.accessibility.light.textOnSurface);
}
```

## Color Psychology

### Calm (Blue/Green)
- **Blue**: Trust, stability, professionalism
- **Green**: Growth, harmony, balance
- **Effect**: Reduces stress, promotes focus

### Vibrant (Red/Orange/Yellow)
- **Red**: Energy, urgency, passion
- **Orange**: Enthusiasm, creativity
- **Yellow**: Optimism, attention
- **Effect**: Increases energy, demands attention

### Technical (Gray/Blue)
- **Gray**: Neutrality, sophistication
- **Blue**: Logic, precision, technology
- **Effect**: Promotes clarity, reduces distraction

### Playful (Multi-color)
- **Pink**: Fun, creativity, warmth
- **Purple**: Imagination, luxury
- **Cyan**: Freshness, innovation
- **Effect**: Encourages creativity, reduces formality

## Integration Patterns

### With Theme System

```javascript
async function generateAndApplyTheme(boardId) {
  // Step 1: Analyze board
  const semanticMap = await interpretBoard(boardData);
  
  // Step 2: Generate colors
  const colorResult = await generateColorPalette(semanticMap);
  
  // Step 3: Create theme
  const theme = {
    name: `${colorResult.mood} Theme`,
    colors: colorResult.palette,
    mood: colorResult.mood,
    boardId: boardId
  };
  
  // Step 4: Save and apply
  await saveTheme(theme);
  applyTheme(theme);
  
  return theme;
}
```

### Auto-Update on Content Change

```javascript
let debounceTimer;

function onBoardContentChange() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const semanticMap = await quickAnalyze(boardData);
    const colors = await quickColorPalette(semanticMap);
    
    // Suggest new palette if mood changed
    if (colors.mood !== currentMood) {
      showPaletteSuggestion(colors);
    }
  }, 2000);
}
```

## Troubleshooting

### Colors Look Washed Out
- **Cause**: Low saturation in generated palette
- **Solution**: Use 'vibrant' mood or increase saturation manually

### Poor Contrast
- **Cause**: Similar luminance between colors
- **Solution**: Check accessibility info, adjust colors

### Colors Don't Match Brand
- **Cause**: Auto-generated palette
- **Solution**: Use `generatePaletteFromColor` with brand color

## Future Enhancements

Planned features:
- [ ] Custom color harmony rules
- [ ] Brand color integration
- [ ] Gradient generation
- [ ] Color blindness simulation
- [ ] Export to design tools (Figma, Sketch)
- [ ] Palette history and favorites
- [ ] A/B testing for palettes

## Credits

- **AI Model**: OpenAI GPT-4o-mini
- **Color Theory**: Traditional color wheel and harmony rules
- **Accessibility**: WCAG 2.1 guidelines
- **Inspiration**: Material Design, Tailwind CSS

---

**Version**: 1.0.0  
**Last Updated**: December 2025  
**Author**: Flowspace Development Team  
**License**: Same as Flowspace project
