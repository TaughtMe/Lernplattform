# Prüfinstanz C – QA, UI/UX und Barrierefreiheit (Browser)

Gesamtaudit Lernraum, Commit `c30b916` (App-Version 0.8.0), Prüftag 20.10.2026.
Dritter Lauf dieser Prüfinstanz (zwei frühere Läufe brachen am Nutzungslimit ab,
ohne Bericht). Alle hier genannten Ergebnisse stammen aus diesem Lauf; Skripte
früherer Läufe wurden wiederverwendet und erneut ausgeführt.

> Stand: abgeschlossen am 20.10.2026 (dritter Lauf).

## 1 Untersuchte Dateien

Code (gezielt zu den Befunden gelesen, nicht vollständig):

- Schülerabläufe: `app/components/learning-word-app.tsx`, `app/views/wortspeicher/{round-screen,completion-screen,start-sheet}.tsx`, `app/views/wortspeicher/stage-copy.ts`; `app/frei/mathematics/mental-math-app.tsx`; `app/frei/german/laufdiktat/running-dictation-app.tsx`; `app/components/textbox-app.tsx`, `app/views/textbox/{run-layout,review-screen,library-screen}.tsx`, `src/domain/textbox-session.ts`; `app/views/tastenwelt/practice-screen.tsx`; `app/components/learning-box-app.tsx`, `app/views/lernbox/parts/{home,deck-grid,types,study}.tsx`, `src/domain/learning-box.ts`, `src/domain/learning-word-progress.ts`
- Startseite, Tagesportion, Empfehlungen, Fortschritt: `app/lernen/learner-home.tsx`, `app/lernen/use-learner-dashboard.ts`, `app/views/lernen/home-screen.tsx`, `src/storage/learning-recommendations.ts`, `src/storage/daily-plan.ts`, `src/domain/personal-learning-space.ts`, `app/lernen/fortschritt/page.tsx`, `app/components/adaptive-progress-panel.tsx`, `app/components/student-settings-panel.tsx`, `app/ueben/practice-overview.tsx`
- Gemeinsame Oberfläche: `app/ui/sheet.tsx`, `app/ui/base.css`, `app/ui/lernraum-ui.css` (Druck, Höhen), `app/raum/use-live-session-guards.ts`, `app/components/live-room-join.tsx`
- Lehrerbereich: `app/views/lehrer/teacher-frame.module.css`, `app/components/teacher-class-configurator.tsx`, `app/components/teacher-content-transfer.tsx`, `app/lehrer/live/hooks/{use-live-room-session,use-content-restore}.ts`
- Tests: `e2e/*.spec.ts` (14 Dateien), `e2e/accessibility-helpers.ts`, `playwright.config.ts`
- Vault/Doku: `obsidian-export/Lernplattform/24 - Textbox/Anwendung.md` (Merkzeit), `19 - Entscheidungsprotokoll/Anwendung.md` (Textbox-Ablauf); Berichte A, B, D (nur Überschriften und Top-5, zur Abgrenzung)

Abgrenzung zu anderen Prüfinstanzen: Speicherlöschung/Offline (B-002, B-013), Sicherung mit Ordnern (B-001), Lehrer-Login ohne Schutz (B-009), geteilte Schülergeräte (B-010), Leitner-Logik (A-004), Fehlerzustände als Leerdaten (A-002), Abdeckungskennzahl (A-005), Didaktik von Rückmeldung, Stufen und Fortschrittsmaßen (D-001, D-004, D-005, D-008, D-011, D-012, D-014) werden hier nur verwiesen, nicht erneut geprüft.

## 2 Ausgeführte Prüfungen (mit echten Ergebnissen)

Umgebung: Entwicklungsserver `vinext dev` auf `http://127.0.0.1:3002`
(Vorschau-Cookie gesetzt), Playwright mit Chromium 1194 (headless,
`/opt/pw-browsers/chromium`), `@axe-core/playwright` mit den Tags
`wcag2a, wcag2aa, wcag21aa, wcag22aa`. Emulierte Ansichten: iPad Hochformat
810×1080 (Touch, `isMobile`), iPad Querformat 1080×810, iPhone 14, 320×640,
200-%-Zoom (CSS-Ansicht 405×540, entspricht 810×1080 bei 200 %). Skripte und Screenshots liegen im
Scratchpad unter
`/tmp/claude-0/-home-user-Lernplattform/c2fe15db-371c-56e7-8bd8-eafd11c1a5af/scratchpad/repro-c/`.

| Prüfung                                                                                                                                                                                                                                                              | Ergebnis                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Routenrundgang 26 Seiten, iPad hoch hell (`sweep.mjs`)                                                                                                                                                                                                               | axe: 0 Verstöße auf allen 26 Seiten; kein horizontales Scrollen; Ziele < 24 px nur Fußzeilenlinks „Impressum/Datenschutz“ (14 px hoch) auf `/` und eine verborgene Datei-Eingabe; < 44 px u. a. Textbox-Karten „… üben“ (27 px hoch), Schwierigkeitsfilter (28 px breit), Lehrer-Live-Schritte (36–40 px); keine Konsolenfehler |
| Routenrundgang 26 Seiten, 320 px dunkel (`sweep.mjs w320 dark`)                                                                                                                                                                                                      | axe: `target-size` je 2× auf `/lernen/aufgaben` und `/frei/mathematics` (Ziel teilverdeckt durch die klebende untere Leiste am Bildschirmrand, nur bei Ausgangsscrollstellung); sonst 0; kein horizontales Scrollen                                                                                                             |
| Routenrundgang 26 Seiten, iPhone 14 und iPad Mini (`sweep.mjs iphone`, `sweep.mjs ipad-mini`)                                                                                                                                                                        | je 1× `target-size` (`/lernen/klasse` bzw. `/frei/german/textbox`), jeweils Element am unteren Rand teilverdeckt durch die klebende Leiste (Messartefakt der Ausgangsscrollstellung, gleiche Klasse wie bei 320 px); kein horizontales Scrollen; keine Konsolenfehler                                                           |
| axe in Zuständen mitten in der Runde, 4 Konfigurationen × 8 Zustände (`s-a11y.mjs`: 320 px, 200 % Zoom, iPad dunkel, iPad reduzierte Bewegung; Wortspeicher-Blatt, Stufe 4 Merken/Abruf/Rückmeldung, Textbox Merken/Schreiben, Kopfrechnen falsch, Tastenwelt Übung) | 0 Verstöße in allen 32 Zuständen; kein horizontales Scrollen; Hauptaktion jeweils sichtbar (Ausnahme: „Starten“ im Wortspeicher-Blatt bei 320 px erst nach Scrollen); bei `prefers-reduced-motion` laufen keine Animationen mehr (Tastenwelt sonst 2)                                                                           |
| Abbruch und Neuladen (`s-abort.mjs`, `s-abort3.mjs`)                                                                                                                                                                                                                 | keine Rückfrage in keinem Übungsmodul; Runde verloren in Wortspeicher, Kopfrechnen, Laufdiktat allein, Tastenwelt; Textbox bietet „weiterüben“ (C-001)                                                                                                                                                                          |
| Textbox Merkzeit mit `page.clock` (`s-textbox-timer.mjs`)                                                                                                                                                                                                            | Merkphase endet nach 60 s selbsttätig; keine Pause/Verlängerung (C-002)                                                                                                                                                                                                                                                         |
| Erstes Öffnen (`s1-first.mjs`)                                                                                                                                                                                                                                       | „Weiterlernen“ → `/frei/typing` (C-003)                                                                                                                                                                                                                                                                                         |
| Bildschirmtastatur emuliert (Ansichtshöhe 430/680 px; `s-kbd.mjs`, `s-typing-kbd.mjs`)                                                                                                                                                                               | Wortspeicher/Textbox: Feld und „Prüfen“ sichtbar; Tastenwelt quer: Vorlage 259 px oberhalb des sichtbaren Bereichs (C-004)                                                                                                                                                                                                      |
| Tastaturbedienung (`s-keyboard.mjs`, `s-focus2.mjs`, `s-live.mjs`, `s-ld-focus.mjs`)                                                                                                                                                                                 | Fokusrahmen überall 3 px sichtbar; Fokus in Runden gut geführt; Fokusverlust nach Schließen des Wortspeicher-Blatts; LernBox-Menü ohne Pfeiltasten; Laufdiktat allein ohne Fokus/Ansage (C-005, C-011)                                                                                                                          |
| Lehrerablauf Klasse + 24 Schüler + QR-Bogen (`s-teacher1.mjs`)                                                                                                                                                                                                       | 27 Klicks, kein Listenimport, axe 0                                                                                                                                                                                                                                                                                             |
| Druck QR-Bogen als PDF (`s-teacher-print.mjs`, `s-print2.mjs`)                                                                                                                                                                                                       | Desktop und iPad: 1 Seite, 12 von 24 Namen (C-006); Laufzettel (leer) je 1 Seite                                                                                                                                                                                                                                                |
| Lehrer Inhalte/Live/Freigabe ohne Supabase (`s-teacher2.mjs`, `s-teacher3.mjs`, `s-tsettings.mjs`)                                                                                                                                                                   | Inhalte-Anlage im Laufdiktat-Assistenten; Freigabe mit Demo-Werten vorbelegt; Meldungen in Entwicklersprache (C-010)                                                                                                                                                                                                            |
| Raum-Beitritt ohne Supabase (`s-raum.mjs`, `s-raum2.mjs`)                                                                                                                                                                                                            | Code-Übernahme aus der Startseite funktioniert (`/raum?code=4821`, Felder vorbelegt); nach „Beitreten“ nach ca. 1 s ehrliche Meldung „Live-Räume sind in dieser lokalen Vorschau noch nicht … verbunden“; Kamera: „Die Kamera konnte nicht geöffnet werden …“; axe 0                                                            |
| Mehrtägige Nutzung mit `page.clock` 19.10.–3.11. (`s-weeks.mjs`)                                                                                                                                                                                                     | Tagesportion wächst 0 → 1 → 7 → 12; Widersprüche bei „erledigt“/„schwierig“/„alles geschafft“ (C-008); Fortschrittsseite axe 0                                                                                                                                                                                                  |
| Neue Karten / Fälligkeit (`s-difficult.mjs`, `s-wortdue.mjs`)                                                                                                                                                                                                        | nie geübte Vokabeln als „Schwierige Wörter“; „üben wir noch einmal“ vs. „Noch nichts fällig“ (C-008)                                                                                                                                                                                                                            |
| Laufdiktat allein mit Fehlern (`s-laufdiktat.mjs`)                                                                                                                                                                                                                   | „Noch nicht richtig“ ohne Ort; Abschluss „★★★★★“ trotz 2 Fehlversuchen (didaktisch D-008); Tipps-Modus deckt Wörter stufenweise auf; axe 0                                                                                                                                                                                      |
| Kopfrechnen (`s-math.mjs`)                                                                                                                                                                                                                                           | Vorschau zeigt alle Aufgaben mit Ergebnis in Rundenreihenfolge (C-013)                                                                                                                                                                                                                                                          |
| Überschriften/Titel (`s-headings.mjs`)                                                                                                                                                                                                                               | `/lehrer/aufgaben` und `/lehrer/einstellungen` ohne `h1`; sonst schlüssig                                                                                                                                                                                                                                                       |
| Textabstand nach WCAG 1.4.12 (`s-spacing.mjs`: Zeilenhöhe 1,5, Buchstabenabstand 0,12 em, Wortabstand 0,16 em) auf Lernen, Wortspeicher, Textbox-Schreiben, LernBox                                                                                                  | kein horizontales Scrollen, kein abgeschnittener Text                                                                                                                                                                                                                                                                           |
| LernBox anlegen und üben (`s-lernbox2.mjs`)                                                                                                                                                                                                                          | Anlegen per Menü, 4 Karten, Schreibrunde mit 2 Fehlern, Abschluss „Gut gearbeitet · 2 gewusst · 2 noch zu üben“, Karteikarten mündlich; axe 0; Stapel „erledigt“ bei „Heute dran 1“ (C-008)                                                                                                                                     |
| Wortspeicher Stufe 1 mit Doppelkonsonant- und Großschreibfehler (`s-wort2.mjs`)                                                                                                                                                                                      | Rückmeldung buchstabengenau („3. Buchstabe fehlt: f“, „1. Buchstabe: groß statt klein“); Abschluss 60 %; „Nochmal üben“ startet mit anderen Wörtern (C-008); untere Leiste in der Runde aktiv, Wechsel nach `/lernen` ohne Rückfrage (C-001); axe 0                                                                             |
| Kinderprofil (`s-profil.mjs`)                                                                                                                                                                                                                                        | 198 Wörter, u. a. Cloud-Synchronisation/WebDAV (C-007)                                                                                                                                                                                                                                                                          |
| Lesbarkeit (`lix.py`, Wortzählung per `grep`)                                                                                                                                                                                                                        | Hinweistexte LIX 51–54; „Durchgang“ 67×, „Merkstufe“ 15× in Schüleransichten (C-007)                                                                                                                                                                                                                                            |
| Abdeckungsabgleich E2E (`grep` über `e2e/*.spec.ts`)                                                                                                                                                                                                                 | siehe C-014                                                                                                                                                                                                                                                                                                                     |

