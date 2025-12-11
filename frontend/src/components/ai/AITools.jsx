import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../../utils/constants';
import { useStore } from '../../state/useStore';
import { aiService } from '../../api/aiService';

export const AITools = () => {
    const [isLoading, setIsLoading] = useState(false);
    const { openAIModal, strokes } = useStore();

    // Helper to extract text from strokes (naive implementation)
    // In a real app, we'd look for "text" tool strokes or metadata.
    // For now, we'll send a JSON dump of strokes and let backend heuristic handle it, 
    // OR just send a test string if empty.
    const getBoardContext = () => {
        if (strokes.length === 0) return "No content on board.";
        // Simplification: We assume backend can parse stroke array or we extract text fields
        return JSON.stringify(strokes);
    };

    const handleAIAction = async (action) => {
        setIsLoading(true);
        // clear previous? openAIModal(action, null);

        try {
            let result;
            const context = getBoardContext();

            if (action === 'summarize') {
                result = await aiService.summarize({ text: context });
            } else if (action === 'sticky-note') {
                // For demo: Generate suggestion based on context
                // Or prompt user? We'll just generate based on board context.
                result = await aiService.generateStickyNote({ text: "Generate a sticky note for: " + context.substring(0, 100) });
            }

            openAIModal(action, result);
        } catch (e) {
            console.error(e);
            openAIModal(action, { error: "Failed to generate response." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed top-4 right-4 bg-white shadow-lg rounded-xl p-3 z-50 border border-gray-200 w-64">
            <div className="flex items-center gap-2 mb-3 text-purple-600 font-semibold border-b pb-2">
                <Sparkles size={18} />
                <span>AI Assistant</span>
            </div>

            <div className="space-y-2">
                <button
                    disabled={isLoading}
                    onClick={() => handleAIAction('summarize')}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-purple-50 flex items-center justify-between group transition-colors"
                >
                    <span>Summarize Board</span>
                    {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <div className="hidden group-hover:block text-xs text-purple-600">Cmd+Enter</div>}
                </button>

                <button
                    disabled={isLoading}
                    onClick={() => handleAIAction('sticky-note')}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-purple-50 group transition-colors"
                >
                    Generate Sticky Note
                </button>
            </div>
        </div>
    );
};
