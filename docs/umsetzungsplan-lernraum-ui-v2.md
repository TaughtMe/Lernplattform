# Umsetzungsplan „Lernraum UI“ v2: vom Design aus bauen

Stand: 29.09.2026 · Branch `claude/lernraum-ui-v2` (abgezweigt von `claude/lernraum-ui`)

## Warum v2

In Phase 0–12 (siehe [umsetzungsplan-lernraum-ui.md](umsetzungsplan-lernraum-ui.md)) wurden die bestehenden Seiten ins Design umgebaut. Dadurch bestimmten die alte Seitenstruktur, die alten Texte und die alte Reihenfolge weiter das Ergebnis. Das Design war angenähert, aber nicht identisch.

v2 dreht die Richtung um:

1. **Zuerst die Oberfläche.** Jeder Screen der Vorlage wird als reine Ansicht (`app/views/`) umgesetzt, mit Beispieldaten, ohne Speicher und ohne Supabase.
2. **Messbar identisch.** Jeder Zustand wird automatisch Pixel gegen Pixel mit einem Referenzbild aus der Vorlage verglichen.
3. **Erst danach anbinden.** Pro Screen verbindet ein Hook die Ansicht mit dem vorhandenen Kern (`src/domain`, `src/storage`, Supabase-Verträge). Jede Anbindung ist eine eigene, getestete Scheibe.

Fachlogik, Speicherung, Datensicherung, Freigaberegister, Supabase-Verträge und Tests bleiben unverändert erhalten.

## Bausteine

| Teil                 | Ort                                                 | Zweck                                                                                                   |
| -------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Design-Tokens        | `app/ui/tokens.css`                                 | Farben, Schriften, Radien aus der Vorlage, hell und dunkel                                              |
| Schriften            | `@fontsource-variable/work-sans`, `…/fredoka`       | lokal ausgeliefert statt von Google Fonts (Datenschutz, offline, gleiche Dateien wie in den Referenzen) |
| Ansichten            | `app/views/<bereich>/<screen>.tsx` + CSS-Modul      | reine Darstellung, Zustand und Aktionen nur über Props                                                  |
| Gemeinsame Bausteine | `app/views/parts/`                                  | Knöpfe, Chips, Tierbild, Typografie- und Boxmodell-Grundlage (`.view`)                                  |
| Beispieldaten        | `app/views/<bereich>/demo.ts`                       | Daten der Vorlage für Katalog und Vergleich                                                             |
| Katalog              | `/entwicklung/screens`, `/entwicklung/screens/<id>` | jede Ansicht in exakter Rahmengröße, nur in der Entwicklung erreichbar                                  |
| Referenzzustände     | `docs/design/screens.json`                          | welcher Screen, welche Größe, welche Klicks im Canvas                                                   |
| Referenzbilder       | `docs/design/referenz/<id>.png`                     | erzeugt mit `npm run design:references` aus `lernraum-ui.dc.html`                                       |
| Vergleichstest       | `e2e/design/design-fidelity.spec.ts`                | `npm run test:design`, Chromium, Toleranz 1,2 % der Pixel (Kantenglättung, proportionale Balken)        |
| Typen der CSS-Module | `*.module.css.d.ts`                                 | erzeugt mit `npm run css-types`; `npm run typecheck` prüft, dass sie aktuell sind                       |

### Was die Vorlage technisch vorgibt

Beim Nachmessen der Vorlage fielen drei Browser-Standards auf, die das Aussehen prägen. Die Grundlage `.view` in `app/views/parts/parts.module.css` bildet sie nach:

- **Schrift in Schaltflächen:** Buttons erben in der Vorlage die Schrift nicht. Sie zeigen die Standardschrift des Browsers für Bedienelemente: San Francisco auf Apple-Geräten, Segoe UI unter Windows, sonst Arial. Token `--font-control`. Soll es später doch Work Sans sein, genügt eine Zeile.
- **Boxmodell:** Nur Buttons und Auswahlfelder messen mit Rahmen (border-box), alle übrigen Elemente ohne (content-box), inklusive Standard-Innenabständen.
- **Zeilenhöhe:** `normal` statt 1,5.

### Bewusste Abweichungen von der Vorlage

