# Umsetzungsplan: Vokabelübernahme aus dem Laufdiktat und Schreiberleichterung (LRS)

Stand: 02.10.2026 · Ausgangsstand `claude/lernraum-ui-v2` @ `e23f96d`

Dieser Plan ist die Arbeitsgrundlage für einen KI-Agenten. Die fachlichen Entscheidungen
in Abschnitt 1 sind mit der projektverantwortlichen Lehrkraft abgestimmt und **verbindlich**.
Wo der Code etwas anderes nahelegt, gilt dieser Plan. Bei echten Widersprüchen erst nachfragen und
nicht selbst umentscheiden.

## 0. Arbeitsweise

- **Branch:** Arbeite auf einem eigenen Branch, der von `claude/lernraum-ui-v2` abzweigt.
  `claude/lernraum-ui-v2` ist in Cloudflare als Produktionsstand aktiv. Schüler nutzen ihn
  bereits. **Niemals direkt auf `claude/lernraum-ui-v2` pushen.** Die Lehrkraft übernimmt nach
  einem Probedurchlauf selbst.
- **Regeln lesen:** `AGENTS.md`, `docs/engineering-quality.md`, `docs/architecture.md`,
  `docs/umsetzungsplan-lernraum-ui-v2.md` (Abschnitt „Regeln für die Anbindung“).
- **Keine neuen Abhängigkeiten.** Kryptografie nur über WebCrypto (`crypto.subtle`), wie in
  `src/domain/houses.ts` und `src/domain/teacher-workspace.ts`. Zod für alle Grenzen.
- **Ansichten bleiben rein:** Kein Speicherzugriff in `app/views/`. Logik gehört in reine
  Funktionen unter `src/domain/` und in Hooks.
- **Keine Supabase-Migration.** Alles in diesem Plan kommt ohne Datenbankänderung aus. Die
  Raumkonfiguration ist `jsonb` ohne Schlüssel-Whitelist (Limit 1 MB), und `liveSessionConfigSchema` ist
  `.passthrough()`. Neue Felder dort sind optional.
- **Kein Personenbezug online:** Hilfen pro Wort, Platzierungen und LRS-Status werden **nicht** an
  den Server gesendet. `wordErrors` geht wie bisher an den Server, sonst nichts Neues.
- **Prüfen vor jedem Push:** `npm run check` (Format, Lint, Typen, Coverage, DB-Tests, Build, Render).
  Bei UI-Änderungen zusätzlich die betroffenen Playwright-Tests, `npm run test:e2e:live`, wenn
  eine Supabase-Testumgebung konfiguriert ist. Die Coverage-Grenzen aus `vitest.config.ts`
  dürfen nicht sinken.
- **Sprache:** Oberflächentexte, Kommentare und Commit-Nachrichten auf Deutsch, im Stil des
  bestehenden Codes. Commits klein und pro Arbeitsschritt.

## 1. Fachliche Entscheidungen (verbindlich)

### 1.1 Begriffe

Alle Begriffe gelten für Wörter vom Typ `vocabulary` in einer Live-Runde ohne Stationsmodus.

- **Fehlversuch:** eine abgeschickte, falsche Antwort zu einem Wort. Wird heute schon in
  `wordErrors[liveWordErrorKey(word)]` gezählt.
- **Hilfe:** Das Kind hat zu diesem Wort **die Buchstabenhilfe** (`hint` in `live-game.tsx`) oder
  **die Abschreibvorlage** (`copyMode` → `CopyGuide`) tatsächlich angezeigt bekommen.
  - **Keine** Hilfe ist: das erste Aufdecken, erneutes Aufdecken (`peeks`) und Vorlesen. Im
    Vokabelmodus zeigt das Aufdecken nur die Frage (`sentence={prompt}`), nicht die Lösung.
  - Hinweis: Im Modus `UEBUNG` erscheint die Buchstabenhilfe nach dem ersten Fehlversuch
    automatisch. Das ist gewollt und gilt als Hilfe (siehe 6. Kalibrierung).
