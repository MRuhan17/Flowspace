# Interactive HTML Board Export

## Overview
The Interactive HTML Board Export feature allows you to export your entire Flowspace board as a standalone, self-contained HTML file. The exported file includes all canvas objects (nodes, edges, strokes) and provides interactive viewing capabilities including zoom, pan, and inspection - all without requiring any external dependencies or server.

## Features

### 🎯 **Standalone & Portable**
- Single HTML file contains everything
- No external dependencies required
- Works offline - open anywhere, anytime
- Share via email, cloud storage, or USB drive

### 🖼️ **Complete Board Rendering**
- **Nodes**: Rendered with accurate positioning, colors, and text
- **Edges**: Bezier curves with arrow heads showing connections
- **Strokes**: Freehand drawings with original colors and stroke widths
- **Layout**: Preserves exact spatial relationships

### 🎮 **Interactive Controls**
- **Pan**: Click and drag to move around the board
- **Zoom**: Mouse wheel or buttons to zoom in/out (10% - 500%)
- **Reset View**: Return to default view with one click
- **Fit to Screen**: Auto-scale to fit entire board in viewport
- **Inspector Panel**: View board statistics and metadata

### ⌨️ **Keyboard Shortcuts**
- `+` or `=`: Zoom in
- `-` or `_`: Zoom out
- `0`: Reset view to 100%
- `F`: Fit board to screen
- `I`: Toggle inspector panel

### 🎨 **Theme Support**
- **Light Theme**: Clean, professional appearance (default)
- **Dark Theme**: Modern dark mode for reduced eye strain

### 📊 **Board Inspector**
- Total element count
- Breakdown by type (nodes, edges, strokes)
- Canvas dimensions
- Export timestamp

## Usage

### Exporting from Flowspace

1. **Open Export Menu**
   - Click the **Download icon** (⬇️) in the toolbar
   - The export dropdown will appear

2. **Select HTML Export**
   - Click on **HTML** → **Interactive** option
   - The option has a purple-blue gradient badge

3. **File Download**
   - Browser will download `flowspace-board.html`
   - File is ready to open immediately

### Opening the Exported File

1. **Locate the downloaded HTML file**
2. **Double-click** to open in your default browser
3. **Or right-click** → Open with → Choose your preferred browser

### Sharing the Export

The exported HTML file can be shared via:
- **Email**: Attach as a regular file
- **Cloud Storage**: Upload to Google Drive, Dropbox, OneDrive, etc.
- **USB/External Drive**: Copy for offline access
- **Web Hosting**: Upload to any web server
- **Version Control**: Commit to Git repositories

## Technical Details

### File Structure

The exported HTML file is a complete, self-contained document containing:

```html
<!DOCTYPE html>
<html>
  <head>
    <!-- Embedded CSS styles -->
    <style>/* All styling inline */</style>
  </head>
  <body>
    <!-- Header with controls -->
    <!-- Canvas container -->
    <!-- Inspector panel -->
    <!-- Footer with zoom indicator -->
    
    <!-- Embedded JavaScript -->
    <script>
      // Board data as JSON
      // Canvas rendering logic
      // Interaction handlers
    </script>
  </body>
</html>
```

### Canvas Rendering

- **Technology**: HTML5 Canvas API
- **Rendering**: Client-side JavaScript
- **Performance**: Optimized for boards with hundreds of elements
- **Quality**: High-fidelity reproduction of original board

### Browser Compatibility

Works in all modern browsers:
- ✅ Chrome/Edge (Chromium) 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Opera 76+

### File Size

Typical file sizes:
- **Small board** (10-20 elements): ~50-100 KB
- **Medium board** (50-100 elements): ~150-300 KB
- **Large board** (200+ elements): ~500 KB - 1 MB

## API Reference

### Function Signature

```javascript
exportBoardAsHTML(dataStore, options)
```

### Parameters

**dataStore** (object, required)
```javascript
{
  nodes: Array,    // Array of node objects
  edges: Array,    // Array of edge/connection objects
  strokes: Array   // Array of freehand stroke objects
}
```

**options** (object, optional)
```javascript
{
  fileName: string,  // Default: 'flowspace-board'
  title: string,     // Default: 'Flowspace Board Export'
  theme: 'light' | 'dark'  // Default: 'light'
}
```

### Example Usage

```javascript
import { exportBoardAsHTML } from './utils/htmlExporter';

// Basic export
exportBoardAsHTML({ nodes, edges, strokes });

// Custom export
exportBoardAsHTML(
  { nodes, edges, strokes },
  {
    fileName: 'my-project-board',
    title: 'Project Planning Board',
    theme: 'dark'
  }
);
```

## Implementation Details

### Module Structure

```
frontend/src/utils/
├── exporter.js          # Main export orchestrator
└── htmlExporter.js      # HTML export implementation
```

### Key Functions

#### `exportBoardAsHTML(dataStore, options)`
Main export function that orchestrates the HTML generation and download.

#### `generateInteractiveHTML(boardData, config)`
Creates the complete HTML document structure.

#### `generateStyles(theme)`
Generates theme-specific CSS styles.

