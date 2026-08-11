# Gemeinsames Datenmodell

## Zweck

Alle Anwendungen benötigen ein gemeinsames, versioniertes Austauschformat, vorläufig **LearningBundle v1**.

## Kernobjekte

- Vokabel
- Bedeutung und alternative Antworten
- Sprache und Abfragerichtung
- Herkunft und stabile Quell-ID
- Stapel und Tags
- Lernstand „gewusst“
- Lernstand „geschrieben“
- Leitner-Box und Fälligkeit
- Lernereignis
- Herkunft des Lernereignisses: Lernmodus, Test, LernBox, Battle oder Duell
- Test- oder Runden-ID, Antwortform und verwendete Hilfe
- Merkstufe, Eingabekorrekturen und Merkspanne
- Synchronisationsstatus
- Duell- und Punktereignis
- Klassenmitgliedschaft mit stabiler pseudonymer ID
- QR-Leistungsbrief mit Turnus-ID, Standnummer, Paket-ID und Signatur
- lokaler Abgabestatus je Turnus oder Aufgabenpaket
- Datenformat-Version

## Anforderungen

- stabile IDs
- lokale und externe IDs sauber trennen
- Dubletten erkennen
- Änderungen versionieren
- Lernstände bei Inhaltsupdates bewahren
- Migrationen zwischen Datenformat-Versionen ermöglichen
- Ereignis-IDs gegen doppelte QR-Auswertung
- idempotente QR-Übernahme: doppelte und ältere Standnummern verändern den Lehrerstand nicht
- Export ohne Abhängigkeit von einem Anbieter

## Erweiterbare Lernobjekte

Version 1 bleibt bewusst auf Vokabeln begrenzt. Das Datenmodell erhält jedoch einen erweiterbaren Lernobjekttyp:

- **Vokabel:** stabile ID, Sprachen, Bedeutungen und Abfragerichtungen
- **Lernwort:** Zielschreibung, Rechtschreibphänomene, Merkstufe und Herkunft
- **Mathematische Kompetenz/Aufgabenfamilie:** Kompetenz-ID, Thema, Schwierigkeit und Strategie statt einer einzelnen gespeicherten Aufgabe

Lernereignisse bleiben unveränderlich. Projektionen wie Boxstand, Fälligkeit, Merkstufe und Punkte werden aus ihnen abgeleitet. So können Fehler aus einem Laufdiktat später passende Lernobjekte aktivieren, ohne Inhalte zu duplizieren.

## Nutzen

Laufdiktat, LernBox, Lehrer-Cockpit und Duelle können getrennt entwickelt werden, bleiben aber miteinander kompatibel.