## 3 Nicht untersuchte Bereiche und Grenzen

- Kein WebKit/Safari, keine echten iPads: Safari-spezifisches Verhalten
  (Bildschirmtastatur, `visualViewport`, Speicherlöschung, Spracherkennung,
  Zurück-Wischgeste) ist nur emuliert oder gar nicht prüfbar.
- Headless-Chromium hat keine Sprachausgabe (`speechSynthesis` ohne Stimmen),
  kein Mikrofon und keine Kamera: Wortspeicher-Stufe 6 (Ansage), Vorlesen,
  QR-Scan per Kamera wurden nicht im Ablauf geprüft.
- Keine Bildschirmleser (VoiceOver, NVDA): axe-core prüft nur einen Teil der
  Kriterien automatisch; Aussagen zu Ansagen beruhen auf DOM-Analyse
  (`aria-live`, Rollen), nicht auf echter Ausgabe.
- Keine Live-Räume mit Supabase (Regel: keine Produktivsysteme); Raum-Beitritt
  und Lehrer-Live nur ohne Backend (Fehlerpfad).
- Keine Nutzerstudie mit Kindern oder Lehrkräften; Aussagen zur Verständlichkeit
  sind Expertenurteil und Lesbarkeitsindex, kein empirischer Befund.
- Nicht oder nur oberflächlich geprüft: Lehrer-Aufgaben (`vorschau`, nur
  Seitentext), Spiegelschrift, Duell/Häuser (`aus`), Cloud-Abgleich (Einrichtung
  nur gesichtet), Laufdiktat-Live für Schüler und Lehrkraft im laufenden Raum,
  Battle/Stationen, Sicherung und Wiederherstellung (siehe B-001), Druck in
  Safari, Verhalten bei vollem oder gesperrtem Speicher (siehe A-002).
- Zeitangaben für Menschen (Lehrerablauf) sind Hochrechnungen aus Skriptschritten,
  keine Messung mit Lehrkräften.

## 4 Befunde

### C-001 – Übungsrunden gehen bei einem Fehltipp, „Zurück“ oder Neuladen ohne Rückfrage verloren (außer Textbox)

- **Bereich:** Schülerablauf, Fehler- und Abbruchverhalten
- **Status:** bestätigt (reproduziert)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `app/views/wortspeicher/round-screen.tsx:80` (Schaltfläche „Übung beenden“ ohne Rückfrage), `app/components/learning-word-app.tsx:432-438` (`leaveRound`: verwirft den Lauf), `:352-398` (`finish`: die Runde wird erst am Ende gespeichert); `app/frei/mathematics/mental-math-app.tsx:888-897` („Runde beenden“ setzt sofort auf die Einstellungen zurück); `app/frei/german/laufdiktat/running-dictation-app.tsx:458` („Runde beenden“ → `reset`); einziger Abbruchschutz der App: `app/raum/use-live-session-guards.ts:5-14` (`beforeunload` nur im Live-Raum). Keine Übungsrunde schreibt ihren Zwischenstand in die Adresse oder den Verlauf.
- **Beschreibung:** Während einer Runde bleiben die untere Leiste (Lernen, Üben, Raum, Profil), das Logo („Zur Startseite“) und der Zurück-Pfeil aktiv. Ein Tipp darauf, die Zurück-Geste des Browsers oder ein Neuladen beendet die Runde sofort. Es gibt keine Rückfrage und kein „Weitermachen“. Was erhalten bleibt, ist je Modul verschieden: Wortspeicher und LernBox speichern jede einzelne Antwort, Kopfrechnen merkt sich Fehlaufgaben. Der Rundenfortschritt, der Abschluss und die Rückmeldung am Ende sind aber weg. Laufdiktat allein und Tastenwelt verlieren den Lauf vollständig. Die Textbox zeigt dagegen nach dem Neuladen „Durchgang 2 offen … weiterüben“; dort ist das Problem gelöst.
- **Reproduktion / Prüfweg:** `repro-c/s-abort.mjs` und `repro-c/s-abort3.mjs` (iPad Hochformat 810×1080, Touch). Ergebnisse dieses Laufs: Wortspeicher „ck und tz“, Stufe 1, nach 4 von 10 Wörtern „Übung beenden“ → Übersicht, 0 Dialoge, kein Angebot zum Fortsetzen. Wortspeicher Stufe 2 mitten in der Runde, Browser-Zurück → landet auf `/ueben` (die Runde hat keine eigene Adresse). Kopfrechnen nach Fehlversuchen neu geladen → Einstellungsseite, nur „Eine Aufgabe wartet auf dich“ bleibt. Laufdiktat allein nach Aufgabe 1 neu geladen → Startseite des Moduls. Tastenwelt mitten in Übung 1 neu geladen → Übersicht. Textbox nach Durchgang 1 neu geladen → „Durchgang 2 offen … weiterüben“. In der Runde zeigt `getByRole("navigation")` die Leiste „Lernen Üben Raum Profil“ (Screenshot `shots/abort3-round-nav.png`).
- **Betroffene Nutzergruppen:** jüngere Kinder und Kinder mit geringer Aufmerksamkeit (Fehltipps auf die große untere Leiste), Kinder mit Lernschwierigkeiten (die mühsam erarbeitete halbe Runde ist weg), Klassen, die nach Klingel oder Gerätewechsel unterbrechen.
- **Mögliche Folgen:** Frust und Abbruch. Kinder erleben „alles weg“, obwohl Einzelantworten gespeichert sind. Für das Ziel kurzer, regelmäßiger Einheiten fehlt die Unterbrechbarkeit, die im Schulalltag (Klingel, Akku, Wechsel an die Lehrkraft) die Regel ist.
- **Empfehlung:** (1) Während einer Runde einen einheitlichen Abbruchdialog für Logo, Leiste und Zurück-Pfeil („Runde wirklich beenden? Deine Antworten bis hier sind gespeichert.“) mit „Weiterüben“ als Standard. (2) Zwischenstand je Runde wie bei der Textbox in IndexedDB halten und beim nächsten Öffnen „Weitermachen“ anbieten (Wortspeicher, Kopfrechnen, Laufdiktat allein). (3) Die Runde als eigenen Verlaufseintrag führen (`history.pushState`), damit die Zurück-Geste zuerst die Runde und nicht das Modul verlässt. (4) Die untere Leiste in Runden ausblenden oder abschwächen (Fokusmodus).
- **Aufwand (grob):** M
- **Erfolgskriterium:** E2E-Test je Modul: Runde starten, 3 Antworten, Neuladen bzw. Zurück → Angebot „Weitermachen“ mit Stand 3/10; Tipp auf die Leiste → Rückfrage.

### C-002 – Feste Merkzeit in der Textbox ohne Pause oder Verlängerung

