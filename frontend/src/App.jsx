import React, { useEffect } from 'react';
import { CanvasBoard } from './components/canvas/CanvasBoard';
import { Toolbar } from './components/ui/Toolbar';
import { AITools } from './components/ai/AITools';
import { useSocketListeners } from './hooks/useSocketListeners';
import { useStore } from './state/useStore';

// AI Response Modal (Placeholder for visual result display)
const AIModal = () => {
    const { aiModal, closeAIModal } = useStore();

    if (!aiModal.isOpen || !aiModal.data) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-[90%] max-w-lg border border-gray-100 font-sans">
                <h3 className="text-xl font-bold text-gray-800 mb-4 capitalize flex items-center gap-2">
                    ✨ AI Result: {aiModal.type}
                </h3>

                <div className="bg-gray-50 p-4 rounded-lg text-gray-700 whitespace-pre-wrap max-h-[60vh] overflow-y-auto leading-relaxed border border-gray-100">
                    {/* Handle different data structures */}
                    {typeof aiModal.data === 'string' ? aiModal.data : JSON.stringify(aiModal.data, null, 2)}

                    {aiModal.data?.summary && <p>{aiModal.data.summary}</p>}
                    {aiModal.data?.rewritten && <p>{aiModal.data.rewritten}</p>}
                    {aiModal.data?.content && <div>
                        <p className="text-sm font-semibold mb-1">Sticky Note Content:</p>
                        <p className="bg-yellow-100 p-3 rounded shadow-sm inline-block">{aiModal.data.content.text}</p>
                    </div>}
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={closeAIModal}
                        className="px-5 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-md"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

function App() {
    // activate global socket listeners (Sync, Draw, etc.)
    useSocketListeners();

    // Prevent default touch actions for canvas (pinch-zoom etc mostly handled by browser, but safer here)
    useEffect(() => {
        const preventDefault = (e) => e.preventDefault();
        document.body.addEventListener('touchmove', preventDefault, { passive: false });
        return () => document.body.removeEventListener('touchmove', preventDefault);
    }, []);

    return (
        <div className="relative w-full h-screen bg-gray-50 flex flex-col font-sans text-gray-900 select-none">

            {/* Nav / Brand Header (Optional) */}
            <div className="absolute top-4 left-6 z-40 pointer-events-none">
                <h1 className="text-2xl font-black tracking-tighter text-gray-900 flex items-center gap-2">
                    <span className="text-2xl">🌊</span> Flowspace
                </h1>
                <p className="text-sm text-gray-400 font-medium ml-8">Collaborative Workspace</p>
            </div>

            {/* Sidebar / AI Tools */}
            <AITools />

            {/* Main Canvas Area */}
            <main className="flex-1 w-full h-full relative overflow-hidden">
                <CanvasBoard />
            </main>

            {/* Floating Toolbar */}
            <Toolbar />

            {/* Overlays */}
            <AIModal />

        </div>
    );
}

export default App;