- **Sicher gewusst:** richtig gelöst, 0 Fehlversuche, keine Hilfe.
- **Nicht erreicht:** Das Wort wurde nicht abschließend beantwortet, weil die Lehrkraft die Runde
  vorzeitig beendet hat. Dabei gilt:
  - Wörter mit Index größer als `currentIndex` sind nicht erreicht.
  - Das aktuelle Wort ist nicht erreicht, wenn es weder Fehlversuch noch Hilfe hat.
  - Hat das aktuelle Wort einen Fehlversuch oder eine Hilfe, wird es danach eingeordnet.

### 1.2 Ergebnis pro Wort → Platzierung in der LernBox

Es gibt genau vier Ergebnisse. Sie werden in einer reinen Funktion bestimmt (siehe 2.1).

| Ergebnis   | Bedingung (Standardregeln)                  | Neue Vokabel         | Vokabel schon in der LernBox                       |
| ---------- | ------------------------------------------- | -------------------- | -------------------------------------------------- |
| `known`    | sicher gewusst                              | **Box 2**            | unverändert                                        |
| `practice` | 1–2 Fehlversuche, keine Hilfe               | Box 1, sofort fällig | Box bleibt, **sofort fällig** (`nextReview = now`) |
| `reset`    | **Hilfe genutzt** oder **≥ 3 Fehlversuche** | Box 1, sofort fällig | **Box 1**, sofort fällig                           |
| `unseen`   | nicht erreicht (vorzeitiges Ende)           | Box 1, sofort fällig | unverändert                                        |

Platzierungsregeln gelten für die **im Laufdiktat abgefragte Richtung**. Die Karte wird mit
`question = prompt`, `answer = targetWord` angelegt. Die abgefragte Richtung ist deshalb immer
`forward` der Karte (`box`, `level`, `interval`, `nextReview`).

- Bei neuen Karten startet `reverse` immer in Box 1 und ist sofort fällig.
- Bei vorhandenen Karten bleibt `reverse` unverändert.
- Intervalle wie in `processLearningBoxResult`: Box 1–4 → `interval = 1`, Box 5 → `7`.
  - `known`/neu: `box = level = 2`, `interval = 1`, `nextReview = now + 1 Tag`.
  - `reset`: `box = level = 1`, `interval = 1`, `nextReview = now`.
- Bestehendes Verhalten, das sich **ändert**: Heute setzt `ingestBundle` bei Quelle
  `running-dictation` jede vorhandene Karte in **beiden** Richtungen sofort fällig. Künftig gilt die
  Tabelle.
- Die Dublettenerkennung (`sourceLinks`, Fingerprint) bleibt unverändert. Der `sourceLink` wird in
  jedem Fall ergänzt, auch bei „unverändert“.

### 1.3 Lehrer-Optionen im Vokabelheft

Werte im Schema bleiben `"all" | "errors" | "none"`. Alte Räume und gespeicherte Lehrer-Einstellungen
bleiben gültig. Nur Bedeutung und Beschriftung ändern sich.

| Wert     | Neue Beschriftung (Vorschlag) | Was übernommen wird                        |
| -------- | ----------------------------- | ------------------------------------------ |
| `all`    | „Alle Vokabeln übernehmen“    | jede Vokabel der Runde, platziert nach 1.2 |
| `errors` | „Nur Übungsbedarf übernehmen“ | Ergebnisse `practice`, `reset`, `unseen`   |
| `none`   | „Nichts übernehmen“           | nichts                                     |

Standard bleibt `errors`. Der Stationsmodus übernimmt weiterhin nie, weil sich dort mehrere Kinder
ein Gerät teilen.

### 1.4 Vorzeitiges Ende

Beendet die Lehrkraft die Runde (Broadcast `session-ended` bzw. Status `ended`), bevor das Kind
fertig ist, wird **genauso übernommen**, mit `unseen` für nicht erreichte Wörter. Bei `all` und
`errors` landen damit alle nicht erreichten Wörter in der LernBox. Die Übernahme darf pro Runde
und Gerät nur **einmal** wirken: Runde zu Ende geschrieben und danach beendet ergibt keine zweite
Übernahme.

### 1.5 Texte für Kinder

Niemals „zurückgestuft“, „Strafe“ oder Ähnliches. Vorschläge:

- „3 neue Vokabeln sind jetzt in deiner LernBox.“
- „4 Vokabeln üben wir noch einmal.“ (für `practice` + `reset` bei vorhandenen Karten)
- Beim vorzeitigen Ende auf dem Bildschirm „Diese Runde ist beendet.“ zusätzlich die
  Übernahme-Meldung und der Knopf „Zur LernBox“.
