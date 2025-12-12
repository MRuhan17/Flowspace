import React, { createContext, useContext } from 'react';
import { theme } from './theme';

const ThemeContext = createContext(theme);

export const ThemeProvider = ({ children }) => {
    return (
        <ThemeContext.Provider value={theme}>
            {/* Global style injection for typography */}
            <div style={{ fontFamily: theme.typography.fontFamily.sans, color: theme.colors.textPrimary }} className="min-h-screen bg-slate-50 antialiased selection:bg-indigo-100 selection:text-indigo-900">
                {children}
            </div>
        </ThemeContext.Provider>
    );
};

export const useThemeContext = () => useContext(ThemeContext);
