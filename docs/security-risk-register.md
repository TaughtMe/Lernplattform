# Sicherheitsrisikoregister

## SR-001 · `image-size` über vinext

- **Stand:** 12. August 2026
- **Status:** Beobachtung, aktuell keine offene `npm audit`-Meldung.
- **Hinweis:** vinext verwendet indirekt `image-size@2.0.2`. Bildparser sind grundsätzlich ein sensibler Verarbeitungspfad und werden deshalb vor Einführung von Uploads erneut geprüft.
- **Reichweite:** indirekte Build-/Bildverarbeitungsabhängigkeit; Lernraum akzeptiert derzeit keine Bild-Uploads und verarbeitet keine fremden Bilder über diesen Pfad.
- **Gegenmaßnahmen:** keine Verarbeitung nicht vertrauenswürdiger Bilddateien, wöchentliche Abhängigkeitsprüfung und erneutes Threat Modeling vor Upload-Funktionen.
- **Aktuelle Prüfung:** `npm audit` meldet am Stichtag null bekannte Schwachstellen.
- **Neubewertung:** vor Einführung von Uploads oder spätestens beim nächsten Meilenstein.
