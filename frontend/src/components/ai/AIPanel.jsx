import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../state/useStore';
import { X, Sparkles, RefreshCw, Copy, Check, FileText, PenTool, StickyNote } from 'lucide-react';
import clsx from 'clsx';
import { theme } from '../../utils/theme';
import { Panel } from '../design/Panel';
import { Button } from '../design/Button';
import { IconButton } from '../design/IconButton';

export const AIPanel = () => {
    const { aiModal, closeAIModal, openAIModal } = useStore();
    const [isCopied, setIsCopied] = useState(false);
    const [activeTab, setActiveTab] = useState(aiModal.type || 'summarize');

    // Sync internal tab with external store updates
    useEffect(() => {
        if (aiModal.type) {
            setActiveTab(aiModal.type);
        }
    }, [aiModal.type]);

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

    const tabs = [
        { id: 'summarize', label: 'Summary', icon: FileText },
        { id: 'rewrite', label: 'Rewrite', icon: PenTool },
        { id: 'stickynote', label: 'Sticky', icon: StickyNote },
    ];

    const handleTabChange = (id) => {
        setActiveTab(id);
        // In a real app, this might trigger a new context or clearer state
        // For now, we just switch the view, but if data doesn't match, we might show empty
        if (aiModal.type !== id) {
            // If switching tabs, we ideally want to trigger that mode. 
            // But simpler is to just let user browse.
            // We won't clear data to allow switching back.
        }
    };

    return (
        <>
            {/* Backdrop for click-outside */}
            <div
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[55] transition-opacity"
                onClick={closeAIModal}
            />

            {/* Slide-in Panel */}
            <div className="fixed inset-y-0 right-0 z-[60] flex">
                <div className="w-96 h-full bg-white shadow-2xl shadow-indigo-900/20 flex flex-col animate-slideInRight">

                    {/* Header */}
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white relative">
                        <div className="flex items-center gap-2.5 text-indigo-600 font-bold text-lg">
                            <div className="p-2 bg-indigo-50 rounded-lg">
                                <Sparkles size={20} />
                            </div>
                            <span>Flowspace AI</span>
                        </div>
                        <IconButton
                            icon={X}
                            onClick={closeAIModal}
                            variant="ghost"
                            size="sm"
                        />
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-slate-100 px-2 pt-2 gap-1 bg-slate-50/50">
                        {tabs.map(t => (
                            <button
                                key={t.id}
                                onClick={() => handleTabChange(t.id)}
                                className={clsx(
                                    "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-all",
                                    activeTab === t.id
                                        ? "border-indigo-600 text-indigo-700 bg-gradient-to-t from-indigo-50/50 to-transparent"
                                        : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                                )}
                            >
                                <t.icon size={16} />
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">

                        {/* Loading State? */}
                        {!aiModal.data && (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                                <RefreshCw className="animate-spin text-indigo-500" size={32} />
                                <span className="text-sm font-medium animate-pulse">Generating insights...</span>
                            </div>
                        )}

                        {/* Data Display */}
                        {aiModal.data && (
                            <div className="space-y-6">
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 leading-relaxed text-slate-700 text-sm whitespace-pre-wrap">
                                    {/* Handle different data shapes based on activeTab logic or just raw data */}
                                    {/* We display raw data if it matches current type, else show placeholder */}

                                    {(aiModal.type === activeTab || !aiModal.type) ? (
                                        <>
                                            {typeof aiModal.data === 'string' && aiModal.data}
                                            {aiModal.data?.summary && aiModal.data.summary}
                                            {aiModal.data?.rewritten && aiModal.data.rewritten}
                                            {aiModal.data?.content && (
                                                <div className="space-y-3">
                                                    <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-lg shadow-sm text-slate-800 font-handwriting rotate-1">
                                                        {aiModal.data.content.text}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-center py-8 text-slate-400 italic">
                                            Select content on the board and click {tabs.find(t => t.id === activeTab)?.label} to generate.
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        onClick={handleCopy}
                                        variant={isCopied ? "subtle" : "solid"}
                                        iconLeft={isCopied ? Check : Copy}
                                        className="w-full"
                                    >
                                        {isCopied ? "Copied" : "Copy"}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        iconLeft={RefreshCw}
                                        className="w-full"
                                        title="Regenerate"
                                    >
                                        Regenerate
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-100 text-[10px] text-center text-slate-400 bg-white">
                        AI generated content may be inaccurate. Review before using.
                    </div>
                </div>
            </div>
        </>
    );
};