- Fehler: „Die Vokabeln konnten auf diesem Gerät nicht übernommen werden.“ (wie bisher)

### 1.6 Schreiberleichterung (LRS)

- Nur die Lehrkraft kann sie vergeben: per Haken beim Kind in der Klassenliste, transportiert über
  den persönlichen Einschreibe-QR. **Kein** Schalter im Schülerprofil.
- Sie wirkt **nur in Live-Räumen, die die Lehrkraft für genau diese Klasse gestartet hat** (Abgleich
  über den Klassenstempel, siehe 1.7). In Räumen ohne Klassenwahl gelten die Standardregeln.
- Mit Schreiberleichterung gilt:
  1. **Fast richtig zählt als richtig:** Bei Vokabeln wird eine Antwort mit Damerau-Levenshtein-Abstand
     ≤ 1 zu einer akzeptierten Lösung angenommen. Gemeint ist ein Buchstabe falsch, fehlend,
     zusätzlich oder zwei benachbarte vertauscht. Die richtige Schreibweise wird angezeigt
     („Richtig! So schreibt man es: …“).
     - Normalisierung wie bisher, Groß-/Kleinschreibung je nach `caseSensitive`.
     - Bei Antworten mit höchstens 3 Zeichen gilt **keine** Toleranz.
     - Gilt nur für `kind === "vocabulary"`.
  2. Ein so angenommenes Wort gilt für die Platzierung als `practice` (kein Zurücksetzen, aber
     sofort fällig), nicht als `known`.
  3. `reset` erst ab **5** Fehlversuchen statt 3.
  4. Die **Buchstabenhilfe zählt nicht als Hilfe**. Die Abschreibvorlage zählt weiterhin.
- Die Lehrkraft sieht in der Live-Übersicht ein tolerant angenommenes Wort als richtig. Es wird
  keine LRS-Information an Server, Raum oder andere Geräte übertragen.
- Gültigkeit gegenüber `strictTypingMode`: Der strenge Tippmodus blockiert falsche Tasten bereits bei
  der Eingabe. Prüfe, ob die Toleranz dann überhaupt greifen kann. Wenn beides kollidiert: Im strengen
  Tippmodus gilt keine Toleranz, Punkt 3 und 4 gelten trotzdem. Dokumentiere das.

### 1.7 Klassenstempel (Schutz gegen selbst ausgestellte Freigaben)

Es gibt keine Logins, und jeder kann den Lehrerbereich öffnen. Ziel ist daher nicht Fälschungsfreiheit
an sich, sondern: **Eine selbst ausgestellte Freigabe wirkt im Raum der echten Lehrkraft nicht.**

- Jede Klasse erhält beim Anlegen ein eigenes Schlüsselpaar: ECDSA P-256 über WebCrypto, privater
  Schlüssel extrahierbar als JWK, nur im Lehrer-Datenbereich gespeichert. Bestehende Klassen erhalten
  ihr Schlüsselpaar bei der Migration oder beim ersten Bedarf.
- **Stempelabdruck** = SHA-256 über den öffentlichen Schlüssel (SPKI), base64url.
- **Freigabe** = signiertes Objekt `{ v: 1, classId, membershipId, writingRelief: true, issuedAt }`.
  Es steht zusammen mit öffentlichem Schlüssel und Signatur im Einschreibe-QR.
- **Raumstart:** Die Lehrkraft wählt optional eine Klasse. Der Raum trägt dann
  `config.classSeal = <Stempelabdruck>`. Nur der Abdruck kommt in den Raum, keine Klassen-ID, kein Name.
- **Schülergerät:** Die Erleichterung ist aktiv, wenn eine gespeicherte Mitgliedschaft existiert, bei der
  alle drei Bedingungen gelten:
  1. Die Signatur der Freigabe ist mit dem mitgelieferten öffentlichen Schlüssel gültig.
  2. `membershipId` und `classId` der Freigabe passen zur Mitgliedschaft.
  3. Der Abdruck dieses öffentlichen Schlüssels ist gleich `session.classSeal`.
