/**
 * Flowspace Shadow System
 * Smooth, multi-layer shadows for depth without harshness.
 */
export const shadows = {
    elevation: {
        // Card hover, subtle inputs
        low: '0 2px 4px -1px rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.02)',

        // Dropdowns, panels, sticky headers
        medium: '0 8px 16px -4px rgba(0, 0, 0, 0.06), 0 4px 6px -2px rgba(0, 0, 0, 0.03)',

        // Modals, floating actions, popovers
        high: '0 20px 40px -8px rgba(0, 0, 0, 0.08), 0 8px 12px -4px rgba(0, 0, 0, 0.04)',
    },

    // Colored shadows for focus states or accents
    focusRing: '0 0 0 3px rgba(99, 102, 241, 0.2)', // Matches primary indigo

    // Utility
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
};
