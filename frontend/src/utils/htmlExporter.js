/**
 * Exports the entire board as an interactive HTML file
 * This creates a standalone, self-contained HTML document with all canvas objects
 * and their interactive states (zoom, pan, inspect).
 */

/**
 * Main export function
 * @param {object} dataStore - { nodes, edges, strokes } complete board state
 * @param {object} options - { fileName, title, theme }
 */
export const exportBoardAsHTML = (dataStore, options = {}) => {
    const {
        fileName = 'flowspace-board',
        title = 'Flowspace Board Export',
        theme = 'light' // 'light' | 'dark'
    } = options;

    const { nodes = [], edges = [], strokes = [] } = dataStore;

    // Calculate canvas bounds
    const bounds = calculateBounds(nodes, strokes);
    const canvasWidth = Math.max(bounds.maxX - bounds.minX + 200, 1200);
    const canvasHeight = Math.max(bounds.maxY - bounds.minY + 200, 800);

    // Generate the complete HTML document
    const htmlContent = generateInteractiveHTML(
        { nodes, edges, strokes },
        { canvasWidth, canvasHeight, title, theme }
    );

    // Create and download the HTML file
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    downloadBlob(blob, `${fileName}.html`);
};

/**
 * Helper to download blob
 */
const downloadBlob = (blob, fileName) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Generate the complete interactive HTML document
 */
const generateInteractiveHTML = (boardData, config) => {
    const { nodes, edges, strokes } = boardData;
    const { canvasWidth, canvasHeight, title, theme } = config;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    ${generateStyles(theme)}
</head>
<body>
    ${generateHeader(title)}
    ${generateCanvasContainer()}
    ${generateInspector(nodes, edges, strokes, canvasWidth, canvasHeight)}
    ${generateFooter()}
    ${generateTooltip()}
    ${generateScript(nodes, edges, strokes, canvasWidth, canvasHeight)}
</body>
</html>`;
};

/**
 * Generate CSS styles
 */
const generateStyles = (theme) => `
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: ${theme === 'dark' ? '#0f172a' : '#f8fafc'};
            color: ${theme === 'dark' ? '#f1f5f9' : '#1e293b'};
            overflow: hidden;
        }

        #header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 60px;
            background: ${theme === 'dark' ? '#1e293b' : '#ffffff'};
            border-bottom: 1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'};
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 24px;
            z-index: 1000;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        #header h1 {
            font-size: 20px;
            font-weight: 600;
            color: ${theme === 'dark' ? '#f1f5f9' : '#1e293b'};
        }

        #controls {
            display: flex;
            gap: 12px;
            align-items: center;
        }

        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            background: ${theme === 'dark' ? '#334155' : '#f1f5f9'};
            color: ${theme === 'dark' ? '#f1f5f9' : '#1e293b'};
        }

        .btn:hover {
            background: ${theme === 'dark' ? '#475569' : '#e2e8f0'};
            transform: translateY(-1px);
        }

        .btn:active {
            transform: translateY(0);
        }

        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .btn-primary:hover {
            background: linear-gradient(135deg, #5568d3 0%, #63408a 100%);
        }

        #canvas-container {
            position: fixed;
            top: 60px;
            left: 0;
            right: 0;
            bottom: 40px;
            overflow: hidden;
            cursor: grab;
        }

        #canvas-container.grabbing {
            cursor: grabbing;
        }

        #canvas {
            position: absolute;
            top: 0;
            left: 0;
            background: ${theme === 'dark' ? '#1e293b' : '#ffffff'};
        }

        #footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 40px;
            background: ${theme === 'dark' ? '#1e293b' : '#ffffff'};
            border-top: 1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'};
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 24px;
            font-size: 12px;
            color: ${theme === 'dark' ? '#94a3b8' : '#64748b'};
        }

        #inspector {
            position: fixed;
            top: 80px;
            right: 20px;
            width: 300px;
            max-height: calc(100vh - 140px);
            background: ${theme === 'dark' ? '#1e293b' : '#ffffff'};
            border: 1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'};
            border-radius: 12px;
            padding: 16px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow-y: auto;
            display: none;
            z-index: 999;
        }

        #inspector.visible {
            display: block;
        }

        #inspector h3 {
            font-size: 16px;
            margin-bottom: 12px;
            color: ${theme === 'dark' ? '#f1f5f9' : '#1e293b'};
        }

        .inspector-item {
            margin-bottom: 8px;
            padding: 8px;
            background: ${theme === 'dark' ? '#334155' : '#f8fafc'};
            border-radius: 6px;
            font-size: 13px;
        }

        .inspector-label {
            font-weight: 600;
            color: ${theme === 'dark' ? '#cbd5e1' : '#475569'};
        }

        .inspector-value {
            color: ${theme === 'dark' ? '#94a3b8' : '#64748b'};
            margin-top: 4px;
        }

        .zoom-indicator {
            font-family: 'Courier New', monospace;
            font-weight: 600;
        }

        .tooltip {
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            pointer-events: none;
            z-index: 10000;
            display: none;
            white-space: nowrap;
        }
    </style>
