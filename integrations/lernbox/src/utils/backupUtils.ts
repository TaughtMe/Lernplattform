import { vocabularyService } from '../services/db.service';

export const triggerDownload = (data: unknown, prefix: string = 'LernBox_Backup') => {
    try {
        const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${prefix}_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return true;
    } catch (err) {
        console.error("Download failed:", err);
        return false;
    }
};

/**
 * Exports all data (Decks + Cards) and triggers a download.
 * Returns true if successful, false otherwise.
 */
export const exportData = async (prefix?: string): Promise<boolean> => {
    try {
        const data = await vocabularyService.exportBackup();
        return triggerDownload(data, prefix);
    } catch (err) {
        console.error("Export failed:", err);
        return false;
    }
};