- Bewusst akzeptierte Restrisiken: Siehe Entscheidung 50 (2.8).
- Der Klassenschlüssel gehört in den bestehenden Gesamt-Export/-Import des Lehrerbereichs. Geht er
  verloren, stellt die Lehrkraft den LRS-Kindern neue QR-Codes aus.

## 2. Umsetzung

### Teil 1: Vokabelübernahme (unabhängig von Teil 2, zuerst umsetzen)

#### 2.1 Reine Fachlogik

Neue Datei `src/domain/live-vocabulary-placement.ts` mit Tests (`*.test.ts`, Ziel 100 % Zweige):

```ts
export type LiveVocabularyOutcome = "known" | "practice" | "reset" | "unseen";
export type LiveWordTrace = {
  errors: number;
  usedHelp: boolean;
  answered: boolean;
};
export type PlacementRules = { resetAfterErrors: number }; // Standard 3, Schreiberleichterung 5

export function classifyLiveVocabulary(
  trace: LiveWordTrace,
  rules: PlacementRules,
): LiveVocabularyOutcome;
export function shouldTransfer(
  outcome: LiveVocabularyOutcome,
  choice: VocabularyTransferChoice,
): boolean;
```

- Bei `answered === false` gilt: `unseen`, wenn `errors === 0 && !usedHelp`, sonst nach Fehlern und Hilfe
  einordnen (vgl. 1.1).
- Tests sind tabellengetrieben und decken jede Zeile aus 1.2 und 1.3 ab, einschließlich der Grenzen
  2/3 bzw. 4/5 Fehlversuche.

#### 2.2 Hilfen und Antwortstatus pro Wort mitschreiben

In `app/raum/spiel/live-game.tsx`:

- Neuer Zustand `wordHelps: Record<string, true>` mit dem Schlüssel `liveWordErrorKey(word)`. Setzen, sobald
  für das aktuelle Vokabelwort `hint` nicht leer ist oder `copyMode` aktiv ist. Das geschieht beim
  Rendern als abgeleiteter Zustand, deshalb per Effekt mit Abhängigkeit auf `hint`/`copyMode`/`index`
  und nicht im Render selbst.
- Gemeinsam mit `wordErrors`, `currentIndex` und `finished` als **lokaler Schnappschuss** in
  `sessionStorage` sichern (Schlüssel z. B. `lernraum:live-trace:<sessionId>`).
  - `sessionStorage` passt zum Grundsatz aus dem Laufdiktat (`LESSONS.md`): kein dauerhafter
    Teilnehmerzustand.
  - Beim Wiederaufnehmen (`initialProgress`) den Schnappschuss wieder einlesen, wenn er zur `sessionId`
    gehört.
  - Lesen und Schreiben mit `try/catch`. Ohne Speicher funktioniert alles weiter, nur ohne Hilfen-Info.
- `wordHelps` **nicht** in `onProgress`/`LiveProgress` aufnehmen: kein neues Serverfeld.
- Hilfsfunktion zum Lesen und Schreiben des Schnappschusses in eine eigene, getestete Datei, z. B.
  `src/integrations/laufdiktat/live-trace.ts`, mit Zod-Validierung beim Lesen.

#### 2.3 Übernahme-Bundle mit Platzierungen

`src/integrations/laufdiktat/vocabulary-transfer.ts`:

- `buildLiveVocabularyTransfer(session, trace, rules)` ersetzt `wordErrors` durch den Schnappschuss.
  Rückgabe zusätzlich `placements: Record<itemId, LiveVocabularyOutcome>`.
- `selectVocabularyForTransfer` nutzt `classifyLiveVocabulary` + `shouldTransfer`.
- Titel: Bei `errors` „Übungsbedarf aus Unterrichtsrunde“. Achtung: Der Deck-Fallback in `ingestBundle`
  sucht über den Titel. Der alte Titel „Fehler aus Unterrichtsrunde“ muss weiter gefunden werden
  (beide Titel prüfen), sonst entsteht ein zweiter Stapel.
- `LearningBundleV1` **nicht** ändern. Platzierungen werden als separater Parameter übergeben.

#### 2.4 LernBox-Eingang

`src/storage/personal-learning-events.ts`, Funktion `ingestBundle`:

