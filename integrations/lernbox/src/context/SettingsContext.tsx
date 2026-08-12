import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface SettingsContextType {
    hapticsEnabled: boolean;
    setHapticsEnabled: (enabled: boolean) => void;
    triggerHaptic: (type: 'success' | 'error' | 'light') => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [hapticsEnabled, setHapticsEnabled] = useState(() => {
        const saved = localStorage.getItem('settings-haptics');
        // Default to true if not set
        return saved !== null ? JSON.parse(saved) : true;
    });

    useEffect(() => {
        localStorage.setItem('settings-haptics', JSON.stringify(hapticsEnabled));
    }, [hapticsEnabled]);

    const triggerHaptic = (type: 'success' | 'error' | 'light') => {
        if (!hapticsEnabled) return;

        // Check if navigator.vibrate is supported
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            switch (type) {
                case 'success':
                    navigator.vibrate(50);
                    break;
                case 'error':
                    navigator.vibrate([50, 50, 50]);
                    break;
                case 'light':
                    navigator.vibrate(10);
                    break;
            }
        }
    };

    return (
        <SettingsContext.Provider value={{ hapticsEnabled, setHapticsEnabled, triggerHaptic }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
