import React, { useState } from 'react';
import { LANGUAGES } from '../constants/languages';

interface NewCardFormProps {
    onAdd: (question: string, answer: string, tag?: string) => void;
    existingTags?: string[];
    frontLang?: string;
    backLang?: string;
}

export const NewCardForm: React.FC<NewCardFormProps> = ({ onAdd, existingTags = [], frontLang, backLang }) => {
    const getLangLabel = (code?: string) => {
        if (!code) return '';
        const lang = LANGUAGES.find(l => l.code === code);
        return lang ? lang.label.split(' ')[0] : code; // "Deutsch (DE)" -> "Deutsch"
    };

    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [tag, setTag] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (question.trim() && answer.trim()) {
            onAdd(question, answer, tag);
            setQuestion('');
            setAnswer('');
            // Tag behalten wir optional bei, für schnelles Erfassen gleicher Unit
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
                {frontLang && <span className="text-xs text-primary font-bold ml-1 uppercase">{getLangLabel(frontLang)}</span>}
                <input type="text" placeholder="Frage (Vorderseite)" value={question} onChange={e => setQuestion(e.target.value)} className="p-3 rounded bg-background border border-border-default text-text-main outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-text-muted/50" />
            </div>

            <div className="flex flex-col gap-1">
                {backLang && <span className="text-xs text-primary font-bold ml-1 uppercase">{getLangLabel(backLang)}</span>}
                <input type="text" placeholder="Antwort (Rückseite)" value={answer} onChange={e => setAnswer(e.target.value)} className="p-3 rounded bg-background border border-border-default text-text-main outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-text-muted/50" />
            </div>

            {/* TAG INPUT mit DATALIST */}
            <div className="relative">
                <input list="tags-list" type="text" placeholder="Tag / Kategorie (z.B. Unit 1)" value={tag} onChange={e => setTag(e.target.value)} className="w-full p-2 rounded bg-background border border-border-default text-text-muted text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-text-muted/50" />
                <datalist id="tags-list">
                    {existingTags.map(t => <option key={t} value={t} />)}
                </datalist>
            </div>

            <button type="submit" className="mt-2 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded transition-colors">Hinzufügen</button>
        </form>
    );
};
