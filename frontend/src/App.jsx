import { CanvasBoard } from './components/canvas/CanvasBoard';
import { Toolbar } from './components/ui/Toolbar';
import { AITools } from './components/ai/AITools';
import { AIPanel } from './components/ai/AIPanel';
import { SnapshotLoader } from './components/SnapshotLoader';
import { CursorGhosts } from './components/CursorGhosts';
import { useSocketListeners } from './hooks/useSocketListeners';
import { useStore } from './state/useStore';

// AI Modal logic moved to AIPanel component

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
                <CursorGhosts />
            </main>

            {/* Floating Toolbar */}
            <Toolbar />

            {/* Overlays */}
            <AIPanel />
            <SnapshotLoader />

        </div>
    );
}

export default App;
