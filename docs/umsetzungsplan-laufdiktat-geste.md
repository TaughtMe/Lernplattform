# Umsetzungsplan: Zwei-Finger-Aufdecken im Lernraum-Laufdiktat wie im Original

Stand: 03.10.2026 · Ausgangsstand `claude/lernraum-ui-v2` @ `bbb4702` · Vergleich mit
`TaughtMe/Laufdiktat` (Standardbranch, `src/pages/Game.tsx`, `src/pages/StationGame.tsx`)

Dieser Plan ist die Arbeitsgrundlage für einen KI-Agenten. Er ändert nur das Schülerspiel
(Laufdiktat, Üben, Battle, Stationen) und nichts an Raumdienst, Speicherung oder Wertung.
Die Punkte in Abschnitt 4 muss die projektverantwortliche Lehrkraft vor dem Start entscheiden.

## 0. Arbeitsweise

- Eigener Branch, abgezweigt von `claude/lernraum-ui-v2`. **Nicht direkt auf
  `claude/lernraum-ui-v2` pushen.** Die Lehrkraft übernimmt per Pull Request.
- Regeln: `AGENTS.md`, `docs/engineering-quality.md`, `docs/device-support.md`,
  `docs/laufdiktat-parity.md`, `docs/umsetzungsplan-lernraum-ui-v2.md` (bewusste
  Abweichungen von der Vorlage 5a/5b werden dort dokumentiert).
- Keine neuen Abhängigkeiten. Keine Änderung an Peek-, Fehler- oder Sternlogik, an
  `onProgress`, an der Vokabelübernahme oder an den Raum-RPCs.
- Vor dem Push: `npm run check`, `npm run test:design`,
  `npx playwright test --config playwright.live.config.ts e2e/live/original-parity.spec.ts`
  und der neue Gestentest (Abschnitt 6), mindestens in `mobile-chrome`, `mobile-safari`,
  `tablet-safari`. Die volle Browsermatrix läuft in GitHub.

## 1. Vergleich im aktiven Spiel

Die öffentlichen Seiten waren aus der Arbeitsumgebung nicht erreichbar (Netzwerkrichtlinie).
Verglichen wurde deshalb der Quellcode, aus dem beide Seiten gebaut werden. Zusätzlich lief
der Lernraum lokal (`npm run dev` mit den Testwerten aus `playwright.live.config.ts`) und wurde
in Chromium mit echten Mehrfinger-Eingaben (CDP `Input.dispatchTouchEvent`, Pixel-7-Maße)
bedient. Das Laufdiktat-Muster wurde dafür auf einer Testseite nachgebaut.

| Schritt                        | Laufdiktat (Original)                                                                | Lernraum (heute)                                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Wartezustand                   | Eine Zeile Hinweis, zwei dezente Leisten an den Rändern (Deckkraft 25 %), sonst leer | Große Infokarte: Augen-Symbol, Überschrift, Erklärtext, Laptop-Hinweis, Knopf „Aufgabe zeigen“, zwei gestrichelte Randflächen „hier“            |
| Aufdecken                      | Zwei Finger irgendwo auf der Spielfläche, auch während des Schreibens                | Zwei Finger auf der Spielfläche; die Infokarte lädt aber zum Antippen des Knopfs ein                                                            |
| Während des Haltens            | Nur das Wort, groß (automatisch 28–88 px), Randleisten ausgeblendet                  | Karte mit Rahmen, Zähler-Pill „Satz 1 von 3“, Wort in 26 px, Hinweis „Loslassen …“, Knopf „Jetzt schreiben“, zwei gefüllte Randflächen „halten“ |
| Loslassen                      | Weniger als zwei Finger → Schreibfeld                                                | Gleich gedacht, aber über vier verschiedene Wege (Touch, Pointer-Up, Pointer-Leave, Knopf)                                                      |
| Finger rutschen leicht         | Wort bleibt sichtbar                                                                 | **Wort verschwindet schon während des Haltens**, Schreibfeld öffnet sich (Nachweis unten)                                                       |
| Zwei Finger ziehen auseinander | Kein Zoom                                                                            | **Seite zoomt** (gemessen: Faktor 3,55), Randflächen liegen danach außerhalb des sichtbaren Bereichs                                            |
| Per Knopf aufgedeckt           | Gibt es nicht                                                                        | Wort bleibt stehen, bis „Jetzt schreiben“ bzw. „Aufgabe wieder verdecken“ getippt wird – zwei Taps pro Wort                                     |
| Erneutes Ansehen               | Zwei Finger direkt im Schreibzustand oder Link „nochmal ansehen“                     | Link „nochmal ansehen“ führt zurück zur großen Infokarte; erst die nächste Berührung zeigt das Wort                                             |