- **Bereich:** Barrierefreiheit (WCAG 2.2.1 „Zeitbegrenzung anpassbar“), Differenzierung
- **Status:** bestätigt (reproduziert)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** mittel (ob die Merkzeit „wesentlich“ im Sinne der Ausnahme von 2.2.1 ist, ist eine Gestaltungsentscheidung; für Kinder mit LRS ist sie es nicht)
- **Fundstelle:** `src/domain/textbox-session.ts:156-158` (`memorizeSeconds`, fest 60/90/120 s je Schwierigkeit), `app/components/textbox-app.tsx:137-149` (Intervall beendet die Merkphase nach Ablauf selbsttätig), `app/views/textbox/run-layout.tsx:259-260` (`role="timer"`); Vault `24 - Textbox/Anwendung.md:21,70` (Merkzeiten ausdrücklich „zu kalibrieren“).
- **Beschreibung:** In jedem der vier Durchgänge läuft eine Merkzeit. Nach Ablauf springt die Ansicht ohne Zutun in die Schreibphase. Es gibt nur „Ich bin bereit“ (vorzeitig beenden), aber weder Pause noch Verlängerung. Die vorhandene Schreiberleichterung (LRS-Freigabe) wirkt nur im Live-Laufdiktat (`app/raum/use-writing-relief.ts`), nicht hier. Ein Kind, das langsam liest oder kurz abgelenkt ist, verliert den Text, bevor es ihn gelesen hat.
- **Reproduktion / Prüfweg:** `repro-c/s-textbox-timer.mjs` mit `page.clock`: Start „Der kleine Hund“ → „Noch 0:59“; Schaltflächen nur „Ich bin bereit“; nach 30 s „Noch 0:28“; nach 61 s ohne Eingabe: „Schreibe die fehlenden Wörter in die Lücken …“, 8 Lücken sichtbar, kein Weg zurück zum Text (`shots/ipad-portrait-tbt-after-timeout.png`).
- **Betroffene Nutzergruppen:** Kinder mit LRS, langsame Leser, DaZ-Kinder, Kinder mit Aufmerksamkeitsschwierigkeiten.
- **Mögliche Folgen:** Systematisch schlechtere Werte genau bei denen, die die Textbox am meisten brauchen. Das verstärkt die von D-005 beschriebene Verzerrung zugunsten des Textbehaltens.
- **Empfehlung:** Merkzeit standardmäßig ohne harte Grenze („Ich bin bereit“ als einziger Übergang) oder mit „+30 s“ und Pause. Eine Profileinstellung „mehr Zeit“ (auch von der Lehrkraft setzbar), die alle Zeitgrenzen der Schülermodule verlängert.
- **Aufwand (grob):** S
- **Erfolgskriterium:** Bei aktivierter Einstellung endet keine Merkphase ohne Handlung des Kindes; ein Komponententest prüft das.

### C-003 – Erstes Öffnen: „Heute ist nichts dran“, und „Weiterlernen“ führt ein neues Kind in die Tastenwelt

- **Bereich:** Schülerablauf (Szenario 1 „erstes Öffnen“), Orientierung
- **Status:** bestätigt (reproduziert)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `app/lernen/learner-home.tsx:20-28` (Ziel von „Weiterlernen“: erstes offenes Portionselement, sonst erste Empfehlung), `src/storage/learning-recommendations.ts:286-320` (einziger Kandidat ohne Vorgeschichte: nächste Tastschreib-Lektion „… beginnen“), `src/storage/daily-plan.ts:88-164` (Portion nur aus Vorhandenem, siehe D-011), `app/views/lernen/home-screen.tsx:116` („Heute ist nichts dran – frei üben“).
- **Beschreibung:** Ein Kind ohne Klasse und ohne Lehrkraftinhalte tippt auf der Startseite „Weiter als Esel“. Es sieht ein Tier, „Heute ist nichts dran – frei üben“, zwei Kacheln „0 heute dran“ und „0 schwierige Wörter“ sowie die große Schaltfläche „Weiterlernen“. Diese führt nicht zu Rechtschreibung oder Mathematik. Sie führt in die **Tastenwelt** mit 50 Stationen und einer Tastaturgrafik. Grund: Wortspeicher, Kopfrechnen und LernBox erzeugen erst nach eigener Nutzung Empfehlungen, die Tastschreib-Lektion 1 ist dagegen immer „der nächste passende Schritt“. Auf einem Schüler-iPad ohne Hardwaretastatur ist das Zehnfingersystem das am wenigsten passende Angebot (D-014). Zudem widersprechen sich die Signale: „nichts dran“ und „Weiterlernen“ für ein Kind, das nie angefangen hat. Eine Einführung, Hinweise zu den Bereichen oder ein erster Vorschlag aus den Kernfächern fehlen.
- **Reproduktion / Prüfweg:** `repro-c/s1-first.mjs` (frischer Browserkontext, iPad Hochformat): Startseite „Lehrer-Login | Weiter als Esel | Tippen öffnet deinen Lernraum | RAUMCODE …“ → `/lernen`: „Heute ist nichts dran – frei üben | Weiterlernen | 0 heute dran | 0 schwierige Wörter“ → `href` von „Weiterlernen“ = `/frei/typing` → Tastenwelt „0 von 50 Stationen geschafft … Weiter mit Lektion 1“. Screenshot `shots/ipad-portrait-light_lernen.png`.
- **Betroffene Nutzergruppen:** alle Kinder beim ersten Kontakt, besonders jüngere Kinder mit wenig Leseerfahrung (sie folgen der großen Schaltfläche); Lehrkräfte, die „Mein Lernraum“ als Einstieg empfehlen.
- **Mögliche Folgen:** Der erste Eindruck verfehlt die Kernziele Rechtschreibung und Mathematik. Kinder landen in einem Modul, das auf dem iPad kaum bedienbar ist (siehe C-004 zur Bildschirmtastatur), und brechen ab oder irren durch „Üben“. Die Startseite verspricht Führung, liefert aber keine.
- **Empfehlung:** (1) Leerzustand für neue Kinder: kurze Begrüßung mit zwei bis drei großen Bildkarten „Wörter üben“, „Rechnen“, „Vokabeln“ statt „Weiterlernen“. (2) Tastenwelt nur empfehlen, wenn eine Hardwaretastatur erkannt wurde oder die Lehrkraft sie freigibt. (3) „Weiterlernen“ erst zeigen, wenn es etwas fortzusetzen gibt; sonst „Loslegen“. (4) Mittelfristig die curriculare Startsequenz aus D-011 einspeisen.
- **Aufwand (grob):** S (1–3), M (4)
- **Erfolgskriterium:** E2E-Test „frisches Gerät“: Die Hauptschaltfläche führt in ein Deutsch- oder Mathe-Angebot; kein Widerspruch zwischen Statuszeile und Schaltflächentext.

### C-004 – Tastenwelt auf dem iPad: Bildschirmtastatur verdeckt Vorlage oder Tastaturgrafik

- **Bereich:** Schülerablauf auf Tablets, Bildschirmtastatur
- **Status:** begründetes Risiko (nur per verkleinerter Ansicht emuliert; Safari verschiebt bei Bildschirmtastatur den sichtbaren Ausschnitt anders als Chromium)
- **Schweregrad:** P3
- **Sicherheit der Einschätzung:** mittel
- **Fundstelle:** `app/views/tastenwelt/practice-screen.tsx:99-148` (verstecktes Tippfeld, `onInput` als Rückfall für Bildschirmtastaturen), `:438` („Einfach lostippen“); kein Hinweis auf eine nötige Hardwaretastatur in `app/views/tastenwelt/`.
- **Beschreibung:** Die Übungsansicht besteht aus Vorlage, Fortschritt und einer großen Tastaturgrafik mit Fingerfarben. Auf einem iPad ohne Hardwaretastatur öffnet das Antippen von „Hier tippen“ die Bildschirmtastatur. Die verdeckt im Querformat rund die Hälfte des Bildschirms. In der Emulation (Ansicht 1080×430 statt 1080×810) lag die Vorlage „Tippe ab: …“ nach dem Fokussieren 259 px oberhalb des sichtbaren Bereichs; sichtbar blieb die verschwommene Grafiktastatur mit „Einfach lostippen“. Im Hochformat (810×680) blieb die Vorlage sichtbar. Fingerzuordnung und Grundstellung, der Kern des Lehrgangs, lassen sich auf Glas nicht üben (pädagogisch bei D-014).
- **Reproduktion / Prüfweg:** `repro-c/s-typing-kbd.mjs`: `land-kbd {"active":"INPUT:Tippfeld","targetTop":-259,"vh":430,"sh":769}`, `port-kbd {"targetTop":146,"vh":680}`; Screenshot `shots/typing-land-kbd.png`. Zum Vergleich: Wortspeicher und Textbox halten Eingabefeld und „Prüfen“ in beiden emulierten Höhen sichtbar (`repro-c/s-kbd.mjs`).
- **Betroffene Nutzergruppen:** alle Kinder an iPads ohne Tastaturhülle.
- **Mögliche Folgen:** Kinder üben „Zehnfingerschreiben“ mit zwei Fingern auf Glas; Fortschrittsanzeige und Sterne belohnen etwas anderes als das Lernziel.
- **Empfehlung:** Hardwaretastatur erkennen (erstes `keydown` mit `code`) und ohne sie einen klaren Hinweis zeigen („Für die Tastenwelt brauchst du eine Tastatur“); auf echtem iPad mit Safari prüfen. In Verbindung mit C-003 die Tastenwelt nicht als ersten Vorschlag anbieten.
- **Aufwand (grob):** S
- **Erfolgskriterium:** Auf einem iPad ohne Tastatur erscheint der Hinweis statt einer nicht nutzbaren Übung; Prüfung auf Gerät dokumentiert.

### C-005 – Fokus geht beim Schließen von Blättern verloren; „Menü“ ohne Menü-Tastaturbedienung

