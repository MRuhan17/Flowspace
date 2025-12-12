import React from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

/**
 * Flowspace IconButton Component
 * Circular button for tools, actions, and toggles.
 */
export const IconButton = React.forwardRef(({
    icon: Icon,
    onClick,
    variant = 'ghost',
    size = 'md',
    active = false,
    disabled = false,
    loading = false,
    title,
    className,
    ...props
}, ref) => {

    const baseStyles = "inline-flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95";

    const variants = {
        primary: `bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg focus:ring-indigo-500/30`,
        secondary: `bg-white text-slate-700 border border-slate-200 hover:border-indigo-500 hover:text-indigo-600 shadow-sm hover:shadow-md focus:ring-slate-200`,
        ghost: `text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-200`,
        danger: `text-red-500 hover:bg-red-50 hover:text-red-700 focus:ring-red-200`
    };

    const activeStyles = active ? "bg-indigo-50 text-indigo-700 ring-2 ring-indigo-600 scale-105" : "";

    const sizes = {
        sm: "w-8 h-8",
        md: "w-10 h-10",
        lg: "w-12 h-12"
    };

    const iconSizes = {
        sm: 16,
        md: 20,
        lg: 24
    };

    return (
        <button
            ref={ref}
            onClick={onClick}
            disabled={disabled || loading}
            title={title}
            className={clsx(
                baseStyles,
                !active && variants[variant],
                active && activeStyles,
                sizes[size],
                className
            )}
            {...props}
        >
            {loading ? (
                <Loader2 className="animate-spin" size={iconSizes[size]} />
            ) : (
                <Icon size={iconSizes[size]} strokeWidth={2.5} />
            )}
        </button>
    );
});

IconButton.displayName = 'IconButton';