Diese Unterschiede erklären die gemeldeten Eindrücke:

- „Erste Berührung zeigt einen Infobildschirm, zweite das Wort“: Nach „nochmal ansehen“ und
  nach jedem gelösten Wort erscheint die große Infokarte. Wer dort den Knopf antippt, muss das
  Wort danach wieder per Knopf verdecken. Rutscht ein Finger, schließt das Wort vorzeitig und
  das Kind muss neu ansetzen – das zählt dann zusätzlich als Spicker.
- „Der Rand muss beim Wort nicht mehr gezeigt werden“: Die Lesephase zeigt weiter beide
  Randflächen, Karte, Knopf und Hinweistext. Im Original steht nur noch das Wort.

## 2. Befunde mit Nachweis

### 2.1 Spielfläche ist zoom- und scrollbar

- `app/ui/lernraum-ui.css:1277` setzt `touch-action: none`, `height: 100dvh`,
  `overflow: hidden` und `user-select: none` nur für `.ui-game.is-active-round`.
- Seit `0185083` („Laufdiktat Schüler im Design 5a/5b angebunden“) heißt die Spielfläche
  `.ui-dictation is-active-round` (`app/raum/spiel/live-game.tsx:672`,
  `app/raum/spiel/station-game.tsx:196`). Für `.ui-dictation` (`lernraum-ui.css:1519`) gibt es
  keine dieser Regeln. Die Sperre ging bei der Umstellung verloren.
- Messung: Pinch mit zwei Fingern auf der Spielfläche → `visualViewport.scale = 3,55`.
  Gleiche Geste im Laufdiktat-Muster (`touch-none` am Wurzelcontainer) → `1`.

### 2.2 Leichtes Verrutschen beendet das Halten

- `ReadPhase` (`app/views/laufdiktat/student-dictation-screen.tsx:393–408`) beendet das Halten
  bei `onTouchEnd`, `onPointerUp` **und** `onPointerLeave`, ohne die Zahl der Finger zu prüfen.
- Ohne `touch-action: none` übernimmt der Browser zwei bewegte Finger als Zoom- oder
  Scrollgeste und schickt `pointercancel`; danach folgt `pointerleave` → `releaseHold` →
  Schreibfeld.
- Messung im laufenden Lernraum (beide Finger an den Rändern, x = 30 und x = 382):

  | Bewegung beim Halten | Lernraum: während des Haltens | Laufdiktat-Muster |
  | -------------------- | ----------------------------- | ----------------- |
  | keine                | Wort sichtbar                 | Wort sichtbar     |
  | 12 px                | Wort sichtbar                 | Wort sichtbar     |
  | 25 px nach innen     | **Schreibfeld, Wort weg**     | Wort sichtbar     |
  | 50 px nach innen     | **Schreibfeld, Wort weg**     | Wort sichtbar     |

### 2.3 Das berührte Element verschwindet beim Aufdecken

