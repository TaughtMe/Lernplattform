# Umsetzungsplan: Zwei-Finger-Aufdecken im Lernraum-Laufdiktat wie im Original

Stand: 03.10.2026 · Ausgangsstand `claude/lernraum-ui-v2` @ `e3cd7a5` · Vergleich mit
`TaughtMe/Laufdiktat` (Standardbranch, `src/pages/Game.tsx`, `src/pages/StationGame.tsx`)

Dieser Plan ist die Arbeitsgrundlage für einen KI-Agenten. Er ändert nur das Schülerspiel
(Laufdiktat, Üben, Battle, Stationen) und nichts an Raumdienst, Speicherung oder Wertung.
Die Entscheidungen in Abschnitt 4 sind mit der projektverantwortlichen Lehrkraft abgestimmt
und verbindlich.

## 0. Arbeitsweise

- Eigener Branch, abgezweigt von `claude/lernraum-ui-v2`. **Nicht direkt auf
  `claude/lernraum-ui-v2` pushen.** Die Lehrkraft übernimmt per Pull Request.
- Regeln: `AGENTS.md`, `docs/engineering-quality.md`, `docs/device-support.md`,
  `docs/laufdiktat-parity.md`, `docs/umsetzungsplan-lernraum-ui-v2.md` (bewusste
  Abweichungen von der Vorlage 5a/5b werden dort dokumentiert).
- Keine neuen Abhängigkeiten. Keine Änderung an Peek-, Fehler- oder Sternlogik, an
  `onProgress`, an der Vokabelübernahme oder an den Raum-RPCs.
- Vor dem Push: `npm run check`, `npm run test:design`,
  `npx playwright test --config playwright.live.config.ts` (alle Live-Tests, weil mehrere
  heute den Knopf „Aufgabe zeigen“ benutzen, siehe Paket 4) und der neue Gestentest
  (Abschnitt 6), mindestens in `desktop-chromium`, `mobile-chrome`, `mobile-safari`,
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

- `app/ui/lernraum-ui.css:1111` setzt `touch-action: none`, `height: 100dvh`,
  `overflow: hidden` und `user-select: none` nur für `.ui-game.is-active-round`.
- Seit `0185083` („Laufdiktat Schüler im Design 5a/5b angebunden“) heißt die Spielfläche
  `.ui-dictation is-active-round` (`app/raum/spiel/live-game.tsx:672`,
  `app/raum/spiel/station-game.tsx:196`). Für `.ui-dictation` (`lernraum-ui.css:1353`) gibt es
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
   dezenten Randleisten. Keine Karte, kein Augen-Symbol, kein Erklärabsatz, **kein Knopf**.
2. **Halten:** Sobald zwei Finger liegen, steht nur das Wort/die Aufgabe groß in der Mitte.
   Randleisten und Hinweis blenden aus. Fingerbewegung, Nachgreifen oder ein dritter Finger
   ändern nichts.
3. **Loslassen:** Bei weniger als zwei Fingern öffnet sich das Schreibfeld (wie heute).
4. **Nochmal ansehen:** Zwei Finger funktionieren auch im Schreibzustand; die angefangene
   Antwort bleibt erhalten. Der Link „nochmal ansehen“ führt zum schlichten Wartezustand.
5. **Kein Zoom, kein Scrollen** auf der Spielfläche, solange gewartet oder gelesen wird.
6. **PC und Laptop:** Die Tasten **A und L gleichzeitig gedrückt halten** zeigt das Wort,
   Loslassen einer der beiden Tasten öffnet das Schreibfeld. Das entspricht den zwei Fingern:
   Beide Hände sind beim Ansehen belegt, eine Maus wird nicht gebraucht. Das bisherige
   Gedrückthalten der Maustaste entfällt.

Stationen folgen demselben Muster. Nummernwahl, Blättern, Spickerzählung und die Rückkehr nach
drei Sekunden bleiben unverändert.

## 4. Entscheidungen (abgestimmt)

