# Umsetzungsplan: Spiegelschrift im Lesetext der Textbox

Stand: 18.10.2026 · Ausgangsstand `claude/lernraum-ui-v2`

Dieser Plan ist die Arbeitsgrundlage für einen KI-Agenten. Die fachlichen Entscheidungen in
Abschnitt 1 sind mit der projektverantwortlichen Lehrkraft abgestimmt und **verbindlich**. Bei
echten Widersprüchen zum Code erst nachfragen und nicht selbst umentscheiden.

## Ausgangslage

Einige Kinder mit Lese-Rechtschreib-Schwierigkeiten sollen den Lesetext gespiegelt sehen können.
Ein früher Versuch (Branch `claude/lernplattform-aktueller-stand-8g8i2x`, Commit `174c57e`,
`src/barrierefreiheit/mirror-mode.ts`) spiegelte die **ganze Seite** per `body { transform:
scaleX(-1) }` und wurde von der Lehrkraft per PIN für 10–30 Minuten freigeschaltet. Das ist kaum
bedienbar (Knöpfe, Menü und Eingaben gespiegelt) und wird **nicht** übernommen. Die reinen
Zeitfunktionen dort (`computeMirrorUntil`, `isMirrorActive`) taugen als Vorbild.

Bausteine, die es schon gibt:

- Schüler-Einstellungen: `app/components/student-settings-panel.tsx`, Abschnitt „Darstellung“
  (Farbschema über `Segmented`, Hinweis „nur auf diesem Gerät gespeichert“).
- Gerätelokale Einstellung als Vorbild: `app/ui/theme.ts` (`localStorage`, Änderungsereignis,
  `useSyncExternalStore`).
- Textbox-Container: `app/components/textbox-app.tsx`; Leseansicht „Einprägen“:
  `app/views/textbox/memorize-screen.tsx` mit `TextFlow` (`app/views/textbox/text-flow.tsx`).
- Freigabe-Register: `src/domain/release.ts`. Bereiche ohne eigenen Pfad gibt es schon
  (`geraete-sync`, `routes: []`); Abfrage über `useAreaVisible` aus `app/release/release-context.tsx`.

## 0. Arbeitsweise

- Branch `claude/spiegelschrift`, abgezweigt vom aktuellen `claude/lernraum-ui-v2`, PR dorthin.
  Nicht selbst mergen.
- Regeln: `AGENTS.md`, `docs/engineering-quality.md`, `docs/architecture.md` (Abschnitt
  „Oberflächenschichten“: Ansichten in `app/views` sind rein, Daten kommen über Props).
- Keine neuen Abhängigkeiten, keine Supabase-Migration, keine Änderung an synchronisierten Schemas.
- Prüfen vor dem Push: `npm run check` vollständig, dazu die neuen und die betroffenen
  Playwright-Tests (`desktop-chromium`, `mobile-chrome`) mit Axe. Lokale Playwright-Config mit
  `executablePath: "/opt/pw-browsers/chromium"`, nicht `playwright install` ausführen.
- Keine neuen Referenzbilder: Im Ausgangszustand ist die Spiegelschrift aus, `test:design` muss
  unverändert grün bleiben.
- Commits klein, auf Deutsch. Für den PR genügt ein Push; nach dem Push nicht wiederholt CI
  abfragen.

## 1. Fachliche Entscheidungen (verbindlich)

1. **Wer schaltet:** das Kind selbst, in „Profil und Einstellungen“, Abschnitt „Darstellung“.
   Keine PIN, keine Freigabe durch die Lehrkraft.
2. **Wo es wirkt:** nur der **Lesetext** der Textbox in der Ansicht „Einprägen“
   (`MemorizeScreen`). Überschrift, Knöpfe, Navigation, Eingabefelder, Lückentext, freies
   Schreiben, Überprüfung und Arbeitsblatt bleiben normal. Andere Bereiche (z. B. Laufdiktat)
   kommen erst später, auf eigenen Wunsch der Lehrkraft.
3. **Dauer:** Beim Einschalten gilt die Spiegelschrift **7 Tage** ab jetzt. Danach ist sie von
   selbst aus und muss bewusst neu eingeschaltet werden. Kein Verlängern während sie läuft;
   Ausschalten geht jederzeit.
