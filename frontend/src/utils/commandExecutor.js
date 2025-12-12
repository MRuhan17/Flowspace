/**
 * Command Executor - Translates command actions to canvas operations
 * 
 * Takes JSON actions from the command palette and executes them on the canvas.
 */

export class CommandExecutor {
    constructor(canvasEngine, boardState) {
        this.canvas = canvasEngine;
        this.board = boardState;
    }

    /**
     * Execute a command action
     */
    async execute(action) {
        console.log('Executing command:', action);

        switch (action.type) {
            case 'align':
                return this.executeAlign(action);

            case 'distribute':
                return this.executeDistribute(action);

            case 'group':
                return this.executeGroup(action);

            case 'ungroup':
                return this.executeUngroup(action);

            case 'style':
                return this.executeStyle(action);

            case 'generate':
                return this.executeGenerate(action);

            case 'create':
                return this.executeCreate(action);

            case 'analyze':
                return this.executeAnalyze(action);

            case 'layout':
                return this.executeLayout(action);

            case 'organize':
                return this.executeOrganize(action);

            case 'select':
                return this.executeSelect(action);

            case 'find':
                return this.executeFind(action);

            case 'delete':
                return this.executeDelete(action);

            case 'clear':
                return this.executeClear(action);

            case 'export':
                return this.executeExport(action);

            default:
                throw new Error(`Unknown action type: ${action.type}`);
        }
    }

    /**
     * Execute alignment
     */
    executeAlign(action) {
        const nodes = this.getTargetNodes(action.targets);
        if (nodes.length === 0) return;

        const bounds = this.calculateBounds(nodes);

        nodes.forEach(node => {
            switch (action.direction) {
                case 'left':
                    node.x = bounds.minX;
                    break;
                case 'right':
                    node.x = bounds.maxX - (node.width || 100);
                    break;
                case 'top':
                    node.y = bounds.minY;
                    break;
                case 'bottom':
                    node.y = bounds.maxY - (node.height || 100);
                    break;
                case 'center':
                    node.x = bounds.centerX - (node.width || 100) / 2;
                    break;
            }
        });

        this.canvas.updateNodes(nodes);
        return { success: true, message: `Aligned ${nodes.length} nodes ${action.direction}` };
    }

    /**
     * Execute distribution
     */
    executeDistribute(action) {
        const nodes = this.getTargetNodes('selected');
        if (nodes.length < 3) {
            throw new Error('Need at least 3 nodes to distribute');
        }

        const sorted = action.direction === 'horizontally'
            ? [...nodes].sort((a, b) => a.x - b.x)
            : [...nodes].sort((a, b) => a.y - b.y);

        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const totalSpace = action.direction === 'horizontally'
            ? last.x - first.x
            : last.y - first.y;
        const spacing = totalSpace / (sorted.length - 1);

        sorted.forEach((node, index) => {
            if (index === 0 || index === sorted.length - 1) return;

            if (action.direction === 'horizontally') {
                node.x = first.x + spacing * index;
            } else {
                node.y = first.y + spacing * index;
            }
        });

        this.canvas.updateNodes(sorted);
        return { success: true, message: `Distributed ${nodes.length} nodes ${action.direction}` };
    }

    /**
     * Execute grouping
     */
    executeGroup(action) {
        const nodes = this.getTargetNodes(action.filter);
        if (nodes.length === 0) return;

        const groupId = `group-${Date.now()}`;
        this.canvas.createGroup(groupId, nodes.map(n => n.id));

        return { success: true, message: `Grouped ${nodes.length} nodes` };
    }

    /**
     * Execute ungrouping
     */
    executeUngroup(action) {
        if (action.targets === 'all') {
            this.canvas.ungroupAll();
            return { success: true, message: 'Ungrouped all nodes' };
        } else {
            const groups = this.canvas.getSelectedGroups();
            groups.forEach(group => this.canvas.ungroup(group.id));
            return { success: true, message: `Ungrouped ${groups.length} groups` };
        }
    }

