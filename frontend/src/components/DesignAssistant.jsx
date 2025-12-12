import React, { useState, useRef } from 'react';
import { useStore } from '../state/useStore';
import {
    X, Sparkles, MessageSquare, Palette,
    FileText, Activity, Layout,
    ArrowRight, Loader2, Copy, PlusCircle
} from 'lucide-react';
import clsx from 'clsx';
import { generateFlowchartFromText } from '../api/flowchart';
import { FlowchartRenderer } from './FlowchartRenderer';

// We assume these endpoints exist or mimic them as per request
// /ai/rewrite, /ai/summarize, /ai/flowchart were created.
// /ai/layout-assist ? (We'll use layoutService or similar)

const TABS = [
    { id: 'flowchart', label: 'Flowchart', icon: Activity },
    { id: 'rewrite', label: 'Rewrite', icon: FileText },
    { id: 'color', label: 'Colors', icon: Palette },
    { id: 'layout', label: 'Layout', icon: Layout },
];

export const DesignAssistant = () => {
    const {
        isAiAssistantOpen, toggleAiAssistant,
        addNode, addEdge,
        nodes, setNodes
    } = useStore();

    const [activeTab, setActiveTab] = useState('flowchart');
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [streamBuffer, setStreamBuffer] = useState(''); // Text streaming simulation

    // --- Actions ---

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsLoading(true);
        setResult(null);
        setStreamBuffer('');

        try {
            if (activeTab === 'flowchart') {
                const data = await generateFlowchartFromText(prompt);
                setResult({ type: 'flowchart', data });
            }
            else if (activeTab === 'rewrite') {
                // Mock streaming effect for text
                const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/ai/rewrite`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: prompt, tone: 'professional' })
                });
                const json = await response.json();

                // Simulate streaming
                let text = json.result || "Could not generate text.";
                let i = 0;
                setResult({ type: 'text', data: '' });
                const interval = setInterval(() => {
                    setResult(prev => ({ type: 'text', data: text.slice(0, i) }));
                    i += 5;
                    if (i > text.length) clearInterval(interval);
                }, 20);
            }
            else {
                // Fallback for other tabs
                setResult({ type: 'info', data: " Feature coming soon!" });
            }
        } catch (error) {
            console.error(error);
            setResult({ type: 'error', data: "Failed to generate content." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleInsert = () => {
        if (!result) return;

        if (result.type === 'flowchart') {
            // Insert nodes/edges
            const { nodes: newNodes, edges: newEdges } = result.data;
            // Iterate and add. 
            // Better: merge into store.
            // But store doesn't have bulk add yet? optimistic updates one by one.
            newNodes.forEach(n => addNode(n));
            newEdges.forEach(e => addEdge(e));
            toggleAiAssistant(); // Close on success
        }
        else if (result.type === 'text') {
            // Copy to clipboard or create Sticky Note?
            // Simplest: Create Sticky Note with text
            // We need 'addStroke' or 'addNode'.
            // Flowspace has Sticky Notes? Not explicitly. We have Nodes.
            // Let's copy to clipboard as default "Insert Text" behavior or create a Text Node.
            navigator.clipboard.writeText(result.data);
            alert("Text copied to clipboard!");
        }
    };

    // --- Renderers ---

    const renderResult = () => {
        if (isLoading && !result) {
            return (
                <div className="flex flex-col items-center justify-center p-8 text-gray-400">
                    <Loader2 className="animate-spin mb-2" />
                    <span className="text-xs">Thinking...</span>
                </div>
            );
        }

        if (!result) return null;

        if (result.type === 'flowchart') {
            return (
                <div className="border border-gray-100 rounded-lg overflow-hidden bg-gray-50 mt-4 relative group h-48">
                    <div className="absolute inset-0 bg-white">
                        {/* Mini Preview - scaled down */}
                        <div className="transform scale-50 origin-top-left w-[200%] h-[200%] pointer-events-none">
                            <FlowchartRenderer
                                nodes={result.data.nodes}
                                edges={result.data.edges}
                                width={600}
                                height={400}
                                editable={false}
                            />
                        </div>
                    </div>
                </div>
            );
        }

        if (result.type === 'text') {
            return (
                <div className="bg-gray-50 p-4 rounded-lg mt-4 text-sm text-gray-700 leading-relaxed border border-gray-200">
                    {result.data}
                </div>
            );
        }

        return <div className="mt-4 text-sm text-gray-500">{result.data}</div>;
    };

    // --- Main UI ---

    return (
        <div
            className={clsx(
                "fixed top-0 right-0 h-screen w-[400px] bg-white shadow-2xl z-[100] transform transition-transform duration-300 ease-in-out flex flex-col border-l border-gray-100",
                isAiAssistantOpen ? "translate-x-0" : "translate-x-full"
            )}
        >
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-tr from-purple-100 to-blue-100 rounded-lg text-blue-600">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h2 className="font-semibold text-gray-900">Design AI</h2>
                        <p className="text-xs text-gray-500">Your creative co-pilot</p>
                    </div>
                </div>
                <button
                    onClick={toggleAiAssistant}
                    className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex px-2 pt-2 gap-1 border-b border-gray-100 overflow-x-auto no-scrollbar">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={clsx(
                            "flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap",
                            activeTab === tab.id
                                ? "text-blue-600 bg-blue-50/50 border-b-2 border-blue-600"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                        )}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">

                {/* Prompt Input */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {activeTab === 'flowchart' ? 'Describe process' : 'Your text'}
                    </label>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g. A user registration flow with email verification..."
                        className="w-full h-32 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm resize-none transition-all placeholder:text-gray-400"
                    />
                </div>

                {/* Generate Button */}
                <button
                    onClick={handleGenerate}
                    disabled={isLoading || !prompt.trim()}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    {isLoading ? 'Generating...' : 'Generate Content'}
                </button>

                {/* Results Area */}
                {result && (
                    <div className="animate-fadeIn">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-500 uppercase">Result</span>
                            <div className="flex gap-2">
                                {/* Insert / Action Button */}
                                {result.type === 'flowchart' && (
                                    <button
                                        onClick={handleInsert}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"
                                    >
                                        <PlusCircle size={14} /> Insert
                                    </button>
                                )}
                                {result.type === 'text' && (
                                    <button
                                        onClick={handleInsert}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                                    >
                                        <Copy size={14} /> Copy
                                    </button>
                                )}
                            </div>
                        </div>
                        {renderResult()}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 text-center">
                <p className="text-[10px] text-gray-400">Powered by Gemini Pro • Flowspace AI</p>
            </div>
        </div>
    );
};
