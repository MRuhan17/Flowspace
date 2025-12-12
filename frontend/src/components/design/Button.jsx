import React from 'react';
import clsx from 'clsx';
import { theme } from '../../utils/theme';
import { Loader2 } from 'lucide-react';

/**
 * Flowspace Button Component
 * Supports: Solid, Subtle, Outline, Ghost variants
 */
export const Button = React.forwardRef(({
    children,
    onClick,
    variant = 'solid',
    size = 'md',
    disabled = false,
    loading = false,
    iconLeft: IconLeft,
    iconRight: IconRight,
    className,
    ...props
}, ref) => {

    const baseStyles = "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";

    // Variant Styles
    const variants = {
        solid: `bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg focus:ring-indigo-500/30`,
        subtle: `bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 focus:ring-indigo-500/20`,
        outline: `border-2 border-slate-200 text-slate-700 hover:border-indigo-600 hover:text-indigo-600 bg-white focus:ring-slate-200`,
        ghost: `text-slate-600 hover:bg-slate-100 hover:text-slate-900`
    };

    // Size Styles
    const sizes = {
        sm: "px-3 py-1.5 text-xs gap-1.5",
        md: "px-4 py-2 text-sm gap-2",
        lg: "px-6 py-2.5 text-base gap-2.5"
    };

    return (
        <button
            ref={ref}
            onClick={onClick}
            disabled={disabled || loading}
            className={clsx(
                baseStyles,
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        >
            {loading && <Loader2 className="animate-spin" size={size === 'sm' ? 14 : 18} />}
            {!loading && IconLeft && <IconLeft size={size === 'sm' ? 14 : 18} />}

            <span>{children}</span>

            {!loading && IconRight && <IconRight size={size === 'sm' ? 14 : 18} />}
        </button>
    );
});

Button.displayName = 'Button';