#### `generateScript(nodes, edges, strokes, canvasWidth, canvasHeight)`
Creates the JavaScript code for rendering and interaction.

#### `calculateBounds(nodes, strokes)`
Calculates the bounding box of all board elements.

#### `escapeHtml(text)`
Sanitizes text content to prevent XSS vulnerabilities.

### Rendering Pipeline

1. **Data Collection**: Gather all board elements from store
2. **Bounds Calculation**: Determine canvas size needed
3. **HTML Generation**: Build complete HTML document
4. **Data Embedding**: Serialize board data as JSON
5. **Script Injection**: Add rendering and interaction code
6. **Blob Creation**: Convert to downloadable blob
7. **Download Trigger**: Initiate browser download

### Canvas Rendering Details

**Nodes**:
- Rounded rectangles with shadows
- Custom background colors
- Text wrapping for long labels
- Port indicators (if present)

**Edges**:
- Cubic Bezier curves
- Arrow heads at target
- Custom colors
- Smooth connections

**Strokes**:
- Polyline rendering
- Original colors and widths
- Rounded caps and joins
- Smooth curves

## Customization

### Changing Default Theme

Edit `htmlExporter.js`:
```javascript
const {
    theme = 'dark'  // Change from 'light' to 'dark'
} = options;
```

### Modifying Canvas Size

The canvas automatically sizes to fit all content with 200px padding. To adjust:

```javascript
const canvasWidth = Math.max(bounds.maxX - bounds.minX + 400, 1200);  // More padding
const canvasHeight = Math.max(bounds.maxY - bounds.minY + 400, 800);
```

### Adding Custom Metadata

Extend the inspector panel in `generateInspector()`:

```javascript
<div class="inspector-item">
    <div class="inspector-label">Custom Field</div>
    <div class="inspector-value">Custom Value</div>
</div>
```

## Troubleshooting

### Export Button Not Visible
- Ensure you're using the latest version of Flowspace
- Check that `htmlExporter.js` is properly imported in `exporter.js`

### File Won't Download
- Check browser's download settings
- Ensure pop-ups aren't blocked
- Try a different browser

### Board Appears Empty
- Verify board has content before exporting
- Check browser console for JavaScript errors
- Ensure browser supports HTML5 Canvas

### Zoom/Pan Not Working
- Verify JavaScript is enabled in browser
- Check for browser console errors
- Try refreshing the page

### Text Not Displaying
- Check that node labels exist in data
- Verify font loading (uses system fonts)
- Inspect browser console for errors

## Best Practices

### Before Exporting
1. **Save your work** in Flowspace
2. **Review board content** for completeness
3. **Test with small boards** first
4. **Choose appropriate theme** for intended use

### After Exporting
1. **Test the HTML file** before sharing
2. **Verify all elements** rendered correctly
3. **Check file size** if sharing via email
4. **Include instructions** for recipients if needed

### For Large Boards
- Consider exporting sections separately
- Use "Fit to Screen" for initial view
- Provide zoom instructions to viewers
- Test performance in target browsers

## Security Considerations

### XSS Prevention
- All user text is HTML-escaped
- No eval() or dangerous functions used
- JSON data is properly sanitized

### Safe Sharing
- HTML files are static and safe to share
- No server-side code execution
- No external resource loading
- No tracking or analytics

## Future Enhancements

Planned features:
- [ ] Search functionality within exported board
- [ ] Element filtering by type
- [ ] Export selected elements only
- [ ] Annotation mode in exported file
- [ ] Print-optimized view
- [ ] Minimap navigation
- [ ] Touch gesture support for mobile
- [ ] Export to PowerPoint/Keynote
- [ ] Collaborative viewing mode

## Performance Optimization

### Current Optimizations
- Single-pass rendering
- Efficient canvas transformations
- Throttled interaction handlers
- Minimal DOM manipulation

### Recommendations for Large Boards
- Limit to 500 elements for best performance
- Use modern browsers (Chrome/Edge recommended)
- Close other browser tabs during viewing
- Ensure adequate system memory

## Examples

### Basic Light Theme Export
```javascript
exportBoardAsHTML(
  { nodes, edges, strokes },
  { fileName: 'my-board' }
);
```

### Dark Theme with Custom Title
```javascript
exportBoardAsHTML(
  { nodes, edges, strokes },
  {
    fileName: 'night-mode-board',
    title: 'Project Architecture - Dark Mode',
    theme: 'dark'
  }
);
```

### Programmatic Export
```javascript
// From Toolbar component
const handleExport = async (mode) => {
    if (mode === 'html') {
        await exportCanvas(stageRef, { nodes, edges, strokes }, 'html', {
            title: 'My Flowspace Board',
            theme: 'light'
        });
    }
};
```

## Credits

- **Canvas Rendering**: HTML5 Canvas API
- **Interaction**: Vanilla JavaScript
- **Styling**: CSS3 with modern features
- **Export**: Blob API and File Download API

---

**Version**: 1.0.0  
**Last Updated**: December 2025  
**Author**: Flowspace Development Team  
**License**: Same as Flowspace project
