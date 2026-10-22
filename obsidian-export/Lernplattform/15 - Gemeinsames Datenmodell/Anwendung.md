---
umsetzungsstand: Teilweise implementiert
audit: "[[Lernraum – Gesamtaudit – 2026-10-19]]"
---

# Gemeinsames Datenmodell

> **Umsetzungsstand laut Gesamtaudit vom 19./20.10.2026: Teilweise implementiert.** `LearningBundleV1` und versionierte Lernereignisse sind umgesetzt. Der Satz „Version 1 bleibt bewusst auf Vokabeln begrenzt“ ist für Lernereignisse **überholt** (Mathe-, Textbox- und Lernwort-Ereignisse); übertragbar bleiben nur Vokabeln. Projektionen werden nur für Mathe aus Ereignissen abgeleitet (A-003). Strikte Schemata lassen ein einziges unbekanntes Feld alle Projektionen scheitern (A-001). Details: [[../21 - Qualitätsgrundlage und Freigabe/Lernraum – Gesamtaudit – 2026-10-19|Gesamtaudit 2026-10-19]].


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
- Fach und optionales Sprachpaar
- Quellenverknüpfung: selbst angelegt, Lehrkraftpaket, Laufdiktat oder andere Lernaktivität
- Inhaltspaket mit stabiler Paket-ID, Inhaltsversion und Ablaufmetadaten
- temporärer Transferraum mit Erstellungs- und Ablaufzeit, aber ohne Schülerzuordnung
- Duell- und Punktereignis
- Klassenmitgliedschaft mit stabiler pseudonymer ID
- bereitgestellter Lehrkraftinhalt als zusätzliche Quelle im persönlichen Lernraum
- Tagesübung mit Auslöser „fällig“, „Fehler“ oder „Lehrkraft“
- optionaler Klassenkontext im Lernereignis mit Klassen-ID, Aufgaben-ID und Rankingfreigabe
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
- idempotente Paketübernahme ohne Zurücksetzen persönlicher Lernstände
- fachliche Identität nicht allein aus sichtbarem Text ableiten
- abgelaufene Transferpakete serverseitig unlesbar machen und löschen

## Erweiterbare Lernobjekte

Version 1 bleibt bewusst auf Vokabeln begrenzt. Das Datenmodell erhält jedoch einen erweiterbaren Lernobjekttyp:

- **Vokabel:** stabile ID, Sprachen, Bedeutungen und Abfragerichtungen
- **Lernwort:** Zielschreibung, Rechtschreibphänomene, Merkstufe und Herkunft
- **Mathematische Kompetenz/Aufgabenfamilie:** Kompetenz-ID, Thema, Schwierigkeit und Strategie statt einer einzelnen gespeicherten Aufgabe

Lernereignisse bleiben unveränderlich. Projektionen wie Boxstand, Fälligkeit, Merkstufe und Punkte werden aus ihnen abgeleitet. So können Fehler aus einem Laufdiktat später passende Lernobjekte aktivieren, ohne Inhalte zu duplizieren.

## Nutzen

Laufdiktat, LernBox, Lehrer-Cockpit und Duelle können getrennt entwickelt werden, bleiben aber miteinander kompatibel.
