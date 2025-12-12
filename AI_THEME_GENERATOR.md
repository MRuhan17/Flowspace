# AI-Driven Theme Generator Feature

## Overview
The AI-Driven Theme Generator is a powerful feature that analyzes your whiteboard content and generates beautiful, harmonious color palettes using Google's Gemini AI. It provides intelligent color suggestions based on the context of your board and allows you to apply themes instantly.

## Features

### 🎨 **Intelligent Color Analysis**
- Analyzes board content (nodes, edges, strokes, text)
- Considers current color usage
- Understands semantic context from element labels
- Generates contextually relevant color palettes

### 🤖 **AI-Powered Palette Generation**
- Creates 4 distinct, professional color themes per request
- Each palette includes:
  - **Primary**: Main brand/action color
  - **Secondary**: Supporting color
  - **Accent**: Highlight/emphasis color
  - **Background**: Canvas/surface color
  - **Text**: Readable text color
  - **Highlight**: Special emphasis color

### 🎯 **Smart Recommendations**
- AI provides analysis of your current board
- Suggests which palette works best and why
- Explains design philosophy behind each theme
- Tags palettes with style descriptors (e.g., "professional", "creative", "modern")

### ⚡ **Flexible Application**
- **Apply to All**: Theme all objects on the board
- **Apply to Selected**: Theme only selected objects
- **Apply to New**: Set theme for future objects

## Usage

### Opening the Theme Generator
1. Click the **Palette icon** (🎨) in the toolbar
2. The Theme Generator modal will open

### Generating Themes
1. **(Optional)** Enter context in the text field:
   - Examples: "Modern tech startup", "Nature-inspired", "Professional presentation"
2. Click **Generate** button
3. Wait for AI to analyze and generate palettes (usually 2-5 seconds)

### Applying a Theme
1. Review the generated palettes
2. Click on a palette card to select it
3. Choose application mode:
   - **All**: Apply to everything on the board
   - **Selected**: Apply only to selected objects
   - **New**: Set as default for new objects
4. Click **Apply Theme**

## Technical Implementation

### Backend Components

#### 1. AI Service (`backend/src/ai/themeGenerator.js`)
```javascript
- generateTheme(boardContent, context)
  // Analyzes board and generates palettes using Gemini AI
  
- applyThemeToBoard(boardContent, palette, applyTo)
  // Applies selected palette to board elements
  
- extractBoardContext(boardContent)
  // Extracts meaningful context from board for AI analysis
  
- getFallbackThemes()
  // Provides default themes if AI service is unavailable
```

#### 2. Controller (`backend/src/controllers/aiController.js`)
```javascript
- generateColorTheme(req, res, next)
  // POST /api/ai/theme/generate
  // Handles theme generation requests
  
- applyTheme(req, res, next)
  // POST /api/ai/theme/apply
  // Handles theme application requests
```

#### 3. Routes (`backend/src/routes/ai.js`)
```javascript
POST /api/ai/theme/generate
POST /api/ai/theme/apply
```

### Frontend Components

#### 1. UI Component (`frontend/src/components/ui/ThemeGenerator.jsx`)
- Beautiful modal interface with gradient header
- Real-time loading states with animations
- Palette card grid with color swatches
- Interactive selection and application controls

#### 2. API Service (`frontend/src/api/aiService.js`)
```javascript
- aiService.generateTheme(boardContent, context)
- aiService.applyTheme(boardContent, palette, applyTo)
```

#### 3. Integration
- Added to Toolbar component
- State management via useState hooks
- Automatic theme generation on modal open (if board has content)

## API Endpoints

### Generate Theme
```http
POST /api/ai/theme/generate
Content-Type: application/json

{
  "boardContent": {
    "nodes": [...],
    "edges": [...],
    "strokes": [...]
  },
  "context": "Modern tech startup" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "palettes": [
      {
        "name": "Modern Professional",
        "description": "Clean, professional palette for business",
        "philosophy": "Balanced blues with warm accents",
        "colors": {
          "primary": "#2563EB",
          "secondary": "#7C3AED",
          "accent": "#F59E0B",
          "background": "#F8FAFC",
          "text": "#1E293B",
          "highlight": "#FEF3C7"
        },
        "tags": ["professional", "business", "clean"]
      }
      // ... 3 more palettes
    ],
    "recommendation": "Modern Professional works well for most use cases...",
    "boardAnalysis": "Your board contains 5 nodes and 3 connections..."
  }
}
```

### Apply Theme
```http
POST /api/ai/theme/apply
Content-Type: application/json

{
  "boardContent": {
    "nodes": [...],
    "edges": [...],
    "strokes": [...]
  },
  "palette": {
    "name": "Modern Professional",
    "colors": { ... }
  },
  "applyTo": "all" // "all" | "selected" | "new"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "nodes": [...], // Updated with new colors
    "edges": [...], // Updated with new colors
    "strokes": [...] // Updated with new colors
  }
}
```

## Environment Variables
Ensure `GEMINI_API_KEY` is set in your backend `.env` file:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

## Fallback Behavior
If the AI service is unavailable or fails, the system provides 4 pre-designed fallback themes:
1. **Modern Professional** - Business-focused blues and warm accents
2. **Creative Vibrant** - Bold, energetic colors for brainstorming
3. **Nature Calm** - Earthy, calming tones
4. **Dark Mode Elite** - Sophisticated dark theme with neon accents

## UI/UX Features

### Visual Design
- **Gradient Header**: Purple-blue-cyan gradient with subtle grid pattern
- **Smooth Animations**: fadeIn and slideUp animations for modal
- **Color Swatches**: Interactive preview of all 6 colors per palette
- **Hover Effects**: Scale and shadow effects on interactive elements
- **Loading States**: Animated spinner with pulsing icon

### Accessibility
- Clear visual hierarchy
- High contrast text
- Descriptive button labels
- Keyboard navigation support (via standard browser behavior)

### Responsive Design
- Modal adapts to screen size
- Grid layout adjusts for mobile/tablet
- Scrollable content area for long palette lists

## Best Practices

### For Best Results
1. **Add Context**: Provide specific context for more relevant themes
2. **Iterate**: Try different context descriptions to explore options
3. **Preview**: Review all palettes before applying
4. **Test**: Apply to selected objects first to preview

### Performance Tips
- Board content is limited to 50 strokes, 20 nodes, 20 edges for AI analysis
- Theme generation typically takes 2-5 seconds
- Application is instant (client-side state update)

## Future Enhancements
- [ ] Save favorite themes
- [ ] Export/import theme palettes
- [ ] Theme history and undo
- [ ] Custom color picker integration
- [ ] Accessibility contrast checking
- [ ] Theme preview before applying
- [ ] Gradient and pattern support

## Troubleshooting

### Theme Generator Not Opening
- Check console for errors
- Ensure Toolbar component is properly imported
- Verify ThemeGenerator component exists

### AI Generation Fails
- Check GEMINI_API_KEY is set correctly
- Verify backend is running
- Check network connectivity
- Fallback themes will be provided automatically

### Colors Not Applying
- Ensure objects are properly structured in state
- Check browser console for errors
- Verify API response structure

## Credits
- **AI Model**: Google Gemini Pro
- **UI Framework**: React + Tailwind CSS
- **Icons**: Lucide React
- **State Management**: Zustand

---

**Version**: 1.0.0  
**Last Updated**: December 2025  
**Author**: Flowspace Development Team
