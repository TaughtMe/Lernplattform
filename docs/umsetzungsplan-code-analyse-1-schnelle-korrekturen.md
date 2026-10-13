# Teilplan 1: Schnelle Korrekturen (Doku, Demo-Route, Abdeckung)

Stand: 13.10.2026 · Übersicht: [umsetzungsplan-code-analyse.md](umsetzungsplan-code-analyse.md) ·
Branch: `claude/code-analyse-1-schnelle-korrekturen`

Drei voneinander unabhängige Aufgaben. Je Aufgabe ein Commit.

## 1.1 Freigabestand in README und Architektur-Doku korrigieren

**Befund:** `src/domain/release.ts` stellt seit Entscheidung 48 alle Lernbereiche und den
Lehrerbereich auf `frei`. Die Doku beschreibt noch den alten Pilotstand:

- `README.md`, Abschnitt „Freigaberegister“, ab ca. Zeile 26: „Standard im Schulbetrieb: Laufdiktat
  (Schüler und Lehrkraft) und Kopfrechnen sind `frei`, alles Weitere liegt in der `vorschau`.“
- `docs/architecture.md`, Abschnitt „Aktueller fachlicher Stand“, ca. Zeile 39: „… der übrige
  Lernraum liegt in der Vorschau …“

**Ziel:** Die Doku nennt den Standard aus dem Code, und ein Test verhindert, dass beide wieder
auseinanderlaufen.

**Schritte:**

1. In `src/domain/release.ts` eine reine Funktion ergänzen:

   ```ts
   /** Markdown-Tabelle der Standardstufen, Quelle für README und Test. */
   export function releaseStagesMarkdown(): string;
   ```

   Sie erzeugt aus `RELEASE_AREAS` eine Tabelle mit den Spalten `Bereich` (Schlüssel in
   Backticks), `Bezeichnung` (`label`), `Routen` (kommagetrennt in Backticks, `–` wenn leer) und
   `Standard` (`stage` in Backticks), in der Reihenfolge der Schlüssel im Objekt. Die Ausgabe
   muss so aussehen, wie Prettier die Tabelle formatiert (Spaltenbreiten aufgefüllt), sonst
   schlägt `format:check` fehl. Einfachster Weg: Tabelle erzeugen, in die README einsetzen,
   `npx prettier --write README.md` laufen lassen und die Funktion so anpassen, dass sie genau
   diese Ausgabe liefert (Spalten auf die längste Zelle mit Leerzeichen auffüllen, Trennzeile
   aus `-`).

2. In `README.md` den Absatz „Standard im Schulbetrieb: …“ ersetzen durch einen Satz
   („Standardstufen im Schulbetrieb (Entscheidung 48):“) und die Tabelle zwischen den Markern
   `<!-- freigabe:start -->` und `<!-- freigabe:end -->`.
3. In `docs/architecture.md` den Satz zum Schulbetrieb ersetzen durch: „Die Standardstufen stehen
   als Tabelle im README (Abschnitt Freigaberegister); maßgeblich ist `src/domain/release.ts`.“
   Den Verweis auf den Pilot-Produktvertrag als historischen Ausgangspunkt belassen, aber nicht
   mehr als aktuelle Standardeinstellung bezeichnen.
4. Neuer Test `src/domain/release-docs.test.ts`: liest `README.md` mit `node:fs` (Muster wie in
   `src/domain/learner-profile.test.ts`), schneidet den Bereich zwischen den Markern aus und
   vergleicht ihn mit `releaseStagesMarkdown()`. Fehlermeldung auf Deutsch mit Hinweis, wie die
   Tabelle neu erzeugt wird.
5. Weitere Fundstellen prüfen: `grep -rn "in der Vorschau\|liegt in der .vorschau" README.md docs`.
   Nur Stellen anpassen, die den **aktuellen** Standard beschreiben, nicht abgeschlossene
   Umsetzungspläne (`docs/umsetzungsplan-*.md` bleiben unverändert).

**Fertig, wenn:** Der neue Test grün ist und rot wird, sobald man in `release.ts` eine Stufe ändert.

