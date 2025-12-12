/**
 * Flowspace Typography System
 * Scalable type scale with specific UI label definitions.
 */
export const typography = {
    fontFamily: {
        sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        mono: '"JetBrains Mono", "Fira Code", monospace',
    },

    // Scale
    size: {
        xs: '0.75rem',    // 12px
        sm: '0.875rem',   // 14px
        base: '1rem',     // 16px
        lg: '1.125rem',   // 18px
        xl: '1.25rem',    // 20px
        '2xl': '1.5rem',  // 24px
        '3xl': '1.875rem',// 30px
        '4xl': '2.25rem', // 36px
    },

    weight: {
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
    },

    // Semantic Usage
    components: {
        h1: { fontSize: '2.25rem', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em' },
        h2: { fontSize: '1.875rem', fontWeight: 600, lineHeight: 1.3, letterSpacing: '-0.01em' },
        h3: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.4 },

        body: { fontSize: '1rem', lineHeight: 1.6 },
        bodySmall: { fontSize: '0.875rem', lineHeight: 1.5 },

        button: { fontSize: '0.875rem', fontWeight: 500, letterSpacing: '0.01em', textTransform: 'none' },
        uiLabel: { fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' },
    }
};