1. **Kein Knopf zum Aufdecken.** „Aufgabe zeigen“, „Jetzt schreiben“ und „Aufgabe wieder
   verdecken“ entfallen ersatzlos, auch nicht klein am Rand. Aufgedeckt wird nur durch Halten:
   zwei Finger (Touch) oder die Tasten A und L (Tastatur). Weitere Barrierefreiheits-
   Ergänzungen für die Geste (Ein-Zeiger-Alternative nach WCAG 2.5.1, Ansage per
   `aria-live`) sind nicht Teil dieses Plans. Die bestehenden axe-Prüfungen der Seiten
   (Kontrast, Beschriftungen, Rollen) bleiben als Quality Gate bestehen.
2. **Zoom nur auf der Spielfläche sperren** (`touch-action`), **nicht** global per
   `user-scalable=no` im Viewport. Zoom bleibt in allen anderen Bereichen erhalten.
3. **Bewusste Abweichung von der Designvorlage 5a/5b** für Warten und Lesen. Wird in
   `docs/umsetzungsplan-lernraum-ui-v2.md` dokumentiert; die Design-Referenzbilder für „hold“
   und „read“ werden neu festgelegt.
4. **Am Computer A + L statt Maus.** Gleichzeitiges Halten von A und L deckt auf; die Maus hat
   keine Aufdeck-Funktion mehr.
5. **Erklärung vor dem ersten Aufdecken genügt.** Der Hinweis im Wartezustand sagt vor jedem
   Aufdecken, was zu tun ist. Ein zusätzlicher Ersatzweg für Kinder, die die Geste nicht
   kennen, ist nicht nötig.

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

### Paket 2 – Eine Halte-Quelle statt vieler Handler

- Neuer Hook `app/raum/spiel/use-hold-to-reveal.ts` mit zwei Eingängen (zwei Finger, Tasten
  A + L), die dasselbe „zeigen“/„verdecken“ melden:
  - Signatur: `useHoldToReveal(surfaceRef, { enabled, phase, onReveal, onRelease })`.

  **Zwei Finger:**
  - Native Pointer-Listener am **dauerhaften** Spielflächen-Container (`data-game-surface`),
    Capture-Phase. Aktive Kontakte in einem `Set` von `pointerId` zählen.
  - Ab zwei Kontakten: `surface.setPointerCapture(id)` für alle aktiven Kontakte, dann
    `onReveal()`. Ab jetzt landen `pointerup`/`pointercancel` immer an der Spielfläche, auch
    wenn das berührte Element beim Aufdecken ersetzt wird (in Chromium nachgemessen).
  - Unter zwei Kontakten (`pointerup`, `pointercancel`, `lostpointercapture`): `onRelease()`.
  - Mauszeiger (`pointerType === "mouse"`) werden nicht gezählt; die Maus deckt nicht auf.
  - Einzelne Taps auf Kopf-Knöpfe (Zurück, Vorlesen, Hell/Dunkel), Battle-Knöpfe und das
    Antwortfeld bleiben unberührt: Capture erst ab zwei Kontakten, sonst würde der Klick an
    der Spielfläche statt am Knopf landen.

  **Tasten A + L:**

  - `keydown`/`keyup` am `window`, solange die Spielfläche aktiv ist. Erkennung über
    `event.code` (`KeyA`, `KeyL`), damit Groß-/Kleinschreibung und Tastaturbelegung keine
    Rolle spielen. Ereignisse mit Strg, Alt oder Meta und `event.repeat` werden ignoriert.
  - Sind beide Tasten unten → `onReveal()`. Geht eine davon hoch → `onRelease()`.
  - Im Warte- und Lesezustand `preventDefault` für A und L, damit nichts getippt oder
    gescrollt wird.
  - **Im Schreibzustand deckt A + L nur auf, wenn der Fokus nicht im Antwortfeld liegt.**
    Sonst würde schnelles Tippen von Wörtern wie „alle“ oder „Ball“ (Taste A noch unten,
    während L gedrückt wird) das Wort aufdecken. Zum erneuten Ansehen per Tastatur: `Esc`
    verlässt das Antwortfeld und führt in den Wartezustand (wie „nochmal ansehen“), dann
    A + L. Die angefangene Antwort bleibt erhalten.
  - Nach dem Loslassen das Antwortfeld erst fokussieren, wenn **beide** Tasten oben sind.
    Sonst schreibt die noch gehaltene Taste per Tastenwiederholung „llll“ ins Feld. Bis dahin
    `keydown` von A/L abfangen.
  - Verliert das Fenster den Fokus (`blur`, `visibilitychange`), gilt das als Loslassen; sonst
    bliebe das Wort nach einem Fensterwechsel stehen, weil das `keyup` fehlt.

  **Gemeinsam:**

  - Zustandsfrei gegenüber dem Spiel: Der Hook meldet nur „zeigen“/„verdecken“. Peek-Zählung
    bleibt in `live-game.tsx` bzw. `station-game.tsx`. Kommen Finger und Tasten gleichzeitig,
    zählt das als ein Aufdecken.
  - Reine Logik (Kontakt- und Tastenzählung, Übergänge) als testbare Funktion in
    `src/domain/hold-to-reveal.ts`, der Hook verdrahtet nur DOM-Ereignisse.

