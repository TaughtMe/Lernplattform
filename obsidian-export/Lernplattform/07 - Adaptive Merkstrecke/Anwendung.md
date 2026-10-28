---
umsetzungsstand: Teilweise implementiert
audit: "[[Lernraum – Gesamtaudit – 2026-10-19]]"
---

# Adaptive Merkstrecke

> **Umsetzungsstand laut Gesamtaudit vom 19./20.10.2026: Teilweise implementiert.** Die sechs Merkstufen, Wortboxen, Prozentwert, Bestwert und Laufzettel sind umgesetzt; Runden werden dauerhaft gespeichert (Dexie-Version 6). Die beschriebene **automatische Anpassung von Hilfen und Verzögerungen ist nicht umgesetzt**; die Stufe wählt das Kind (D-003). Befunde: Abschreiben hebt Box und Merkstufe, „Wort zeigen“ schützt besser als ein Fehlversuch (D-001, F-001), Längenstriche verraten die Entscheidung (D-002), Stufe 5 wertet Leerzeichen-Eingaben als Fehler (G-001), Inhaltsfehler in Wortboxen (D-006), belastende Wörter (E-005). Tastschreiben: implementiert (D-014). Details: [[../21 - Qualitätsgrundlage und Freigabe/Lernraum – Gesamtaudit – 2026-10-19|Gesamtaudit 2026-10-19]].

> **Nachtrag Welle 3 (27.10.2026):** Zu D-003 gibt es eine Diagnostik-Vorschau mit Startpunkt, Kompetenzprofil und Tagestraining (Freigabe `diagnostik`); die automatische Anpassung von Hilfen in der Merkstrecke ist nicht Teil von D2. Details: `docs/umsetzungsplan-audit-welle-3.md`.


## Zweck

Die Merkstrecke trainiert nicht nur die richtige Antwort, sondern den Weg vom Wahrnehmen über das Behalten bis zum selbstständigen Abruf.

## Stufen

1. Wort ansehen und direkt wiedergeben
2. Wort verdecken und schreiben
3. Wort nach kurzer Verzögerung schreiben
4. mehrere Wörter behalten
5. Wortgruppen behalten
6. Satzteile behalten
7. vollständige Sätze rekonstruieren

## Mögliche Hilfen

- Silben und Wortbausteine
- farbige Schlüsselstellen
- Sprachausgabe
- Bilder
- Sinnabschnitte
- gestufte Buchstabenhinweise
- schrittweises Entfernen der Vorlage

## Anpassung

Die App wählt Hilfen und Verzögerungen anhand bisheriger Fehler. Erfolgreiche Hilfen werden schrittweise reduziert, damit der Abruf selbstständiger wird.

## Sechsstufiger Lernweg für Lernwörter

| Stufe | Darstellung | Lernhandlung |
|---|---|---|
| 1 | vollständiges Wort sichtbar | fehlerfrei abschreiben |
| 2 | wenige Buchstaben fehlen | Lücken ergänzen |
| 3 | viele Buchstaben fehlen | Wort weitgehend rekonstruieren |
| 4 | Wort kurz ansehen, dann verdecken; Striche zeigen die Wortlänge | vollständiges Wort aus dem Gedächtnis tippen |
| 5 | mehrere Wörter gleichzeitig ansehen | Wörter merken und anschließend ohne feste Reihenfolge tippen |
| 6 | nur das gesprochene Wort, kein Schriftbild, keine Längenstriche | gehörtes Wort schreiben |

Fehlerfrei und ohne Hilfe führt zur nächsten Merkstufe. Eine falsch abgesendete Lösung oder verwendete Hilfe hält das Wort in der Stufe. Wiederholte Fehler können zu einer niedrigeren Merkstufe führen.

Der Wortspeicher ist im freien Deutschbereich umgesetzt (Entscheidung 55). Er lässt alle sechs Stufen mit eigenen Wörtern ausprobieren, zeigt Hilfen bewusst als aufstiegshemmend und empfiehlt nach wiederholten Fehlern eine leichtere Stufe. Die Ergebnisse gelten zunächst nur für die laufende Runde; die dauerhafte Kopplung an den getrennten Leitner-Stand folgt mit dem Lernwort-Datenmodell.