- Die Finger landen auf den Randflächen bzw. der Karte von `HoldPhase`. Beim Aufdecken wird
  `HoldPhase` durch `ReadPhase` ersetzt. Touch-Ereignisse gehen aber immer an das
  ursprünglich berührte Element. Ist es aus dem DOM entfernt, erreicht `touchend` weder den
  äußeren Container noch die Wurzel, an der React lauscht (in Chromium nachgemessen:
  `touchend` kommt nie an). `onTouchEnd` an der Spielfläche (`live-game.tsx:519–525`) ist
  deshalb wirkungslos; das Loslassen hängt allein an Pointer-Ereignissen der `ReadPhase`.
- Im Original sind Hinweis, Randleisten und Wort `pointer-events: none`. Der berührte Knoten
  ist immer der dauerhafte Container, `touchend` kommt zuverlässig an.

### 2.4 Doppelte und konkurrierende Auslöser

- Aufdecken wird an zwei Stellen ausgelöst (`holdHandlers` in der Ansicht und `onTouchStart`
  an der Spielfläche), beendet an fünf. `phaseRef` und `shownByButton` gleichen das aus
  (`live-game.tsx:483–525`, `station-game.tsx:120–133`, `:195–205`, `:244–250`).
- Die Tests lösen Ereignisse synthetisch direkt an `.is-active-round` aus
  (`e2e/live/original-parity.spec.ts:94–126`, `app/raum/spiel/live-parity.test.tsx:32–35`).
  Sie prüfen weder Zoom noch Verrutschen noch ein ausgetauschtes Touch-Ziel und waren deshalb
  grün, obwohl die Geste auf Geräten unzuverlässig ist.

### 2.5 Darstellung beim Halten

- Das Wort steht in 26 px (`student-dictation-screen.module.css:201–208`). Beim Laufdiktat
  liegt das Gerät aber auf einem entfernten Tisch: Das Original passt die Größe an den Platz an
  (`useAutoFitFontSize`, 28–88 px).

## 3. Zielbild

Der Ablauf im aktiven Spiel entspricht dem Original:

1. **Warten:** Kopf, Fortschritt, darunter eine ruhige Fläche mit einer Zeile
   „Mit zwei Fingern an den Rändern halten, um {Satz|Wort|Aufgabe} {n} zu sehen.“ und zwei
   dezenten Randleisten. Keine Karte, kein Augen-Symbol, kein Erklärabsatz.
2. **Halten:** Sobald zwei Finger liegen, steht nur das Wort/die Aufgabe groß in der Mitte.
   Randleisten, Hinweis und Knöpfe blenden aus. Fingerbewegung, Nachgreifen oder ein dritter
   Finger ändern nichts.
3. **Loslassen:** Bei weniger als zwei Fingern öffnet sich das Schreibfeld (wie heute).
4. **Nochmal ansehen:** Zwei Finger funktionieren auch im Schreibzustand; die angefangene
   Antwort bleibt erhalten. Der Link „nochmal ansehen“ führt zum schlichten Wartezustand.
5. **Kein Zoom, kein Scrollen** auf der Spielfläche, solange gewartet oder gelesen wird.

Stationen folgen demselben Muster. Nummernwahl, Blättern, Spickerzählung und die Rückkehr nach
drei Sekunden bleiben unverändert.

## 4. Offene Entscheidungen (vor dem Start klären)

1. **Knopf ohne Geste.** WCAG 2.5.1 verlangt für Mehrfingergesten eine Ein-Zeiger-Alternative,
   `docs/laufdiktat-parity.md` sichert Maus und Tastatur zu. Das Original hat keinen Knopf.
   - **Empfehlung:** Knopf bleibt, aber klein und am unteren Rand der Spielfläche
     („Ohne Geste anzeigen“), nicht mehr in der Bildmitte. Per Knopf gezeigt: ein Tap auf die
     Fläche oder den Knopf „Verdecken“ schließt wieder – wie heute, nur unauffälliger.
   - Alternative: Knopf nur bei Maus/Tastatur (`@media (any-pointer: fine)` plus sichtbar bei
     Fokus). Kinder auf Tablets könnten dann die Geste nicht mehr umgehen, motorisch
     eingeschränkte Touch-Nutzer hätten aber keinen Ersatz.