- `live-game.tsx`: `onTouchStart`/`onTouchEnd`/`onTouchCancel`, `holdWithMouse`,
  `releaseHold`, `showWithButton` und `shownByButton` entfernen und durch den Hook ersetzen.
  `revealWord` und `startWriting` bleiben die einzigen Zustandswechsel. `phaseRef` bleibt als
  Schutz gegen Doppelauslösung.
- `station-game.tsx`: dasselbe; `shownByButton` und `hold.onShow` entfallen, `hide` wird
  `onRelease`. Der Drei-Sekunden-Rückfall läuft weiter über `activity`.
- `student-dictation-screen.tsx`: `holdHandlers`, `onTouchEnd`, `onPointerUp`,
  `onPointerLeave` aus `HoldPhase`/`ReadPhase` entfernen. Props `onHoldStart`/`onHoldEnd`,
  `hold.onShow`, `read.onWriteNow`, `read.writeNowLabel` und `read.releaseHint` entfallen;
  die Ansicht bleibt rein (nur Darstellung).
- Alles, was beim Aufdecken verschwindet oder erscheint (Randleisten, Hinweis, Wort), bekommt
  `pointer-events: none`. Nur echte Knöpfe im Kopf und im Schreibzustand bleiben klickbar.

### Paket 3 – Darstellung wie im Original

- `HoldPhase`: Karte, Augen-Symbol, Überschrift, Erklärabsatz und Knopf entfallen. Stattdessen
  eine Zeile Hinweis in der Mitte und zwei schmale Randleisten (ca. 6 × 96 px, Akzentfarbe,
  Deckkraft 25–40 %, an beiden Rändern mittig), `aria-hidden`. Auf Geräten mit Maus/Touchpad
  (`@media (hover: hover) and (pointer: fine)`) lautet der Hinweis „Halte **A** und **L**
  gleichzeitig gedrückt, um {Satz|Wort|Aufgabe} {n} zu sehen.“, die beiden Buchstaben als
  Tastenkappen (`<kbd>`) links und rechts statt der Randleisten. Tablets mit Tastatur zeigen den
  Finger-Hinweis; A + L funktioniert dort trotzdem. Ladezustand und Fehler mit „Erneut laden“ bleiben (Stationen); „Erneut
  laden“ ist keine Aufdeck-Schaltfläche und bleibt deshalb.
- `ReadPhase`: nur das Wort, zentriert, ohne Karte, ohne Pill, ohne Randflächen, ohne Knopf,
  ohne „Loslassen …“-Hinweis. Randleisten blenden mit 200 ms aus (`prefers-reduced-motion`:
  sofort).
