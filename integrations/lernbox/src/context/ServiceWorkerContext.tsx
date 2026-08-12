import React, { createContext, useContext, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import pkg from '../../package.json';
// import { vocabularyService } from '../services/db.service';

interface ServiceWorkerContextType {
    needRefresh: boolean;
    offlineReady: boolean;
    updateServiceWorker: (force?: boolean) => Promise<void>;
    checkForUpdates: () => Promise<void>;
    appVersion: string;
}

const ServiceWorkerContext = createContext<ServiceWorkerContextType | undefined>(undefined);

export const ServiceWorkerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker: originalUpdateServiceWorker,
    } = useRegisterSW({
        onRegisterError(error: unknown) {
            console.error('SW registration error', error);
        },
    });

    // Suppress unused variable warnings for the setters
    // @ts-expect-error - setters are returned but not used here
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _unused1 = setOfflineReady;
    // @ts-expect-error - setters are returned but not used here
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _unused2 = setNeedRefresh;

    const checkForUpdates = useCallback(async () => {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                    await registration.update();
                    console.log('SW: Checked for updates');
                }
            } catch (error) {
                console.error('SW: Failed to check for updates', error);
            }
        }
    }, []);

    // Active Polling for updates every 60 minutes
    useEffect(() => {
        const intervalMs = 60 * 60 * 1000; // 60 minutes
        const intervalId = setInterval(() => {
            checkForUpdates();
        }, intervalMs);

        return () => clearInterval(intervalId);
    }, [checkForUpdates]);

    // Handle visibility change to check for updates when app comes to foreground
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkForUpdates();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [checkForUpdates]);


    const updateServiceWorker = async (force: boolean = false) => {
        // Just proceed with update. We do NOT clear localStorage.
        // We do strictly relying on the SW taking over.
        // If the user wants to backup first, they can do so manually or we could prompt,
        // but automagically forcing it might cause the "hang" issues on Android/iOS if download fails.
        // The instructions say "The update process (reload) must NOT clear localStorage."
        // We will stick to the standard update flow.

        try {
            await originalUpdateServiceWorker(true);
        } catch (error) {
            console.error("Update failed:", error);
            // Fallback: force reload if SW update fails
            if (force) {
                window.location.reload();
            }
        }
    };

    const value = {
        needRefresh,
        offlineReady,
        updateServiceWorker,
        checkForUpdates,
        appVersion: pkg.version,
    };

    return (
        <ServiceWorkerContext.Provider value={value}>
            {children}
        </ServiceWorkerContext.Provider>
    );
};

export const useServiceWorker = () => {
    const context = useContext(ServiceWorkerContext);
    if (context === undefined) {
        throw new Error('useServiceWorker must be used within a ServiceWorkerProvider');
    }
    return context;
};
