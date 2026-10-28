---
umsetzungsstand: Teilweise implementiert
audit: "[[Lernraum – Gesamtaudit – 2026-10-19]]"
---

# Datenschutz und Rollen

> **Umsetzungsstand laut Gesamtaudit vom 19./20.10.2026: Teilweise implementiert.** Technische Trennung der Datenbereiche, Pseudonyme im Raum und lokale Namenszuordnung sind umgesetzt. Offen bzw. abweichend: Rechtsrahmen (AVV, Verzeichnis, DSFA, Freigabe) fehlt (B-011, rechtlich zu prüfen); die Schreiberleichterung steht lesbar im Einschreibe-QR und ist in der projizierten Einzelansicht an der Größe erkennbar (B-008) und wirkt für das Gerät statt für das Kind (E-001); keine Personentrennung auf geteilten Geräten (B-009, B-010). Details: [[../21 - Qualitätsgrundlage und Freigabe/Lernraum – Gesamtaudit – 2026-10-19|Gesamtaudit 2026-10-19]].

> **Nachtrag Welle 3 (27.10.2026):** Zu B-009 sperrt der Tafelmodus die Personenbereiche; auf „Mein Gerät“ schützt eine PIN-Sperre sie nur als Sichtschutz, nicht verschlüsselt (Vorschau, Freigabe `lehrer-geraet`). Details: `docs/umsetzungsplan-audit-welle-3.md`.


## Grundsatz

So wenige personenbezogene Daten wie möglich übertragen und speichern. Pseudonymisierte Daten bleiben personenbezogen, sobald eine Rückzuordnung möglich ist.

## Drei mögliche Stufen

### Temporäre Klassenansicht

- neuer Zufallsalias je Anzeige
- keine Namen und keine dauerhafte ID
- Daten nur für die laufende Darstellung
- automatische Löschung beim Beenden

### Pseudonyme Klassenstatistik

- dauerhafter Tiername oder Schülercode
- ausschließlich lokale Speicherung auf dem Lehrergerät
- einstellbare Löschfrist
- keine automatische Cloudübertragung

### Persönliche Lehrerübersicht

- Lehrkraft ordnet lokal einen Namen zu
- ausdrücklich zu aktivieren
- durch Gerätesperre, Betriebssystemkonto oder getrenntes Browserprofil schützen
- Export und Löschung ermöglichen
- vor Schuleinsatz rechtlich und organisatorisch prüfen

Ein zusätzlicher Lernraum-Login ist für die lokale Einzelplatznutzung nicht vorgesehen. Jeder Nutzer des entsperrten Geräteprofils kann den Lehrerbereich öffnen; deshalb dürfen persönliche Lehrerübersichten nicht auf gemeinsam mit Schülern verwendeten Profilen geführt werden. Eine optionale App-Sperre oder Kontotrennung bleibt eine spätere Anforderung für gemeinsam genutzte Geräte und mehrere Lehrkräfte.

Die Lehrkraft kann eine feste pseudonyme Mitgliedschaft ausschließlich lokal einem Klarnamen zuordnen. Übertragen wird keine Hardwarekennung. Bei QR-Abgaben erhält das Lehrergerät standardmäßig nur aggregierte Werte und den Abgabestatus, nicht die vollständige persönliche Lernhistorie.

## Schreiberleichterung (LRS) und Klassenstempel

Die Schreiberleichterung ist eine Information über ein Kind und bleibt deshalb lokal: Nur die Lehrkraft setzt sie per Haken in der Klassenliste. Sie reist ausschließlich im persönlichen Einschreibe-QR des Kindes, signiert mit dem Schlüssel der Klasse. In Räumen steht nur der Stempelabdruck der Klasse; Server, Raum und andere Geräte erfahren weder Klasse noch Namen noch LRS-Status. Toleranz und Platzierung entstehen auf dem Gerät des Kindes. Die Lehrkraft sieht ein tolerant angenommenes Wort als richtig. Es gibt kein Schalter im Schülerprofil. Restrisiken (selbst gehostete Runden, Schlüssel nur auf dem Lehrergerät) stehen in Entscheidung 50 und im Sicherheitsrisikoregister (SR-002).

## Persönliche Sicherungsziele

Bei einer freiwilligen Sicherung stellt die Plattform nur den technischen Anschluss an ein lokales Verzeichnis, Google Drive, Microsoft OneDrive oder einen vom Nutzer angegebenen WebDAV-Speicher bereit. Der Nutzer beziehungsweise die zuständige Schule entscheidet über Anbieter, Konto, Speicherort, Freigaben, Aufbewahrung und Löschung und trägt die Verantwortung für das bewusste Teilen sensibler Daten. Die Oberfläche muss diese Verantwortung vor der Aktivierung verständlich anzeigen.

Unabhängig davon bleiben sichere Schnittstellen, minimale OAuth-Berechtigungen, widerrufbare Verbindungen, transparente Datenschutzinformationen und der Schutz gespeicherter Zugangsdaten Aufgaben der Plattform. Eine Sicherung oder Freigabe erfolgt nie automatisch an Lehrkräfte oder andere Personen.

## Öffentliche Anzeige

Keine vollständige Rangliste von besten bis schwächsten Schülern. Besser sind Teamwerte, persönliche Verbesserungen, gemeinsame Ziele und freiwillig geteilte Erfolge.

## Zu klären

- schulischer Zweck und Rechtsgrundlage
- transparente Information
- Datenminimierung
- Zugriffsrechte
- Löschfristen
- Auftragsverarbeitung bei Cloud- oder Backenddiensten
- Abstimmung mit Datenschutzbeauftragten