`;

/**
 * Generate header HTML
 */
const generateHeader = (title) => `
    <div id="header">
        <h1>${escapeHtml(title)}</h1>
        <div id="controls">
            <button class="btn" onclick="resetView()">Reset View</button>
            <button class="btn" onclick="zoomIn()">Zoom In (+)</button>
            <button class="btn" onclick="zoomOut()">Zoom Out (-)</button>
            <button class="btn" onclick="fitToScreen()">Fit to Screen</button>
            <button class="btn btn-primary" onclick="toggleInspector()">Inspector</button>
        </div>
    </div>
`;

/**
 * Generate canvas container
 */
const generateCanvasContainer = () => `
    <div id="canvas-container">
        <canvas id="canvas"></canvas>
    </div>
`;

/**
 * Generate inspector panel
 */
const generateInspector = (nodes, edges, strokes, canvasWidth, canvasHeight) => `
    <div id="inspector">
        <h3>Board Inspector</h3>
        <div class="inspector-item">
            <div class="inspector-label">Total Elements</div>
            <div class="inspector-value">${nodes.length + edges.length + strokes.length}</div>
        </div>
        <div class="inspector-item">
            <div class="inspector-label">Nodes</div>
            <div class="inspector-value">${nodes.length}</div>
        </div>
        <div class="inspector-item">
            <div class="inspector-label">Connections</div>
            <div class="inspector-value">${edges.length}</div>
        </div>
        <div class="inspector-item">
            <div class="inspector-label">Strokes</div>
            <div class="inspector-value">${strokes.length}</div>
        </div>
        <div class="inspector-item">
            <div class="inspector-label">Canvas Size</div>
            <div class="inspector-value">${canvasWidth} × ${canvasHeight}px</div>
        </div>
        <div class="inspector-item">
            <div class="inspector-label">Export Date</div>
            <div class="inspector-value">${new Date().toLocaleString()}</div>
        </div>
    </div>
`;

/**
 * Generate footer
 */
const generateFooter = () => `
    <div id="footer">
        <div>Exported from Flowspace | Interactive Board Viewer</div>
        <div class="zoom-indicator">Zoom: <span id="zoom-level">100%</span></div>
    </div>
`;

/**
 * Generate tooltip element
 */
const generateTooltip = () => `
    <div class="tooltip" id="tooltip"></div>
