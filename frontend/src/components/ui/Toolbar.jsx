import React from 'react';
import { useStore } from '../../state/useStore'; // Updated from useBoardStore
import { TOOLS, BOARD_COLORS } from '../../utils/constants';
import {
    Pencil, Eraser, Undo, Redo,
    MousePointer2, Minus, Maximize,
} from 'lucide-react';
import clsx from 'clsx';

export const Toolbar = () => {
    const {
        toolMode: tool, setToolMode,
        brushColor: color, setBrushColor,
        brushSize: strokeWidth, setBrushSize,
        undo, redo
    } = useStore();

    const handleSliderChange = (e) => {
        setBrushSize(Number(e.target.value));
    };

    return (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-3 z-50">

            {/* Primary Toolbar */}
            <div className="bg-white supports-[backdrop-filter]:bg-white/80 backdrop-blur-md shadow-2xl shadow-gray-200/50 rounded-2xl p-2.5 flex items-center gap-4 border border-gray-100 ring-1 ring-black/5 transition-all hover:shadow-3xl hover:bg-white/90">

                {/* Tools Group */}
                <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl border border-gray-200/50">
                    <button
                        onClick={() => setToolMode(TOOLS.SELECT)}
                        title="Select (V)"
                        className={clsx(
                            "p-2.5 rounded-lg transition-all duration-200",
                            tool === TOOLS.SELECT
                                ? "bg-white text-blue-600 shadow-sm scale-100 font-medium"
                                : "text-gray-500 hover:text-gray-700 hover:bg-black/5"
                        )}
                    >
                        <MousePointer2 size={18} strokeWidth={2.5} />
                    </button>
                    <button
                        onClick={() => setToolMode(TOOLS.PEN)}
                        title="Pen (P)"
                        className={clsx(
                            "p-2.5 rounded-lg transition-all duration-200",
                            tool === TOOLS.PEN
                                ? "bg-white text-blue-600 shadow-sm scale-100 font-medium"
                                : "text-gray-500 hover:text-gray-700 hover:bg-black/5"
                        )}
                    >
                        <Pencil size={18} strokeWidth={2.5} />
                    </button>
                    <button
                        onClick={() => setToolMode(TOOLS.ERASER)}
                        title="Eraser (E)"
                        className={clsx(
                            "p-2.5 rounded-lg transition-all duration-200",
                            tool === TOOLS.ERASER
                                ? "bg-white text-blue-600 shadow-sm scale-100 font-medium"
                                : "text-gray-500 hover:text-gray-700 hover:bg-black/5"
                        )}
                    >
                        <Eraser size={18} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="w-px h-8 bg-gradient-to-b from-transparent via-gray-200 to-transparent"></div>

                {/* Stroke Settings */}
                <div className="flex items-center gap-5 px-1">
                    <div className="flex items-center gap-2 group relative">
                        <Minus size={14} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
                        <input
                            type="range"
                            min="1"
                            max="20"
                            value={strokeWidth}
                            onChange={handleSliderChange}
                            className="w-24 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <Maximize size={14} className="text-gray-400 group-hover:text-gray-600 transition-colors" />

                        {/* Floating Tooltip */}
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold py-1 px-2 rounded-md opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all pointer-events-none shadow-lg">
                            {strokeWidth}px
                        </div>
                    </div>

                    {/* Palette */}
                    <div className="flex items-center gap-2 pl-2 border-l border-gray-100">
                        {Object.values(BOARD_COLORS).map((c) => (
                            <button
                                key={c}
                                onClick={() => setBrushColor(c)}
                                className={clsx(
                                    "w-6 h-6 rounded-full transition-all duration-200 relative group",
                                    "hover:shadow-md hover:scale-110 active:scale-95",
                                    color === c ? "ring-2 ring-offset-2 ring-blue-500 scale-110 shadow-sm z-10" : "border border-gray-200"
                                )}
                                style={{ backgroundColor: c }}
                                title={c}
                            >
                                {color === c && (
                                    <span className="absolute inset-0 flex items-center justify-center">
                                        <span className="w-1.5 h-1.5 bg-white rounded-full shadow-sm"></span>
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="w-px h-8 bg-gradient-to-b from-transparent via-gray-200 to-transparent"></div>

                {/* History Actions */}
                <div className="flex gap-1">
                    <button onClick={undo} className="p-2.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors active:scale-95" title="Undo (Ctrl+Z)">
                        <Undo size={18} strokeWidth={2.5} />
                    </button>
                    <button onClick={redo} className="p-2.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors active:scale-95" title="Redo (Ctrl+Y)">
                        <Redo size={18} strokeWidth={2.5} />
                    </button>
                </div>
            </div>
        </div>
    );
};
