# Umsetzungsplan: Schritt 8 „Lehrerbereich“ (1d/2c/3c/3d) im Lernraum

Stand: 03.10.2026 · Ausgangsstand `bbb4702` (nach PR #4)

Dieser Plan ist die Arbeitsgrundlage für Schritt 8 aus
[umsetzungsplan-lernraum-ui-v2.md](umsetzungsplan-lernraum-ui-v2.md). Er folgt dem v2-Prinzip:
**zuerst die reine Ansicht, messbar identisch zur Vorlage, danach die Anbindung in getesteten
Scheiben.** Die Entscheidungen in Abschnitt 3 sind Vorschläge der technischen Planung. E4
(Ablage nach Klassen) und E9 (Code gilt 45 Minuten) sind mit der projektverantwortlichen
Lehrkraft abgestimmt. E1 und E2 müssen vor Beginn von Scheibe 8.3 noch bestätigt werden
(Abschnitt 9).

## 0. Arbeitsweise

- Eigener Branch je Scheibe oder ein Branch für Schritt 8 mit einem Commit je Scheibe. Übernahme
  per Pull Request.
- Regeln: `AGENTS.md`, `docs/engineering-quality.md`, `docs/umsetzungsplan-lernraum-ui-v2.md`
  (Abschnitt „Regeln für die Anbindung“). Ansichten in `app/views/` bleiben rein: kein Speicher,
  kein Supabase, keine Zeit- oder Zufallsquellen.
- Keine neuen Abhängigkeiten. Keine neue Dexie-Version (neue Felder sind keine Indizes, wie
  beim Klassenstempel). **Genau eine Supabase-Änderung:** die Beitrittsfrist von 45 Minuten
  (E9, Scheibe 8.6). Sonst bleiben alle Supabase-Verträge unverändert.
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
- **Laufzeit eines Raums:** Es gibt heute keine feste Gültigkeit des Codes. Ein Raum endet erst
  3 Stunden nach der letzten Aktivität (Aufräumfunktion in
  `supabase/migrations/20260825124001_migrate_laufdiktat_live_rooms.sql`). Solange er offen ist,
  kann man mit dem Code beitreten. Ein Gerät, das schon beigetreten ist, kommt mit seinem
  Teilnehmertoken zurück, ohne den Code neu zu prüfen (`join_room_secure`, zuletzt in
  `20260920120000_room_identity_contract.sql`). Die Angabe „Code gilt 90 Minuten“ aus der
  Vorlage stimmt also nicht.
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
- Unter dem Titel steht „Klassen: 7b, 9a · ändern“ bzw. „Nicht zugeordnet · zuordnen“. Das
  öffnet die Klassenzuordnung (E4).
- Bewusste Abweichung: Die Vorlage zeigt drei vereinfachte Modi (Laufdiktat/Test/Üben) und
  Schalter (Buchstaben, Selbstkorrektur, Vorlesen, Punkte), die es fachlich so nicht gibt.
  „Selbstkorrektur“ existiert nicht, „Punkte“ hängt an der Motivation (`aus`). Die Fußnote in 2c
  sagt selbst „Modi beim Öffnen: Laufdiktat · Freies Üben · Battle · Stationen — wie im
  bestehenden Laufdiktat“.
- Der Raumcode erscheint erst in der Lobby, weil er beim Erstellen des Raums entsteht. Die
  Vorlage zeigt ihn schon im Overlay. Statt „Code gilt 90 Minuten“ steht dort „Code gilt
  45 Minuten“ (E9).

**E3 – Navigation.** Bereich „Inhalte“ → `/lehrer`, „Räume“ → `/lehrer/live` (offener Raum
oder neuer Raum). „Auswertung“ wird **nicht angezeigt**, bis es dafür einen Entwurf gibt
(keine leeren Seiten, Entscheidung 46). Bereiche ohne Vorlage stehen in einer zweiten, kleineren
Gruppe „Verwalten“ unter „Bereich“, jeweils nur bei Freigabe: Klassen (`/lehrer/klassen`),
Freigabe an Schüler (`/lehrer/material`), Aufgaben, Häuser, Einstellungen. Ihre Seiten bleiben
in alter Oberfläche (v2-Plan: „Bereiche ohne Vorlage bleiben …“). Die Übersicht
`teacher-overview.tsx` entfällt. Ihr Hinweis „Dieses Gerät ist die Schutzgrenze“ wandert auf die
Einstellungsseite und erscheint einmalig in der Ablage, solange kein Lehrerprofil gespeichert ist.

**E4 – Ablage nach Klassen, mit „Nicht zugeordnet“ (abgestimmt).** Die Ablage ist nach
Klassen gegliedert:

- **Leiste:** Unter den Klassen steht ein zusätzlicher Eintrag **„Nicht zugeordnet“** mit der
  Zahl der Inhalte ohne Klasse. Er erscheint nur, wenn es solche Inhalte gibt. Das ist eine
  bewusste Ergänzung zur Vorlage.
- **Klasse gewählt:** Die Ablage zeigt **nur** die Inhalte dieser Klasse (Kopf „Klasse 7b ·
  Inhalte“). Neue Inhalte, die hier angelegt werden, gehören automatisch zu dieser Klasse (Panel
  „Text anlegen für Klasse 7b“).
- **„Nicht zugeordnet“ gewählt:** Die Ablage zeigt die Inhalte ohne Klasse. Dort neu angelegte
  Inhalte bleiben ohne Klasse. Jede Zeile hat zusätzlich den Knopf **„Zuordnen“**.
- **Nachträglich zuordnen:** Der Dialog „Klassen zuordnen“ zeigt alle aktiven Klassen als
  Häkchenliste. Ein Inhalt kann zu **mehreren** Klassen gehören, zum Beispiel „Irregular verbs“
  für 7b und 7c. Erreichbar ist der Dialog über „Zuordnen“ (Ansicht „Nicht zugeordnet“) und
  über „Klassen … ändern“ im Start-Overlay (E2), also auch mobil. Werden alle Häkchen
  entfernt, landet der Inhalt wieder unter „Nicht zugeordnet“.
- **Bestand:** Alle heute abgelegten Vokabelpakete haben keine Klasse und stehen nach dem
  Update unter „Nicht zugeordnet“. Es gibt keine automatische Migration und keinen
  Datenverlust.
- **Archivierte Klassen:** Ihre IDs zählen nicht mehr. Hat ein Inhalt nur noch archivierte
  Klassen, erscheint er unter „Nicht zugeordnet“. Das Archivieren einer Klasse löscht keine
  Inhalte.
- **Aktive Klasse:** Die gewählte Klasse ist zugleich die Klasse des nächsten Raums. Dafür gibt
  es kein neues Feld: Es wird `lastLiveClassId` aus Entscheidung 50 verwendet, zusätzlich steht
  die Wahl in der Adresse (`/lehrer?klasse=<id>` bzw. `/lehrer?klasse=ohne`), damit sie auch
  ohne gespeichertes Lehrerprofil gilt. Ohne gültige Wahl öffnet `/lehrer` die zuletzt genutzte
  Klasse, sonst die erste Klasse, sonst „Nicht zugeordnet“. Ein Raum aus „Nicht zugeordnet“
  startet ohne Klasse, also mit den Standardregeln (keine Schreiberleichterung).
- **Verwaltung:** Schüler, QR und Schreiberleichterung bleiben unter
  `/lehrer/klassen?klasse=…`. Das „+“ neben „Klassen“ und „Klasse anlegen“ führen dorthin.

**E5 – Ablage für alle Inhaltsarten.** Das bestehende Schema wird rückwärtskompatibel
erweitert, statt eine zweite Ablage zu bauen. Alle neuen Felder sind optional:

| Feld         | Typ                                | Bedeutung                                                  |
| ------------ | ---------------------------------- | ---------------------------------------------------------- |
| `kind`       | `"vocabulary" \| "text" \| "math"` | fehlt = `vocabulary` (alle Altbestände sind Vokabelpakete) |
| `classIds`   | `string[]` (UUIDs, max. 50)        | zugeordnete Klassen; leer/fehlt = „Nicht zugeordnet“       |
| `lastUsedAt` | ISO-Zeit                           | letzter Raumstart mit diesem Inhalt                        |
| `textSplit`  | `"satz" \| "zeile" \| "wort"`      | nur Text: Zerlegung in Stationen                           |

- `source` bleibt die einzige Inhaltsquelle: Vokabeln im bisherigen Tabellenformat, Text als
  Rohtext, Mathe als eine Aufgabe je Zeile (wie `mathLines` im Live-Raum).
- `TEACHER_CONTENT_LIBRARY_VERSION` bleibt 1. Alte Dateien bleiben lesbar. Exporte der neuen
  Version kann eine ältere App-Version nicht mehr einlesen (`.strict()`). Das ist eine bekannte
  Grenze und wird dokumentiert.
- Die **Freigabe an Schüler** (24-h-Übergabe) bietet nur `kind = vocabulary` an. Supabase-Verträge
  bleiben unverändert.
- Die Ablage zeigt die Inhalte der gewählten Klasse bzw. die nicht zugeordneten (E4), sortiert
  nach `lastUsedAt ?? updatedAt` (neueste zuerst). Das Datum in der Zeile ist dieser Wert. Die
  Zahl rechts („14 Inhalte“) bezieht sich auf diese Auswahl.
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

**E9 – Code gilt 45 Minuten (abgestimmt).** Neue Beitritte mit Raumcode oder QR sind
**45 Minuten nach dem Öffnen des Raums** möglich, danach nicht mehr. 45 Minuten entsprechen
einer Unterrichtsstunde. Der Code wird außerdem früher wieder frei, was bei nur vierstelligen
Codes Kollisionen verringert.

- **Nur neue Beitritte enden.** Geräte, die schon im Raum sind, kommen mit ihrem
  Teilnehmertoken auch nach 45 Minuten zurück, etwa nach einem Verbindungsabbruch. Die laufende
  Runde, die Live-Ansicht und der CSV-Export laufen weiter. Das Ende des Raums bleibt wie bisher
  (Lehrkraft beendet, sonst nach 3 Stunden ohne Aktivität).
- **Durchsetzung auf dem Server:** In `join_room_secure` wird im Zweig für neue Beitritte
  (nach dem Token-Zweig) zusätzlich `r.created_at > now() - interval '45 minutes'` geprüft. Die
  Antwort bleibt leer wie bei einem unbekannten Code. Die Form des Vertrags ändert sich nicht.
- **Anzeige:** In der Lobby und in der Fußzeile des Live-Schritts steht „Code gilt bis
  HH:MM“. Die Uhrzeit wird beim Erstellen des Raums lokal berechnet und dient nur der Anzeige;
  maßgeblich ist der Server. Nach Ablauf ersetzt „Beitritt geschlossen · neuen Raum öffnen“
  Code und QR, und der vergrößerte QR lässt sich nicht mehr öffnen.
- **Schüler:** Die Meldung bei einem abgelaufenen Code lautet „Raumcode ungültig oder
  abgelaufen“ (gleiche Meldung wie bei einem falschen Code).
- **Eine Konstante:** `ROOM_JOIN_WINDOW_MINUTES = 45` in `src/integrations/laufdiktat/`. Der
  Datenbank-Vertragstest prüft, dass die Migration denselben Wert nutzt.
- **Bekannte Grenze:** Eine zweite Runde im selben Raum nach mehr als 45 Minuten nimmt keine
  neuen Kinder mehr auf. In einer Doppelstunde öffnet die Lehrkraft dafür einen neuen Raum.
- Das ist eine Abweichung vom Original-Laufdiktat. Sie wird in `docs/laufdiktat-parity.md`
  eingetragen.

## 4. Architektur

```
app/views/lehrer/
  teacher-frame.tsx (+ .module.css)      reine Ansicht Rahmen 3c/3d: Leiste, Schublade, Kopf
  content-library-screen.tsx (+ css)     reine Ansicht „Inhalte“: Neu anlegen, Panel, Ablage
  start-sheet.tsx (+ css)                reine Ansicht Start-Overlay (E2)
  class-assign-dialog.tsx (+ css)        reine Ansicht „Klassen zuordnen“ (E4)
  demo.ts                                Beispieldaten der Vorlage (7b/9a/6c, vier Inhalte)
src/domain/teacher-content-library.ts    Schema erweitert (E5)
src/domain/teacher-content-summary.ts    rein: Metazeile, Filter nach Klasse, Sortierung, Titelvorschlag
src/storage/teacher-class-settings.ts    Repository: markUsed(id, at), listForClass(classId | "ohne"),
                                         assignClasses(id, classIds)
app/lehrer/use-content-library.ts        Hook: Ablage + aktive Klasse → Props der Ansicht
app/lehrer/content-adapter.ts            rein: Paket ↔ Live-Raum-Zustand (je Art)
app/lehrer/page.tsx                      bindet Ansicht und Hook
app/ui/shell/teacher-shell.tsx           wird Adapter: liefert Props für teacher-frame.tsx
app/lehrer/live/use-teacher-live-room.tsx  liest `inhalt`/`neu`/`schritt`/Start-Absicht, legt ab
supabase/migrations/2026…_room_join_window.sql  Beitrittsfrist 45 Minuten (E9)
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

1. `app/views/lehrer/teacher-frame.tsx`, `content-library-screen.tsx`, `start-sheet.tsx`,
   `class-assign-dialog.tsx` mit CSS-Modulen. Eintrag „Nicht zugeordnet“ in der Leiste und
   Knopf „Zuordnen“ sind optionale Props; ohne sie zeigt die Ansicht genau die Vorlage.
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
2. Repository: `markUsed(id, at)`, `listForClass(classId | "ohne")`,
   `assignClasses(id, classIds)` (ändert keine Revision, nur `updatedAt`). Gesamtsicherung und
   Import der Lehrerdatenbank mit neuen Feldern.
3. Freigabe an Schüler filtert auf `kind = vocabulary` (Liste und `buildTeacherVocabularyBundle`-Aufruf).
4. Tests:
   - Altpaket ohne `kind` wird als Vokabeln gelesen.
   - Ungültige `classIds` werden abgewiesen.
   - Roundtrip Export/Import mit und ohne neue Felder.
   - Metazeile je Art, Filter und Sortierung.
   - Filter: Inhalt mit zwei Klassen erscheint in beiden; ohne Klasse und mit nur archivierten
     Klassen erscheint er unter „Nicht zugeordnet“.
   - Zuordnen und Entfernen aller Klassen wechseln korrekt zwischen den Ansichten.
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

1. Hook `use-content-library.ts`: lädt die Ablage, liest die Wahl (`?klasse` vor
   `lastLiveClassId`, Rückfall nach E4) und speichert eine geänderte Klassenwahl in
   `lastLiveClassId`, wenn ein Profil existiert. Er liefert Props für `ContentLibraryScreen`,
   den Zähler für „Nicht zugeordnet“ und die Aktion „Klassen zuordnen“. Neue Inhalte erhalten
   die gewählte Klasse.
2. `app/lehrer/page.tsx` bindet Ansicht und Hook. `teacher-overview.tsx` wird gelöscht. Der
   Schutzhinweis folgt E3.
3. Anlegen-Kacheln: auf 3d führt ein Klick direkt zum Editor. Auf 3c wählt der Klick die Art,
   und das Panel „Weiter“ öffnet den Editor (E6). „Bearbeiten“ und „Öffnen“ verhalten sich nach
   E2/E6.
4. Tests: Hook (Filter nach Klasse und „Nicht zugeordnet“, Wahl merken mit und ohne Profil,
   Rückfall bei gelöschter Klasse, Zuordnen aktualisiert Liste und Zähler), Route rendert
   „Inhalte“, Links tragen die richtigen Parameter.

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

### 8.6 Beitrittsfrist 45 Minuten (E9)

Diese Scheibe hängt nicht an 8.1–8.5 und darf zuerst umgesetzt werden.

1. Neue Migration: `join_room_secure` mit der Frist im Zweig für neue Beitritte neu anlegen.
   Rechte (`grant`) wie in der letzten Fassung übernehmen. Token-Zweig unverändert.
2. `ROOM_JOIN_WINDOW_MINUTES` anlegen. Lobby und Live-Fußzeile zeigen „Code gilt bis HH:MM“
   bzw. nach Ablauf „Beitritt geschlossen“ (Hook berechnet, Ansicht erhält Text über optionale
   Props; ohne Props bleibt 5c/5d wie die Vorlage).
3. Schülerseite: Meldung „Raumcode ungültig oder abgelaufen“.
4. Tests:
   - `npm run test:database`: neuer Beitritt nach 45 Minuten wird abgewiesen; Rückkehr mit
     Token nach 45 Minuten klappt; neuer Beitritt vor Ablauf klappt; Migration nutzt 45.
   - Komponententest: Anzeige vor und nach Ablauf (Uhr im Hook injiziert, nicht in der Ansicht).

### 8.7 Aufräumen und Dokumentation

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
  4. „Nicht zugeordnet“ wählen, einen Inhalt der Klasse 7b zuordnen. Er verschwindet dort und
     erscheint unter 7b.
  5. Axe ohne Verstöße auf `/lehrer` mobil und Desktop, auch mit offenem Sheet und offener
     Schublade und offenem Zuordnen-Dialog. Touch-Ziele mindestens 44 px.
- **Datenbank:** `npm run test:database` mit den Fällen aus 8.6.
- **Live (mit Supabase-Konfiguration):** `e2e/live/teacher-room.spec.ts` um zwei Fälle ergänzen:
  „Öffnen → Jetzt starten“ erzeugt eine Lobby, und ein Neuladen zeigt denselben Raumcode. Die
  Lobby zeigt „Code gilt bis HH:MM“.
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
    Inhaltsarten nach Klassen und ein Startweg“ und Entscheidung 52 „Raumcode gilt 45 Minuten
    für neue Beitritte“
- `docs/laufdiktat-parity.md`: Abweichung Beitrittsfrist (E9).
  - `18 - Aufgabenübersicht`: erledigte Punkte

## 8. Nicht Teil dieses Plans

- „Auswertung“ (eigener Entwurf nötig), Neugestaltung von Klassenverwaltung, Freigabe, Aufgaben,
  Häusern und Einstellungen.
- Mehrere gleichzeitig offene Räume oder eine Raumliste unter „Räume“.
- Lehrer-Login oder Kontotrennung (Entscheidung 43).
- Speichern von Mathe-Generator-Einstellungen und der Herkunft „Generator/von Hand“.
- Weitere Änderungen an Supabase (außer E9), an der Freigabe an Schüler (außer dem Filter auf
  Vokabeln) und an CSV-Export oder Spiellogik.
- Eine einstellbare Beitrittsfrist je Raum (z. B. Doppelstunde).

## 9. Offene Fragen an die Lehrkraft (vor 8.3 klären)

Geklärt am 03.10.2026: Ablage nach Klassen mit „Nicht zugeordnet“ und nachträglichem Zuordnen
(E4). Code gilt 45 statt 90 Minuten (E9).

Offen:

1. E1: Sind 3c/3d verbindlich, und sind 1d/2c nur Referenz?
2. E2: Ist das Start-Overlay mit den vier echten Modi statt Laufdiktat/Test/Üben in Ordnung?
3. E9: Gilt die Frist wie vorgeschlagen nur für **neue** Beitritte (bereits beigetretene Geräte
   und die laufende Runde bleiben), oder soll der ganze Raum nach 45 Minuten enden?

## 10. Abnahme durch die Lehrkraft (15 Minuten)

1. Am Laptop `/lehrer` öffnen. Leiste mit Klassen, „Inhalte“ wie im Entwurf 3d, hell und dunkel.
2. Klasse wählen, „Text“ anlegen, einen kurzen Text einfügen, Titel vergeben, „Ablegen“. Der
   Inhalt steht in der Ablage.
3. „Öffnen“ → Modus „Laufdiktat“ → „Jetzt starten“. Die Lobby zeigt Code und QR. Seite neu
   laden: derselbe Raum.
4. Am Handy `/lehrer` öffnen. Wie 3c: Menü, Klassenwahl, großer Knopf „Raum öffnen“; ein Tippen
   auf einen Inhalt öffnet das Start-Overlay.
5. In der Leiste „Nicht zugeordnet“ wählen. Die bisherigen Vokabelpakete stehen dort. Eines
   über „Zuordnen“ zwei Klassen zuordnen; es erscheint danach in beiden Klassen.
6. Ein Vokabelpaket unter „Verwalten → Freigabe an Schüler“ freigeben. Text- und Mathe-Inhalte
   erscheinen dort nicht.
7. Lobby zeigt „Code gilt bis …“. Nach 45 Minuten mit einem neuen Gerät beitreten: abgewiesen.
   Ein schon beigetretenes Gerät neu laden: Es ist weiter im Raum.