4. **Datenschutz:** Die Einstellung bleibt **nur auf dem Gerät** (`localStorage`). Sie geht nicht in
   Cloud-Abgleich, Sicherungsdatei, Klassen- oder Lehrkraftansichten. Die Lehrkraft erfährt nicht,
   wer sie nutzt.
5. **Freigabe:** neuer Bereich `spiegelschrift` im Register, `routes: []`, Stufe `vorschau`. Ohne
   Vorschau erscheint der Schalter nicht und der Text wird nie gespiegelt. Die README-Tabelle aus
   `releaseStagesMarkdown()` mitziehen.

## 2. Schritte

1. **Reine Logik** `src/domain/mirror-reading.ts`: `MIRROR_READING_DAYS = 7`,
   `mirrorReadingUntil(now)`, `isMirrorReadingActive(untilIso, now)` (ungültig oder abgelaufen →
   aus), `mirrorReadingDaysLeft(untilIso, now)` (aufgerundet). Unit-Tests inklusive Grenzen
   (genau 7 Tage, abgelaufen, kaputter Wert, Zeitumstellung).
2. **Gerätespeicher und Hook** `app/ui/mirror-reading.ts` nach dem Muster von `theme.ts`:
   Schlüssel `lernraum-spiegelschrift-bis`, `try/catch` um jeden Zugriff, Änderungsereignis,
   `useMirrorReading()` liefert `{ active, until, turnOn, turnOff }`. Abgelaufene Werte beim Lesen
   entfernen. Solange die Spiegelschrift aktiv ist, einen Zeitgeber bis `until` stellen, der beim
   Ablauf den Wert entfernt und die Abonnenten benachrichtigt; sonst bliebe der Text auf einer
   offenen Seite gespiegelt, bis neu gerendert wird. Beim Ausschalten und Abmelden den Zeitgeber
   löschen. Ohne Freigabe (`useAreaVisible("spiegelschrift")`) immer `active: false`.
3. **Einstellung** in `student-settings-panel.tsx`, Abschnitt „Darstellung“: Schalter
   „Spiegelschrift im Lesetext“ mit Erklärung „Der Text zum Einprägen in der Textbox wird
   gespiegelt angezeigt. Schaltet sich nach 7 Tagen von selbst aus.“ Wenn an: „Aktiv bis
   TT.MM.“ und „Ausschalten“. Bedienbar per Tastatur, mit sichtbarem Fokus und Status für
   Screenreader.
4. **Anzeige:** `MemorizeScreen` bekommt eine Prop `mirrored?: boolean`; `textbox-app.tsx`
   reicht `useMirrorReading().active` durch. `TextFlow` bzw. der Absatz bekommt eine Klasse mit
   `transform: scaleX(-1)` im CSS-Modul. Nur die Darstellung wird gespiegelt; Text, Reihenfolge im
   DOM und Vorlesen bleiben gleich.
5. **Tests:**
   - Komponententest der Ansicht: mit `mirrored` hat der Lesetext die Klasse, ohne nicht.
   - Playwright mit Vorschau: Schalter einschalten → Textbox „Einprägen“ zeigt gespiegelten Text,
     Knöpfe bleiben normal; mit `page.clock` 7 Tage plus 1 Minute vorspulen → ohne Neuladen wieder normal und
     der Schalter steht auf aus. Ohne Vorschau ist der Schalter nicht da. Axe auf der
     Einstellungsseite in beiden Zuständen.
6. **Doku:** kurzer Absatz in `docs/device-support.md` oder der Textbox-Doku, dass die Einstellung
   gerätelokal ist. Unter „Für den Vault“ in der PR-Beschreibung die Entscheidungen aus
   Abschnitt 1 als Eintrag formulieren.

## 3. Nicht Teil dieses Plans

- Spiegelschrift in Laufdiktat, LernBox oder anderen Bereichen.
- Freischalten für den Schulbetrieb (`frei`): entscheidet die Lehrkraft nach dem Probedurchlauf.
- Übernahme von Code aus dem alten Branch außer als Vorbild für die Zeitfunktionen.

## 4. Probedurchlauf (Lehrkraft)

- Mit `?vorschau=an` als Schüler in den Einstellungen die Spiegelschrift einschalten.
- Einen Text in der Textbox öffnen, „Einprägen“: Der Text ist gespiegelt, alles andere normal.
- Ausschalten und wieder einschalten; „Aktiv bis“ zeigt das Datum in 7 Tagen.
