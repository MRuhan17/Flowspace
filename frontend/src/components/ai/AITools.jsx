import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../../utils/constants';

export const AITools = () => {
    const [isLoading, setIsLoading] = useState(false);

    // We would access the board store or selection state here to get text to summarize
    // For now, placeholder for the UI panel.

    const handleAIAction = async (action) => {
        setIsLoading(true);
        try {
            // Mock API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log(`AI Action ${action} completed`);
        } catch (e) {
            console.error(e);
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
