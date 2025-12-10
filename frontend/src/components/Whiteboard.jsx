import React, { useEffect, useRef } from 'react';
import { useSocket } from '../socket/useSocket';

const Whiteboard = () => {
  const canvasRef = useRef(null);
  const { socket } = useSocket();

  useEffect(() => {
    // Initialize canvas and drawing functionality
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      // Drawing logic here
    }
  }, []);

  return (
    <div className="whiteboard-container">
      <canvas
        ref={canvasRef}
        className="whiteboard-canvas"
        width={800}
        height={600}
      />
    </div>
  );
};

export default Whiteboard;