## 1.2 Demo-Route `/klasse/7b` für Schüler ausblenden

**Befund:** `app/klasse/7b/` (drei Seiten: `page.tsx`, `aufgaben/vokabeln/page.tsx`,
`aufgaben/[module]/page.tsx`) zeigt die fest eingebaute Demo-Klasse aus `src/domain/demo-class.ts`.
Weil `/klasse` zum Freigabebereich `lernen` (Stufe `frei`) gehört, ist die Demo für alle
erreichbar. Echte Klassen laufen über `app/klasse/[classId]/page.tsx`.

**Wichtig:** `e2e/platform-quality.spec.ts` nutzt die Demo als Testgelände. Mindestens diese Tests
rufen `/klasse/7b` oder `/klasse/7b/aufgaben/vokabeln` auf (Stand `31457bc`): „a learning result
survives a page reload on the same device“, „a vocabulary session advances through several due
cards“, „vocabulary can be written in the reverse direction“, „flashcard mode reveals and
self-assesses an answer“, „dark mode is stored and the Leitner view stays accessible“, „class
content remains part of the personal learning room“, „a class error becomes practice and
disappears after correction“, dazu die axe-Liste in „primary pages have no automatically
detectable WCAG A/AA violations“. Die Route ganz abzuschalten (`aus`) würde diese Tests brechen.

**Entscheidung (verbindlich):** Die Demo wird nicht gelöscht, sondern einem **neuen**
Freigabebereich `demo-klasse` mit Stufe `vorschau` zugeordnet. Schüler sehen sie nicht mehr, Tests
und Vorschaugeräte schon (Cookie `lernraum-vorschau` bzw. `?vorschau=an`, wie bereits in
`e2e/textbox.spec.ts` und `e2e/cloud-sync.spec.ts`).

**Schritte:**

1. In `src/domain/release.ts` direkt vor `demo` einen Bereich ergänzen:

   ```ts
   "demo-klasse": {
     label: "Demo-Klasse 7b",
     // Feste Demo-Klasse aus der Anfangszeit, Testgelände der Browser-Tests.
     // Echte Klassen laufen über /klasse/[classId].
     routes: ["/klasse/7b"],
     stage: "vorschau",
   },
   ```

   `areaForPath` wählt das längste Präfix, also gewinnt `/klasse/7b` gegen `/klasse`.

2. `src/domain/release.test.ts` ergänzen:
   - `areaForPath("/klasse/7b")` und `areaForPath("/klasse/7b/aufgaben/vokabeln")` →
     `"demo-klasse"`
   - `areaForPath("/klasse/7c")` und `areaForPath("/klasse/<uuid>")` → `"lernen"`
   - Mit Standardstufen ohne Vorschau ist `/klasse/7b` nicht sichtbar, mit Vorschau sichtbar.
3. Prüfen, wie Klassen-IDs erzeugt werden (`app/components/student-class-enrollment.tsx`,
   `src/domain/class-workspace.ts`). Wenn eine echte Klasse die ID `7b` haben könnte, anhalten und
   nachfragen. (Erwartet: IDs sind UUIDs oder ähnlich; dann ist nichts zu tun.)
4. `e2e/platform-quality.spec.ts`: Alle Tests, die `/klasse/7b…` aufrufen, setzen vorher das
   Vorschau-Cookie. Muster aus `e2e/textbox.spec.ts` übernehmen (`context.addCookies` mit
   `lernraum-vorschau=1`), am besten als kleine Hilfsfunktion in der Datei. Die axe-Prüfung von
   `/klasse/7b` aus der gemeinsamen Liste nehmen und mit Vorschau-Cookie als eigenen Durchlauf
   prüfen, damit die Seite weiter auf Barrierefreiheit getestet wird.
5. Mit `grep -rn "klasse/7b" e2e app src` nach weiteren Aufrufen suchen und gleich behandeln.
   `app/components/first-learning-round.tsx` verweist auf `/klasse/7b/aufgaben/vokabeln`; die
   Komponente wird nur von der Demo verwendet und bleibt unverändert.
