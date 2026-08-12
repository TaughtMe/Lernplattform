# Sicherheitsrisikoregister

## SR-001 · `image-size` über vinext

- **Stand:** 12. August 2026
- **Status:** Beobachtung, zwei offene `npm audit`-Meldungen mit Schweregrad hoch in derselben indirekten Abhängigkeit.
- **Hinweis:** vinext verwendet indirekt `image-size@2.0.2`. Die Meldungen betreffen Endlosschleifen beim Parsen speziell präparierter ICNS-, JXL- oder HEIF-Dateien. Bildparser sind deshalb ein sensibler Verarbeitungspfad und werden vor Einführung von Uploads erneut geprüft.
- **Reichweite:** indirekte Build-/Bildverarbeitungsabhängigkeit; Lernraum akzeptiert derzeit keine Bild-Uploads und verarbeitet keine fremden Bilder über diesen Pfad.
- **Gegenmaßnahmen:** keine Verarbeitung nicht vertrauenswürdiger Bilddateien, keine Bild-Uploads, wöchentliche Abhängigkeitsprüfung und erneutes Threat Modeling vor Upload-Funktionen. `npm audit fix` hat die übrigen vier Meldungen ohne Versionsbruch beseitigt.
- **Aktuelle Prüfung:** `npm audit` meldet am Stichtag zwei hohe Meldungen über `vinext → image-size`. Die angebotene automatische Behebung würde vinext inkompatibel auf `0.0.45` zurückstufen und wird deshalb nicht angewendet.
- **Neubewertung:** vor Einführung von Uploads oder spätestens beim nächsten Meilenstein.