- **Bereich:** Barrierefreiheit (WCAG 2.4.3 Fokusreihenfolge, 4.1.2 Name/Rolle/Wert), Tastatur und Schalter-/VoiceOver-Bedienung
- **Status:** bestätigt (reproduziert)
- **Schweregrad:** P3
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `app/components/learning-word-app.tsx:820-851` (`StartSheet` wird beim Schließen ausgehängt statt über `open={false}` geschlossen), `app/ui/sheet.tsx:24-35` (Schließen nur über den Effekt bei `open=false`; beim Aushängen läuft kein `close()`, damit keine Fokus-Rückgabe); LernBox-Schaltfläche „Vokabeln hinzufügen“ mit `aria-haspopup="menu"` und Einträgen `role="menuitem"` (`app/views/lernbox/parts/home.tsx:201-206`).
- **Beschreibung:** (1) Wer im Wortspeicher eine Wortbox per Tastatur öffnet und das Blatt mit Escape oder „Schließen“ verlässt, landet auf `BODY`, also am Seitenanfang, nicht auf der Box. Ursache: Das native `<dialog>` wird samt Inhalt aus dem DOM entfernt, statt geschlossen zu werden. Dasselbe Muster (`cond ? <Sheet …/> : null`) kommt bei weiteren der 11 `Sheet`-Verwendungen in Frage (nicht einzeln geprüft). (2) Das LernBox-Menü meldet sich als Menü (`aria-haspopup="menu"`, `role="menu"`), lässt den Fokus nach dem Öffnen aber auf dem Auslöser; Pfeiltasten tun nichts, nur Tab erreicht die Einträge. Bildschirmleser kündigen eine Menübedienung an, die es nicht gibt.
- **Reproduktion / Prüfweg:** `repro-c/s-focus2.mjs` (Desktop-Chromium): Box fokussieren → Enter → Fokus „Schließen“ → Escape → Fokus `BODY`; ebenso nach „Schließen“. LernBox: `aria-haspopup: menu`, nach Enter `aria-expanded: true`, Fokus bleibt „Vokabeln hinzufügen“, ArrowDown → keine Bewegung, Tab → „Selbst eintragen“. Positiv in `repro-c/s-keyboard.mjs`: In Runden steht der Fokus sofort im Eingabefeld, nach einer falschen Antwort auf „Noch einmal versuchen“, danach wieder im Feld; der Fokusrahmen ist überall 3 px deutlich sichtbar.
- **Betroffene Nutzergruppen:** Kinder mit motorischen Einschränkungen (Schaltersteuerung, Tastatur), VoiceOver-Nutzer, Lehrkräfte mit Tastatur am Beamer-Rechner.
- **Mögliche Folgen:** Orientierungsverlust nach jedem geschlossenen Blatt; überflüssige Wege. Kein Blocker, aber ein wiederkehrender Reibungspunkt.
- **Empfehlung:** `Sheet` immer eingehängt lassen und über `open` steuern oder beim Aushängen den Fokus auf den Auslöser zurückgeben (gemeinsamer Haken in `app/ui/sheet.tsx`). Für das LernBox-Menü entweder das APG-Menümuster vollständig umsetzen (Fokus auf ersten Eintrag, Pfeiltasten, Escape) oder `role="menu"` entfernen und eine einfache Liste von Schaltflächen anbieten. Einen E2E-Test „Fokus kehrt zurück“ für alle Blätter ergänzen.
- **Aufwand (grob):** S
- **Erfolgskriterium:** Nach Escape/Schließen steht der Fokus auf dem auslösenden Element (automatisierter Test für Wortspeicher, LernBox, Textbox, Lehrerdialoge).

### C-006 – QR-Bogen druckt nur die erste Bildschirmseite: bei 24 Kindern fehlen 12 Codes

- **Bereich:** Lehrerablauf (Klasse einrichten, Einschreibung), Druck
- **Status:** bestätigt (reproduziert)
- **Schweregrad:** P1
- **Sicherheit der Einschätzung:** hoch für Chromium (Druck als PDF über dieselbe Druckdarstellung); Safari auf dem iPad nicht geprüft, die Ursache (CSS) wirkt dort gleich
- **Fundstelle:** `app/views/lehrer/teacher-frame.module.css:7-34` (`.frame { height: 100%; overflow: hidden }`, `.column { overflow-y: auto }`; keine `@media print`-Regel in der Datei), `app/components/teacher-class-configurator.tsx:356-394` (QR-Bogen, `window.print()` in Z. 375); vorhandene Druckregeln greifen nur für Schülerseiten (`app/ui/lernraum-ui.css:3014-3024`, `body:has([data-print-sheet])`).
- **Beschreibung:** Der Lehrerrahmen ist ein bildschirmhoher Kasten mit eigenem Scrollbereich. Beim Drucken bleibt diese Höhe erhalten; alles unterhalb des ersten Bildschirms wird abgeschnitten. Der QR-Bogen einer Klasse mit 24 Kindern ergibt **eine** A4-Seite mit 12 Codes (Ali bis Lea), die fünfte Reihe ist angeschnitten, Mats bis Zoe fehlen. Zusätzlich druckt die mobile Kopfzeile des Lehrerbereichs („3a · Klassen“, Menü- und Hell/Dunkel-Knopf) mit. Die Seite meldet keinen Fehler; die Lehrkraft bemerkt es erst beim Austeilen.
- **Reproduktion / Prüfweg:** `repro-c/s-teacher-print.mjs` und `repro-c/s-print2.mjs`: Klasse „3a“, 24 Schüler, „QR-Bogen für die Klasse“ → `page.pdf({format:"A4"})`. Ergebnis Desktop 1280×800 und iPad 810×1080: je `Pages: 1`, 12 von 24 Namen im PDF-Text (`pdftotext`). Bild der Seite: `shots/qrbogen-p-1.png`. Die E2E-Suite prüft den QR-Bogen nur auf dem Bildschirm (`e2e/platform-quality.spec.ts:936-939`), Druck nur für die Textbox (`e2e/textbox.spec.ts:365-375`).
- **Betroffene Nutzergruppen:** Lehrkräfte beim Einrichten einer Klasse; die Hälfte der Kinder kann sich nicht per Bogen einschreiben.
- **Mögliche Folgen:** Der wichtigste Weg in die Klasse scheitert in der ersten Stunde für die halbe Klasse. Die Lehrkraft muss Einzel-QRs am Bildschirm zeigen. Vertrauensverlust beim ersten Einsatz.
- **Empfehlung:** Druckregel für den Lehrerrahmen: `@media print { .frame, .layout, .column { height: auto; overflow: visible } .bar, .sidebar { display: none } }`, QR-Karten mit `break-inside: avoid`. E2E-Test: Bogen mit 24 Schülern als PDF, Seitenzahl ≥ 2, alle Namen im Text. Zusätzlich Hinweis „vertraulich“ auf dem Bogen (siehe B-008).
- **Aufwand (grob):** S
- **Erfolgskriterium:** PDF eines Bogens mit 30 Schülern enthält alle 30 Namen ohne angeschnittene Codes und ohne Bedienelemente; automatisierter Test grün.

### C-007 – Sprache für Erwachsene: Fachwörter, lange Hinweistexte, keine vorgelesenen Anleitungen

- **Bereich:** Verständlichkeit für Kinder (Szenario 2 „Aufgabe nicht verstanden“), DaZ, LRS, jüngere Kinder
- **Status:** bestätigt (Codeanalyse und Browser), Lesbarkeitswerte gemessen
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** mittel (Expertenurteil plus LIX; keine Erprobung mit Kindern)
- **Fundstelle:** `app/views/wortspeicher/completion-screen.tsx:116-120` („Merkstufe und Wiederholungsfälligkeit wurden lokal gespeichert …“), `app/views/wortspeicher/stage-copy.ts:12` („Du rekonstruierst fast das ganze Wort.“), `app/views/wortspeicher/round-screen.tsx:130` (Überschrift „Selbstständig schreiben“ auch auf Stufe 1 „Abschreiben“), `app/frei/mathematics/mental-math-app.tsx:455-459, 794` („… ein eigenes Browserprofil“, „Eine Korrektur allein reicht noch nicht“), `app/components/adaptive-progress-panel.tsx:75` („… als Klassenbeitrag gekennzeichnet“), `app/components/first-learning-round.tsx:283` („nach dem Leitner-Prinzip“), `app/components/live-room-join.tsx:565, 587, 601` (Fehlertexte); Vorlesen nur für Inhalte (`app/views/lernbox/parts/study.tsx:105-123`, Stufe 6, Live-Raum), nicht für Anleitungen.
- **Beschreibung:** Die Kinderoberfläche nutzt das Vokabular des Entwicklers. Zählung in den Schüleransichten (`app/views`, `app/components`, Schülerrouten): „Durchgang“ 67×, „Stapel“ 31×, „Merkstufe“ 15×, „fällig“ 15×, „Wiederholung(en)“ 12×, „Box 1–4“ 9×, „Zahlenraum“ 6×, „Leitner“ in einem Kindertext. Hinweistexte erreichen LIX 51–54 (Sachtextniveau; unter 35 gilt als kindgerecht). Beispiele: Wortspeicher-Abschluss LIX 51 mit „Wiederholungsfälligkeit“, Kopfrechnen-Einstieg LIX 52 mit „Browserprofil“, Fortschritt LIX 54 mit „Klassenbeitrag gekennzeichnet“. Widersprüche verwirren zusätzlich: Stufe 1 heißt „Abschreiben“, die Rundenansicht titelt „Selbstständig schreiben“. Die Textbox-Schwierigkeit erscheint in der Bibliothek nur als drei leere Kreise ohne sichtbare Beschriftung (`title` hilft auf dem iPad nicht; Screenshot `shots/ipad-portrait-light_frei_german_textbox.png`). Fehlertexte im Raum geben falsche Hinweise: Ist der Dienst nicht erreichbar, heißt es „Bitte prüfe den Code“. Das Kinderprofil (`/lernen/einstellungen`, 198 Wörter) enthält Datensicherung in Ordner, „Cloud-Synchronisation“ mit OneDrive, Google Drive und „WebDAV … App-Passwort“ – Aufgaben für Erwachsene in der Kinderoberfläche (Verantwortung für Sicherungen siehe B-002). Anleitungen werden nirgends vorgelesen; Symbole oder Bildhinweise fehlen. Kinder, die noch nicht flüssig lesen, sind auf Erwachsene angewiesen.
- **Reproduktion / Prüfweg:** `repro-c/lix.py` (LIX, Satzlänge; Texte per `grep` im Code bestätigt), Wortzählung per `grep -rhoE` über die Schüleransichten, Screenshot des Wortspeicher-Blatts `shots/a11y-ipadReduced-wort-sheet.png`, Raum-Fehlermeldung `repro-c/s-raum2.mjs` („Ups, hier lief wohl etwas schief | Live-Räume sind in dieser lokalen Vorschau noch nicht mit dem Laufdiktat-Raumdienst verbunden.“).
- **Betroffene Nutzergruppen:** Erst- und Zweitklässler, DaZ-Kinder, Kinder mit LRS, Kinder mit geringer Aufmerksamkeit (lange Texte werden übersprungen).
- **Mögliche Folgen:** Kinder verstehen nicht, was eine Stufe bedeutet oder was sie als Nächstes tun sollen. Die Selbstständigkeit, die das Projekt anstrebt, scheitert an der Sprache. Lehrkräfte müssen dieselben Begriffe immer wieder erklären.
- **Empfehlung:** (1) Ein Kinder-Glossar mit verbindlichen, einfachen Wörtern (z. B. „Stufe“ statt „Merkstufe“, „Runde“ statt „Durchgang“, „heute üben“ statt „fällig“) und ein Lint-Test, der verbotene Fachwörter in Schüleransichten meldet. (2) Hinweistexte für Kinder auf einen Satz mit höchstens 10 Wörtern kürzen; Technik- und Datenschutzhinweise in den Erwachsenenbereich verschieben. (3) Vorlese-Knopf für jede Anleitung (lokale Stimme, siehe B-012). (4) Schwierigkeit sichtbar beschriften („leicht – mittel – schwer“). (5) Fehlertexte nach Ursache trennen („Keine Verbindung – frag deine Lehrkraft“ vs. „Code stimmt nicht“).
- **Aufwand (grob):** M
- **Erfolgskriterium:** Kein Schülertext über LIX 40; Glossar-Test grün; in einem kurzen Probelauf mit 5 Kindern der 2./3. Klasse können alle ohne Hilfe sagen, was „Stufe 2“ bedeutet.

