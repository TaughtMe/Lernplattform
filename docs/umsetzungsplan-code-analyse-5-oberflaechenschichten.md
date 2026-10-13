# Teilplan 5: Oberflächenschichten ordnen (`app/components` und `app/views`)

Stand: 13.10.2026 · Übersicht: [umsetzungsplan-code-analyse.md](umsetzungsplan-code-analyse.md) ·
Branch: `claude/code-analyse-5-oberflaechenschichten`

## Befund

Seit `docs/umsetzungsplan-lernraum-ui-v2.md` gilt: Screens entstehen als **reine Ansichten** in
`app/views/<bereich>/` (Zustand und Aktionen nur über Props, kein Speicher, kein Supabase). Daneben
gibt es `app/components/` mit 51 Modulen (ohne Tests und Typdateien). Die Analyse nennt das „zwei
Oberflächenschichten“. Genauer betrachtet ist `app/components` gemischt:

- **Container**, die eine Ansicht aus `app/views` mit Speicher und Diensten verbinden, z. B.
  `learning-box-app.tsx` → `LernBoxScreen`. Das ist gewollt.
- **Alte Oberfläche** mit eigenem Markup (Klassen `ui-*` aus `app/ui/lernraum-ui.css`), die noch
  nicht auf eine Ansicht in `app/views` umgestellt ist.
- **Hooks und Hilfen** ohne Markup (`use-hydrated.ts`, `use-live-session-guards.ts`,
  `room-activity.ts`, `cloud-sync-client.ts` …).
- Möglicherweise **ungenutzte** Module. Verdacht: `use-auto-fit-font-size.ts` (kein Import
  gefunden; `app/views/laufdiktat/use-auto-fit-text.ts` scheint der Nachfolger zu sein).

`app/views` importiert heute nichts aus `app/components`, `src/storage` oder `src/integrations`.
Das ist richtig, wird aber nicht erzwungen.

## Ziel

Die Regel „Ansicht rein, Container verbindet“ wird per ESLint erzwungen, `app/components` ist
inventarisiert, Ungenutztes ist entfernt, und der verbleibende Umbaubedarf steht als Liste in der
Doku. **Kein** Umbau alter Oberflächen auf neue Ansichten in diesem Plan; das gehört jeweils zu
eigenen Design-Aufgaben, weil dafür Vorlagen aus `docs/design/` nötig sind.

## Schritte

### 5.1 Reinheit der Ansichten erzwingen

In `eslint.config.mjs` einen Block für `app/views/**/*.{ts,tsx}` ergänzen:

```js
{
  files: ["app/views/**/*.{ts,tsx}"],
  ignores: ["app/views/**/*.test.{ts,tsx}"],
  rules: {
    "no-restricted-imports": ["error", { patterns: [{
      group: ["**/components/*", "**/src/storage/*", "**/src/integrations/*",
              "dexie", "@supabase/*"],
      message: "Ansichten in app/views sind rein: Daten und Aktionen kommen über Props (umsetzungsplan-lernraum-ui-v2.md).",
    }] }],
  },
},
```

Muster an die tatsächlichen relativen Importpfade anpassen und mit einem absichtlich falschen
Import lokal prüfen, dass die Regel greift (nicht committen). `npm run lint` muss danach ohne
Fehler laufen.

### 5.2 Inventar von `app/components`

Für jedes Modul (ohne Tests) feststellen:

1. **Wer importiert es?** Auch relative Importe innerhalb von `app/components` (`./name`)
   beachten. Befehl als Ausgangspunkt:
   `grep -rlE "/<name>(\.module\.css)?\"" app src --include=*.ts --include=*.tsx`.
2. **Art:** Container (rendert eine Ansicht aus `app/views`), alte Oberfläche (eigenes Markup),
   Hook/Hilfe (kein JSX), ungenutzt.
3. **Bei alter Oberfläche:** Gibt es eine passende Design-Vorlage in `docs/design/`? (ja/nein,
   Dateiname)

Ergebnis als Tabelle in einem neuen Abschnitt „Oberflächenschichten“ in `docs/architecture.md`
mit den Spalten `Modul`, `Art`, `Verwendet von`, `Nächster Schritt`. Nächster Schritt ist einer
von: „bleibt (Container)“, „bleibt (Hilfe)“, „verschieben nach …“, „auf Ansicht umstellen
(Vorlage …)“, „entfernen“.

### 5.3 Ungenutztes entfernen

Module, die nachweislich nirgends importiert werden (auch nicht in Tests außer ihrem eigenen),
löschen, samt eigener Testdatei und CSS-Modul inklusive `.module.css.d.ts`. Danach
`npm run typecheck` (prüft auch die CSS-Modul-Typen) und `npm run build`. Jede Löschung in der
Commit-Nachricht mit dem Nachweis „kein Import gefunden“ begründen.

### 5.4 Hilfen ohne Markup an ihren Ort

Nur wenn eindeutig: Hooks und Hilfen, die genau einen Bereich bedienen, in den Ordner dieses
Bereichs verschieben (z. B. Live-Raum-Hilfen nach `app/raum/`, Cloud-Sync-Hilfen bleiben
zusammen). Allgemeine Hooks (`use-hydrated.ts`) nach `app/ui/`. Bei Zweifel nicht verschieben,
sondern in der Tabelle als „verschieben nach …“ vermerken. Importpfade anpassen, sonst nichts.

### 5.5 Neue Altlasten verhindern

In `docs/architecture.md` (Abschnitt aus 5.2) die Regel festhalten: Neue Oberfläche entsteht als
Ansicht in `app/views` plus Container; neue Module mit eigenem Markup in `app/components` sind
nicht erwünscht. Zusätzlich in `README.md`, Abschnitt „Oberfläche“, einen Satz mit Verweis
ergänzen.

## Nicht Teil dieses Plans

- Alte Oberflächen auf neue Ansichten umbauen.
- Die Demo-Route `/klasse/7b` (Teilplan 1).
- Aufteilen großer Dateien (Teilplan 4).

## Prüfen

Prüfungen aus der Übersicht, dazu
`npx playwright test e2e/platform-quality.spec.ts --project=desktop-chromium --project=mobile-chrome`,
weil Importpfade von Seiten betroffen sein können.
