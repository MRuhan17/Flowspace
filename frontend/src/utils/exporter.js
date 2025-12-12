import { jsPDF } from "jspdf";
import { exportBoardAsHTML } from './htmlExporter';

/**
 * Downloads a Blob as a file
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
 * Exports Canvas/Board content to various formats
 * @param {object} stageRef - React ref to Konva Stage
 * @param {object} dataStore - { nodes, edges, strokes } source of truth
 * @param {string} mode - 'png' | 'pdf' | 'svg' | 'html'
 * @param {object} options - { fileName, pixelRatio, backgroundColor, title, theme }
 */
export const exportCanvas = async (stageRef, dataStore, mode = 'png', options = {}) => {
    const stage = stageRef.current;
    if (!stage) return;

    const {
        fileName = 'flowspace-export',
        pixelRatio = 2,
        backgroundColor = '#ffffff'
    } = options;

    // Helper: Composite with Background
    const getCanvasWithBackground = async () => {
        const dataUrl = stage.toDataURL({ pixelRatio });
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');

                // Fill Background
                if (backgroundColor) {
                    ctx.fillStyle = backgroundColor;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                ctx.drawImage(img, 0, 0);
                resolve(canvas);
            };
            img.src = dataUrl;
        });
    };

    try {
        if (mode === 'png') {
            const canvas = await getCanvas();
            canvas.toBlob((blob) => {
                downloadBlob(blob, `${fileName}.png`);
            });
        }
        else if (mode === 'pdf') {
            const canvas = await getCanvas();
            const imgData = canvas.toDataURL('image/png');

            // Calculate PDF dimensions (A4 or fit to content)
            const pdf = new jsPDF({
                orientation: canvas.width > canvas.height ? 'l' : 'p',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(`${fileName}.pdf`);
        }
        else if (mode === 'svg') {
            const svgContent = generateSVG(dataStore, stage.width(), stage.height(), backgroundColor);
            const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
            downloadBlob(blob, `${fileName}.svg`);
        }
        else if (mode === 'html') {
            // Export as interactive HTML
            exportBoardAsHTML(dataStore, {
                fileName,
                title: options.title || 'Flowspace Board Export',
                theme: options.theme || 'light'
            });
        }
    } catch (error) {
        console.error("Export failed:", error);
        alert("Export failed. Please check console.");
    }
};

/**
 * Generates SVG markup from store data
 */
const generateSVG = ({ nodes, edges, strokes }, width, height, bgColor) => {
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;

    // Background
    if (bgColor) {
        svg += `<rect width="100%" height="100%" fill="${bgColor}" />`;
    }

    // Connectors (Edges) - Bottom Layer usually
    edges.forEach(edge => {
        // Simplified Line logic (Start to End). 
        // Real Bezier requires calculating positions.
        // Since we don't have the visual layout engine here, we iterate nodes to find positions!
        const source = nodes.find(n => n.id === edge.source);
        const target = nodes.find(n => n.id === edge.target);
        if (source && target) {
            // Rough center points (or use handles if stored)
            const x1 = source.x + 100; // Assume right handle roughly
            const y1 = source.y + 50;
            const x2 = target.x;
            const y2 = target.y + 50;

            // Simple Bezier
            const path = `M ${x1} ${y1} C ${x1 + 50} ${y1}, ${x2 - 50} ${y2}, ${x2} ${y2}`;
            svg += `<path d="${path}" stroke="#b1b1b7" stroke-width="2" fill="none" />`;
        }
    });

    // Nodes
    nodes.forEach(node => {
        svg += `
        <g transform="translate(${node.x}, ${node.y})">
            <rect width="200" height="100" rx="8" fill="white" stroke="#e2e8f0" stroke-width="2" />
            <foreignObject width="180" height="80" x="10" y="10">
                <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: sans-serif; font-size: 14px; color: #333;">
                    ${node.data?.label || 'Node'}
                </div>
            </foreignObject>
        </g>`;
    });

    // Strokes (Freehand)
    strokes.forEach(stroke => {
        if (!stroke.points || stroke.points.length < 2) return;
        let d = `M ${stroke.points[0]} ${stroke.points[1]}`;
        for (let i = 2; i < stroke.points.length; i += 2) {
            d += ` L ${stroke.points[i]} ${stroke.points[i + 1]}`;
        }
        svg += `<path d="${d}" stroke="${stroke.color}" stroke-width="${stroke.strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round" />`;
    });

    svg += `</svg>`;
    return svg;
};
