import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>(() => {
        const savedTheme = localStorage.getItem('theme-preference') as Theme;
        return savedTheme || 'dark'; // Default to dark as requested
    });

    useEffect(() => {
        const root = window.document.documentElement;

        const removeOldTheme = () => {
            root.classList.remove('light', 'dark');
        };

        const applyTheme = (themeToApply: 'light' | 'dark') => {
            removeOldTheme();
            root.classList.add(themeToApply);
        };

        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            applyTheme(mediaQuery.matches ? 'dark' : 'light');

            const listener = (e: MediaQueryListEvent) => {
                applyTheme(e.matches ? 'dark' : 'light');
            };

            mediaQuery.addEventListener('change', listener);
            return () => mediaQuery.removeEventListener('change', listener);
        } else {
            applyTheme(theme);
        }
    }, [theme]);

    const value = {
        theme,
        setTheme: (newTheme: Theme) => {
            setTheme(newTheme);
            localStorage.setItem('theme-preference', newTheme);
        },
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