### C-008 – Widersprüchliche Statusanzeigen: „erledigt“ bei 6 offenen Karten, neue Karten als „schwierig“, „üben wir noch einmal“ bei „nichts fällig“

- **Bereich:** Schülerablauf (Szenarien 3, 6, 7), Verlässlichkeit der Anzeigen
- **Status:** bestätigt (reproduziert)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:**
  - `app/views/lernbox/parts/deck-grid.tsx:36-40` („erledigt“, sobald `deck.due === 0`) mit `app/components/learning-box-app.tsx:307` und `src/domain/learning-box.ts:325-333` (`isLearningBoxCardScheduledDue` zählt neue Karten mit `interval === 0` nie mit); daneben `learning-box-app.tsx:292-293` („Heute dran“ aus der Tagesportion, die neue Karten enthält).
  - `app/lernen/use-learner-dashboard.ts:95-115` („Schwierige Wörter“: Karten in Box 1 mit `lastReviewed > 0`) mit `src/domain/learning-box.ts:127-135` (neue Karte: `box: 1`, `lastReviewed: now`).
  - `app/views/wortspeicher/completion-screen.tsx:116-120` („Fehler machen die betroffenen Wörter sofort wieder fällig“) gegen `src/domain/learning-word-progress.ts:34-62` (nach Sofortkorrektur bleibt Box 1, `dueAt` = morgen).
  - `app/views/lernen/home-screen.tsx:199-202` („Für heute ist alles geschafft.“ bei 0/0).
- **Beschreibung:** Mehrere Anzeigen widersprechen sich oder dem, was das Kind gerade getan hat:
  1. LernBox: Ein Stapel mit 6 nie geübten Vokabeln zeigt im Kopf „HEUTE DRAN 6“ und am Stapel „erledigt“.
  2. „Mein Lernraum“: Drei gerade angelegte, nie geübte Vokabeln erscheinen sofort als „Schwierige Wörter … Box 1“.
  3. Wortspeicher: Der Abschluss sagt „Diese Wörter üben wir noch einmal: fließen, fliegen“ und „Fehler machen … sofort wieder fällig“. Die Übersicht direkt danach zeigt „0 Trainingswörter heute – Noch nichts fällig“. Die Schaltfläche „Nochmal üben“ auf derselben Seite startet eine Runde mit **anderen** Wörtern (`repro-c/s-wort2.mjs`: Fehlerwörter „Koffer, kennen“, neue Runde beginnt mit „Sessel“). Für Szenario 3 („mehrfach derselbe Fehler“) fehlt damit ein direkter Weg, genau die gerade falsch geschriebenen Wörter sofort noch einmal zu üben.
  4. Erster Start: „Heute ist nichts dran“ und gleichzeitig „Für heute ist alles geschafft.“, ohne dass etwas geübt wurde.
  5. „Üben“ beschreibt die Tastenwelt mit „Zehn Stationen“, das Modul zählt „0 von 50 Stationen“.
- **Reproduktion / Prüfweg:** `repro-c/s-weeks.mjs` (Uhr per `page.clock` auf 19.10. bis 3.11.): am 3.11. LernBox „HEUTE DRAN | 6 | … | Englisch Tiere | 6 Vokabeln · eigene | erledigt“; am 19.10. vor jeder Übung „Heute dran | 0 / 0 | Für heute ist alles geschafft.“. `repro-c/s-difficult.mjs`: nach Anlegen von Apfel/Birne/Kirsche „Schwierige Wörter | Kirsche | Box 1 | Birne | Box 1 | Apfel | Box 1“. `repro-c/s-wortdue.mjs`: Stufe 1, „Langes i“, 2 Fehler mit Sofortkorrektur → Abschluss „Diese Wörter üben wir noch einmal | fließen | fliegen“, Übersicht „0 Trainingswörter heute | Noch nichts fällig“.
- **Betroffene Nutzergruppen:** alle Kinder, besonders Kinder mit Lernschwierigkeiten (sie verlassen sich auf die Anzeige „was ist dran“); Lehrkräfte und Eltern, die die Startseite als Lernstand lesen.
- **Mögliche Folgen:** Kinder lernen, den Anzeigen nicht zu trauen, oder hören auf, weil „erledigt“ dasteht. Neue Vokabeln als „schwierig“ zu markieren, entmutigt ohne Grund. Der versprochene sofortige Fehlerrücklauf findet nicht statt (fachlich A-004/D-001).
- **Empfehlung:** Eine gemeinsame Funktion „was ist heute offen“ je Modul, die Karte, Startseite und Portion gleich beantwortet (neue Karten als „neu“, nicht als „erledigt“ oder „schwierig“). „Schwierig“ nur bei tatsächlichen Fehlversuchen. Abschlusstext an die echte Regel anpassen oder Fehlerwörter tatsächlich am selben Tag erneut anbieten. Leerer Tag: „Heute ist noch nichts geplant“ statt „alles geschafft“. Komponententests für diese Zustände.
- **Aufwand (grob):** S–M
- **Erfolgskriterium:** Für jeden der fünf Fälle ein automatisierter Test; keine Ansicht nennt einen Stapel „erledigt“, solange Karten dieses Stapels in „Heute dran“ stehen.

### C-009 – „Mein Fortschritt“ ist nur über Profil → „Klasse und Datenschutz“ erreichbar; parallele Einstiege verwirren

- **Bereich:** Navigation, Szenario 6 „Fortschritt verstehen“
- **Status:** bestätigt (Codeanalyse und Browser)
- **Schweregrad:** P3
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** einziger Link auf `/lernen/fortschritt`: `app/components/student-settings-panel.tsx:157-176` (im Abschnitt „Klasse und Datenschutz“ des Profils); `app/lernen/fortschritt/page.tsx:10-22` (nur Wortspeicher und Textbox, siehe D-004/D-009 zu Mathe); weitere Hubs ohne Verlinkung aus der Navigation: `/lernen/material` („Lernwerkstatt“, nur per Umleitung von `/frei`), `/lernen/aufgaben` (kein statischer Link im Code).
- **Beschreibung:** Die untere Leiste hat vier Ziele (Lernen, Üben, Raum, Profil). „Mein Fortschritt“ steckt als kleiner Knopf im Profil zwischen „Klasse beitreten“ und „Mehr über Datenschutz“. Auf „Mein Lernraum“ gibt es keinen Weg dorthin. Daneben existieren mit „Lernwerkstatt“ (`/lernen/material`) und den Fachseiten (`/lernen/faecher/…`) weitere Einstiege in dieselben Module, die ein Kind nur zufällig findet. Für Kinder ist unklar, was der Unterschied zwischen „Lernen“, „Üben“ und „Lernwerkstatt“ ist.
- **Reproduktion / Prüfweg:** `grep` nach `"/lernen/fortschritt"` (1 Treffer außerhalb der Seite selbst); Routenrundgang `repro-c/sweep.mjs` (alle Seiten erreichbar per Adresse, Überschriften „Mein Fortschritt“, „Lernwerkstatt“, „Meine Aufgaben“); Startseitentexte in `repro-c/s-weeks.mjs` enthalten keinen Fortschrittslink.
- **Betroffene Nutzergruppen:** Kinder (Selbstwirksamkeit braucht sichtbaren Fortschritt), Lehrkräfte, die Kinder auf ihren Fortschritt verweisen wollen.
- **Mögliche Folgen:** Die Fortschrittsseite wird kaum genutzt; die Motivation über sichtbares Wachstum, die das Konzept vorsieht, entsteht nicht.
- **Empfehlung:** Auf „Mein Lernraum“ eine Kachel „Mein Fortschritt“ (ggf. statt der Kachel „Diese Woche“) und die Wochenleiste dorthin verlinken; Lernwerkstatt und Fachseiten entweder in „Üben“ zusammenführen oder entfernen.
- **Aufwand (grob):** S
- **Erfolgskriterium:** Fortschritt ist von „Lernen“ mit einem Tipp erreichbar; Navigationskonzept mit höchstens einem Einstieg je Modul dokumentiert.

