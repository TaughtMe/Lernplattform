export const LANGUAGES = [
    { code: 'de-DE', label: 'Deutsch (DE)' },
    { code: 'en-US', label: 'English (EN)' },
    { code: 'fr-FR', label: 'Français (FR)' },
    { code: 'es-ES', label: 'Español (ES)' },
    { code: 'it-IT', label: 'Italiano (IT)' },
    { code: 'la', label: 'Latin (LA)' }, // No TTS support
] as const;

export const DEFAULT_FRONT_LANG = 'de-DE';
export const DEFAULT_BACK_LANG = 'en-US';