Die Bedienung folgt einem durchgängigen Schreibfluss: Sobald eine Eingabe erwartet wird, erhält sie automatisch den Tastaturfokus. **Enter** prüft eine Antwort beziehungsweise führt nach einer Merkanzeige zur Eingabe. Eine richtige Lösung wird nur kurz mit einem grünen Haken bestätigt und wechselt automatisch zum nächsten Wort. In Stufe 4 werden die Buchstaben direkt auf den sichtbaren Längenstrichen eingegeben; ein getrenntes Eingabefeld darunter ist ausgeschlossen. Stufe 5 verwendet **Umschalt + Enter** für eine zusätzliche Zeile, während Enter die vollständige Antwort prüft.

Feste Sammlungen dienen als Wortbanken und enthalten im ersten Ausbau jeweils mindestens 100 Wörter. Eine konkrete Lernrunde übernimmt daraus standardmäßig nur 10 über die gesamte Sammlung verteilte Wörter; alternativ sind 5, 20 oder die vollständige Wortbank wählbar. Dadurch bleibt eine Runde überschaubar, ohne dass die inhaltliche Breite der Sammlung verloren geht. **Merkwörter & Fremdwörter** bilden eine eigene Sammlung: Wo keine verlässliche Regel greift, wird keine Strategie vorgetäuscht, sondern das Wortbild bewusst eingeprägt.

In Stufe 5 wählt der Schüler eine Blockgröße von beispielsweise 1, 2, 3 oder 5 Wörtern. Eine größere Blockgröße bringt einen Merkbonus, darf sorgfältiges und fehlerfreies Schreiben aber nicht überkompensieren. Ein optionaler Sequenzmodus kann später zusätzlich die Reihenfolge prüfen.

### Wortboxen, Prozentwert und Übernahme

Wörter liegen in **Wortboxen**: feste Wortboxen (vorbereitete Sammlungen, kopierbar), eigene Wortboxen (lokal gespeichert, bearbeitbar) und „Aus dem Unterricht“ (aus dem Laufdiktat). Das Kind wählt Wortbox und Merkstufe für eine **Runde**; sie ergibt einen **Prozentwert** (Wörter auf Anhieb richtig ÷ Wörter der Runde, Selbstkorrektur und Hilfe zählen nicht). Bestwert, letzter Wert und Anzahl der Runden je Wortbox und Stufe werden aus den Runden abgeleitet; Verlauf, Fortschrittsabschnitt und Laufzettel zeigen sie. Stufe 5 wird je Wort bewertet.

Stufe 6 spricht nur das einzelne Wort mit der besten deutschen Stimme des Geräts. Die Stimme wird beim Start vollständig vorbereitet (stummer Aufwärmton), damit schon das erste Wort vollständig und in guter Stimme zu hören ist. Gleich klingende Wörter tragen eine Bedeutungshilfe. Nach einem Fehler zeigt ein Buchstabenvergleich, wo der Unterschied liegt.

Beim Text-Laufdiktat entscheidet die Lehrkraft, ob falsch geschriebene oder alle Wörter in den Wortspeicher der Kinder übernommen werden. Das geschieht nur auf dem Schülergerät; falsch geschriebene Wörter werden sofort fällig.

## Tastschreibtraining als eigener Bereich

Das Tastschreibtraining nutzt dieselbe positive Rückmeldung, bleibt aber fachlich von Rechtschreibung und Merkfähigkeit getrennt. Der Lernweg führt von Grundstellung und Buchstabenreihen über Großbuchstaben, Umlaute, Satzzeichen und Buchstabenfolgen bis zu Wörtern, Sätzen und freien Abschreibtexten.

Erfasst werden Anschläge pro Minute, Genauigkeit, Korrekturen, unsichere Tasten, typische Verwechslungen sowie auffällige Pausen. Auf Geräten mit Bildschirmtastatur wird Tippgenauigkeit trainiert; echtes Zehnfingerschreiben setzt eine physische Tastatur voraus. Es gilt: erst Genauigkeit, dann Geschwindigkeit.