6. `README.md`: In der Freigabe-Tabelle aus 1.1 erscheint der neue Bereich automatisch; zusätzlich
   einen Satz ergänzen, dass `/klasse/7b` Testgelände ist und nur mit Vorschau erscheint.
7. In der PR-Beschreibung als Befund festhalten: Der in diesen Tests geprüfte Lernablauf
   (`FirstLearningRound`) ist für Schüler danach nur noch über echte Klassen erreichbar, falls es
   dort einen entsprechenden Weg gibt. Prüfen und kurz beschreiben, ob es diesen Weg gibt; nichts
   daran ändern.

**Prüfen:** `npx vitest run src/domain/release.test.ts`, danach
`npx playwright test e2e/platform-quality.spec.ts --project=desktop-chromium --project=mobile-chrome`.

## 1.3 `src/integrations` in die Abdeckungsgrenzen aufnehmen

**Befund:** `vitest.config.ts` misst nur `src/domain`, `src/storage` und `src/speech`. In `src/integrations`
liegen Cloud-Sync (Merge, Engine, Umschlag), Kryptografie und die Raum-API.

**Messung vom 13.10.2026** (`src/integrations`, ohne Tests und ohne `cloud-sync/testing/**`):

| Bereich          | Statements | Branches | Functions | Lines |
| ---------------- | ---------- | -------- | --------- | ----- |
| gesamt           | 89,3       | 82,7     | 86,7      | 90,9  |
| cloud-sync       | 93,1       | 89,1     | 88,4      | 94,2  |
| content-transfer | 67,1       | 61,0     | 86,7      | 70,4  |
| laufdiktat       | 82,8       | 73,8     | 83,6      | 86,0  |
| backup           | 76,5       | 60,0     | 62,5      | 75,8  |

Auffällig niedrig: `laufdiktat/room-api.ts` (57,6 % Zeilen), `laufdiktat/room-limits.ts` (0 %),
`content-transfer/content-transfer-client.ts` (51,3 %), `cloud-sync/providers.ts` (0 %),
`cloud-sync/google-identity.ts` (9,5 %), `laufdiktat/live-room-client.ts` (0 %).

Messbefehl (ohne die Konfiguration zu ändern):

```bash
npx vitest run src/integrations --coverage --coverage.reportOnFailure \
  --coverage.include='src/integrations/**/*.ts' --coverage.exclude='**/*.test.ts' \
  --coverage.exclude='src/integrations/cloud-sync/testing/**' \
  --coverage.thresholds.lines=0 --coverage.thresholds.branches=0 \
  --coverage.thresholds.functions=0 --coverage.thresholds.statements=0 --coverage.reporter=text
```

**Auffällig:** `src/integrations/crypto/` (`passphrase.ts`, `base64.ts`) erscheint im Bericht
überhaupt nicht, obwohl `crypto/passphrase.test.ts` läuft und grün ist. Auch ein Lauf nur mit
`--coverage.include='src/integrations/crypto/**'` liefert eine leere Tabelle. Das ist ausgerechnet
der Verschlüsselungskern (PBKDF2, AES-GCM) und muss in Schritt 0 geklärt werden.

Hinweis: Unter Abdeckungsmessung schlug `cloud-sync/controller.test.ts` > „sets up two devices
and carries a change over within one poll“ einmal fehl und lief danach grün. Wenn das bei dir
wiederholt passiert, Ursache suchen (Zeitsteuerung mit `board.fake.advance` gegen `vi.waitFor`)
und robust machen; den Test nicht überspringen.

**Schritte:**

0. Ursache klären, warum `src/integrations/crypto/**` nicht gemessen wird (Vermutungen zum
   Prüfen: Ordnername `crypto` kollidiert in der Auflösung mit dem Node-Modul `crypto`, eine
   Standard-Ausnahme von Vitest oder `@vitest/coverage-v8`, Pfadauflösung über einen Alias).
   Beheben, sodass beide Dateien im Bericht erscheinen. Wenn das nur durch Umbenennen des Ordners
   geht (z. B. `src/integrations/encryption/`), umbenennen und alle Importe anpassen. Erst danach
   mit Schritt 1 weitermachen. Die Ursache in der Commit-Nachricht festhalten.
