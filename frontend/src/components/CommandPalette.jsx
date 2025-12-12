import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Command } from 'lucide-react';
import './CommandPalette.css';

/**
 * Command Palette - Natural Language Command Interface
 * 
 * Allows users to execute board actions using natural language commands.
 * Features autocomplete, shortcuts, and AI-powered command translation.
 */
const CommandPalette = ({
    isOpen,
    onClose,
    onExecuteCommand,
    boardState,
    selectedNodes = []
}) => {
    const [input, setInput] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [recentCommands, setRecentCommands] = useState([]);
    const inputRef = useRef(null);

    // Command templates for autocomplete
    const commandTemplates = [
        // Alignment
        { pattern: 'align', examples: ['align everything', 'align selected left', 'align nodes top'] },
        { pattern: 'distribute', examples: ['distribute horizontally', 'distribute vertically', 'distribute evenly'] },

        // Grouping
        { pattern: 'group', examples: ['group backend items', 'group selected', 'group by type'] },
        { pattern: 'ungroup', examples: ['ungroup all', 'ungroup selected'] },

        // Styling
        { pattern: 'make', examples: ['make sticky notes blue', 'make selected red', 'make larger'] },
        { pattern: 'color', examples: ['color by category', 'color backend green', 'color selected'] },

        // Generation
        { pattern: 'generate', examples: ['generate flowchart', 'generate timeline', 'generate mindmap'] },
        { pattern: 'create', examples: ['create sticky note', 'create connection', 'create group'] },

        // Analysis
        { pattern: 'explain', examples: ['explain this diagram', 'explain flow', 'explain connections'] },
        { pattern: 'analyze', examples: ['analyze board', 'analyze structure', 'analyze issues'] },

        // Layout
        { pattern: 'layout', examples: ['layout as grid', 'layout as tree', 'layout automatically'] },
        { pattern: 'organize', examples: ['organize by type', 'organize alphabetically', 'organize by date'] },

        // Selection
        { pattern: 'select', examples: ['select all', 'select backend', 'select sticky notes'] },
        { pattern: 'find', examples: ['find error', 'find duplicates', 'find orphaned'] },

        // Deletion
        { pattern: 'delete', examples: ['delete selected', 'delete all', 'delete duplicates'] },
        { pattern: 'clear', examples: ['clear board', 'clear selection'] },

        // Export
        { pattern: 'export', examples: ['export as PDF', 'export as image', 'export as JSON'] },
        { pattern: 'save', examples: ['save snapshot', 'save as template'] }
    ];

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Load recent commands from localStorage
    useEffect(() => {
        const stored = localStorage.getItem('recentCommands');
        if (stored) {
            setRecentCommands(JSON.parse(stored));
        }
    }, []);

    // Update suggestions based on input
    useEffect(() => {
        if (!input.trim()) {
            setSuggestions(recentCommands.slice(0, 5));
            return;
        }

        const inputLower = input.toLowerCase();
        const matches = [];

        // Match command templates
        commandTemplates.forEach(template => {
            if (template.pattern.includes(inputLower) || inputLower.includes(template.pattern)) {
                template.examples.forEach(example => {
                    if (example.toLowerCase().includes(inputLower)) {
                        matches.push({
                            text: example,
                            type: 'template',
                            score: calculateMatchScore(inputLower, example)
                        });
                    }
                });
            }
        });

        // Match recent commands
        recentCommands.forEach(cmd => {
            if (cmd.toLowerCase().includes(inputLower)) {
                matches.push({
                    text: cmd,
                    type: 'recent',
                    score: calculateMatchScore(inputLower, cmd) + 10 // Boost recent
                });
            }
        });

        // Sort by score and deduplicate
        const unique = [...new Set(matches.map(m => m.text))];
        const sorted = unique
            .map(text => matches.find(m => m.text === text))
            .sort((a, b) => b.score - a.score)
            .slice(0, 8);

        setSuggestions(sorted);
        setSelectedIndex(0);
    }, [input, recentCommands]);

    // Calculate match score
    const calculateMatchScore = (input, text) => {
        const textLower = text.toLowerCase();
        let score = 0;

        if (textLower === input) score += 100;
        else if (textLower.startsWith(input)) score += 50;
        else if (textLower.includes(input)) score += 25;

        // Bonus for word boundaries
        const words = input.split(' ');
        words.forEach(word => {
            if (textLower.includes(word)) score += 10;
        });

        return score;
    };

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e) => {
        if (!isOpen) return;

        switch (e.key) {
            case 'Escape':
                onClose();
                break;

            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < suggestions.length - 1 ? prev + 1 : prev
                );
                break;

            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
                break;

            case 'Tab':
                e.preventDefault();
                if (suggestions[selectedIndex]) {
                    setInput(suggestions[selectedIndex].text);
                }
                break;

            case 'Enter':
                e.preventDefault();
                if (suggestions[selectedIndex]) {
                    executeCommand(suggestions[selectedIndex].text);
                } else if (input.trim()) {
                    executeCommand(input);
                }
                break;
        }
    }, [isOpen, suggestions, selectedIndex, input]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Execute command
    const executeCommand = async (commandText) => {
        setIsProcessing(true);

        try {
            // Translate natural language to action
            const action = await translateCommand(commandText);

            if (action) {
                // Execute the action
                await onExecuteCommand(action);

                // Save to recent commands
                const updated = [commandText, ...recentCommands.filter(c => c !== commandText)].slice(0, 20);
                setRecentCommands(updated);
                localStorage.setItem('recentCommands', JSON.stringify(updated));

                // Close palette
                setInput('');
                onClose();
            }
        } catch (error) {
            console.error('Command execution error:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    // Translate natural language command to JSON action
    const translateCommand = async (commandText) => {
        const cmd = commandText.toLowerCase().trim();

        // Pattern matching for common commands
        const patterns = [
            // Alignment
            {
                regex: /align\s+(everything|all|selected)?\s*(left|right|top|bottom|center)/i,
                handler: (match) => ({
                    type: 'align',
                    targets: match[1] === 'everything' || match[1] === 'all' ? 'all' : 'selected',
                    direction: match[2]
                })
            },
            {
                regex: /distribute\s+(horizontally|vertically|evenly)/i,
                handler: (match) => ({
                    type: 'distribute',
                    direction: match[1]
                })
            },

            // Grouping
            {
                regex: /group\s+(.+)/i,
                handler: (match) => ({
                    type: 'group',
                    filter: match[1] === 'selected' ? 'selected' : match[1]
                })
            },
            {
                regex: /ungroup\s+(all|selected)/i,
                handler: (match) => ({
                    type: 'ungroup',
                    targets: match[1]
                })
            },

            // Styling
            {
                regex: /make\s+(.+?)\s+(blue|red|green|yellow|purple|orange|pink|gray)/i,
                handler: (match) => ({
                    type: 'style',
                    targets: match[1],
                    property: 'color',
                    value: match[2]
                })
            },
            {
                regex: /make\s+(.+?)\s+(larger|smaller|bigger)/i,
                handler: (match) => ({
                    type: 'style',
                    targets: match[1],
                    property: 'size',
                    value: match[2]
                })
            },
            {
                regex: /color\s+(.+?)\s+(blue|red|green|yellow|purple|orange|pink|gray)/i,
                handler: (match) => ({
                    type: 'style',
                    targets: match[1],
                    property: 'color',
                    value: match[2]
                })
            },

            // Generation
            {
                regex: /generate\s+(flowchart|timeline|mindmap|table)/i,
                handler: (match) => ({
                    type: 'generate',
                    format: match[1]
                })
            },
            {
                regex: /create\s+(sticky note|note|connection|group)/i,
                handler: (match) => ({
                    type: 'create',
                    objectType: match[1].replace(' ', '_')
                })
            },

            // Analysis
            {
                regex: /explain\s+(this|diagram|flow|connections?)/i,
                handler: () => ({
                    type: 'analyze',
                    action: 'explain'
                })
            },
            {
                regex: /analyze\s+(board|structure|issues?)/i,
                handler: (match) => ({
                    type: 'analyze',
                    action: match[1]
                })
            },

            // Layout
            {
                regex: /layout\s+as\s+(grid|tree|circle|force)/i,
                handler: (match) => ({
                    type: 'layout',
                    algorithm: match[1]
                })
            },
            {
                regex: /organize\s+by\s+(type|name|date|category)/i,
                handler: (match) => ({
                    type: 'organize',
                    criteria: match[1]
                })
            },

            // Selection
            {
                regex: /select\s+(all|none|(.+))/i,
                handler: (match) => ({
                    type: 'select',
                    filter: match[1] === 'all' ? 'all' : match[1] === 'none' ? 'none' : match[2]
                })
            },
            {
                regex: /find\s+(.+)/i,
                handler: (match) => ({
                    type: 'find',
                    query: match[1]
                })
            },

            // Deletion
            {
                regex: /delete\s+(selected|all|duplicates)/i,
                handler: (match) => ({
                    type: 'delete',
                    targets: match[1]
                })
            },
            {
                regex: /clear\s+(board|selection)/i,
                handler: (match) => ({
                    type: 'clear',
                    target: match[1]
                })
            },

            // Export
            {
                regex: /export\s+as\s+(pdf|image|json|png|svg)/i,
                handler: (match) => ({
                    type: 'export',
                    format: match[1]
                })
            }
        ];

        // Try pattern matching first
        for (const pattern of patterns) {
            const match = cmd.match(pattern.regex);
            if (match) {
                return pattern.handler(match);
            }
        }

        // Fallback to AI translation for complex commands
        if (process.env.REACT_APP_OPENAI_API_KEY) {
            return await translateWithAI(commandText);
        }

        // No match found
        throw new Error('Command not recognized. Try a different phrasing.');
    };

    // Translate with AI (fallback for complex commands)
    const translateWithAI = async (commandText) => {
        // This would call your backend AI service
        // For now, return a generic action
        return {
            type: 'custom',
            command: commandText,
            requiresAI: true
        };
    };

    if (!isOpen) return null;

    return (
        <div className="command-palette-overlay" onClick={onClose}>
            <div className="command-palette" onClick={(e) => e.stopPropagation()}>
                <div className="command-palette-header">
                    <Command size={20} />
                    <input
                        ref={inputRef}
                        type="text"
                        className="command-palette-input"
                        placeholder="Type a command... (e.g., 'align everything left', 'make sticky notes blue')"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isProcessing}
                    />
                    <kbd className="command-palette-shortcut">Esc</kbd>
                </div>

                {suggestions.length > 0 && (
                    <div className="command-palette-suggestions">
                        {suggestions.map((suggestion, index) => (
                            <div
                                key={index}
                                className={`command-suggestion ${index === selectedIndex ? 'selected' : ''}`}
                                onClick={() => executeCommand(suggestion.text)}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                <span className="suggestion-text">{suggestion.text}</span>
                                {suggestion.type === 'recent' && (
                                    <span className="suggestion-badge">Recent</span>
                                )}
                                <kbd className="suggestion-shortcut">↵</kbd>
                            </div>
                        ))}
                    </div>
                )}

                <div className="command-palette-footer">
                    <div className="command-hints">
                        <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
                        <span><kbd>Tab</kbd> Autocomplete</span>
                        <span><kbd>Enter</kbd> Execute</span>
                    </div>
                    {isProcessing && (
                        <div className="command-processing">
                            <div className="spinner"></div>
                            <span>Processing...</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