### C-010 – Lehrerablauf: viele Einzelschritte, Inhalte hängen am Laufdiktat-Assistenten, Demo-Werte als echte Eingaben, Technikjargon

- **Bereich:** Benutzerfreundlichkeit Lehrkraft (Klasse anlegen, Inhalte, Freigabe, Einstellungen)
- **Status:** bestätigt (reproduziert)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** mittel bis hoch (Abläufe gemessen; Zeitschätzung für Menschen ist eine Hochrechnung)
- **Fundstelle:** `app/components/teacher-class-configurator.tsx` (Schüler einzeln über „Name oder Alias“ + „Schüler anlegen“, kein Listenimport), `app/components/teacher-content-transfer.tsx:35-48` (Freigabeformular mit `DEFAULT_VOCABULARY` „school;Schule …“ und Titel „Englisch · Unterrichtspaket“ als echte Werte), `app/lehrer/live/hooks/use-live-room-session.ts:380` („… URL und Publishable Key verbinden wir anschließend.“), `app/lehrer/live/hooks/use-content-restore.ts:47` (Titel aus erster Zeile „Hund;dog“), Seiten `/lehrer/aufgaben` und `/lehrer/einstellungen` ohne `h1`.
- **Beschreibung:** Gemessener Weg bis zur ersten Nutzung ohne Live-Dienst:
  1. Startseite → „Lehrer-Login“ (ohne Anmeldung, siehe B-009) → „Inhalte“.
  2. „Klassen“ → Klassenname und Lehrkraft eintragen → „Klasse anlegen“.
  3. 24 Kinder **einzeln**: je Name eintippen und „Schüler anlegen“ (48 Handlungen, kein Einfügen einer Namensliste).
  4. „QR-Bogen“ → Drucken (druckt nur die Hälfte, C-006).
  5. Jedes Kind scannt seinen Code und bestätigt die Identität.
     Das Skript brauchte 27 Klicks; realistisch sind für Schritt 1–4 rund 8–12 Minuten, für das Einschreiben einer Klasse eine Unterrichtsstunde (Schätzung, nicht gemessen).
     Inhalte anlegen ist irreführend: „Inhalte → Neu anlegen → Vokabeln“ öffnet „Schritt 1 von 4 · Laufdiktat · Wortliste vorbereiten“. Wer nur Vokabeln für die Klasse anlegen will, landet im Assistenten für einen Live-Raum. Ohne Titel heißt der Inhalt „Hund;dog“. „Freigabe an Schüler“ ist ein zweites, getrenntes Formular mit eigener Textfeld-Syntax. Es ist mit Beispieldaten **vorbelegt** (Titel „Englisch · Unterrichtspaket“, drei Paare, Zähler „3 Vokabelpaare“). Ein schneller Klick auf „Für Schüler freigeben“ verteilt Demo-Vokabeln. Eine Seite trägt drei Namen: Navigation „Freigabe an Schüler“, Seitentitel „Material“, Überschrift „Vokabelpaket freigeben“. Ebenso „Wortspeicher“ und „Deutsch · Lernwörter“. Meldungen und Einstellungen sprechen Entwicklersprache („Publishable Key verbinden wir anschließend“, „IndexedDB · lokal“, „Dieses Gerät ist die Schutzgrenze“, „WebDAV … App-Passwort“).
- **Reproduktion / Prüfweg:** `repro-c/s-teacher1.mjs` (iPad quer: „24 Schüler einzeln: 26 Klicks“, „has bulk/list import: 0“, axe ohne Befund), `repro-c/s-teacher2.mjs` („Schritt 1 von 4 · Laufdiktat | Wortliste vorbereiten“), `repro-c/s-teacher3.mjs` („„Hund;dog“ ist gespeichert.“, Freigabe mit „3 Vokabelpaaren“ vorbelegt, Screenshot `shots/ipad-landscape-t3-03-freigabe.png`, ohne Supabase: „Die Inhaltsübertragung ist noch nicht konfiguriert.“), `repro-c/s-tsettings.mjs`, `repro-c/s-headings.mjs` (`page-has-heading-one` auf `/lehrer/aufgaben` und `/lehrer/einstellungen`).
- **Betroffene Nutzergruppen:** Lehrkräfte ohne Technikaffinität, Vertretungslehrkräfte, Kollegium bei einer schulweiten Einführung.
- **Mögliche Folgen:** Hohe Einstiegshürde. Lehrkräfte verwechseln „Inhalte“, „Freigabe“, „Aufgaben“ und „Live“. Versehentlich freigegebene Demo-Inhalte. Die schulartübergreifende Einführung scheitert eher am Lehrerablauf als an den Schülermodulen.
- **Empfehlung:** (1) Namensliste einfügen (eine Zeile je Kind) plus CSV-Import. (2) Inhalte unabhängig vom Laufdiktat anlegen; die Verwendung (Live, Freigabe, Aufgabe) erst danach wählen. Ein Inhaltsmodell statt zweier Formulare. (3) Beispieldaten nur als Platzhalter, nie als Werte. (4) Ein Begriff je Seite; Technikbegriffe in einen Bereich „Für Fortgeschrittene“. (5) Einen geführten Ersteinrichtungsweg „Klasse in 5 Minuten“ mit Fortschrittsanzeige. (6) Eine `h1` je Lehrerseite.
- **Aufwand (grob):** M (1, 3, 4, 6: S; 2, 5: M–L)
- **Erfolgskriterium:** Eine Lehrkraft ohne Vorwissen richtet im Test eine Klasse mit 25 Kindern samt druckfertigem Bogen in unter 10 Minuten ein. Kein Formular startet mit Beispieldaten als Wert.

### C-011 – Laufdiktat allein: kein Fokus auf dem Antwortfeld, Rückmeldung wird nicht angesagt

- **Bereich:** Barrierefreiheit (WCAG 4.1.3 Statusmeldungen, 2.4.3 Fokusreihenfolge), Bedienkomfort auf dem iPad
- **Status:** bestätigt (reproduziert)
- **Schweregrad:** P3
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `app/frei/german/laufdiktat/running-dictation-app.tsx:440` („Richtig“/„Noch nicht richtig“ ohne `role="status"`/`aria-live`; die einzige Statusregion der Datei, Z. 330, gilt nur der Übernahme-Meldung am Ende), keine Fokussteuerung bei den Phasenwechseln.
- **Beschreibung:** In LernBox, Kopfrechnen, Wortspeicher und Textbox steht der Fokus nach jedem Phasenwechsel im Eingabefeld oder auf der nächsten Aktion, und die Rückmeldung wird über `role="status"` angesagt. Laufdiktat allein ist die Ausnahme: Nach „Laufdiktat starten“, „Verstanden – jetzt schreiben“ und „Prüfen“ liegt der Fokus jeweils auf `BODY`. Das Kind muss auf dem iPad erst ins Feld tippen, bevor die Tastatur erscheint. „Noch nicht richtig“ erscheint nur visuell.
- **Reproduktion / Prüfweg:** `repro-c/s-ld-focus.mjs`: „reveal focus: BODY“, „write focus: BODY“, „feedback focus: BODY | live regions: [nur Versionsknopf]“. Vergleich `repro-c/s-live.mjs`: LernBox „INPUT:Deine Antwort“ → „BUTTON:Weiter“ mit `status`; Kopfrechnen Fokus im Feld mit `status: Noch nicht – probiere es erneut.`; Wortspeicher „BUTTON:Noch einmal versuchen“ mit `status`; Textbox „INPUT:Lücke 1 von 8“, nach Prüfen Fokus auf der Überschrift.
- **Betroffene Nutzergruppen:** Kinder mit VoiceOver oder Schaltersteuerung; alle iPad-Nutzer (zusätzlicher Tipp je Aufgabe).
- **Mögliche Folgen:** Unnötige Reibung im Modul, das als Gedächtnis-Schreibübung auf flüssige Abläufe angewiesen ist; für Bildschirmleser ist die Rückmeldung unsichtbar.
- **Empfehlung:** Das Fokus- und Ansagemuster der übrigen Module übernehmen (gemeinsamer Hook); Komponententest „Fokus im Antwortfeld nach ‚Verstanden‘“.
- **Aufwand (grob):** S
- **Erfolgskriterium:** `s-ld-focus`-Prüfung meldet Fokus im Antwortfeld und eine Statusregion mit der Rückmeldung.

### C-012 – Nach 0 % schlägt die Textbox als Hauptaktion den schwereren Durchgang vor

- **Bereich:** Szenario 4 „frustrierende Bewertung“, Ablaufsteuerung
- **Status:** bestätigt (reproduziert)
- **Schweregrad:** P3
- **Sicherheit der Einschätzung:** hoch (Verhalten); mittel (Wirkung auf Kinder, Expertenurteil)
- **Fundstelle:** `app/views/textbox/review-screen.tsx:108-118` (Hauptschaltfläche immer „Weiter zu Durchgang n+1“, „Durchgang wiederholen“ immer zweitrangig, unabhängig vom Ergebnis).
- **Beschreibung:** Nach Durchgang 1 mit 0 von 8 Lücken zeigt die Kontrolle groß „0 %“ und darunter als breite Hauptschaltfläche „Weiter zu Durchgang 2“ – also mehr Lücken (40 % statt 20 %). Ein Kind, das gerade alles falsch hatte, wird ohne Hinweis in die schwerere Stufe geschickt. Die Prozentzahl ist das größte Element der Seite; ein Satz, was jetzt sinnvoll ist, fehlt. (Didaktik der Rückmeldung selbst: D-005/D-008.)
- **Reproduktion / Prüfweg:** `repro-c/s-textbox.mjs`: Lücken mit „fallsch“/„Hunt“ gefüllt → „0 von 8 Lücken richtig geschrieben | 0 % | … | Durchgang wiederholen | Weiter zu Durchgang 2“; Screenshot `shots/ipad-portrait-tb-03-kontrolle.png`.
- **Betroffene Nutzergruppen:** Kinder mit LRS, schwächere Schreiber, Kinder mit geringer Frustrationstoleranz.
- **Mögliche Folgen:** Abwärtsspirale aus schwerer werdenden Durchgängen und schlechteren Werten; Abbruch.
- **Empfehlung:** Unter einer Schwelle (z. B. < 60 %) „Noch einmal mit diesem Durchgang“ als Hauptaktion und einen kurzen ermutigenden Satz zeigen; die Prozentzahl kleiner, die Zahl richtiger Wörter größer darstellen.
- **Aufwand (grob):** S
- **Erfolgskriterium:** Komponententest: bei 0–59 % ist „Durchgang wiederholen“ die Hauptaktion.

