import React from 'react';
import { useBoardStore } from '../../state/boardStore';
import { TOOLS, BOARD_COLORS } from '../../utils/constants';
import {
    Pencil, Eraser, Undo, Redo,
    MousePointer2, Minus, Maximize,
    Palette
} from 'lucide-react';
import clsx from 'clsx';
import { AITools } from '../ai/AITools'; // Incorporate AI Tools into toolbar or nearby if requested, or keep separate. 
// User prompt asked for "AI Summarize... AI Sticky Note" buttons *in* the Toolbar.
// But AITools is currently a separate component. I can merge or keep separate. 
// "Implement a professional Toolbar UI with ... AI Summarize... ". I will add them here.

export const Toolbar = () => {
    const {
        tool, setTool,
        color, setColor,
        strokeWidth, setStrokeWidth,
        undo, redo
    } = useBoardStore();

    // Mapping size to a sensible range (1 to 20?)
    // This slider allows adjusting brush thickness
    const handleSliderChange = (e) => {
        setStrokeWidth(Number(e.target.value));
    };

    return (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-3 z-50">

            {/* Primary Toolbar */}
            <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl p-2 flex items-center gap-3 border border-gray-200/50">

                {/* Tools Group */}
                <div className="flex bg-gray-100/50 p-1 rounded-xl">
                    <button
                        onClick={() => setTool(TOOLS.SELECT)}
                        title="Select (V)"
                        className={clsx("p-3 rounded-lg transition-all", tool === TOOLS.SELECT ? "bg-white shadow-sm text-blue-600 scale-105" : "text-gray-500 hover:bg-gray-200/50")}
                    >
                        <MousePointer2 size={20} />
                    </button>
                    <button
                        onClick={() => setTool(TOOLS.PEN)}
                        title="Pen (P)"
                        className={clsx("p-3 rounded-lg transition-all", tool === TOOLS.PEN ? "bg-white shadow-sm text-blue-600 scale-105" : "text-gray-500 hover:bg-gray-200/50")}
                    >
                        <Pencil size={20} />
                    </button>
                    <button
                        onClick={() => setTool(TOOLS.ERASER)}
                        title="Eraser (E)"
                        className={clsx("p-3 rounded-lg transition-all", tool === TOOLS.ERASER ? "bg-white shadow-sm text-blue-600 scale-105" : "text-gray-500 hover:bg-gray-200/50")}
                    >
                        <Eraser size={20} />
                    </button>
                </div>

                <div className="w-px h-8 bg-gray-200"></div>

                {/* Stroke Settings */}
                <div className="flex items-center gap-4 px-2">
                    <div className="flex items-center gap-2 group relative">
                        <Minus size={16} className="text-gray-400" />
                        <input
                            type="range"
                            min="1"
                            max="20"
                            value={strokeWidth}
                            onChange={handleSliderChange}
                            className="w-24 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <Maximize size={16} className="text-gray-400" />

                        {/* Tooltip for size */}
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            {strokeWidth}px
                        </div>
                    </div>

                    {/* Palette */}
                    <div className="flex items-center gap-1.5">
                        {Object.values(BOARD_COLORS).map((c) => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={clsx(
                                    "w-5 h-5 rounded-full border border-gray-100 transition-transform hover:scale-110",
                                    color === c && "ring-2 ring-offset-2 ring-blue-500 scale-110"
                                )}
                                style={{ backgroundColor: c }}
                                title={c}
                            />
                        ))}
                    </div>
                </div>

                <div className="w-px h-8 bg-gray-200"></div>

                {/* History Actions */}
                <div className="flex gap-1">
                    <button onClick={undo} className="p-2.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors" title="Undo (Ctrl+Z)">
                        <Undo size={18} />
                    </button>
                    <button onClick={redo} className="p-2.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors" title="Redo (Ctrl+Y)">
                        <Redo size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};
