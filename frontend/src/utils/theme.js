import { colors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { shadows } from './shadows';

/**
 * Unified Flowspace Theme
 * Aggregates all design tokens into a central object.
 */
export const theme = {
    colors,
    typography,
    spacing,
    shadows,

    // Breakpoints (Mobile First)
    breakpoints: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
    },

    radius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        full: '9999px',
    }
};

/**
 * Hook to access theme variables (for future context/dynamic theme support)
 * Currently returns the static theme.
 */
export const useTheme = () => {
    return theme;
};