2. **Seitenzoom.** Empfehlung: Zoom nur auf der Spielfläche sperren (`touch-action`), **nicht**
   global per `user-scalable=no` im Viewport. So bleibt Zoom in allen anderen Bereichen und
   über die Textgröße des Systems erhalten (`docs/device-support.md`: Zoom bis 200 %).
3. **Vorlage 5a/5b.** Wartezustand und Lesephase weichen danach bewusst von der Designvorlage
   ab. Empfehlung: Abweichung in `docs/umsetzungsplan-lernraum-ui-v2.md` dokumentieren und die
   Design-Referenzbilder für „hold“ und „read“ neu festlegen.

## 5. Umsetzung in Paketen

Jedes Paket ist einzeln prüf- und übernehmbar. Reihenfolge einhalten: Paket 1 behebt die
größten Probleme mit kleinstem Risiko.

### Paket 1 – Spielfläche sperren (klein, sofort spürbar)

- `app/ui/lernraum-ui.css`: Die Regeln aus `.ui-game.is-active-round` auch für
  `.ui-dictation.is-active-round` setzen: `height: 100dvh`, `overflow: hidden`,
  `touch-action: none`, `overscroll-behavior: none`, `user-select: none`,
  `-webkit-user-select: none`, `-webkit-touch-callout: none`.
  `body:has(.ui-dictation.is-active-round) .ui-footer { display: none; }` ergänzen.
- Schreibphase: Braucht der Inhalt bei offener Bildschirmtastatur Platz (Hilfen, Battle-Leiste),
  bekommt nur der Schreibbereich `overflow-y: auto; touch-action: pan-y`. `pan-y` erlaubt
  Scrollen, aber kein Zoomen. Klärt der Agent mit Messung auf 360 × 640 und offener Tastatur.
- Kontextmenü bei langem Halten unterbinden: `onContextMenu={(e) => e.preventDefault()}` an
  der Spielfläche.
- iOS-Absicherung: Auf der Spielfläche `gesturestart`/`gesturechange` (nur WebKit) per
  `preventDefault` abfangen, als nativer Listener mit `{ passive: false }`. Auf einem echten
  iPad prüfen, ob es zusätzlich zu `touch-action: none` nötig ist; sonst weglassen.
- Allein damit verschwinden Zoom und das Abbrechen beim Verrutschen (2.1, 2.2).

### Paket 2 – Eine Gestenquelle statt vieler Handler

- Neuer Hook `app/raum/spiel/use-two-finger-hold.ts`:
  - Signatur: `useTwoFingerHold(surfaceRef, { enabled, onReveal, onRelease })`.
  - Native Pointer-Listener am **dauerhaften** Spielflächen-Container (`data-game-surface`),
    Capture-Phase. Aktive Kontakte in einem `Set` von `pointerId` zählen.
  - Ab zwei Kontakten: `surface.setPointerCapture(id)` für alle aktiven Kontakte, dann
    `onReveal()`. Ab jetzt landen `pointerup`/`pointercancel` immer an der Spielfläche, auch
    wenn das berührte Element beim Aufdecken ersetzt wird (in Chromium nachgemessen).
  - Unter zwei Kontakten (`pointerup`, `pointercancel`, `lostpointercapture`): `onRelease()`.
  - Maus: `pointerdown` mit `pointerType === "mouse"` auf der freien Fläche zählt als Halten,
    `pointerup` als Loslassen (heutiges Laptop-Verhalten bleibt).
  - Einzelne Taps auf Knöpfe und das Antwortfeld bleiben unberührt: Capture erst ab zwei
    Kontakten, sonst würde der Klick an der Spielfläche statt am Knopf landen.
  - Zustandsfrei gegenüber dem Spiel: Der Hook meldet nur „zeigen“/„verdecken“. Peek-Zählung
    bleibt in `live-game.tsx` bzw. `station-game.tsx`.
  - Reine Logik (Kontaktzählung, Übergänge) als testbare Funktion in
    `src/domain/two-finger-hold.ts`, der Hook verdrahtet nur DOM-Ereignisse.
