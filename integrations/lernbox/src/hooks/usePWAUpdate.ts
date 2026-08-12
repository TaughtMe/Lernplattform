import { useServiceWorker } from '../context/ServiceWorkerContext';


export const usePWAUpdate = () => {
    const { needRefresh, updateServiceWorker, checkForUpdates } = useServiceWorker();

    const handleSafeUpdate = async () => {
        try {
            console.log("Initiating safe update...");

            // 1. Create Backup
            const success = await import('../utils/backupUtils').then(m => m.exportData('LernBox_AutoBackup_Update'));

            if (!success) {
                const proceed = window.confirm("Automatisches Backup ist fehlgeschlagen. Möchtest du trotzdem aktualisieren? (Datenverlust möglich)");
                if (!proceed) return;
            } else {
                // Give the browser a moment to start the download
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // 2. Perform Update
            await updateServiceWorker(true);
        } catch (error) {
            console.error("Safe update failed:", error);
            alert("Update abgebrochen: Fehler beim Backup.");
        }
    };

    return {
        needRefresh,
        handleSafeUpdate,
        checkForUpdates
    };
};
