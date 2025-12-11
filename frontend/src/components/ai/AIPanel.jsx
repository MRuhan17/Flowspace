import React, { useState } from 'react';
import { useStore } from '../../state/useStore'; // Updated from useBoardStore
import { X, Sparkles, AlertCircle, RefreshCw, Copy, Check } from 'lucide-react';
import clsx from 'clsx';
import { API_BASE_URL } from '../../utils/constants';

export const AIPanel = () => {
    // We reuse the existing modal state or create a sidebar state
    // The previous steps created 'aiModal' in the store? Yes.
    // This panel can double as the "Sidebar" result view or a floating panel.
    // Let's implement it as a sophisticated side panel that slides in.

    const { aiModal, closeAIModal, openAIModal } = useStore();
    const [isCopied, setIsCopied] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // If we want this to handle the *request* too, we can add logic. 
    // But currently, AITools triggers the request. 
    // Let's assume this panel *displays* the result of aiModal.

    // We can also make it smart: if aiModal.type is set but data is null, it loads?
    // Or simpler: Just display data passed in aiModal.data

    if (!aiModal.isOpen) return null;

    const handleCopy = () => {
        if (!aiModal.data) return;

        let textToCopy = "";
        if (typeof aiModal.data === 'string') textToCopy = aiModal.data;
        else if (aiModal.data.summary) textToCopy = aiModal.data.summary;
        else if (aiModal.data.rewritten) textToCopy = aiModal.data.rewritten;
        else if (aiModal.data.content?.text) textToCopy = aiModal.data.content.text;

        navigator.clipboard.writeText(textToCopy);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-[60] border-l border-gray-100 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-white">
                <div className="flex items-center gap-2 text-purple-700 font-bold">
                    <Sparkles size={20} />
                    <span>AI Assistant</span>
                </div>
                <button
                    onClick={closeAIModal}
                    className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-5">
                {error ? (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3">
                        <AlertCircle className="mt-0.5" size={18} />
                        <div className="text-sm">
                            <p className="font-semibold">Something went wrong</p>
                            <p className="mt-1 opacity-90">{error}</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 animate-fadeIn">
                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Result: {aiModal.type}
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">
                            {/* Render content based on structure */}
                            {typeof aiModal.data === 'string' && aiModal.data}
                            {aiModal.data?.summary && aiModal.data.summary}
                            {aiModal.data?.rewritten && aiModal.data.rewritten}
                            {aiModal.data?.content && (
                                <div className="space-y-2">
                                    <div className="bg-yellow-100 p-3 shadow-sm rotate-1 text-gray-800 font-handwriting">
                                        {aiModal.data.content.text}
                                    </div>
                                    <div className="text-xs text-gray-400 text-right">
                                        Confidence: {Math.round((aiModal.data.content.confidence || 0) * 100)}%
                                    </div>
                                </div>
                            )}

                            {!aiModal.data && (
                                <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                                    <RefreshCw className="animate-spin mb-2" />
                                    <span>Processing...</span>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        {aiModal.data && (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCopy}
                                    className={clsx(
                                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                                        isCopied ? "bg-green-100 text-green-700" : "bg-gray-900 text-white hover:bg-black"
                                    )}
                                >
                                    {isCopied ? (
                                        <>
                                            <Check size={16} /> Copied
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={16} /> Copy to Clipboard
                                        </>
                                    )}
                                </button>

                                <button className="p-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors" title="Regenerate (Mock)">
                                    <RefreshCw size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer / Context */}
            <div className="p-4 border-t border-gray-100 text-xs text-center text-gray-400 bg-gray-50/50">
                AI can make mistakes. Review generated content.
            </div>
        </div>
    );
};