    /**
     * Execute styling
     */
    executeStyle(action) {
        const nodes = this.getTargetNodes(action.targets);
        if (nodes.length === 0) return;

        nodes.forEach(node => {
            if (action.property === 'color') {
                node.data = node.data || {};
                node.data.backgroundColor = this.getColorValue(action.value);
            } else if (action.property === 'size') {
                const scale = action.value === 'larger' || action.value === 'bigger' ? 1.2 : 0.8;
                node.width = (node.width || 100) * scale;
                node.height = (node.height || 100) * scale;
            }
        });

        this.canvas.updateNodes(nodes);
        return { success: true, message: `Styled ${nodes.length} nodes` };
    }

    /**
     * Execute generation
     */
    async executeGenerate(action) {
        // Call backend transformer API
        const response = await fetch('/api/ai/transform', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                boardJSON: this.board.toJSON(),
                mode: action.format
            })
        });

        const result = await response.json();

        if (result.success) {
            this.canvas.loadTransformedBoard(result.data.transformed);
            return { success: true, message: `Generated ${action.format}` };
        } else {
            throw new Error('Generation failed');
        }
    }

    /**
     * Execute creation
     */
    executeCreate(action) {
        const position = this.canvas.getViewportCenter();

        switch (action.objectType) {
            case 'sticky_note':
                this.canvas.createNode({
                    type: 'sticky',
                    x: position.x,
                    y: position.y,
                    data: { label: 'New Note' }
                });
                break;

            case 'connection':
                // Requires two selected nodes
                const selected = this.canvas.getSelectedNodes();
                if (selected.length === 2) {
                    this.canvas.createEdge(selected[0].id, selected[1].id);
                } else {
                    throw new Error('Select exactly 2 nodes to create a connection');
                }
                break;

            case 'group':
                return this.executeGroup({ filter: 'selected' });
        }

        return { success: true, message: `Created ${action.objectType}` };
    }

    /**
     * Execute analysis
     */
    async executeAnalyze(action) {
        // Call backend analysis API
        const endpoint = action.action === 'explain' ? '/api/ai/story/elevator-pitch' : '/api/ai/interpret';

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                boardData: this.board.toJSON()
            })
        });

        const result = await response.json();

        if (result.success) {
            // Show result in a modal or panel
            this.canvas.showAnalysisResult(result.data);
            return { success: true, message: 'Analysis complete' };
        } else {
            throw new Error('Analysis failed');
        }
    }

    /**
     * Execute layout
     */
    executeLayout(action) {
        const nodes = this.canvas.getAllNodes();

        switch (action.algorithm) {
            case 'grid':
                this.layoutGrid(nodes);
                break;
            case 'tree':
                this.layoutTree(nodes);
                break;
            case 'circle':
                this.layoutCircle(nodes);
                break;
            case 'force':
                this.layoutForce(nodes);
                break;
        }

        this.canvas.updateNodes(nodes);
        return { success: true, message: `Applied ${action.algorithm} layout` };
    }

    /**
     * Execute organization
     */
    executeOrganize(action) {
        const nodes = this.canvas.getAllNodes();

        // Sort nodes based on criteria
        const sorted = [...nodes].sort((a, b) => {
            switch (action.criteria) {
                case 'type':
                    return (a.type || '').localeCompare(b.type || '');
                case 'name':
                    return (a.data?.label || '').localeCompare(b.data?.label || '');
                case 'date':
                    return (a.createdAt || 0) - (b.createdAt || 0);
                default:
                    return 0;
            }
        });

        // Apply grid layout to sorted nodes
        this.layoutGrid(sorted);
        this.canvas.updateNodes(sorted);

        return { success: true, message: `Organized by ${action.criteria}` };
    }

    /**
     * Execute selection
     */
    executeSelect(action) {
        if (action.filter === 'all') {
            this.canvas.selectAll();
            return { success: true, message: 'Selected all nodes' };
        } else if (action.filter === 'none') {
            this.canvas.clearSelection();
            return { success: true, message: 'Cleared selection' };
        } else {
            const nodes = this.getTargetNodes(action.filter);
            this.canvas.select(nodes.map(n => n.id));
            return { success: true, message: `Selected ${nodes.length} nodes` };
        }
    }

    /**
     * Execute find
     */
    executeFind(action) {
        const nodes = this.canvas.getAllNodes();
        const query = action.query.toLowerCase();

        const matches = nodes.filter(node =>
            (node.data?.label || '').toLowerCase().includes(query) ||
            (node.type || '').toLowerCase().includes(query)
        );

        if (matches.length > 0) {
            this.canvas.select(matches.map(n => n.id));
            this.canvas.focusOnNodes(matches);
            return { success: true, message: `Found ${matches.length} matches` };
        } else {
            throw new Error('No matches found');
        }
    }

    /**
     * Execute deletion
     */
    executeDelete(action) {
        if (action.targets === 'all') {
            if (!confirm('Delete all nodes? This cannot be undone.')) {
                throw new Error('Cancelled');
            }
            this.canvas.deleteAll();
            return { success: true, message: 'Deleted all nodes' };
        } else if (action.targets === 'selected') {
            const selected = this.canvas.getSelectedNodes();
            this.canvas.deleteNodes(selected.map(n => n.id));
            return { success: true, message: `Deleted ${selected.length} nodes` };
        } else if (action.targets === 'duplicates') {
            const duplicates = this.findDuplicates();
            this.canvas.deleteNodes(duplicates.map(n => n.id));
            return { success: true, message: `Deleted ${duplicates.length} duplicates` };
        }
    }

    /**
     * Execute clear
     */
    executeClear(action) {
        if (action.target === 'board') {
            if (!confirm('Clear entire board? This cannot be undone.')) {
                throw new Error('Cancelled');
            }
            this.canvas.clear();
            return { success: true, message: 'Board cleared' };
        } else if (action.target === 'selection') {
            this.canvas.clearSelection();
            return { success: true, message: 'Selection cleared' };
        }
    }

    /**
     * Execute export
     */
    async executeExport(action) {
        await this.canvas.export(action.format);
        return { success: true, message: `Exported as ${action.format}` };
    }

    // Helper methods

    getTargetNodes(filter) {
        if (filter === 'all' || filter === 'everything') {
            return this.canvas.getAllNodes();
        } else if (filter === 'selected') {
            return this.canvas.getSelectedNodes();
        } else {
            // Filter by type or label
            return this.canvas.getAllNodes().filter(node =>
                (node.type || '').toLowerCase().includes(filter.toLowerCase()) ||
                (node.data?.label || '').toLowerCase().includes(filter.toLowerCase())
            );
        }
    }

    calculateBounds(nodes) {
        const xs = nodes.map(n => n.x);
        const ys = nodes.map(n => n.y);

        return {
            minX: Math.min(...xs),
            maxX: Math.max(...xs),
            minY: Math.min(...ys),
            maxY: Math.max(...ys),
            centerX: (Math.min(...xs) + Math.max(...xs)) / 2,
            centerY: (Math.min(...ys) + Math.max(...ys)) / 2
        };
    }

    getColorValue(colorName) {
        const colors = {
            blue: '#3b82f6',
            red: '#ef4444',
            green: '#10b981',
            yellow: '#f59e0b',
            purple: '#8b5cf6',
            orange: '#f97316',
            pink: '#ec4899',
            gray: '#6b7280'
        };
        return colors[colorName] || colorName;
    }

    layoutGrid(nodes) {
        const cols = Math.ceil(Math.sqrt(nodes.length));
        const spacing = 150;

        nodes.forEach((node, index) => {
            node.x = (index % cols) * spacing;
            node.y = Math.floor(index / cols) * spacing;
        });
    }

    layoutTree(nodes) {
        // Simple tree layout (would need proper tree algorithm)
        const levels = new Map();
        // ... tree layout logic
    }

    layoutCircle(nodes) {
        const radius = 300;
        const angleStep = (2 * Math.PI) / nodes.length;

        nodes.forEach((node, index) => {
            const angle = index * angleStep;
            node.x = Math.cos(angle) * radius;
            node.y = Math.sin(angle) * radius;
        });
    }

    layoutForce(nodes) {
        // Would use force-directed algorithm
        // For now, just spread them out
        this.layoutGrid(nodes);
    }

    findDuplicates() {
        const nodes = this.canvas.getAllNodes();
        const seen = new Map();
        const duplicates = [];

        nodes.forEach(node => {
            const key = node.data?.label || '';
            if (seen.has(key)) {
                duplicates.push(node);
            } else {
                seen.set(key, node);
            }
        });

        return duplicates;
    }
}

export default CommandExecutor;