- Schriftgröße automatisch anpassen: kleiner Hook `app/views/laufdiktat/use-auto-fit-text.ts`
  nach Vorbild von `useAutoFitFontSize` im Original (28–88 px, Station 28–72 px), Container
  ca. 92 vw × 38 vh. Formeln (`MathDisplay`, KaTeX) einbeziehen.
- Fortschrittsanzeige (Satz n von m) steht im Kopf; die Pill in der Lesephase entfällt.
- Vorlesen bleibt im Kopf; der Knopf stoppt die Weitergabe von `pointerdown`, damit er nicht
  als Halten zählt.
- Stationen: Die Blätter-Leiste (`StationNav`: Zurück, Nächste Aufgabe, Fertig, Zur
  Nummernauswahl) bleibt im Wartezustand sichtbar und wird beim Halten ausgeblendet.

### Paket 4 – Tests auf Halten umstellen

Heute klicken viele Tests „Aufgabe zeigen“, um im Spiel voranzukommen. Diese Schritte werden
durch Halten ersetzt:

- Live-Tests: `e2e/live/original-parity.spec.ts`, `math-continuation.spec.ts`,
  `progress-delivery.spec.ts`, `vocabulary-transfer.spec.ts`, `writing-relief.spec.ts`.
  Gemeinsamer Helfer `e2e/live/hold.ts` mit `revealByHold(page)` und `release(page)`:
  `page.keyboard.down("a")` + `page.keyboard.down("l")` bzw. `page.keyboard.up("l")` +
  `page.keyboard.up("a")` (funktioniert in allen sieben Profilen). Prüfungen auf „Aufgabe zeigen“ als Hinweis auf einen bedienbaren Zustand
  (z. B. Versionskonflikt: „not.toBeVisible“) auf den Hinweistext umstellen.
- Komponententests: `app/raum/spiel/live-parity.test.tsx`, `station-game.test.tsx` von
  Knopf-Klicks auf Pointer-Ereignisse an der Spielfläche bzw. A + L umstellen.
- Nicht betroffen: gleichnamige Texte in `teacher-dictation-screen.tsx`,
  `learning-box-app.tsx` und `lernbox-screen.tsx` gehören zu anderen Bereichen und bleiben.

### Paket 5 – Dokumentation

- `docs/laufdiktat-parity.md`: Zeilen „Erneutes Nachschauen“ und „Stationen“ um „robust gegen
  Verrutschen, kein Zoom“ ergänzen; den Satz „Maus- und Tastaturbedienung bleiben zusätzlich
  zur Zwei-Finger-Bedienung möglich“ ersetzen durch „Am Computer decken die gleichzeitig
  gehaltenen Tasten A und L auf. Eine Schaltfläche zum Aufdecken gibt es bewusst nicht (wie im
  Original).“
- `docs/umsetzungsplan-lernraum-ui-v2.md`: bewusste Abweichung von Vorlage 5a/5b (Warten und
  Lesen, kein Aufdeck-Knopf) mit Begründung festhalten.
- Vault: kurze Notiz unter „Qualitätsgrundlage“ zu den neuen Gestentests.

## 6. Tests

- **Unit** (`src/domain/hold-to-reveal.test.ts`): zwei Kontakte → zeigen; einer hebt ab →
  verdecken; drei Kontakte und wieder zwei → bleibt gezeigt; `pointercancel` zählt als
  Abheben; Mauszeiger zählt nicht; doppelte `pointerdown`-IDs werden nicht doppelt gezählt.
  A + L → zeigen; A oder L hoch → verdecken; nur A oder nur L → nichts; Tastenwiederholung
  und Strg/Alt/Meta ignoriert; `blur` → verdecken; im Schreibzustand mit Fokus im Antwortfeld
  löst A + L nicht aus.
