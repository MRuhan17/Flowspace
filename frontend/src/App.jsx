import React from 'react';
import CanvasBoard from './components/CanvasBoard';
import Toolbar from './components/Toolbar';

function App() {
    return (
        <div className="App" style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
            <Toolbar />
            <div style={{ width: '100%', height: '100%' }}>
                <CanvasBoard />
            </div>
        </div>
    );
}

export default App;