### C-013 – Kopfrechnen zeigt vor der Runde alle Aufgaben mit Lösungen in derselben Reihenfolge; Einstieg ist ein Generator für Erwachsene

- **Bereich:** Schülerablauf Kopfrechnen, Szenario 8 (Schwierigkeit wählen), Rechenschwäche
- **Status:** bestätigt (reproduziert)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `app/frei/mathematics/mental-math-app.tsx:702-735` (Liste „Vorschau“ mit `= {displayMathNumber(task.answer)}` und „neu würfeln“ je Aufgabe), Einstellungsbereich davor (Rechenarten, Von/Bis, Anzahl, „Feineinstellungen“: negative Ergebnisse, 0 vermeiden, Lückenaufgaben); Hinweistext Z. 455-459.
- **Beschreibung:** Wer in „Kopfrechnen“ eine Runde zusammenstellt, sieht unter „Vorschau“ alle zehn Aufgaben **mit Ergebnis** („12 − 4 = 8“, „15 − 11 = 4“ …) direkt über „Runde starten“. Die Runde stellt genau diese Aufgaben in genau dieser Reihenfolge („Aufgabe 1 von 10 | 12 − 4“). Zusätzlich kann jedes Kind schwierige Aufgaben einzeln „neu würfeln“. Der Einstieg selbst ist ein Aufgabengenerator mit Zahlenraum von/bis, vier Rechenarten, Anzahl und drei Feineinstellungen. Eine kindgerechte Auswahl („leicht – mittel – schwer“, „Einmaleins“, „bis 20 mit Übergang“) gibt es nicht. Der Weg über „Heute üben“ / „Meine Fehler und Wiederholungen üben“ umgeht den Generator, steht aber erst nach den ersten Fehlern zur Verfügung.
- **Reproduktion / Prüfweg:** `repro-c/s-math.mjs` (iPad hoch): nach „Aufgaben erzeugen“ Text „Vorschau | 12 − 4 | = 8 | 15 − 11 | = 4 | 16 + 4 | = 20 | …“; nach „Runde starten“: „Aufgabe 1 von 10 | KOPFRECHNEN | 12 − 4“.
- **Betroffene Nutzergruppen:** Kinder mit Rechenschwäche (Ablesen statt Rechnen), jüngere Kinder (überfordernde Einstellungen), Kinder mit geringer Aufmerksamkeit (Abkürzung über „neu würfeln“).
- **Mögliche Folgen:** Die Runde misst Kurzzeitgedächtnis statt Rechnen; Fehler- und Wiederholungsdaten (D-009) werden verfälscht. Kinder verlieren Zeit in Einstellungen statt beim Üben.
- **Empfehlung:** Für Kinder die Vorschau ohne Ergebnisse (oder ganz ohne Vorschau) zeigen und die Reihenfolge mischen; „neu würfeln“ nur im Lehrermodus. Drei bis fünf vorgefertigte, benannte Pakete als Standard; der Generator als „Eigene Runde“ für Ältere bzw. Lehrkräfte.
- **Aufwand (grob):** S (Vorschau), M (Pakete)
- **Erfolgskriterium:** Im Schülermodus erscheint vor der Runde keine Lösung; E2E-Test prüft, dass der Setup-Text kein „= <Ergebnis>“ der ersten Rundenaufgabe enthält.

### C-014 – Testlücken bei kritischen Nutzerabläufen: Druck, Abbruch/Fortsetzen, Erstkontakt, Fokus-Rückgabe, Mehrtagesverlauf

- **Bereich:** Testabdeckung kritischer Abläufe (E2E, Barrierefreiheit)
- **Status:** bestätigt (Codeanalyse der Testsuite)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `e2e/*.spec.ts` (14 Dateien, ≈ 88 Tests; `e2e/live/` mit abgefangenen RPCs), `e2e/accessibility-helpers.ts:14-22` (`analyzeAccessibility` scrollt vor jeder Prüfung ans Seitenende), `playwright.config.ts:34-48` (7 Projekte inkl. `minimum-width` 320 px und Playwright-WebKit `tablet-safari`).
- **Beschreibung:** Die Suite ist für ein Einzelprojekt breit. axe läuft auf 19 Hauptseiten (`platform-quality.spec.ts:75-107`) und in Zuständen von Wortspeicher, Textbox, Kopfrechnen, Laufdiktat-Pilot und Lehrerinhalten. 22 `toBeFocused`-Prüfungen sichern die Fokusführung, und alle Tests laufen zusätzlich bei 320 px. Die in diesem Bericht gefundenen Fehler liegen aber genau in den Lücken:
  - **Druck:** `emulateMedia({media:"print"})` nur in `textbox.spec.ts:365-375`. Der QR-Bogen wird nur am Bildschirm geprüft (`platform-quality.spec.ts:936-939`) → C-006 unentdeckt.
  - **Abbruch/Fortsetzen:** 13 `reload()`-Aufrufe prüfen gespeicherte Ergebnisse, die Fortsetzung nur in der Textbox. Kein Test für Zurück-Geste, Navigation während der Runde oder Rückfrage → C-001.
  - **Erstkontakt:** Kein Test öffnet ein frisches Gerät und folgt der Hauptschaltfläche → C-003. „Weiterlernen“ wird nur mit vorbereiteten Daten geprüft (`platform-quality.spec.ts:294-346`).
  - **Fokus-Rückgabe nach Dialogen/Blättern:** keine Prüfung → C-005.
  - **Zeitverlauf:** `page.clock` in 2 Tests (Portion von gestern, Spiegelschrift). Kein Mehrtagesverlauf mit Anzeigen auf Startseite, LernBox und Wortspeicher → C-008.
  - **Darstellungsmodi:** Dunkelmodus nur für die LernBox (`platform-quality.spec.ts:581`). Kein Test mit `reducedMotion`, 200 % Zoom oder Textabstand (WCAG 1.4.12).
  - **Module:** Tastenwelt nur „listet Lektionen und startet“ (`:367`), ohne Übung, ohne axe im Übungszustand. Laufdiktat allein nur als Fehlerübernahme (`:388`), ohne Fokus und Ansage → C-011.
  - **Plattform:** Playwright-WebKit ist nicht Safari auf dem iPad. Bildschirmtastatur, Zurück-Wischgeste, Speicherlöschung (B-002) und VoiceOver sind ungeprüft; die Suite läuft gegen den Entwicklungsserver (A-006).
    Zur Kennzahl siehe A-005: `app/` geht nicht in die Abdeckungsschwelle ein.
- **Reproduktion / Prüfweg:** `grep` über `e2e/*.spec.ts`: `emulateMedia` 1 Datei, `colorScheme` 0, `reducedMotion` 0, `clock` 2 Dateien, `goBack` 1 Treffer, `toBeFocused` 22; Testnamen per `grep -n 'test("'`. Gegenprobe: Die eigenen Skripte in `repro-c/` decken die genannten Lücken ab und fanden dort C-001, C-003, C-005, C-006, C-008, C-011.
- **Betroffene Nutzergruppen:** alle; indirekt die Lehrkraft als einzige Entwicklerin bzw. einziger Entwickler, die sich auf grüne Suiten verlässt.
- **Mögliche Folgen:** Regressionen in Abläufen, die im Unterricht sofort auffallen (Druck, Abbruch, Erstkontakt), bleiben bis zum Einsatz unentdeckt.
- **Empfehlung:** Eine kleine Suite „Unterrichtsabläufe“ mit sechs Szenarien: (1) frisches Gerät → erste Übung, (2) Abbruch und Fortsetzen je Modul, (3) QR-Bogen mit 30 Kindern als PDF, (4) Dialog öffnen/schließen mit Fokusprüfung, (5) zehn Tage mit `page.clock` und Konsistenzprüfung aller Zähler, (6) axe in jedem Modul im Rundenzustand mit `colorScheme: "dark"` und `reducedMotion: "reduce"`. Zusätzlich vor Releases eine manuelle Checkliste auf einem echten iPad mit VoiceOver.
- **Aufwand (grob):** M
- **Erfolgskriterium:** Die sechs Szenarien laufen in CI; ein absichtlich wiedereingebauter Fehler aus C-006 oder C-008 lässt die Suite rot werden.

### C-015 – Kleinere Bedien- und Darstellungspunkte (Sammelbefund)

- **Bereich:** Touch-Ziele, Rückmeldungsdarstellung, Konsistenz
- **Status:** bestätigt (reproduziert)
- **Schweregrad:** P3
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** Messung `repro-c/sweep.mjs` (Funktion `targets` in `repro-c/lib.mjs`); `app/views/textbox/library-screen.tsx:433-451` (Schwierigkeitsfilter), Wortspeicher-Rückmeldung (`app/views/wortspeicher/`), Kopfzeile der Schülerseiten.
- **Beschreibung:**
  1. **Touch-Ziele:** WCAG 2.5.8 (≥ 24 px) ist fast überall erfüllt. Unter der für Kinder üblichen Empfehlung von 44 px liegen der Logo-Link „Zur Startseite“ und „Hell oder dunkel“ (38×38 px, auf jeder Schülerseite), die Textbox-Schwierigkeitsfilter (28 px breit, ohne sichtbare Beschriftung) und die Fußzeilenlinks der Startseite (14 px hoch).
  2. **Rückmeldung bei völlig falscher Eingabe:** Der Wortspeicher listet je Buchstabe eine Zeile („1. Buchstabe fehlt: S … 6. Buchstabe: x statt l“). Bei Teilfehlern ist das hilfreich, bei einem ganz falschen Wort ist es eine Textwand (Screenshot `shots/a11y-ipadDark-wort-s4-feedback.png`).
  3. **Klebende untere Leiste:** Bei 320 px, iPhone und iPad Mini meldet axe einzelne Ziele am unteren Rand als „teilverdeckt“. Beim Scrollen sind sie erreichbar. `e2e/accessibility-helpers.ts` umgeht das, indem es vor der Prüfung ans Seitenende scrollt. Der Effekt besteht also und wird bewusst ausgeblendet.