- `live-game.tsx`: `onTouchStart`/`onTouchEnd`/`onTouchCancel`, `holdWithMouse`, `releaseHold`
  entfernen und durch den Hook ersetzen. `revealWord` und `startWriting` bleiben die einzigen
  Zustandswechsel. `phaseRef` bleibt als Schutz gegen Doppelauslösung.
- `station-game.tsx`: dasselbe; `hide` wird `onRelease`. Der Drei-Sekunden-Rückfall läuft
  weiter über `activity`.
- `student-dictation-screen.tsx`: `holdHandlers`, `onTouchEnd`, `onPointerUp`,
  `onPointerLeave` aus `HoldPhase`/`ReadPhase` entfernen. Props `onHoldStart`/`onHoldEnd`
  entfallen; die Ansicht bleibt rein (nur Darstellung).
- Ziele, die beim Aufdecken verschwinden (Randleisten, Hinweis, Wort), bekommen
  `pointer-events: none`. Nur echte Knöpfe bleiben klickbar.

### Paket 3 – Darstellung wie im Original

- `HoldPhase`: Karte, Augen-Symbol, Überschrift und Erklärabsatz entfallen. Stattdessen eine
  Zeile Hinweis in der Mitte und zwei schmale Randleisten (ca. 6 × 96 px, Akzentfarbe,
  Deckkraft 25–40 %, an beiden Rändern mittig). Die Leisten sind reine Orientierung,
  `aria-hidden`. Ladezustand und Fehler mit „Erneut laden“ bleiben (Stationen).
- Der Knopf ohne Geste wandert gemäß Entscheidung 4.1 an den unteren Rand der Spielfläche.
- `ReadPhase` erhält eine Unterscheidung `revealedBy: "gesture" | "button"`:
  - Geste: nur das Wort, zentriert, ohne Karte, ohne Pill, ohne Randflächen, ohne Knopf.
    Randleisten blenden mit 200 ms aus (`prefers-reduced-motion`: sofort).
  - Knopf: Wort plus „Verdecken“ (Live) bzw. „Aufgabe wieder verdecken“ (Station).
- Schriftgröße automatisch anpassen: kleiner Hook `app/views/laufdiktat/use-auto-fit-text.ts`
  nach Vorbild von `useAutoFitFontSize` im Original (28–88 px, Station 28–72 px), Container
  ca. 92 vw × 38 vh. Formeln (`MathDisplay`, KaTeX) einbeziehen.
- Fortschrittsanzeige (Satz n von m) steht im Kopf; die Pill in der Lesephase entfällt.
- Vorlesen bleibt im Kopf; der Knopf stoppt die Weitergabe von `pointerdown`, damit er nicht
  als Halten zählt.
- Barrierefreiheit: Beim Aufdecken das Wort per `aria-live="polite"` ansagen (heute fehlt eine
  Ansage beim Phasenwechsel); Fokus bei Knopfbedienung auf „Verdecken“ setzen.

### Paket 4 – Dokumentation

- `docs/laufdiktat-parity.md`: Zeilen „Erneutes Nachschauen“ und „Stationen“ um „robust gegen
  Verrutschen, kein Zoom“ ergänzen; Prüfnachweis aktualisieren.
- `docs/umsetzungsplan-lernraum-ui-v2.md`: bewusste Abweichung von Vorlage 5a/5b (Warten und
  Lesen) mit Begründung festhalten.
- Vault: kurze Notiz unter „Qualitätsgrundlage“ zu den neuen Gestentests.

## 6. Tests

- **Unit** (`src/domain/two-finger-hold.test.ts`): zwei Kontakte → zeigen; einer hebt ab →
  verdecken; drei Kontakte und wieder zwei → bleibt gezeigt; `pointercancel` zählt als
  Abheben; Maus drücken/loslassen; doppelte `pointerdown`-IDs werden nicht doppelt gezählt.