- Neuer optionaler Parameter `placements?: Record<string, LiveVocabularyOutcome>`. Ohne Angabe gilt das
  alte Verhalten, damit andere Aufrufer unverändert bleiben (Aufrufer suchen: `ingestBundle(`).
- Neue Karte: Platzierung nach 1.2 statt Standard aus `createLearningBoxCard`.
- Vorhandene Karte (Quelle `running-dictation`): nur `forward`-Felder nach 1.2 ändern, `reverse*`
  unverändert lassen, `sourceLinks` wie bisher ergänzen.
- Rückgabe erweitern um `{ added, reused, practiceAgain }`. `practiceAgain` zählt vorhandene Karten mit
  `practice` oder `reset`. Das ist die Grundlage für die Texte aus 1.5.
- Die Platzierung als reine Funktion in `src/domain/learning-box.ts` ablegen, z. B.
  `placeLiveVocabularyCard(card | undefined, outcome, now)`, mit eigenen Tests. `ingestBundle` ruft sie
  nur auf.
- Tests in `src/storage/personal-learning-events.test.ts` mit `fake-indexeddb` (wie die bestehenden):
  - jede Tabellenzeile für neue und vorhandene Karten
  - Dublette über Fingerprint
  - zweimalige Übernahme derselben Runde ergibt dasselbe Ergebnis (idempotent)
  - alter Stapeltitel wird wiederverwendet

#### 2.5 Übernahme auslösen: regulär und bei vorzeitigem Ende

- **Regulär** (`phase === "complete"` in `live-game.tsx`): wie heute, aber mit Schnappschuss und
  Platzierungen.
- **Vorzeitiges Ende** (`app/components/live-room-join.tsx`): Beim Wechsel nach `view === "ended"` wird
  heute `setSession(null)` aufgerufen (ca. Zeile 133). Dadurch ist die Runde danach unbekannt.
  - Vorher die letzte `LiveSession` in einer Ref sichern.
  - Den Schnappschuss aus `sessionStorage` lesen und dieselbe Übernahme ausführen.
  - Die Meldung auf dem „Diese Runde ist beendet.“-Bildschirm anzeigen.
- **Gemeinsamer Baustein:** Die Logik „Übernahme ausführen + Meldung bestimmen“ in einen Hook oder eine
  Funktion auslagern, z. B. `useLiveVocabularyTransfer`. Beide Stellen nutzen sie, keine doppelte Logik.
- **Einmaligkeit:** Erfolgreiche Übernahme pro `sessionId` in `sessionStorage` markieren
  (`lernraum:live-transfer-done:<sessionId>`). Ist sie markiert, keine zweite Übernahme, nur die
  gespeicherte Meldung zeigen. Wiederholung bei Fehler muss möglich bleiben.
- Stationsmodus und `vocabularyTransfer === "none"`: keine Übernahme, keine Meldung.
- Hat das Kind die Seite vor dem Ende geschlossen, gibt es keine Übernahme. Das ist bekannte Grenze,
  dokumentieren.

#### 2.6 Lehrkraft-Oberfläche

- `app/views/laufdiktat/vocabulary-editor.tsx`: Beschriftungen nach 1.3. Unter der Auswahl einen
  kurzen erklärenden Satz anzeigen, z. B. bei `all`: „Sicher gewusste Vokabeln starten in Box 2.“
- Design-Referenzbilder: Prüfen, ob `npm run test:design` betroffen ist. Falls ja, Abweichung im
  v2-Plan unter „Bewusste Abweichungen“ eintragen statt Referenzen zu verändern.

#### 2.7 Tests Teil 1

- Unit: 2.1, 2.2 (Schnappschuss), 2.3, 2.4 wie beschrieben.
- Komponenten:
  - `app/raum/spiel/live-game.test.tsx`: Buchstabenhilfe angezeigt → Wort gilt als `reset`.
  - `app/components/live-room-join.test.tsx` (anlegen, falls nicht vorhanden): Runde wird mitten im
    Spiel beendet → Übernahme mit `unseen` und Meldung auf dem Ende-Bildschirm.
- E2E: `e2e/live/vocabulary-transfer.spec.ts` erweitern:
  1. Lehrkraft beendet die Runde nach dem ersten Wort → alle Vokabeln in der LernBox.
  2. Modus `all`, alles sicher gewusst → Karten in Box 2.
  3. Gleiche Vokabeln in einer zweiten Runde mit Hilfe → Karte wieder in Box 1, keine Dublette.