- **Reproduktion / Prüfweg:** Rundgänge iPad hoch/320 px/iPhone/iPad Mini (Tabelle in Abschnitt 2); Wortspeicher Stufe 4 mit Eingabe „xx“ (`repro-c/s-a11y.mjs`).
- **Betroffene Nutzergruppen:** jüngere Kinder (Feinmotorik), Kinder mit geringer Lesemotivation.
- **Mögliche Folgen:** Fehltipps auf das Logo (führt aus der Runde, C-001), Überforderung bei vielen Fehlerzeilen.
- **Empfehlung:** Kopfzeilenknöpfe auf 44 px; Filter beschriften; ab mehr als zwei Abweichungen statt der Liste nur „Schau dir das Wort noch einmal genau an“ mit dem Vergleich; `scroll-padding-bottom` für die klebende Leiste.
- **Aufwand (grob):** S
- **Erfolgskriterium:** Alle Bedienelemente der Schülerseiten ≥ 44 px; Rückmeldung bei Totalfehlern höchstens zwei Zeilen.

## 5 Bewertung der Dimensionen (0–5)

| Dimension                          | Wert | Begründung                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------- | ---: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Benutzerfreundlichkeit (Schüler)   |  2,5 | **Stärken:** ruhige, einheitliche Oberfläche. Große Hauptaktionen. „Üben“ mit Bildkacheln. Gute Rundenabläufe in Wortspeicher, LernBox und Textbox mit Fokusführung und Fortsetzen (Textbox). **Schwächen für die Zielgruppe** (junge Kinder, DaZ, LRS): Der Erstkontakt führt ins Leere bzw. in die Tastenwelt (C-003). Erwachsenensprache und keine vorgelesenen Anleitungen (C-007). Widersprüchliche Statusanzeigen (C-008). Runden gehen beim Fehltipp verloren (C-001). Kopfrechnen verrät die Lösungen (C-013). Feste Merkzeit (C-002). Selbstständiges Arbeiten ohne Erwachsene ist für Grundschulkinder nur eingeschränkt möglich.    |
| Benutzerfreundlichkeit (Lehrkraft) |    2 | Klassen und QR-Codes entstehen schnell und lokal; axe ohne Befund. Aber: Der QR-Bogen druckt nur die Hälfte (C-006, P1). Schüler werden einzeln angelegt. Inhalte hängen am Laufdiktat-Assistenten, die Freigabe ist ein zweites Formular mit Demo-Werten, Seiten tragen mehrere Namen, Einstellungen sprechen Technik (C-010). Der Weg zur ersten Nutzung im Unterricht ist lang und fehleranfällig.                                                                                                                                                                                                                                          |
| Barrierefreiheit                   |  3,5 | **Automatisch prüfbar sehr gut:** 0 axe-Verstöße in 26 Seiten × 4 Ansichten und 32 Rundenzuständen (hell/dunkel, 320 px, 200 %, reduzierte Bewegung). Kein horizontales Scrollen, robust bei Textabstand, Bewegung abschaltbar, sichtbarer Fokus, Statusansagen in drei Modulen (Textbox: Fokus auf die Überschrift). **Abzüge:** nicht anpassbare Zeitgrenze (C-002, WCAG 2.2.1), Fokusverlust nach Blättern und Scheinmenü (C-005), Laufdiktat allein ohne Fokus/Ansage (C-011). Kognitive Zugänglichkeit (Sprache, Vorlesen; C-007) ist die größte Lücke. Keine Prüfung mit VoiceOver/Schaltern möglich; keine formale Konformitätsaussage. |
| Testabdeckung kritischer Abläufe   |    3 | Breite E2E-Suite (≈ 88 Tests, 7 Projekte inkl. 320 px und WebKit), axe auch in Zuständen, 22 Fokusprüfungen. Die hier gefundenen Fehler liegen aber genau in nicht getesteten Unterrichtsabläufen: Druck, Abbruch/Fortsetzen, frisches Gerät, Fokus-Rückgabe, Mehrtagesverlauf, Darstellungsmodi (C-014). Kein echter iPad-Safari-, Bildschirmtastatur- oder VoiceOver-Test (A-006).                                                                                                                                                                                                                                                           |

## 6 Die fünf wichtigsten Befunde

1. **C-006 (P1)**: Der QR-Bogen druckt nur die erste Bildschirmseite. Bei 24 Kindern fehlen 12 Codes. Der wichtigste Einschreibeweg scheitert in der ersten Stunde, die Behebung ist eine kleine CSS-Regel.
2. **C-003 (P2)**: Erstes Öffnen: „Heute ist nichts dran“, und die Hauptschaltfläche führt neue Kinder in die Tastenwelt statt zu Rechtschreibung oder Mathematik.
3. **C-001 (P2)**: Übungsrunden gehen bei Fehltipp, Zurück-Geste oder Neuladen ohne Rückfrage verloren. Nur die Textbox kann fortsetzen.
4. **C-007 (P2)**: Die Kinderoberfläche spricht Erwachsenensprache („Merkstufe“, „Durchgang“, „Wiederholungsfälligkeit“, LIX bis 54) ohne Vorlesefunktion für Anleitungen. Das ist die größte Hürde für jüngere Kinder, DaZ und LRS.
5. **C-008 (P2)**: Statusanzeigen widersprechen sich: „erledigt“ bei offenen Karten, neue Karten als „schwierig“, „üben wir noch einmal“ bei „nichts fällig“.

Direkt dahinter: C-013 (Kopfrechnen zeigt Lösungen vor der Runde), C-010 (Lehrerablauf), C-002 (feste Merkzeit), C-014 (Testlücken genau bei diesen Abläufen).

## 7 Echte Stärken (in diesem Lauf geprüft)

- **Automatisch prüfbare Barrierefreiheit auf hohem Niveau:** axe meldet in 26 Seiten auf vier Geräteansichten und in 32 Zuständen mitten in Runden (hell, dunkel, 320 px, 200 % Zoom, reduzierte Bewegung) keinen Verstoß außer Randartefakten der klebenden Leiste. Kein horizontales Scrollen. Robust gegen erhöhte Text-, Wort- und Zeilenabstände.
- **`prefers-reduced-motion` wird beachtet:** Die Tastenwelt-Animationen laufen nur ohne diese Einstellung.
- **Fokusführung in Runden:** Eingabefeld beim Start fokussiert, nach Fehler „Noch einmal versuchen“, danach wieder das Feld. Rückmeldungen per `role="status"` in LernBox, Kopfrechnen und Wortspeicher. Deutlicher 3-px-Fokusrahmen.
- **Buchstabengenaue Rückmeldung im Wortspeicher** („3. Buchstabe fehlt: f“, „groß statt klein“) und ein sauberer Wiederholungsablauf.
- **Textbox setzt nach Neuladen fort** („Durchgang 2 offen … weiterüben“). Das Muster, das den übrigen Modulen fehlt (C-001).
- **Bildschirmtastatur (emuliert):** Wortspeicher und Textbox halten Eingabe und „Prüfen“ auch bei halbierter Höhe sichtbar.
- **Raumcode-Eingabe:** vier Ziffernfelder mit `inputmode="numeric"`, Übernahme des Codes von der Startseite, verständliche Kamera-Fehlermeldung, ehrliche Meldung ohne Backend.
- **Ton ohne Druck:** keine Strafserie, stattdessen „Diese Woche x von 7 Tagen“. LernBox-Abschluss „Gut gearbeitet · 2 gewusst · 2 noch zu üben“. Stufe 6 ohne Stimme wird deaktiviert und erklärt.
- **Übersicht „Üben“:** sechs Kacheln mit Bild, Name und einem Satz. Klar und groß.

## 8 Reproduktionsartefakte (Scratchpad, nicht im Repository)

Verzeichnis `/tmp/claude-0/-home-user-Lernplattform/c2fe15db-371c-56e7-8bd8-eafd11c1a5af/scratchpad/repro-c/`:
Hilfsbibliothek `lib.mjs`, `flows.mjs`; Szenarien `s1-first.mjs`, `s-abort.mjs`,
`s-abort3.mjs`, `s-a11y.mjs`, `sweep.mjs` (+ `sweep-*.json`, `sweep-run3-*.log`),
`s-textbox.mjs`, `s-textbox-timer.mjs`, `s-kbd.mjs`, `s-typing-kbd.mjs`,
`s-keyboard.mjs`, `s-focus2.mjs`, `s-live.mjs`, `s-ld-focus.mjs`, `s-laufdiktat.mjs`,
`s-teacher1.mjs`, `s-teacher2.mjs`, `s-teacher3.mjs`, `s-teacher-print.mjs`,
`s-print2.mjs`, `s-tsettings.mjs`, `s-headings.mjs`, `s-raum.mjs`, `s-raum2.mjs`,
`s-weeks.mjs` (+ `out-weeks.txt`), `s-difficult.mjs`, `s-wortdue.mjs`, `s-wort2.mjs`,
`s-lernbox2.mjs`, `s-math.mjs`, `s-spacing.mjs`, `s-profil.mjs`, `s-typing.mjs`,
`lix.py`; Screenshots und PDFs in `shots/` (u. a. `qrbogen.pdf`, `qrbogen-p-1.png`,
`desktop-qrbogen.pdf`, `ipad-portrait-qrbogen.pdf`, `abort3-round-nav.png`,
`typing-land-kbd.png`, `ipad-portrait-tb-03-kontrolle.png`).
