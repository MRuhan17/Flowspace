import React from 'react';
import { useBoardStore } from '../state/boardStore';
import { TOOLS, BOARD_COLORS } from '../utils/constants'; // Fix path to constants
import { Pencil, Eraser, Type, Undo, Redo, Save } from 'lucide-react';
import clsx from 'clsx';

export const Toolbar = () => {
    const {
        tool, setTool,
        color, setColor,
        strokeWidth, setStrokeWidth,
        undo, redo
    } = useBoardStore();

    return (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-xl p-2 flex items-center gap-4 z-50 border border-gray-200">
            {/* Tools */}
            <div className="flex gap-2">
                <button
                    onClick={() => setTool(TOOLS.PEN)}
                    className={clsx("p-2 rounded-lg hover:bg-gray-100", tool === TOOLS.PEN && "bg-blue-100 text-blue-600")}
                >
                    <Pencil size={20} />
                </button>
                <button
                    onClick={() => setTool(TOOLS.ERASER)}
                    className={clsx("p-2 rounded-lg hover:bg-gray-100", tool === TOOLS.ERASER && "bg-blue-100 text-blue-600")}
                >
                    <Eraser size={20} />
                </button>
            </div>

            <div className="w-px h-8 bg-gray-200"></div>

            {/* Colors */}
            <div className="flex gap-2">
                {Object.values(BOARD_COLORS).map((c) => (
                    <button
                        key={c}
                        onClick={() => setColor(c)}
                        className={clsx(
                            "w-6 h-6 rounded-full border border-gray-300",
                            color === c && "ring-2 ring-blue-500 ring-offset-2"
                        )}
                        style={{ backgroundColor: c }}
                    />
                ))}
            </div>

            <div className="w-px h-8 bg-gray-200"></div>

            {/* Actions */}
            <div className="flex gap-2">
                <button onClick={undo} className="p-2 rounded-lg hover:bg-gray-100">
                    <Undo size={20} />
                </button>
                <button onClick={redo} className="p-2 rounded-lg hover:bg-gray-100">
                    <Redo size={20} />
                </button>
            </div>
        </div>
    );
};