- **Komponenten** (`live-game.test.tsx`, `live-parity.test.tsx`, `station-game.test.tsx`):
  Wort bleibt nach `pointermove` beider Kontakte sichtbar; Antwort bleibt nach erneutem
  Aufdecken aus dem Schreibzustand erhalten; erstes Ansehen zählt nicht, zweites zählt einen
  Spicker (unverändert); im Warte- und Lesezustand gibt es keine Schaltfläche zum Aufdecken
  oder Verdecken; ein Tap auf „Vorlesen“ deckt nicht auf; Tippen von „alle“ im Antwortfeld
  deckt nicht auf; nach A + L enthält das Antwortfeld kein „a“ oder „l“; `Esc` im Antwortfeld
  führt in den Wartezustand und behält die Antwort.
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
- **Design** (`npm run test:design`): Referenzbilder „hold“ und „read“ neu festlegen; axe
  ohne Befund in beiden Zuständen und im Hell/Dunkel-Modus.
- **Geräteabnahme im Unterricht** (verpflichtend, nicht automatisierbar): iPad (Safari),
  Android-Tablet (Chrome), ein Schul-Smartphone. Je zehn Durchgänge mit Nachgreifen und
  bewusst unruhigen Fingern; kein Zoom, kein vorzeitiges Schließen, kein Kontextmenü.

## 7. Risiken

| Risiko                                                                                          | Gegenmaßnahme                                                                                       |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `touch-action: none` verhindert Scrollen im Schreibzustand mit Bildschirmtastatur               | Schreibbereich mit `pan-y` und eigenem Scrollbereich; Test auf 360 × 640 mit offener Tastatur       |
| iOS ignoriert die Sperre in Einzelfällen                                                        | `gesturestart` abfangen (Paket 1), echte iPad-Abnahme                                               |
| Pointer-Capture stört Klicks auf Knöpfe                                                         | Capture erst ab zwei Kontakten; Komponententest „Prüfen“ und „Vorlesen“ per Tap                     |
| Ohne Knopf bleibt ein Kind hängen, das die Geste nicht kennt                                    | Gering: Der Hinweis im Wartezustand erklärt vor jedem Aufdecken, was zu tun ist (Finger bzw. A + L) |
| A + L löst beim Tippen im Antwortfeld aus oder hinterlässt Buchstaben im Feld                   | Kein Auslösen bei Fokus im Antwortfeld; Fokus erst, wenn beide Tasten oben sind; Komponententests   |
| Viele Live-Tests brechen, weil sie „Aufgabe zeigen“ klicken                                     | Paket 4 im selben Pull Request wie Paket 2/3; gemeinsamer Helfer statt Einzelanpassungen            |
| Battle: Tinte/Flimmern überlagern die Fläche                                                    | Overlays bleiben `pointer-events: none` (heute schon); im Gestentest Battle-Runde mitprüfen         |
| Bildschirmtastatur schließt beim Aufdecken aus dem Schreibzustand und lässt das Layout springen | Verhalten wie im Original akzeptieren; Fokus nach dem Loslassen wieder ins Antwortfeld (besteht)    |

## 8. Fertig, wenn

- Auf Handy und Tablet zeigt **eine** Zwei-Finger-Berührung das Wort, Loslassen öffnet das
  Schreibfeld – ohne Zwischenbildschirm, ohne zweiten Tap.
- Im Warte- und Lesezustand gibt es keine Schaltfläche zum Aufdecken oder Verdecken.
- Während des Haltens ist nur das Wort zu sehen, groß und ohne Randflächen oder Knöpfe.
- Verrutschen, Nachgreifen und Pinch beenden das Halten nicht und zoomen die Seite nicht.
- Am Computer deckt gleichzeitiges Halten von A und L auf, ohne Maus; im Antwortfeld landen
  dabei keine Buchstaben.
- Stationen verhalten sich gleich; Spickerzählung, Fortschritt und Wertung sind unverändert.
- Alle Prüfungen aus Abschnitt 0 und 6 sind grün, die Geräteabnahme ist dokumentiert.