#### 2.8 Dokumentation Teil 1

- `obsidian-export/Lernplattform/19 - Entscheidungsprotokoll/Anwendung.md`: **Entscheidung 49**
  „Vokabelübernahme aus dem Laufdiktat: Platzierung nach Ergebnis“ mit Tabelle 1.2, den Optionen 1.3,
  dem vorzeitigen Ende 1.4 und der Begründung. Begründung: Alle Kinder erhalten die Lehrer-Vokabeln.
  Die Unterrichtsrunde dient als ehrliche Kontrolle gegenüber reinem Aufdecken in der LernBox.
- Kapitel 02 (Laufdiktat) und 06 (Lernlogik) im Vault an die Tabelle angleichen.
- `18 - Aufgabenübersicht`: Punkte abhaken bzw. ergänzen.
- `docs/umsetzungsplan-lernraum-ui-v2.md`, Abschnitt „Stand der Anbindung“: „Laufdiktat → LernBox“
  aktualisieren.

### Teil 2: Schreiberleichterung mit Klassenstempel

#### 2.9 Fachlogik Klassenstempel

Neue Datei `src/domain/class-seal.ts` mit Tests:

- `createClassSealKeyPair()` erzeugt ECDSA P-256 `{ privateJwk, publicKeyB64u }`.
- `classSealFingerprint(publicKeyB64u)` → SHA-256 base64url.
- `signWritingReliefGrant(privateJwk, grant)` / `verifyWritingReliefGrant(publicKeyB64u, grant, signatureB64u)`.
- `isWritingReliefActive(memberships, classSeal)` als reine async-Funktion nach den Regeln aus 1.7.
- Kanonische Serialisierung des Grants (feste Feldreihenfolge), damit die Signatur stabil ist.
- Tests:
  - gültig
  - falscher Schlüssel (**Schummeltest:** Freigabe einer selbst angelegten Klasse gegen den Abdruck
    der echten Klasse)
  - manipuliertes Feld (z. B. andere `membershipId`)
  - fehlender `classSeal` → inaktiv
  - mehrere Mitgliedschaften, nur eine passt → aktiv

#### 2.10 Lehrer-Datenbereich

- `src/domain/class-enrollment.ts`: `teacherClassSchema` erweitern um optionales `seal`
  (`{ privateJwk, publicKey }`), `classMemberSchema` um optionales `writingRelief: boolean`. Die
  Schemata sind `.strict()`, deshalb gezielt erweitern.
- `src/storage/teacher-class-settings.ts`: neue Dexie-Version 6. Bei der Migration erhalten bestehende
  Klassen ein Schlüsselpaar, falls das im Upgrade-Callback asynchron mit WebCrypto zuverlässig geht.
  Sonst lazy beim ersten Erzeugen eines QR oder Raums. Die Entscheidung kommentieren.
- Gesamt-Export/-Import des Lehrerbereichs: `seal` und `writingRelief` mitnehmen, Import validiert per Zod.
  Bestehende Exportdateien ohne diese Felder bleiben importierbar (Test).

#### 2.11 Einschreibe-QR

- `createEnrollmentCode` / `parseEnrollmentCode`: Das kompakte Tupel bekommt ein optionales zehntes
  Element `{ k: publicKeyB64u, g: grant | null, s: signature | null }`. Der bestehende
  `z.union`-Parser muss 8, 9 und 10 Elemente akzeptieren. Alte QR-Codes bleiben gültig (Test).
- `classEnrollmentSchema` um optionale Felder `sealPublicKey`, `writingReliefGrant`,
  `writingReliefSignature` erweitern.
- Erneutes Scannen derselben Mitgliedschaft **ersetzt** die Freigabe. Ein QR ohne Freigabe entfernt sie,
  so nimmt die Lehrkraft die Erleichterung zurück. Prüfen in `app/components/student-class-enrollment.tsx`
  und `src/storage/student-classes.ts`.
- QR-Lesbarkeit prüfen: Der Code wird um ca. 250 Zeichen länger. Mit dem bestehenden Generator und
  Scanner (`qrcode.react`, `qr-scanner`) testen. Bei Problemen die Fehlerkorrekturstufe senken oder
  Felder kürzen, nicht den Inhalt.

