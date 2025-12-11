import React from 'react';
import { CanvasBoard } from './components/canvas/CanvasBoard';
import { Toolbar } from './components/ui/Toolbar';
import { AITools } from './components/ai/AITools';

function App() {
    return (
        <div className="relative w-full h-screen">
            <Toolbar />
            <AITools />
            <CanvasBoard />
        </div>
    );
}

export default App;