1. Fehlende Tests ergänzen, bevor die Grenze greift:
   - `laufdiktat/room-limits.test.ts`: `roomTimeline` und `roomTimeState` an allen Grenzen
     (genau 90, 110, 120 Minuten, eine Millisekunde davor).
   - `cloud-sync/providers.test.ts`: `available` folgt den Client-IDs, WebDAV immer verfügbar.
   - `laufdiktat/room-api.ts`: Tests nach dem Muster in `room-api.test.ts` für die ungetesteten
     Funktionen (Teilnehmer abrufen und entfernen, Fortschritt speichern und lesen, Raum beenden,
     Fehlerpfade bei abgelehntem Token). Ziel mindestens 80 % Zeilen für die Datei.
   - `content-transfer/content-transfer-client.ts`: Fehlerpfade (Netzwerkfehler, ungültige
     Antwort, abgelaufener Code). Ziel mindestens 80 % Zeilen.
   - `backup/personal-backup-storage.ts`: die ungedeckten Zeilen (31, 43–50, 112–126) prüfen und
     testen, soweit sie Logik und nicht nur Browser-Aufrufe enthalten.
2. Reine Browser-Anbindung ohne eigene Logik von der Messung ausnehmen, jeweils mit Kommentar in
   `vitest.config.ts`: `cloud-sync/google-identity.ts` (lädt das Google-Skript),
   `laufdiktat/live-room-client.ts` (erzeugt nur den Supabase-Client). Weitere Ausnahmen nur mit
   gleicher Begründung.
3. `vitest.config.ts` anpassen:
   - `coverage.include` um `"src/integrations/**/*.ts"` erweitern, `coverage.exclude` um
     `"**/*.test.ts"`, `"src/integrations/cloud-sync/testing/**"` und die Ausnahmen aus Schritt 2.
   - Grenzen pro Glob ergänzen (Vitest unterstützt Glob-Schlüssel in `thresholds`):

     ```ts
     thresholds: {
       branches: 85, functions: 90, lines: 90, statements: 90, // bisher, unverändert
       "src/integrations/**/*.ts": {
         statements: 88, branches: 80, functions: 85, lines: 90,
       },
       // Sicherheitskern: Merge, Umschlag, Uhr, Hash und Verschlüsselung
       "src/integrations/{crypto/**,content-transfer/crypto.ts,cloud-sync/{merge,engine,envelope,hlc,hash,dedupe}.ts}": {
         statements: 90, branches: 88, functions: 95, lines: 93,
       },
     },
     ```

     Die Werte liegen knapp unter der Messung. Wenn die Tests aus Schritt 1 die Werte deutlich
     anheben, die Grenze für `src/integrations/**` auf den neuen Stand minus etwa 1 Prozentpunkt
     setzen, nicht höher.

   - Prüfen, ob die globalen Grenzen weiterhin nur für `src/domain`, `src/storage` und `src/speech` gelten oder
     ob Vitest die Integrationsdateien mit einrechnet. Wenn die globalen Werte dadurch unter die
     bisherigen Grenzen fallen, die globalen Grenzen **nicht** senken, sondern den Glob
     `"{src/domain,src/storage,src/speech}/**/*.ts"` mit den bisherigen Werten als eigene Grenze anlegen und
     die globalen Werte auf das Niveau des Gesamtstands setzen. Im Commit begründen.
4. `docs/engineering-quality.md`: Wo die Abdeckungsgrenzen beschrieben sind, `src/integrations`
   und die strengere Grenze für den Sicherheitskern ergänzen.

**Fertig, wenn:** `npm run test:coverage` grün ist, `crypto/passphrase.ts` im Bericht steht und
die Sicherheitskern-Grenze erfüllt, und eine absichtlich entfernte Testdatei in
`src/integrations/cloud-sync/merge.test.ts` (nur lokal ausprobieren, nicht committen) die Grenze
reißt.