`;

/**
 * Generate JavaScript for interactivity
 */
const generateScript = (nodes, edges, strokes, canvasWidth, canvasHeight) => {
    // Escape the board data for safe embedding
    const boardDataJSON = JSON.stringify({ nodes, edges, strokes }, null, 2)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e');

    return `
    <script>
        // Board Data
        const boardData = ${boardDataJSON};

        // Canvas Setup
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        const container = document.getElementById('canvas-container');

        // View State
        let viewState = {
            offsetX: 100,
            offsetY: 100,
            scale: 1,
            isDragging: false,
            dragStartX: 0,
            dragStartY: 0
        };

        // Initialize Canvas
        function initCanvas() {
            canvas.width = ${canvasWidth};
            canvas.height = ${canvasHeight};
            render();
        }

        // Render Board
        function render() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();

            // Apply transformations
            ctx.translate(viewState.offsetX, viewState.offsetY);
            ctx.scale(viewState.scale, viewState.scale);

            // Render edges first (background layer)
            renderEdges();

            // Render nodes
            renderNodes();

            // Render strokes
            renderStrokes();

            ctx.restore();
        }

        function renderNodes() {
            boardData.nodes.forEach(node => {
                const x = node.x || 0;
                const y = node.y || 0;
                const width = 200;
                const height = 100;

                // Shadow
                ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 2;

                // Node background
                ctx.fillStyle = node.data?.backgroundColor || '#ffffff';
                ctx.strokeStyle = '#e2e8f0';
                ctx.lineWidth = 2;
                roundRect(ctx, x, y, width, height, 8);
                ctx.fill();
                ctx.stroke();

                ctx.shadowColor = 'transparent';

                // Node text
                ctx.fillStyle = node.data?.textColor || '#1e293b';
                ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                
                const label = node.data?.label || 'Node';
                wrapText(ctx, label, x + 12, y + 12, width - 24, 18);

                // Ports (visual indicators)
                if (node.data?.ports) {
                    ctx.fillStyle = '#94a3b8';
                    // Input ports (left)
                    if (node.data.ports.inputs) {
                        node.data.ports.inputs.forEach((port, i) => {
                            ctx.beginPath();
                            ctx.arc(x, y + 30 + i * 20, 4, 0, Math.PI * 2);
                            ctx.fill();
                        });
                    }
                    // Output ports (right)
                    if (node.data.ports.outputs) {
                        node.data.ports.outputs.forEach((port, i) => {
                            ctx.beginPath();
                            ctx.arc(x + width, y + 30 + i * 20, 4, 0, Math.PI * 2);
                            ctx.fill();
                        });
                    }
                }
            });
        }

        function renderEdges() {
            boardData.edges.forEach(edge => {
                const source = boardData.nodes.find(n => n.id === edge.source);
                const target = boardData.nodes.find(n => n.id === edge.target);

                if (!source || !target) return;

                const x1 = (source.x || 0) + 200;
                const y1 = (source.y || 0) + 50;
                const x2 = target.x || 0;
                const y2 = (target.y || 0) + 50;

                ctx.strokeStyle = edge.color || '#b1b1b7';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                
                // Bezier curve
                const cp1x = x1 + (x2 - x1) / 3;
                const cp1y = y1;
                const cp2x = x2 - (x2 - x1) / 3;
                const cp2y = y2;
                ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
                ctx.stroke();

                // Arrow head
                drawArrowHead(ctx, cp2x, cp2y, x2, y2);
            });
        }

        function renderStrokes() {
            boardData.strokes.forEach(stroke => {
                if (!stroke.points || stroke.points.length < 2) return;

                ctx.strokeStyle = stroke.color || '#000000';
                ctx.lineWidth = stroke.strokeWidth || 2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                ctx.beginPath();
                ctx.moveTo(stroke.points[0], stroke.points[1]);
                
                for (let i = 2; i < stroke.points.length; i += 2) {
                    ctx.lineTo(stroke.points[i], stroke.points[i + 1]);
                }
                
                ctx.stroke();
            });
        }

        // Helper Functions
        function roundRect(ctx, x, y, width, height, radius) {
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
        }

        function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
            const words = text.split(' ');
            let line = '';
            let currentY = y;

            for (let i = 0; i < words.length; i++) {
                const testLine = line + words[i] + ' ';
                const metrics = ctx.measureText(testLine);
                
                if (metrics.width > maxWidth && i > 0) {
                    ctx.fillText(line, x, currentY);
                    line = words[i] + ' ';
                    currentY += lineHeight;
                } else {
                    line = testLine;
                }
            }
            ctx.fillText(line, x, currentY);
        }

        function drawArrowHead(ctx, fromX, fromY, toX, toY) {
            const angle = Math.atan2(toY - fromY, toX - fromX);
            const headLength = 10;

            ctx.beginPath();
            ctx.moveTo(toX, toY);
            ctx.lineTo(
                toX - headLength * Math.cos(angle - Math.PI / 6),
                toY - headLength * Math.sin(angle - Math.PI / 6)
            );
            ctx.moveTo(toX, toY);
            ctx.lineTo(
                toX - headLength * Math.cos(angle + Math.PI / 6),
                toY - headLength * Math.sin(angle + Math.PI / 6)
            );
            ctx.stroke();
        }

        // Interaction Handlers
        container.addEventListener('mousedown', (e) => {
            viewState.isDragging = true;
            viewState.dragStartX = e.clientX - viewState.offsetX;
            viewState.dragStartY = e.clientY - viewState.offsetY;
            container.classList.add('grabbing');
        });

        container.addEventListener('mousemove', (e) => {
            if (viewState.isDragging) {
                viewState.offsetX = e.clientX - viewState.dragStartX;
                viewState.offsetY = e.clientY - viewState.dragStartY;
                render();
            }
        });

        container.addEventListener('mouseup', () => {
            viewState.isDragging = false;
            container.classList.remove('grabbing');
        });

        container.addEventListener('mouseleave', () => {
            viewState.isDragging = false;
            container.classList.remove('grabbing');
        });

        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            viewState.scale = Math.max(0.1, Math.min(5, viewState.scale * delta));
            updateZoomDisplay();
            render();
        });

        // Control Functions
        function resetView() {
            viewState.offsetX = 100;
            viewState.offsetY = 100;
            viewState.scale = 1;
            updateZoomDisplay();
            render();
        }

        function zoomIn() {
            viewState.scale = Math.min(5, viewState.scale * 1.2);
            updateZoomDisplay();
            render();
        }

        function zoomOut() {
            viewState.scale = Math.max(0.1, viewState.scale / 1.2);
            updateZoomDisplay();
            render();
        }

        function fitToScreen() {
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            const scaleX = containerWidth / canvas.width;
            const scaleY = containerHeight / canvas.height;
            viewState.scale = Math.min(scaleX, scaleY) * 0.9;
            viewState.offsetX = (containerWidth - canvas.width * viewState.scale) / 2;
            viewState.offsetY = (containerHeight - canvas.height * viewState.scale) / 2;
            updateZoomDisplay();
            render();
        }

        function toggleInspector() {
            const inspector = document.getElementById('inspector');
            inspector.classList.toggle('visible');
        }

        function updateZoomDisplay() {
            document.getElementById('zoom-level').textContent = 
                Math.round(viewState.scale * 100) + '%';
        }

        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                zoomIn();
            } else if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                zoomOut();
            } else if (e.key === '0') {
                e.preventDefault();
                resetView();
            } else if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                fitToScreen();
            } else if (e.key === 'i' || e.key === 'I') {
                e.preventDefault();
                toggleInspector();
            }
        });

        // Initialize
        initCanvas();
        fitToScreen();
    </script>
`;
};

/**
 * Calculate bounds of all board elements
 */
const calculateBounds = (nodes, strokes) => {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    // Check nodes
    nodes.forEach(node => {
        const x = node.x || 0;
        const y = node.y || 0;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + 200); // Node width
        maxY = Math.max(maxY, y + 100); // Node height
    });

    // Check strokes
    strokes.forEach(stroke => {
        if (stroke.points) {
            for (let i = 0; i < stroke.points.length; i += 2) {
                minX = Math.min(minX, stroke.points[i]);
                maxX = Math.max(maxX, stroke.points[i]);
                minY = Math.min(minY, stroke.points[i + 1]);
                maxY = Math.max(maxY, stroke.points[i + 1]);
            }
        }
    });

    // Default bounds if empty
    if (minX === Infinity) {
        return { minX: 0, minY: 0, maxX: 1200, maxY: 800 };
    }

    return { minX, minY, maxX, maxY };
};

/**
 * Escape HTML special characters
 */
const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};