#### 2.12 Oberflächen

- **Klassenliste** (`app/components/teacher-class-configurator.tsx`): Haken „Schreiberleichterung“
  je Kind mit kurzer Erklärung („Wirkt nur in Laufdiktaten, die du für diese Klasse startest.“).
  Nach Änderung den QR des Kindes neu anzeigen und darauf hinweisen, dass das Kind ihn neu scannen muss.
- **Raumstart** (`app/lehrer/live/use-teacher-live-room.tsx` + Optionen-Schritt der Ansicht):
  - Optionale Auswahl „Klasse“ (Standard: keine bzw. zuletzt gewählte, gemerkt in den
    Lehrer-Einstellungen).
  - Bei Wahl: `config.classSeal` setzen. Dazu `TeacherRoomConfig`/`buildTeacherRoomConfig` in
    `src/integrations/laufdiktat/teacher-session.ts` und `liveSessionConfigSchema` um
    `classSeal: z.string().regex(/^[A-Za-z0-9_-]{43}$/).optional()` erweitern.
  - Die Ansicht bleibt rein: Die Klassenliste kommt als Prop.
- **Schülerspiel** (`app/raum/spiel/live-game.tsx`):
  - Vor Spielbeginn `isWritingReliefActive` auswerten (async, Standard `false`).
  - Danach `checkLiveAnswer` um eine Toleranzvariante ergänzen (neue reine Funktion in
    `src/integrations/laufdiktat/live-session.ts` oder `src/domain`, mit Tests), dazu die Rückmeldung
    „Richtig! So schreibt man es: …“.
  - `PlacementRules` mit `resetAfterErrors: 5` übergeben, Buchstabenhilfe nicht als Hilfe zählen.
  - Tolerant angenommene Wörter im Schnappschuss markieren (`toleratedSpelling`), damit sie als
    `practice` platziert werden. `classifyLiveVocabulary` entsprechend erweitern.
- Kein sichtbares LRS-Etikett auf dem Schülerbildschirm, keins in der Lehrer-Live-Übersicht.

#### 2.13 Tests Teil 2

- Unit: 2.9, Schema- und QR-Kompatibilität (2.10/2.11), Toleranzfunktion. Tests dafür:
  - Abstand 0/1/2
  - Vertauschung
  - Länge ≤ 3
  - `caseSensitive`
  - Alternativen
- Komponenten: Klassenliste mit Haken. Raumstart mit Klasse setzt `classSeal`. Spiel mit passender
  bzw. unpassender Mitgliedschaft.
- E2E (live), drei Fälle:
  1. Kind mit Freigabe, Raum mit passender Klasse: Tippfehler wird angenommen.
  2. Gleiches Kind, Raum ohne Klasse: Tippfehler wird nicht angenommen.
  3. Selbst angelegte Klasse mit Freigabe, Raum der echten Klasse: keine Erleichterung.

#### 2.14 Dokumentation Teil 2

- **Entscheidung 50** „Schreiberleichterung über Klassenstempel ohne Lehrerlogin“, mit diesen Punkten:
  - Regeln aus 1.6.
  - Mechanik aus 1.7.
  - Begründung: Datensparsamkeit, keine LRS-Information online, kein Verifikationsprozess für
    Lehrkräfte.
  - Bewusst akzeptierte Restrisiken:
    1. Ein Kind kann sich in einer selbst gehosteten Runde mit selbst angelegter Klasse Erleichterung
       geben. Ohne verifizierte Lehrkräfte lässt sich das nicht verhindern, und es verschafft keinen
       Vorteil gegenüber anderen.
    2. Der Schlüssel liegt nur auf dem Lehrergerät bzw. in dessen Sicherung.
- `docs/security-risk-register.md`: neuer Eintrag zu 1.7 mit diesen Restrisiken.
- Vault-Kapitel 13 (Datenschutz und Rollen) und 04 (Lehrer-Cockpit) ergänzen.

### Teil 3: Probedurchlauf (Checkliste für die Lehrkraft)

Nach Teil 1 bzw. Teil 2 auf einer Vorschau-Bereitstellung des Arbeitsbranches. Ausstattung: Laptop
(Lehrkraft) und ein Handy (Kind), privates Browserfenster auf dem Handy.