- **Komponenten** (`live-game.test.tsx`, `live-parity.test.tsx`, `station-game.test.tsx`):
  bestehende Fälle auf Pointer-Ereignisse umstellen; neu: Wort bleibt nach `pointermove` beider
  Kontakte sichtbar; Antwort bleibt nach erneutem Aufdecken aus dem Schreibzustand erhalten;
  erstes Ansehen zählt nicht, zweites zählt einen Spicker (unverändert).
- **Browser, neue Datei `e2e/live/two-finger-gesture.spec.ts`**, nur Chromium-Projekte, mit
  echten Mehrfinger-Eingaben über `page.context().newCDPSession(page)` und
  `Input.dispatchTouchEvent`:
  1. Zwei Finger an den Rändern, 50 px nach innen gleiten → Wort sichtbar; loslassen →
     Schreibfeld.
  2. Pinch in der Mitte → `visualViewport.scale` bleibt 1.
  3. Aus dem Schreibfeld zwei Finger → Wort sichtbar, Antwort nach dem Loslassen erhalten.
  4. Station: gleiche Geste, nach drei Sekunden ohne Berührung zurück zur Nummernwahl.
     WebKit und Firefox behalten die synthetischen Tests aus `original-parity.spec.ts`; dort
     zusätzlich `getComputedStyle(surface).touchAction === "none"` prüfen.
- **Design** (`npm run test:design`): Referenzbilder „hold“ und „read“ nach Entscheidung 4.3
  neu festlegen; axe ohne Befund in beiden Zuständen und im Hell/Dunkel-Modus.
- **Geräteabnahme im Unterricht** (verpflichtend, nicht automatisierbar): iPad (Safari),
  Android-Tablet (Chrome), ein Schul-Smartphone. Je zehn Durchgänge mit Nachgreifen und
  bewusst unruhigen Fingern; kein Zoom, kein vorzeitiges Schließen, kein Kontextmenü.

## 7. Risiken

| Risiko                                                                                          | Gegenmaßnahme                                                                                    |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `touch-action: none` verhindert Scrollen im Schreibzustand mit Bildschirmtastatur               | Schreibbereich mit `pan-y` und eigenem Scrollbereich; Test auf 360 × 640 mit offener Tastatur    |
| iOS ignoriert die Sperre in Einzelfällen                                                        | `gesturestart` abfangen (Paket 1), echte iPad-Abnahme                                            |
| Pointer-Capture stört Klicks auf Knöpfe                                                         | Capture erst ab zwei Kontakten; Komponententest „Prüfen“ und „Vorlesen“ per Tap                  |
| Weniger Erklärung im Wartezustand verunsichert neue Kinder                                      | Einzeiler bleibt immer sichtbar; Lehrkraft erklärt die Geste wie beim Original einmal vorab      |
| Battle: Tinte/Flimmern überlagern die Fläche                                                    | Overlays bleiben `pointer-events: none` (heute schon); im Gestentest Battle-Runde mitprüfen      |
| Bildschirmtastatur schließt beim Aufdecken aus dem Schreibzustand und lässt das Layout springen | Verhalten wie im Original akzeptieren; Fokus nach dem Loslassen wieder ins Antwortfeld (besteht) |

## 8. Fertig, wenn

- Auf Handy und Tablet zeigt **eine** Zwei-Finger-Berührung das Wort, Loslassen öffnet das
  Schreibfeld – ohne Zwischenbildschirm, ohne zweiten Tap.
- Während des Haltens ist nur das Wort zu sehen, groß und ohne Randflächen oder Knöpfe.
- Verrutschen, Nachgreifen und Pinch beenden das Halten nicht und zoomen die Seite nicht.
- Stationen verhalten sich gleich; Spickerzählung, Fortschritt und Wertung sind unverändert.
- Alle Prüfungen aus Abschnitt 0 und 6 sind grün, die Geräteabnahme ist dokumentiert.
