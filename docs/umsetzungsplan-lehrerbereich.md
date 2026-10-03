# Umsetzungsplan: Schritt 8 „Lehrerbereich“ (1d/2c/3c/3d) im Lernraum

Stand: 03.10.2026 · Ausgangsstand `bbb4702` (nach PR #4)

Dieser Plan ist die Arbeitsgrundlage für Schritt 8 aus
[umsetzungsplan-lernraum-ui-v2.md](umsetzungsplan-lernraum-ui-v2.md). Er folgt dem v2-Prinzip:
**zuerst die reine Ansicht, messbar identisch zur Vorlage, danach die Anbindung in getesteten
Scheiben.** Die Entscheidungen in Abschnitt 3 sind Vorschläge der technischen Planung und
müssen vor Beginn von Scheibe 8.3 von der projektverantwortlichen Lehrkraft bestätigt werden
(Abschnitt 9).

## 0. Arbeitsweise

- Eigener Branch je Scheibe oder ein Branch für Schritt 8 mit einem Commit je Scheibe. Übernahme
  per Pull Request.
- Regeln: `AGENTS.md`, `docs/engineering-quality.md`, `docs/umsetzungsplan-lernraum-ui-v2.md`
  (Abschnitt „Regeln für die Anbindung“). Ansichten in `app/views/` bleiben rein: kein Speicher,
  kein Supabase, keine Zeit- oder Zufallsquellen.
- Keine neuen Abhängigkeiten. **Keine Supabase-Änderung.** Keine neue Dexie-Version (neue Felder
  sind keine Indizes, wie beim Klassenstempel).
- Während der Arbeit gezielte Tests (`npx vitest run <datei>`). Vor jedem Push:
  `npm run check`, `npm run test:design` und die fokussierten E2E-Tests aus Abschnitt 6.
- Jede Scheibe endet grün und lauffähig. Alte Lehrer-Screens und ihre Stile werden erst
  gelöscht, wenn die neue Route angebunden ist.

## 1. Befund

**Vorlage** (`docs/design/lernraum-ui.dc.html`, Referenzbilder in `docs/design/referenz/`):

| Screen | Größe      | Inhalt                                                                                                                                                           | Alter in der Vorlage |
| ------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| 1d     | 1180 × 839 | „Raum starten in drei Schritten“: Modus, Inhalt, Hilfen links; Projektion mit Code, QR und „Beigetreten 0 von 24“ rechts; Kopfleiste statt Seitenleiste          | Turn 1 (älteste)     |
| 2c     | 1180 × 760 | Seitenleiste (Klassen mit Zahl, Bereich: Inhalte · Räume · Auswertung, Profil), „Inhalte“ mit „Neu anlegen“, Panel „Text anlegen für Klasse 7b · Weiter“, Ablage | Turn 2               |
| 3c     | 390 × 788  | Lehrer mobil: Kopf mit Menü, Klasse, Hell/Dunkel; großer Knopf „Raum öffnen“; Ablage als Liste; Leiste als Schublade; Tippen öffnet Start-Overlay                | Turn 3 (neueste)     |
| 3d     | 1180 × 700 | Lehrer Desktop wie 2c, „gleiche Tokens, dunkel nutzbar“: Hell/Dunkel oben rechts, „Raum öffnen“ unten, kein Anlege-Panel                                         | Turn 3 (neueste)     |

**Code:**

- `/lehrer` zeigt `app/lehrer/teacher-overview.tsx` (alte Oberfläche, Kacheln „Klassen, Inhalte,
  Aufgaben, Häuser“, Kommentar „nach Design 1d“, ist es aber nicht).
- Der Rahmen `app/ui/shell/teacher-shell.tsx` (im Root-Layout über `AreaFrame`) nähert 2c/3c/3d
  an, ist aber keine reine Ansicht und nicht im Designvergleich. Navigation: Übersicht,
  Laufdiktat, Klassen, Inhalte, Aufgaben, Häuser, Einstellungen. Klassen in der Leiste
  (`app/ui/shell/teacher-classes.tsx`) verlinken auf die Klassenverwaltung.
- Die **Inhaltsablage** (`createTeacherContentLibraryRepository`, Schema
  `src/domain/teacher-content-library.ts`) kennt nur Vokabelpakete: `title`, `source`,
  `promptLocale`, `answerLocale`, Revision, Zeitstempel. Es gibt **keine Art** (Text/Mathe/
  Vokabeln), **keine Klassenzuordnung** und **kein „zuletzt genutzt“**. Die Ablage wird von der
  Freigabe an Schüler (`/lehrer/material`, `teacher-content-transfer.tsx`) und der
  Gesamtsicherung (`src/domain/teacher-workspace.ts`) genutzt.
- Texte und Mathe-Aufgaben existieren nur im flüchtigen Zustand des Live-Raums
  (`app/lehrer/live/use-teacher-live-room.tsx`). Der Live-Raum kann keinen abgelegten Inhalt
  laden und nichts ablegen.
- Die Klassenwahl für den Raum ist schon da (`lastLiveClassId` im Lehrerprofil, Entscheidung 50).
- Es gibt keinen Lehrer-Login (Entscheidung 43). Die Vorlage zeigt „T. Bryson · Abmelden“.
- Designvergleich: Die Registry `app/entwicklung/screens/registry.tsx` kennt bisher nur 2a und
  5a–5d. Für Schritt 8 werden die Lehrer-Screens dort ergänzt und in `screens.json` auf
  `umgesetzt` gesetzt.
- Bestehende Tests, die `/lehrer` berühren: `tests/rendered-html.test.mjs` (erwartet
  „Übersicht“), `e2e/platform-quality.spec.ts` (Axe-Prüfung aller Lehrer-Routen, Link auf
  `/lehrer/live`), `e2e/laufdiktat-pilot.spec.ts`.

## 2. Ziel

Die Lehrkraft landet unter `/lehrer` in **„Inhalte“** ihrer aktuellen Klasse: Sie legt Text,
Mathe oder Vokabeln an, findet alles Abgelegte wieder, öffnet daraus mit zwei Klicks einen Raum
und kann jeden Inhalt erneut bearbeiten. Rahmen und Inhalte-Seite entsprechen 3c (mobil) und
3d (Desktop) pixelgenau, hell und dunkel. Der vorhandene Laufdiktat-Ablauf 5c/5d bleibt der
einzige Weg, einen Raum zu betreiben.

## 3. Entscheidungen (Vorschlag, von der Lehrkraft zu bestätigen)

**E1 – Verbindliche Screens.** 3c und 3d sind die Ziel-Screens (neueste Fassung). 2c und 1d
gelten wie 1a–1c als Referenz und erhalten in `screens.json` den Status `referenz`:

- Aus 2c wird das Panel „Text anlegen für Klasse 7b · Weiter“ für mobil übernommen (es steht
  auch in 3c). „Raum öffnen“ sitzt wie in 3d unten.
- Aus 1d werden die Ideen übernommen, die es im Lauf 5c/5d bereits gibt: großer Code mit QR
  zum Projizieren und „Beigetreten x von y“. Ein eigener 1d-Startbildschirm entsteht **nicht**,
  weil er die Einstellungen aus 5c/5d doppeln würde.

**E2 – Ein Startweg.** Räume werden weiter nur über `/lehrer/live` (5c/5d) erstellt.
„Öffnen“ in der Ablage öffnet das **Start-Overlay** aus 3c (mobil als Bottom-Sheet, ab 900 px
als zentrierter Dialog). Es zeigt Titel, Klasse, die **vier echten Modi** (Laufdiktat, Freie
Übung, Battle, Stationen) und „Jetzt starten · ‹Modus›“ sowie „Alle Optionen“.

- „Jetzt starten“ öffnet direkt die Lobby mit den Standardoptionen des Modus und der aktiven
  Klasse.
- „Alle Optionen“ öffnet den Schritt „Einstellungen“ (5c/5d) mit geladenem Inhalt.
- Bewusste Abweichung: Die Vorlage zeigt drei vereinfachte Modi (Laufdiktat/Test/Üben) und
  Schalter (Buchstaben, Selbstkorrektur, Vorlesen, Punkte), die es fachlich so nicht gibt.
  „Selbstkorrektur“ existiert nicht, „Punkte“ hängt an der Motivation (`aus`). Die Fußnote in 2c
  sagt selbst „Modi beim Öffnen: Laufdiktat · Freies Üben · Battle · Stationen — wie im
  bestehenden Laufdiktat“.
- Der Raumcode erscheint erst in der Lobby, weil er beim Erstellen des Raums entsteht. Die
  Vorlage zeigt ihn schon im Overlay.

**E3 – Navigation.** Bereich „Inhalte“ → `/lehrer`, „Räume“ → `/lehrer/live` (offener Raum
oder neuer Raum). „Auswertung“ wird **nicht angezeigt**, bis es dafür einen Entwurf gibt
(keine leeren Seiten, Entscheidung 46). Bereiche ohne Vorlage stehen in einer zweiten, kleineren
Gruppe „Verwalten“ unter „Bereich“, jeweils nur bei Freigabe: Klassen (`/lehrer/klassen`),
Freigabe an Schüler (`/lehrer/material`), Aufgaben, Häuser, Einstellungen. Ihre Seiten bleiben
in alter Oberfläche (v2-Plan: „Bereiche ohne Vorlage bleiben …“). Die Übersicht
`teacher-overview.tsx` entfällt. Ihr Hinweis „Dieses Gerät ist die Schutzgrenze“ wandert auf die
Einstellungsseite und erscheint einmalig in der Ablage, solange kein Lehrerprofil gespeichert ist.

**E4 – Aktive Klasse.** Ein Klick auf eine Klasse in der Leiste wählt sie als **aktive Klasse**
(Kopf „Klasse 7b · Inhalte“, Panel „… für Klasse 7b“, Klasse beim Raumstart). Es gibt dafür
kein neues Feld: Es wird `lastLiveClassId` aus Entscheidung 50 verwendet, weil die aktive Klasse
genau die Klasse des nächsten Raums ist. Zusätzlich steht sie in der Adresse (`/lehrer?klasse=…`),
damit sie auch ohne gespeichertes Lehrerprofil gilt. Die Verwaltung der Klasse (Schüler, QR,
Schreiberleichterung) bleibt unter `/lehrer/klassen?klasse=…`. Das „+“ neben „Klassen“ und
„Klasse anlegen“ führen dorthin. Ohne Klasse heißt der Kopf „Alle Inhalte“.

**E5 – Ablage für alle Inhaltsarten.** Das bestehende Schema wird rückwärtskompatibel
erweitert, statt eine zweite Ablage zu bauen. Alle neuen Felder sind optional:

| Feld         | Typ                                | Bedeutung                                                                 |
| ------------ | ---------------------------------- | ------------------------------------------------------------------------- |
| `kind`       | `"vocabulary" \| "text" \| "math"` | fehlt = `vocabulary` (alle Altbestände sind Vokabelpakete)                |
| `classIds`   | `string[]` (UUIDs, max. 50)        | Klassen, für die der Inhalt angelegt wurde; leer/fehlt = für alle Klassen |
| `lastUsedAt` | ISO-Zeit                           | letzter Raumstart mit diesem Inhalt                                       |
| `textSplit`  | `"satz" \| "zeile" \| "wort"`      | nur Text: Zerlegung in Stationen                                          |

- `source` bleibt die einzige Inhaltsquelle: Vokabeln im bisherigen Tabellenformat, Text als
  Rohtext, Mathe als eine Aufgabe je Zeile (wie `mathLines` im Live-Raum).
- `TEACHER_CONTENT_LIBRARY_VERSION` bleibt 1. Alte Dateien bleiben lesbar. Exporte der neuen
  Version kann eine ältere App-Version nicht mehr einlesen (`.strict()`). Das ist eine bekannte
  Grenze und wird dokumentiert.
- Die **Freigabe an Schüler** (24-h-Übergabe) bietet nur `kind = vocabulary` an. Supabase-Verträge
  bleiben unverändert.
- Die Ablage zeigt die Inhalte der aktiven Klasse und die Inhalte ohne Klasse, sortiert nach
  `lastUsedAt ?? updatedAt` (neueste zuerst). Das Datum in der Zeile ist dieser Wert.
- Die Metazeile („42 Vokabeln · Englisch“, „6 Abschnitte · 38 Wörter“, „30 Aufgaben“) wird
  aus `source` abgeleitet, nicht gespeichert. „Generator“ entfällt, solange die Herkunft nicht
  gespeichert wird.

**E6 – Anlegen, Bearbeiten, Ablegen.** Editoren gibt es nur im Live-Raum (Schritt „Inhalt“ in
5c/5d). Sie werden wiederverwendet, nicht nachgebaut:

- „Neu anlegen“ (Text/Mathe/Vokabeln) → `/lehrer/live?neu=text|math|vocabulary`
- „Bearbeiten“ → `/lehrer/live?inhalt=<id>&schritt=inhalt`
- „Öffnen“ → Start-Overlay (E2)
- Im Schritt „Inhalt“ kommen zwei optionale Elemente dazu: ein Feld **„Titel“** und der Knopf
  **„Ablegen“**. Beim Bearbeiten kommt **„Aus der Ablage löschen“** dazu, mit Bestätigung. Ohne
  diese Props zeigt die Ansicht unverändert die Vorlage 5c/5d (Muster „optionale Ergänzungen“ aus
  dem v2-Plan). Der Designvergleich 5c/5d bleibt deshalb unberührt.
- Beim Öffnen der Lobby wird der Inhalt **automatisch abgelegt**: neu angelegt oder aktualisiert,
  `lastUsedAt` gesetzt. Die Revision steigt nur bei geänderter Quelle oder geändertem Titel.
  Ein fehlender Titel wird vorgeschlagen (erste Zeile, gekürzt auf 60 Zeichen).

**E7 – Profil statt Login.** Unten in der Leiste stehen Initialen und Name aus dem Lehrerprofil.
Ohne Profil steht dort „Lehrkraft“. Statt „Abmelden“ steht „Zur Startseite“. Ein Klick auf den
Namen öffnet `/lehrer/einstellungen`. Das ist eine bewusste Abweichung wegen Entscheidung 43.

**E8 – Hell/Dunkel und Fuß.** Hell/Dunkel sitzt wie in 3c im mobilen Kopf und wie in 3d oben
rechts neben dem Seitentitel. Der Rahmen zeigt weiter den kompakten Seitenfuß (Impressum,
Datenschutz, Version). Im Designvergleich fehlt er, weil der Katalog nur die Ansicht rendert.

## 4. Architektur

```
app/views/lehrer/
  teacher-frame.tsx (+ .module.css)      reine Ansicht Rahmen 3c/3d: Leiste, Schublade, Kopf
  content-library-screen.tsx (+ css)     reine Ansicht „Inhalte“: Neu anlegen, Panel, Ablage
  start-sheet.tsx (+ css)                reine Ansicht Start-Overlay (E2)
  demo.ts                                Beispieldaten der Vorlage (7b/9a/6c, vier Inhalte)
src/domain/teacher-content-library.ts    Schema erweitert (E5)
src/domain/teacher-content-summary.ts    rein: Metazeile, Filter nach Klasse, Sortierung, Titelvorschlag
src/storage/teacher-class-settings.ts    Repository: markUsed(id, at), listForClass(classId?)
app/lehrer/use-content-library.ts        Hook: Ablage + aktive Klasse → Props der Ansicht
app/lehrer/content-adapter.ts            rein: Paket ↔ Live-Raum-Zustand (je Art)
app/lehrer/page.tsx                      bindet Ansicht und Hook
app/ui/shell/teacher-shell.tsx           wird Adapter: liefert Props für teacher-frame.tsx
app/lehrer/live/use-teacher-live-room.tsx  liest `inhalt`/`neu`/`schritt`/Start-Absicht, legt ab
```

- **Start-Absicht statt Seiteneffekt per URL:** „Jetzt starten“ schreibt
  `{ contentId, mode, classId }` einmalig in den Sitzungsspeicher
  (`lernraum.teacher-live-intent`) und navigiert zu `/lehrer/live`. Der Hook liest die Absicht
  und **löscht sie, bevor** er den Raum erstellt. Danach greift die vorhandene Wiederaufnahme
  über das Lehrkrafttoken. Ein Neuladen erzeugt so keinen zweiten Raum. Die Absicht trägt keine
  Tokens und keine Inhalte, nur IDs.
- Die Query-Parameter `inhalt`, `neu` und `schritt` lösen nur Laden und Anzeigen aus, nie das
  Erstellen eines Raums. Nach dem Lesen werden sie per `router.replace("/lehrer/live")`
  entfernt.
- Ist bereits ein Raum offen, haben dieser Raum und das Lehrkrafttoken Vorrang. Ein Overlay-Start
  zeigt dann „Es ist schon ein Raum offen“ mit „Zum offenen Raum“. Es gibt keinen stillen
  Abbruch der laufenden Runde.
- Die Ansichten erhalten Texte, Zahlen und Zustände nur über Props. Navigation erfolgt über
  `href`-Props oder Callbacks.

## 5. Umsetzung in Scheiben

### 8.1 Ansichten und Designvergleich (ohne Anbindung)

1. `app/views/lehrer/teacher-frame.tsx`, `content-library-screen.tsx`, `start-sheet.tsx` mit CSS-Modulen.
   Container-Query ab 900 px für 3d, darunter 3c. Grundlage `.view` aus `app/views/parts`.
   Tokens aus `app/ui/tokens.css`, keine neuen Farben.
2. Schublade mobil als `<dialog>` (Fokusfalle, Escape, Schließen-Knopf, Klick auf Hintergrund).
   Breite 296 px wie in der Vorlage. Start-Sheet ebenso als `<dialog>`.
3. `demo.ts` mit den Daten der Vorlage. Registry `app/entwicklung/screens/registry.tsx` um 3c und 3d
   ergänzen.
4. `docs/design/screens.json`:
   - 3c und 3d auf `umgesetzt`
   - neue Zustände `3c-nav` (Klick auf `[id="3c"] button[aria-label="Klassen und Bereiche"]`) und
     `3d-dark` (Klick auf den Hell/Dunkel-Knopf in 3d, mit `reset`)
   - 1d und 2c auf `referenz`, Statuswert in `manifest.ts` und in `docs/design/README.md`
     erklären
   - Referenzbilder mit `npm run design:references` erzeugen (offline: `DESIGN_UMD_DIR`)
5. Komponententests der Ansichten: Klicks rufen die richtigen Props, aktive Klasse hat
   `aria-current`, Sheet schließt per Escape, leere Ablage zeigt einen Hinweis statt einer leeren Liste.

**Fertig, wenn:** `npm run test:design` für 3c, 3c-nav, 3d und 3d-dark grün ist (Toleranz
unverändert 1,2 %) und die Lehrkraft die Ansichten im Katalog `/entwicklung/screens` freigegeben
hat.

### 8.2 Fachlogik und Speicher

1. Schema erweitern (E5) und `teacher-content-summary.ts` mit Metazeile, Klassenfilter,
   Sortierung und Titelvorschlag schreiben. Zählen über `parseVocabularyTable` /
   `parseTeacherVocabularyPairs`, `buildRunningDictationSections` und Zeilen für Mathe.
2. Repository: `markUsed(id, at)`, `listForClass(classId?)`. Gesamtsicherung und Import der
   Lehrerdatenbank mit neuen Feldern.
3. Freigabe an Schüler filtert auf `kind = vocabulary` (Liste und `buildTeacherVocabularyBundle`-Aufruf).
4. Tests:
   - Altpaket ohne `kind` wird als Vokabeln gelesen.
   - Ungültige `classIds` werden abgewiesen.
   - Roundtrip Export/Import mit und ohne neue Felder.
   - Metazeile je Art, Filter und Sortierung.
   - Freigabe bietet keine Text- und Mathe-Pakete an.

### 8.3 Rahmen anbinden

1. `TeacherShell` rendert `TeacherFrame`. Klassenliste mit Schülerzahl (aus `teacher-classes.tsx`
   übernehmen, Änderungsereignis beibehalten). Die Klasse wird als `/lehrer?klasse=<id>` verlinkt
   (E4). Navigation nach E3 mit Freigaberegister, Profil unten nach E7.
2. `teacherAreaOf` und `areas.ts` an die neue Navigation anpassen. Das Laufdiktat behält seine
   volle Breite (`fill`).
3. Alte Klassen `ui-teacher__*` aus `lernraum-ui.css` erst nach 8.5 entfernen.
4. Tests: Rahmen-Adapter (aktiver Bereich je Adresse, Ausblenden nach Freigabe), Schublade
   schließt nach Navigation.

### 8.4 Inhalte-Seite `/lehrer` anbinden

1. Hook `use-content-library.ts`: lädt die Ablage, liest die aktive Klasse (`?klasse` vor
   `lastLiveClassId`) und speichert eine geänderte Wahl in `lastLiveClassId`, wenn ein Profil
   existiert. Er liefert Props für `ContentLibraryScreen`.
2. `app/lehrer/page.tsx` bindet Ansicht und Hook. `teacher-overview.tsx` wird gelöscht. Der
   Schutzhinweis folgt E3.
3. Anlegen-Kacheln: auf 3d führt ein Klick direkt zum Editor. Auf 3c wählt der Klick die Art,
   und das Panel „Weiter“ öffnet den Editor (E6). „Bearbeiten“ und „Öffnen“ verhalten sich nach
   E2/E6.
4. Tests: Hook (Filter nach Klasse, Wahl merken mit und ohne Profil), Route rendert „Inhalte“,
   Links tragen die richtigen Parameter.

### 8.5 Live-Raum: Inhalt laden, ablegen, Start-Overlay

1. `content-adapter.ts`: Paket → Zustand des Live-Raums (Art, Text samt Zerlegung,
   Vokabeltabelle samt Sprachen, Mathe-Zeilen) und zurück. Ein Roundtrip-Test je Art.
2. `use-teacher-live-room.tsx`:
   - `inhalt`, `neu`, `schritt` und die Start-Absicht auswerten (Abschnitt 4)
   - Titel-Zustand
   - Aktion „Ablegen“ und automatisches Ablegen beim Öffnen der Lobby (E6)
   - „Aus der Ablage löschen“
   - Mehr nicht: Den Hook nicht umbauen.
3. `teacher-dictation-screen.tsx`: optionale Props `title`, `onTitle`, `onSave`, `onDelete`. Ohne
   Props unverändert.
4. Start-Overlay in `/lehrer` anbinden: Modi und Standardoptionen kommen aus derselben Quelle wie
   in 5c (keine zweite Modusliste). „Alle Optionen“ führt zu `?inhalt=<id>` mit dem Schritt
   „Einstellungen“.
5. Tests:
   - Hook: Laden je Art
   - Hook: Ablegen erzeugt bzw. aktualisiert genau ein Paket, die Revision steigt nur bei Änderung
   - Hook: Die Start-Absicht wird genau einmal verbraucht
   - Hook: Bei offenem Raum wird nichts überschrieben
   - Bestehende Tests `teacher-live-room*.test.tsx` bleiben grün

### 8.6 Aufräumen und Dokumentation

1. Ungenutzte Stile und Komponenten der alten Übersicht entfernen. `npm run css-types` ausführen.
2. Erwartungen in `tests/rendered-html.test.mjs` („Übersicht“ → „Inhalte“) und
   `e2e/platform-quality.spec.ts` (Link-Erwartung auf `/lehrer`) anpassen. Keinen Test löschen
   oder abschwächen.
3. Dokumentation, siehe Abschnitt 7.

## 6. Prüfungen

- **Unit/Komponenten:** siehe Scheiben. Abdeckung über `npm run test:coverage`.
- **Design:** `npm run test:design` (alle bisherigen und die neuen Zustände).
- **E2E (Chromium, vor dem Push):** `npm run test:e2e:chromium -- e2e/platform-quality.spec.ts
e2e/laufdiktat-pilot.spec.ts` und ein neuer Test `e2e/teacher-content.spec.ts`:
  1. Text anlegen, Raum über die Lobby öffnen und beenden. Der Inhalt steht danach oben in der
     Ablage mit heutigem Datum.
  2. „Bearbeiten“ öffnet den Text im Editor. Nach einer Änderung und „Ablegen“ steht der neue
     Titel in der Ablage.
  3. Mobil: Menü öffnen, Klasse wählen. Der Kopf zeigt die Klasse, und die Ablage ist gefiltert.
  4. Axe ohne Verstöße auf `/lehrer` mobil und Desktop, auch mit offenem Sheet und offener
     Schublade. Touch-Ziele mindestens 44 px.
- **Live (mit Supabase-Konfiguration):** `e2e/live/teacher-room.spec.ts` um einen Fall ergänzen:
  „Öffnen → Jetzt starten“ erzeugt eine Lobby, und ein Neuladen zeigt denselben Raumcode.
- Die vollständige Cross-Browser-Suite läuft in GitHub (AGENTS.md).

## 7. Dokumentation

- `docs/umsetzungsplan-lernraum-ui-v2.md`: Schritt 8 in der Tabelle auf ✅, „Stand der Anbindung“
  ergänzen, die Abweichungen aus E2, E3, E6 und E7 unter „Bewusste Abweichungen“ eintragen. Den
  Punkt „Ohne Navigationseintrag: Klasse, Material, Aufgaben …“ und „Noch in alter Oberfläche:
  … Lehrerbereich `/lehrer`“ aktualisieren.
- `docs/design/README.md`: Status `referenz`, Ziel-Routen für 1d/2c/3c/3d.
- Vault:
  - `04 - Lehrer-Cockpit/Anwendung.md`: Ablage für Text, Mathe und Vokabeln, aktive Klasse, Startweg
  - `19 - Entscheidungsprotokoll`: neue Entscheidung 51 „Lehrerbereich: Ablage aller
    Inhaltsarten und ein Startweg“
  - `18 - Aufgabenübersicht`: erledigte Punkte

## 8. Nicht Teil dieses Plans

- „Auswertung“ (eigener Entwurf nötig), Neugestaltung von Klassenverwaltung, Freigabe, Aufgaben,
  Häusern und Einstellungen.
- Mehrere gleichzeitig offene Räume oder eine Raumliste unter „Räume“.
- Lehrer-Login oder Kontotrennung (Entscheidung 43).
- Speichern von Mathe-Generator-Einstellungen und der Herkunft „Generator/von Hand“.
- Änderungen an Supabase, an der Freigabe an Schüler (außer dem Filter auf Vokabeln) und an
  CSV-Export oder Spiellogik.

## 9. Offene Fragen an die Lehrkraft (vor 8.3 klären)

1. E1: Sind 3c/3d verbindlich, und sind 1d/2c nur Referenz?
2. E2: Ist das Start-Overlay mit den vier echten Modi statt Laufdiktat/Test/Üben in Ordnung?
3. E4: Soll die Ablage die Inhalte der aktiven Klasse **und** die Inhalte ohne Klasse zeigen,
   oder nur die der Klasse?
4. Die Vorlage nennt „Code gilt 90 Minuten“. Gegen die tatsächliche Raumlaufzeit des
   Laufdiktat-Vertrags prüfen. Der Text erscheint nur, wenn er stimmt.

## 10. Abnahme durch die Lehrkraft (10 Minuten)

1. Am Laptop `/lehrer` öffnen. Leiste mit Klassen, „Inhalte“ wie im Entwurf 3d, hell und dunkel.
2. Klasse wählen, „Text“ anlegen, einen kurzen Text einfügen, Titel vergeben, „Ablegen“. Der
   Inhalt steht in der Ablage.
3. „Öffnen“ → Modus „Laufdiktat“ → „Jetzt starten“. Die Lobby zeigt Code und QR. Seite neu
   laden: derselbe Raum.
4. Am Handy `/lehrer` öffnen. Wie 3c: Menü, Klassenwahl, großer Knopf „Raum öffnen“; ein Tippen
   auf einen Inhalt öffnet das Start-Overlay.
5. Ein Vokabelpaket unter „Verwalten → Freigabe an Schüler“ freigeben. Text- und Mathe-Inhalte
   erscheinen dort nicht.