**Teil 1 – Vokabelübernahme (ca. 15 Minuten)**

1. Vokabelheft mit 5 Vokabeln, Modus „Üben“, Option „Nur Übungsbedarf“. Raum starten und beitreten.
2. Am Handy: Wort 1 sicher richtig, Wort 2 einmal falsch, Wort 3 so lange falsch, bis die Buchstabenhilfe
   erscheint. Danach Runde zu Ende spielen.
   → LernBox: Wort 2 und 3 in Box 1, Wort 1 nicht übernommen.
3. Neue Runde mit denselben Vokabeln, Option „Alle Vokabeln“. Alles sicher richtig.
   → Wörter 1, 4, 5 neu in Box 2. Wörter 2 und 3 bleiben, wo sie waren. Keine doppelten Karten.
4. Neue Runde, nach dem zweiten Wort am Laptop beenden.
   → Handy zeigt „Diese Runde ist beendet“ und eine Übernahme-Meldung. Nicht erreichte Wörter sind
   in der LernBox.
5. Während einer Runde am Handy die Seite neu laden und weiterspielen.
   → Übernahme am Ende stimmt, keine doppelte Meldung.
6. Stationsmodus mit Vokabeln.
   → Es wird nichts übernommen.

**Teil 2 – Schreiberleichterung (ca. 15 Minuten)**

7. Klasse mit zwei Kindern anlegen. Bei Kind A den Haken setzen, QR auf dem Handy scannen.
8. Raum **mit** Klassenwahl starten. Am Handy einen Buchstaben falsch tippen.
   → wird angenommen, richtige Schreibweise angezeigt.
9. Raum **ohne** Klassenwahl starten. Gleicher Tippfehler.
   → wird nicht angenommen.
10. **Schummeltest:** Auf dem Handy ein neues privates Fenster öffnen (ohne die echte Freigabe aus
    Schritt 7). Dort selbst den Lehrerbereich öffnen, eine Fantasieklasse anlegen, sich selbst die
    Erleichterung geben und den eigenen QR scannen. Dann in einen Raum eintreten, den der Laptop für
    die echte Klasse gestartet hat. Am Handy einen Buchstaben falsch tippen.
    → wird **nicht** angenommen.
11. Haken bei Kind A entfernen, neuen QR scannen, Raum mit Klasse.
    → keine Erleichterung mehr.

## 3. Nicht Teil dieses Plans

- Getrennte Lernstände „Bedeutung“ und „Schreiben“ in der LernBox (Konzept 06) – später.
- Toleranz für Text-Laufdiktate (Sätze) – später, nach Rückmeldung aus dem Unterricht.
- Abgabeprotokolle, Klassenranking oder Klassenbezug über den Klassenstempel hinaus.
- Änderungen an Supabase-Migrationen, Login oder Lehrerverifikation.
- Wortspeicher und Tastenwelt.

## 4. Bekannte Grenzen (dokumentieren, nicht lösen)

- Schließt ein Kind die Seite vor dem Ende, wird nichts übernommen (Sitzungsspeicher).
- Liegt eine Vokabel in der LernBox in umgekehrter Richtung (Frage/Antwort vertauscht), erkennt der
  Fingerprint sie nicht als Dublette. Bestehendes Verhalten, unverändert.

## 5. Abschluss

Pro Teil ein eigener Commit-Block. Danach:

1. `npm run check` grün.
2. Relevante E2E-Tests grün.
3. Branch pushen.
4. Kurzer Bericht an die Lehrkraft in einfacher Sprache: was geändert wurde, was getestet ist, was sie
   im Probedurchlauf prüfen soll (Teil 3).

## 6. Später zu kalibrieren (nach dem Probedurchlauf)

- Im Modus „Üben“ erscheint die Buchstabenhilfe nach dem ersten Fehlversuch automatisch. Ein einzelner
  Tippfehler führt dort deshalb zu `reset`. Die Zeile „1–2 Fehlversuche → bleibt in der Box“ wirkt
  praktisch nur in den Modi Laufdiktat und Battle. Die Lehrkraft entscheidet nach dem Test, ob das so
  bleibt.
- Grenzwerte der Schreiberleichterung (Abstand 1, 5 Versuche).
