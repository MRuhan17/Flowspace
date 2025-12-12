import React, { useState, useEffect } from 'react';
import { useStore } from '../../state/useStore';
import { aiService } from '../../api/aiService';
import {
    Palette, Sparkles, Loader2, X, Check,
    Wand2, RefreshCw, Download, ChevronRight
} from 'lucide-react';
import clsx from 'clsx';

export const ThemeGenerator = ({ isOpen, onClose }) => {
    const { strokes, nodes, edges, setStrokes, setNodes, setEdges } = useStore();
    const [isGenerating, setIsGenerating] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [context, setContext] = useState('');
    const [themeData, setThemeData] = useState(null);
    const [selectedPalette, setSelectedPalette] = useState(null);
    const [applyMode, setApplyMode] = useState('all');

    // Auto-generate on open if board has content
    useEffect(() => {
        if (isOpen && !themeData && (strokes.length > 0 || nodes.length > 0)) {
            handleGenerate();
        }
    }, [isOpen]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setThemeData(null);
        setSelectedPalette(null);

        try {
            const boardContent = {
                strokes: strokes.slice(0, 50), // Limit for performance
                nodes: nodes.slice(0, 20),
                edges: edges.slice(0, 20)
            };

            const response = await aiService.generateTheme(boardContent, context);

            if (response.success && response.data) {
                setThemeData(response.data);
                // Auto-select first palette
                if (response.data.palettes && response.data.palettes.length > 0) {
                    setSelectedPalette(response.data.palettes[0]);
                }
            }
        } catch (error) {
            console.error('Theme generation failed:', error);
            // Show error state or fallback
        } finally {
            setIsGenerating(false);
        }
    };

    const handleApplyTheme = async () => {
        if (!selectedPalette) return;

        setIsApplying(true);

        try {
            const boardContent = { strokes, nodes, edges };
            const response = await aiService.applyTheme(boardContent, selectedPalette, applyMode);

            if (response.success && response.data) {
                // Update store with themed content
                if (response.data.strokes) setStrokes(response.data.strokes);
                if (response.data.nodes) setNodes(response.data.nodes);
                if (response.data.edges) setEdges(response.data.edges);

                // Show success feedback
                setTimeout(() => {
                    onClose();
                }, 500);
            }
        } catch (error) {
            console.error('Theme application failed:', error);
        } finally {
            setIsApplying(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-slideUp">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 p-6 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>

                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                                <Palette size={24} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">AI Theme Generator</h2>
                                <p className="text-white/80 text-sm mt-0.5">
                                    Generate beautiful color palettes powered by AI
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Context Input */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Theme Context (Optional)
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={context}
                                onChange={(e) => setContext(e.target.value)}
                                placeholder="e.g., 'Modern tech startup', 'Nature-inspired', 'Professional presentation'..."
                                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                            />
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className={clsx(
                                    "px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all",
                                    isGenerating
                                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                        : "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl active:scale-95"
                                )}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 size={18} />
                                        Generate
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Loading State */}
                    {isGenerating && (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="relative">
                                <div className="w-20 h-20 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-purple-600" size={32} />
                            </div>
                            <p className="mt-6 text-gray-600 font-medium">Analyzing your board and generating themes...</p>
                        </div>
                    )}

                    {/* Theme Results */}
                    {!isGenerating && themeData && (
                        <div className="space-y-6">
                            {/* AI Analysis */}
                            {themeData.boardAnalysis && (
                                <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 rounded-xl p-4">
                                    <div className="flex items-start gap-3">
                                        <Sparkles className="text-purple-600 mt-0.5 flex-shrink-0" size={20} />
                                        <div>
                                            <h3 className="font-semibold text-gray-900 mb-1">AI Analysis</h3>
                                            <p className="text-sm text-gray-700">{themeData.boardAnalysis}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Recommendation */}
                            {themeData.recommendation && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                    <div className="flex items-start gap-3">
                                        <ChevronRight className="text-amber-600 mt-0.5 flex-shrink-0" size={20} />
                                        <div>
                                            <h3 className="font-semibold text-gray-900 mb-1">Recommendation</h3>
                                            <p className="text-sm text-gray-700">{themeData.recommendation}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Palettes Grid */}
                            <div>
                                <h3 className="font-bold text-gray-900 mb-4 text-lg">Generated Palettes</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {themeData.palettes?.map((palette, index) => (
                                        <PaletteCard
                                            key={index}
                                            palette={palette}
                                            isSelected={selectedPalette === palette}
                                            onClick={() => setSelectedPalette(palette)}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!isGenerating && !themeData && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="p-6 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full mb-4">
                                <Palette size={48} className="text-purple-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to Generate Themes</h3>
                            <p className="text-gray-600 max-w-md">
                                Click "Generate" to create AI-powered color palettes based on your board content.
                                Add context for more personalized results!
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {selectedPalette && (
                    <div className="border-t border-gray-200 p-6 bg-gray-50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <label className="text-sm font-semibold text-gray-700">Apply to:</label>
                                <div className="flex gap-2">
                                    {['all', 'selected', 'new'].map((mode) => (
                                        <button
                                            key={mode}
                                            onClick={() => setApplyMode(mode)}
                                            className={clsx(
                                                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                                applyMode === mode
                                                    ? "bg-purple-600 text-white shadow-md"
                                                    : "bg-white text-gray-700 border border-gray-200 hover:border-purple-300"
                                            )}
                                        >
                                            {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleApplyTheme}
                                disabled={isApplying}
                                className={clsx(
                                    "px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all",
                                    isApplying
                                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                        : "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl active:scale-95"
                                )}
                            >
                                {isApplying ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        Applying...
                                    </>
                                ) : (
                                    <>
                                        <Check size={20} />
                                        Apply Theme
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Palette Card Component
const PaletteCard = ({ palette, isSelected, onClick }) => {
    const colors = palette.colors;
    const colorArray = Object.values(colors);

    return (
        <div
            onClick={onClick}
            className={clsx(
                "border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg",
                isSelected
                    ? "border-purple-600 shadow-lg ring-4 ring-purple-100"
                    : "border-gray-200 hover:border-purple-300"
            )}
        >
            {/* Color Swatches */}
            <div className="flex gap-2 mb-4">
                {colorArray.map((color, idx) => (
                    <div
                        key={idx}
                        className="flex-1 h-16 rounded-lg shadow-sm transition-transform hover:scale-105"
                        style={{ backgroundColor: color }}
                        title={Object.keys(colors)[idx]}
                    />
                ))}
            </div>

            {/* Palette Info */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h4 className="font-bold text-gray-900">{palette.name}</h4>
                    {isSelected && (
                        <div className="p-1 bg-purple-600 rounded-full">
                            <Check size={14} className="text-white" strokeWidth={3} />
                        </div>
                    )}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{palette.description}</p>

                {/* Tags */}
                {palette.tags && palette.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                        {palette.tags.map((tag, idx) => (
                            <span
                                key={idx}
                                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-md"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
