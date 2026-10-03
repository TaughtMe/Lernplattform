# Sicherheitsrisikoregister

## Neubewertung am 8. September 2026

Die aktuelle Installation meldete `fast-uri` und `fflate` als verwundbare
indirekte Entwicklungsabhängigkeiten. Beide wurden innerhalb der bestehenden
Versionsbereiche aktualisiert; `npm audit` meldet anschließend null bekannte
Schwachstellen. Der historische Befund SR-001 beschreibt nicht den aktuellen
Lockdateistand.

Die Reparaturmigration erhält die Capability-Grenzen der Raum- und Transfer-API.
Abgelehnte Lehrkraftschlüssel und unbekannte Raumcodes werden dauerhaft gezählt;
die SQL-Tests prüfen das über getrennte Transaktionen. Das IP-Limit setzt voraus,
dass das vorgeschaltete Supabase-Gateway `x-forwarded-for` vertrauenswürdig setzt.
Die Gateway-Konfiguration und echte konkurrierende Requests sind vor
Produktivfreigabe separat zu prüfen. Kurze Raumcodes bleiben ein bewusstes
Pilotmerkmal; sie sind kein Ersatz für individuelle Klassenberechtigungen.

## SR-001 · `image-size` über vinext

- **Stand:** 12. August 2026
- **Status:** Beobachtung, zwei offene `npm audit`-Meldungen mit Schweregrad hoch in derselben indirekten Abhängigkeit.
- **Hinweis:** vinext verwendet indirekt `image-size@2.0.2`. Die Meldungen betreffen Endlosschleifen beim Parsen speziell präparierter ICNS-, JXL- oder HEIF-Dateien. Bildparser sind deshalb ein sensibler Verarbeitungspfad und werden vor Einführung von Uploads erneut geprüft.
- **Reichweite:** indirekte Build-/Bildverarbeitungsabhängigkeit; Lernraum akzeptiert derzeit keine Bild-Uploads und verarbeitet keine fremden Bilder über diesen Pfad.
- **Gegenmaßnahmen:** keine Verarbeitung nicht vertrauenswürdiger Bilddateien, keine Bild-Uploads, wöchentliche Abhängigkeitsprüfung und erneutes Threat Modeling vor Upload-Funktionen. `npm audit fix` hat die übrigen vier Meldungen ohne Versionsbruch beseitigt.
- **Aktuelle Prüfung:** `npm audit` meldet am Stichtag zwei hohe Meldungen über `vinext → image-size`. Die angebotene automatische Behebung würde vinext inkompatibel auf `0.0.45` zurückstufen und wird deshalb nicht angewendet.
- **Neubewertung:** vor Einführung von Uploads oder spätestens beim nächsten Meilenstein.

## SR-002 · Klassenstempel für die Schreiberleichterung

- **Stand:** 2. Oktober 2026
- **Status:** Bewusst akzeptiertes Restrisiko (Entscheidung 50).
- **Hinweis:** Es gibt weder Logins noch verifizierte Lehrkräfte; jeder kann den Lehrerbereich öffnen. Jede Klasse hat ein ECDSA-P-256-Schlüsselpaar. Der Raum trägt nur den SHA-256-Abdruck des öffentlichen Schlüssels (`classSeal`). Die Freigabe der Schreiberleichterung wird vom Klassenschlüssel signiert und liegt im Einschreibe-QR; das Schülergerät prüft Signatur, Passung zur Mitgliedschaft und Abdruck.
- **Geschützt gegen:** selbst ausgestellte Freigaben im Raum der echten Lehrkraft, manipulierte Freigaben (andere Mitgliedschaft, andere Klasse) und das Ändern des Schlüssels im QR. Ohne Klassenwahl beim Raumstart wirkt keine Freigabe.
- **Nicht geschützt gegen:** (1) Ein Kind kann in einer selbst gehosteten Runde mit selbst angelegter Klasse Erleichterung vergeben. Das verschafft keinen Vorteil gegenüber anderen und lässt sich ohne verifizierte Lehrkräfte nicht verhindern. (2) Der private Klassenschlüssel liegt nur auf dem Lehrergerät beziehungsweise in dessen Sicherung (Gesamt-Export); wer die Sicherung hat, kann Freigaben ausstellen. Geht der Schlüssel verloren, stellt die Lehrkraft neue QR-Codes aus.
- **Datenschutz:** Keine LRS-Information an Server, Raum oder andere Geräte. Der Raum erhält nur den Abdruck, keine Klassen-ID und keinen Namen; Toleranz und Platzierung entstehen lokal.
- **Neubewertung:** bei Einführung von Lehrerkonten oder gemeinsam genutzten Geräten.
