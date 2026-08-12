export interface LogEntry {
    version: string;
    date: string;
    changes: string[];
}

export const changelog: LogEntry[] = [
    {
        version: "1.1.7 - Critical Update System",
        date: "15.01.2026",
        changes: [
            "Live-Update Fix: Behebt das Problem, dass die App auf Handys bei alten Versionen hängen bleibt.",
            "Background-Check: Die App prüft nun stündlich und beim Öffnen automatisch auf Verbesserungen.",
            "Cache-Cleanup: Alte Datenreste werden aggressiver bereinigt."
        ]
    },
    {
        version: "1.1.6 - Mobile UI & Smart Learning Update",
        date: "14.01.2026",
        changes: [
            "Mobile First: Komplett neues, optimiertes Layout für Handys (kein Verzerren mehr).",
            "Fokus-Design: Neue \"Ghost-Buttons\" lenken weniger vom Lernen ab.",
            "Smart Learning: 24h-Rhythmus mit intelligentem Puffer (morgens lernen = morgens wiederholen)."
        ]
    },
    {
        version: "1.1.0 - Security Update",
        date: "12.01.2026",
        changes: [
            "Sicherheits-Headers & Spam-Schutz",
            "Barrierefreiheit verbessert",
            "Impressum vervollständigt"
        ]
    },
    {
        version: "1.0.2",
        date: "12.01.2026",
        changes: [
            "Datenschutz-Optimierung (Offline-First)",
            "Rechtstexte aktualisiert",
            "Anzeige-Fehler behoben"
        ]
    },
    {
        version: "1.0.1",
        date: "11.01.2026",
        changes: [
            "Bug Fixes in Light & Dark Mode"
        ]
    },
    {
        version: "1.0.0",
        date: "08.01.2026",
        changes: [
            "Erste offizielle Schul-Version der LernBox PWA.",
            "Leitner-System für intelligentes Lernen",
            "QR-Code Export und Import von Decks",
            "Medaillen-System für Lernfortschritt",
            "Offline-Fähigkeit"
        ]
    }
];
