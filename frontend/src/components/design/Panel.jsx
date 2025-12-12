import React from 'react';
import clsx from 'clsx';
import { theme } from '../../utils/theme';

/**
 * Flowspace Panel Component
 * Flexible container for sidebars, toolbars, and modal content.
 */
export const Panel = React.forwardRef(({
    children,
    variant = 'floating', // 'floating' | 'sidebar' | 'flat'
    padding = 'md', // 'none' | 'sm' | 'md' | 'lg'
    className,
    ...props
}, ref) => {

    const baseStyles = "bg-white border border-slate-100 transition-all";

    const variants = {
        // Floating: High shadow, rounded corners, backdrop feel
        floating: `rounded-2xl shadow-xl shadow-slate-200/50 supports-[backdrop-filter]:bg-white/80 backdrop-blur-md`,

        // Sidebar: Full height, borders only on side usually (but here generic)
        sidebar: `h-full bg-white border-r border-slate-200 shadow-sm`,

        // Flat: Embedded panel
        flat: `rounded-lg border border-slate-200 bg-slate-50/50`
    };

    const paddings = {
        none: 'p-0',
        sm: 'p-2',
        md: 'p-4',
        lg: 'p-6'
    };

    return (
        <div
            ref={ref}
            className={clsx(
                baseStyles,
                variants[variant],
                paddings[padding],
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
});

Panel.displayName = 'Panel';
