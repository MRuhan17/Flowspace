import React from 'react';

const Toolbar = () => {
    return (
        <div style={{
            position: 'absolute',
            top: 20,
            left: 20,
            zIndex: 10,
            background: 'white',
            padding: '10px',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            display: 'flex',
            gap: '10px'
        }}>
            <button onClick={() => console.log('Undo clicked')}>Undo</button>
            <button onClick={() => console.log('Redo clicked')}>Redo</button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <label htmlFor="color-picker" style={{ fontSize: '14px' }}>Color:</label>
                <input
                    type="color"
                    id="color-picker"
                    defaultValue="#000000"
                    onChange={(e) => console.log('Color changed:', e.target.value)}
                />
            </div>
        </div>
    );
};

export default Toolbar;
