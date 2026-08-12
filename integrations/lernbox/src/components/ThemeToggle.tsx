import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    const cycleTheme = () => {
        if (theme === 'light') setTheme('dark');
        else if (theme === 'dark') setTheme('system');
        else setTheme('light');
    };

    return (
        <button
            onClick={cycleTheme}
            className="p-2 rounded-full text-text-muted hover:text-primary hover:bg-surface-hover transition-colors duration-200"
            title={`Current theme: ${theme}`}
        >
            {theme === 'light' && <Sun className="w-5 h-5" />}
            {theme === 'dark' && <Moon className="w-5 h-5" />}
            {theme === 'system' && <Monitor className="w-5 h-5" />}
        </button>
    );
}
