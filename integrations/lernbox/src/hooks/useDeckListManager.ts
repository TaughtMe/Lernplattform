import { useState } from 'react';
import { useDecks } from './useDecks';
import { vocabularyService } from '../services/db.service';


export const useDeckListManager = () => {
    const { decks, isLoading } = useDecks();
    const [newDeckName, setNewDeckName] = useState('');
    const [frontLang, setFrontLang] = useState('de-DE');
    const [backLang, setBackLang] = useState('en-US');

    const addDeck = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newDeckName.trim()) return;
        try {
            await vocabularyService.addDeck(newDeckName, frontLang, backLang);
            setNewDeckName('');
            // Reset to defaults or keep last selection? Keeping last selection is often better UX for batch creation, 
            // but user didn't specify. I'll reset to defaults to be safe/clean.
            setFrontLang('de-DE');
            setBackLang('en-US');
        } catch (err) {
            console.error(err);
        }
    };

    const deleteDeck = async (id: number) => {
        await vocabularyService.deleteDeck(id);
    };

    const exportBackup = async () => {
        const success = await import('../utils/backupUtils').then(m => m.exportData());
        if (!success) {
            alert("Export fehlgeschlagen.");
        }
    };

    const importBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const json = e.target?.result as string;
                const data = JSON.parse(json);
                if (!data.decks || !data.cards) throw new Error("Invalid backup format");

                if (confirm(`Backup importieren? Dies wird ${data.decks.length} Decks und ${data.cards.length} Karten hinzufügen.`)) {
                    await vocabularyService.importBackup(data);
                    // Force reload to refresh data
                    window.location.reload();
                }
            } catch (err) {
                console.error("Import failed:", err);
                alert("Import fehlgeschlagen: Ungültiges Format.");
            }
        };
        reader.readAsText(file);
    };

    return {
        decks,
        isLoading,
        newDeckName,
        setNewDeckName,
        frontLang,
        setFrontLang,
        backLang,
        setBackLang,
        addDeck,
        deleteDeck,
        exportBackup,
        importBackup
    };
};