- `--ink3` ist für WCAG-AA-Kontrast leicht nachgedunkelt bzw. aufgehellt.
- Fehlerbalken im Live-Screen sind proportional zur Fehlerzahl; die Vorlage zeigt feste Beispielbreiten.
- Der Raumcode bleibt vierstellig numerisch (Supabase-Vertrag). Die Beispieldaten nutzen „4K2P“ nur, um die Vorlage exakt abzubilden.

## Reihenfolge

Jeder Schritt endet mit grünem Designvergleich, grünen statischen Prüfungen und Freigabe der Ansicht durch die Projektverantwortliche Lehrkraft im Katalog, bevor die Anbindung beginnt.

| Schritt | Screens                    | Ansicht                            | Anbindung                                                                                                           |
| ------- | -------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1       | Grundlage                  | ✅ Tokens, Schriften, Vergleich    | –                                                                                                                   |
| 2       | 2a Startseite              | ✅                                 | ✅ `/`: Tierprofil, Raumcode, QR-Scanner; Tier → eigener Lernraum                                                   |
| 3       | 5a/5b Laufdiktat Schüler   | ✅ alle Phasen, hell/dunkel        | ✅ `/raum`: Stationen, Halten/Lesen/Schreiben, Hilfen, Battle-Leiste, Ergebnis; Beitritt und Lobby im Schülerrahmen |
| 4       | 5c/5d Laufdiktat Lehrkraft | ✅ alle Schritte, Optionen-Overlay | ✅ `/lehrer/live`: Text/Vokabeln/Mathe, Satz/Zeile/Wort, Sortieren, Datei, Modi, Optionen, Lobby mit QR, Live, CSV  |
| 5       | 4a–4c LernBox              | ✅ Leiste einklappbar, hell/dunkel | ✅ `/lernbox`: Ordner, Stapel, Modus/Richtung (auch gemischt), Runde, Vorlesen, Vokabelliste, Import                |
| 6       | 2b/3a/3b Dashboard         | ✅ 3a/3b, Schülerrahmen, Üben      | ✅ `/lernen`: Tagesziel, Woche, heute fällig, schwierige Wörter; `/ueben`: Bereichskacheln                          |
| 7       | 4d–4f Wortspeicher         | offen                              | offen                                                                                                               |
| 8       | 1d/2c/3c/3d Lehrerbereich  | offen                              | offen                                                                                                               |
| 9       | 6a–6c Tastenwelt           | ✅ Lernweg, Übung, Ergebnis        | ✅ `/frei/typing`: Stationen, Fehler-Stopp, Serie, Sterne, Tasten-Extra                                             |
| 10      | 7a–7c Häuser               | offen                              | offen                                                                                                               |

Bereiche ohne Vorlage (Klassenverwaltung, Material, Aufgaben, Kopfrechnen) bleiben bis zu einem eigenen Design in ihrer jetzigen Form und werden über das Freigaberegister gesteuert.

## Stand der Anbindung (29.09.2026)

- **Startseite `/`** nutzt die Ansicht 2a. Sie füllt genau den Bildschirm ohne Scrollen und zeigt „Lehrer-Login“. Das Tier führt in den eigenen Lernraum; die Tierwahl liegt im Profil. Impressum und Datenschutz stehen klein unter dem Raumcode, weil der Seitenfuß auf Vollbild-Screens entfällt.
- **Laufdiktat Lehrkraft `/lehrer/live`** nutzt die Ansicht 5c/5d ohne Lehrer-Seitenleiste; Hell/Dunkel sitzt oben rechts. Der Adapter `app/lehrer/live/dictation-adapter.ts` übersetzt zwischen Kern und Ansicht.
- **Vokabeln und Mathe im Lehrer-Laufdiktat** haben eigene Editoren nach dem Aufbau des Original-Laufdiktats, im Lernraum-Design (`app/views/laufdiktat/vocabulary-editor.tsx`, `math-editor.tsx`): Vokabelheft mit Sprachwahl (steuert das Vorlesen), weiteren Antworten, Abfragerichtung, Groß-/Kleinschreibung, Übernahme in die LernBox, Tabelle einfügen und Datei-Import; Mathe mit Rechenarten, Bis und Anzahl, Aufgabenliste (bearbeiten mit Rechenzeichen-Leiste, neu würfeln, löschen, hinzufügen) und Vorschau, die per Zahnrad zu Zahlenraum, Regeln, Lückenaufgaben und Einmaleins-Reihen umschaltet. In der Lücken-Vorschau wird die Lücke je Aufgabe gewählt.
- **Vorerst ausgeblendet, weil der Entwurf sie nicht zeigt:** eigene Trennzeichen, Marker-Modus und manuelle Abschnitte, Abschnitte ausschließen, Teilnehmende entfernen, großer QR-Code. Die Logik dafür bleibt im Hook `useTeacherLiveRoom` erhalten und kommt mit eigenem Entwurf zurück.
- **Freigaben:** Lernbereiche und Lehrerbereich stehen auf `frei` (Entscheidung 48). Motivation und Duell bleiben `aus`.
- **Schülerrahmen:** Seitenleiste (ab 900 px) bzw. Tab-Leiste unten mit Lernen · Üben · Raum; Duell und Haus nur bei Freigabe. Zahnrad → Profileinstellungen. Hell/Dunkel oben rechts im Seitenkopf. Beim ersten Besuch wird ein zufälliges Tier angelegt. Die Boxmodell-Grundlage `.view` gilt im Rahmen nur für die Navigation; Seiten im Inhalt bringen ihre eigene mit, ältere Seiten messen weiter mit border-box. Auch Raum-Beitritt, Lobby und Rundenende liegen im Rahmen; nur das laufende Spiel bleibt Vollbild.
- **Rahmen im Root-Layout (`AreaFrame`):** Schüler- und Lehrerrahmen sitzen im Root-Layout und bleiben beim Seitenwechsel stehen (kein Neuaufbau, kein Flimmern). Seiten liefern nur Inhalt; das laufende Raum-Spiel blendet die Navigation mit `useFullscreenFrame` aus. Beide Rahmen zeigen einen kompakten Seitenfuß (Impressum, Datenschutz, Version mit Update-Hinweis) im Bild; im Lehrerbereich sitzt Hell/Dunkel oben rechts, das Laufdiktat behält die Lehrer-Seitenleiste.
- **Laufdiktat im Unterricht:** QR in der Lobby vergrößerbar (Vollbild mit Code und Zahl der Beigetretenen), im Live-Schritt Raumcode in der Fußzeile mit QR für spätere Beitritte. Lehrkraft sieht je Schüler „übt weiter“ (Raumseite verlassen, allein weiterüben) oder „getrennt“; die Anwesenheit beim Weiterüben endet mit der Runde oder 45 Minuten nach dem letzten Besuch der Raumseite.
- **Lernen `/lernen`** nutzt 3a (Desktop) bzw. 3b (mobil): Tagesring, Weiterlernen, Woche, heute fällig, schwierige Wörter. Serie und Duell erscheinen nur, wenn Motivation bzw. Duell freigegeben sind.
- **Üben `/ueben`**: eine große Kachel je Übungsbereich mit eigenem Symbol.
- **Tastenwelt `/frei/typing`** zeigt statt des Lernwegs (6c) alle Lektionen als Karten, nach Bereichen gegliedert (Entwurf aus dem Feedback): Kartenfarbe Bronze ab 90 %, Silber ab 94 %, Gold ab 97 % bester Genauigkeit, vier wechselnde Glanz-Muster, das eigene Tier wippt auf der aktuellen Lektion; lange Namen werden in der Karte umbrochen und gekürzt. Übung nach 6a/6b. Falsche Tasten zählen, der Cursor bleibt stehen (Fehler-Stopp). Unsichere Tasten werden als Wärmebild gezeigt und im „Tasten-Extra“ geübt. Auf dem Desktop ist die Aufgabe so hoch wie ihr Text; Tastatur und Buchstaben wachsen mit Breite und Höhe des Fensters (Tastatur bis 1240 px), damit die Übung ohne Scrollen auf den Bildschirm passt.
- **Vorerst ausgeblendet (Tastenwelt):** Buchstabenregen, Ziffernblock, Einstellungen zu Tastaturhilfe, XP und Level.
- **Ohne Navigationseintrag:** Klasse, Material, Aufgaben und Fortschritt sind per Adresse erreichbar, haben aber noch keinen Platz in der neuen Navigation. Ihr Zugang wird mit dem Klassen- und Lehrerentwurf festgelegt.
- **Laufdiktat Schüler `/raum`** nutzt 5a/5b für das laufende Spiel. Die Ansicht hat dafür optionale Ergänzungen, die ohne Angabe genau die Vorlage zeigen: Bezeichnung Satz/Wort/Aufgabe, Formeln, Zähler, Vorlesen, Hinweise, Aufdecken per Knopf, Buchstabenhilfe und Abschreibvorlage, Rückmeldung, strenger Tippmodus, Stationen blättern und Ergebnis mit Sternen und Links. Per Knopf Aufgedecktes bleibt sichtbar, bis „Jetzt schreiben“ kommt; Halten mit zwei Fingern oder der Maus wie im Original.
- **Battle:** Die Vorlage zeigt Battle als eigenen Abschnitt mit Abschreibtext. Im Spiel bleibt es beim Ablauf des Originals (Halten, Lesen, Schreiben); Ladung, Tinte, Flimmern, Schild und Zielauswahl stehen als Leiste darüber.
- **LernBox `/lernbox`** nutzt 4a (Übersicht mobil), 4b (Karte mobil) und 4c (Desktop, Leiste einklappbar, Zustand je Gerät gemerkt). Ordner fassen Stapel zusammen (z. B. „Buch Klasse 5“). Richtung auch gemischt; während einer Runde sind Modus und Richtung gesperrt, bis sie beendet ist. Vorlesen von Frage und Lösung in der Sprache des Stapels. Vokabelliste mit Suche, Sortierung (Alphabet, Box, Tag, Datum, Stapel), Bearbeiten, Mehrfachauswahl zum Üben, Verschieben, Taggen und Löschen. Massenimport per Einfügen oder Datei (Tab oder Semikolon, dritte Spalte Tag, Alternativen mit „|“). Adapter: `app/components/learning-box-app.tsx`, Ansicht: `app/views/lernbox/lernbox-screen.tsx`.
- **Laufdiktat → LernBox:** Schaltet die Lehrkraft im Vokabelheft „In die LernBox übernehmen“ ein, landen die Vokabeln nach der Runde in der LernBox der Schüler, platziert nach Ergebnis: sicher gewusst startet in Box 2, Übungsbedarf (Fehlversuche, Hilfe, nicht erreicht) in Box 1 und sofort fällig; vorhandene Karten werden nur bei Übungsbedarf angefasst (Entscheidung 49). Optionen im Vokabelheft: „Alle Vokabeln übernehmen“, „Nur Übungsbedarf übernehmen“ (Standard), Nichts. Die Übernahme läuft auch, wenn die Lehrkraft die Runde vorzeitig beendet, und wirkt pro Runde und Gerät einmal. Hilfen pro Wort bleiben lokal im Sitzungsspeicher. Tag: eigener Tag der Vokabel, sonst der Standard-Tag aus den Lehrer-Einstellungen. Persönliche Lernereignisse aus dem Live-Spiel bleiben während des Pilots aus.
- **Cloud-Synchronisation (Grundlage):** WebDAV sofort nutzbar, OneDrive und Google Drive vorbereitet, bis die Konten eingerichtet sind; siehe [cloud-sync.md](cloud-sync.md).
- **Aufgaben der Lehrkraft** stehen vorerst auf `vorschau` (`lehrer-aufgaben`) und kommen später.
- **Laufdiktat → LernBox:** Runden-Tag im Vokabelheft (Vorschlag aus den Einstellungen), eigener Tag je Vokabel geht vor. In Stationen wird nicht übernommen, weil sich dort mehrere Kinder ein Gerät teilen.
- **Noch in alter Oberfläche (im neuen Rahmen):** Wortspeicher, Kopfrechnen, Laufdiktat allein, Klassenseiten und Lehrerbereich `/lehrer`, bis ihre Screens an der Reihe sind.

## Regeln für die Anbindung

- Ansichten bleiben rein: keine Speicherzugriffe, kein Supabase, keine Zeit- oder Zufallsquellen in `app/views/`.
- Pro Screen ein Hook, der `[props]` für die Ansicht liefert; Tests für den Hook und für die Route.
- Verhalten gegen die Original-Repos (Laufdiktat, LernBox) prüfen, z. B. mit [laufdiktat-parity.md](laufdiktat-parity.md).
- Alte Screens und ihre Stile werden erst gelöscht, wenn die neue Route angebunden ist. Am Ende bleiben von `lernraum-ui.css` nur die Teile, die noch genutzt werden.
