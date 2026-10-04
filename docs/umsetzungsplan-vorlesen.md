# Umsetzungsplan: Besseres Vorlesen mit den Stimmen des Geräts

Stand: 04.10.2026 · Ausgangsstand `claude/lernraum-ui-v2` @ `69fe66a`

Dieser Plan ist die Arbeitsgrundlage für einen KI-Agenten. Die Entscheidungen in Abschnitt 2
sind mit der projektverantwortlichen Lehrkraft abgestimmt und verbindlich. Er ist unabhängig
von den Plänen zur PWA und zu den Paket-Updates, weil das Vorlesen kein Paket nutzt.

## 0. Arbeitsweise

- Eigener Branch, abgezweigt von `claude/lernraum-ui-v2`. Übernahme per Pull Request.
- Regeln: `AGENTS.md`, `docs/engineering-quality.md`, `docs/umsetzungsplan-lernraum-ui-v2.md`
  (Ansichten bleiben rein).
- Keine neuen Abhängigkeiten, kein Server, keine Datenbankänderung. Kein Text verlässt das
  Gerät.
- Vor dem Push: `npm run check`, `npm run test:e2e:chromium`, `npm run test:design` (wenn sich
  die Einstellungsseiten ändern).

## 1. Befund

Symptom: Beim ersten Tippen auf „Vorlesen“ klingt die Stimme deutlich schlechter als beim
zweiten Tippen.

Das Vorlesen nutzt die im Browser eingebaute Sprachausgabe (Web Speech API,
`speechSynthesis`), an drei Stellen mit jeweils eigenem Code:

| Stelle                                              | Sprache                           | Tempo |
| --------------------------------------------------- | --------------------------------- | ----- |
| `app/raum/spiel/live-game.tsx`, `readPromptAloud()` | `promptLang ?? "de-DE"`           | 1,0   |
| `app/raum/spiel/station-game.tsx`, `readAloud()`    | `promptLang ?? "de-DE"`           | 1,0   |
| `app/components/learning-box-app.tsx`, `say()`      | `frontLocale`/`backLocale` (Deck) | 0,9   |

**Ursache:** Alle drei setzen nur `utterance.lang`, nie `utterance.voice`. Die Browser laden die
Stimmenliste aber erst verzögert (`speechSynthesis.getVoices()` ist anfangs leer, später folgt
das Ereignis `voiceschanged`). Beim ersten Vorlesen kennt der Browser seine guten Stimmen also
noch nicht und nimmt eine einfache Standardstimme. Beim zweiten Mal ist die Liste geladen, und er
wählt eine bessere, z. B. „Google Deutsch“ in Chrome. Die Herleitung stammt aus dem Code und
dem dokumentierten Browserverhalten. Auf einem echten Gerät ist der Fehler noch nicht
nachgestellt, weil die Testumgebung keine Stimmen hat.

Weitere Schwächen:

- **Drei Kopien derselben Logik** mit unterschiedlichem Tempo, unterschiedlicher Reihenfolge von
  `cancel()`/`speak()` und unterschiedlicher Spracherkennung.
- **Kurze Sprachcodes.** Vokabeldaten nutzen teils `"de"` statt `"de-DE"`
  (`src/integrations/laufdiktat/vocabulary-transfer.ts`). Manche Browser finden dann keine
  passende Stimme.
- **Keine Sicht auf die Stimme.** Niemand sieht, welche Stimme ein Gerät verwendet. Ob sich die
  Installation einer besseren Stimme (Abschnitt 4) gelohnt hat, lässt sich nicht prüfen.

## 2. Entscheidung

- **Weg 1:** Wir verwenden die Stimmen, die auf dem Gerät installiert sind, und wählen gezielt
  die beste aus. Keine Cloud-Sprachausgabe, keine Sprachmodelle im Browser.
- Die Schulgeräte erhalten bei Bedarf hochwertige Stimmen über die Systemeinstellungen. Eine
  Anleitung dafür entsteht mit diesem Plan (Abschnitt 4).
- Spätere Optionen (Sprachmodell im Browser, Cloud-Dienst) werden erst geprüft, wenn Weg 1 auf
  den echten Geräten nicht reicht.

## 3. Umsetzung

### 3.1 Gemeinsamer Baustein `src/speech/`

Ein reines, testbares Modul ohne React:

- `normalizeSpeechLang(lang)`: `"de"` → `"de-DE"`, `"en"` → `"en-GB"`, `"fr"` → `"fr-FR"`,
  `"es"` → `"es-ES"`. Vollständige Codes bleiben, Groß- und Kleinschreibung wird
  vereinheitlicht.
- `rankVoice(voice, lang)`: Punktzahl für eine Stimme.
  1. Die exakte Sprache mit Region (`de-DE`) schlägt die gleiche Sprache mit anderer Region
     (`de-AT`). Eine andere Sprache ist ausgeschlossen.
  2. Qualitätsmerkmale im Namen geben Pluspunkte: `Natural`, `Neural`, `Online`, `Premium`,
     `Enhanced`, `Siri`, `Google`. Die Liste steht an einer Stelle und ist kommentiert.
  3. Bekannte schwache Stimmen geben Minuspunkte, z. B. `eSpeak` und die Kompaktstimmen von
     macOS. Bei Gleichstand gewinnt die Systemvorgabe (`voice.default`).
- `pickVoice(voices, lang, preferredVoiceURI?)`: Eine gespeicherte Wunschstimme (3.4) gewinnt,
  wenn sie vorhanden ist und zur Sprache passt. Sonst gewinnt die beste nach `rankVoice`, und
  ohne Treffer gibt die Funktion `null` zurück. Dann setzt der Aufrufer nur `lang` wie heute.

Ein Laufzeitteil, `src/speech/speaker.ts`:

- `preloadVoices()`: ruft `getVoices()` sofort auf und hört auf `voiceschanged`. Weil Safari das
  Ereignis nicht zuverlässig auslöst, fragt es zusätzlich kurz nacheinander nach (z. B. 5 × 250
  ms), bis die Liste nicht mehr leer ist. Das Ergebnis wird zwischengespeichert.
- `speak(text, lang, { rate })`:
  - Ist die Liste noch leer, wartet es höchstens ca. 300 ms auf die Stimmen. Danach liest es auf
    jeden Fall vor, nötigenfalls nur mit `lang`, damit sich ein Tippen nie „tot“ anfühlt.
  - Es setzt `utterance.voice`, `utterance.lang` und `utterance.rate`, ruft `cancel()` auf und
    danach `speak()`.
  - Eine gemeinsame Tempo-Vorgabe gilt für alle Stellen. Vorschlag: 0,9, wie bisher in der
    LernBox. Für Kinder und für Diktate ist das angenehmer.
- `isSpeechAvailable()` ersetzt die verstreuten `"speechSynthesis" in window`-Abfragen.

### 3.2 Früh vorladen

- `preloadVoices()` wird einmal app-weit beim Start aufgerufen, in der Client-Komponente aus dem
  PWA-Plan (3.5, `app/ui/service-worker-registration.tsx`), sonst in einer eigenen kleinen
  Komponente im Root-Layout. So ist die Liste beim ersten Tippen schon geladen.

### 3.3 Die drei Stellen umstellen

- `live-game.tsx`, `station-game.tsx` und `learning-box-app.tsx` rufen nur noch
  `speak(text, lang)` auf. Die Mathe-Umschreibung („plus“, „minus“, „mal“, „geteilt durch“) in
  `live-game.tsx` wird als `spokenMath(text)` in `src/speech/` verschoben. Ab dann gilt sie auch
  im Stationsspiel, das Mathe heute unverändert vorliest. Bestehendes Verhalten wie das Zählen
  der Ansichten (`setPeeks`, `reveal(false)`) bleibt unverändert an seinem Ort.
- `canSpeak` in der LernBox nutzt `isSpeechAvailable()`.

### 3.4 „Vorlesestimme“ in den Einstellungen

Damit Lehrkraft und Kinder sehen und wählen können, was ihr Gerät kann:

- In `app/lernen/einstellungen/page.tsx` und `app/lehrer/einstellungen/page.tsx` ein kleiner
  Bereich „Vorlesestimme“ je Sprache (Deutsch, Englisch; weitere nur, wenn Material diese
  Sprache nutzt).
  - Er zeigt die verwendete Stimme, z. B. „Anna (Premium)“, und eine Auswahl aller passenden
    Stimmen. Voreinstellung ist „Automatisch (beste)“.
  - Ein Knopf „Probe hören“ liest einen kurzen Beispielsatz.
  - Gibt es nur einfache Stimmen, erscheint ein Hinweis mit einem Verweis auf die Anleitung aus
    Abschnitt 4.
- Die Wahl wird **pro Gerät** gespeichert, als `voiceURI` je Sprache in `localStorage`, mit
  `try/catch`. Sie ist eine Geräte-Eigenschaft und wird nicht synchronisiert. Fehlt die
  gespeicherte Stimme später, gilt wieder „Automatisch“.
- Die Ansicht bleibt rein. Daten und Aktionen kommen über Props, die Logik liegt in einem Hook
  `app/ui/use-speech-voices.ts`.

## 4. Anleitung: bessere Stimmen auf den Geräten

Neue Datei `docs/vorlesen-stimmen-einrichten.md`, kurz und mit Klickpfaden für Lehrkräfte bzw.
die Geräteverwaltung. Verlinkt aus dem Hinweis in 3.4 (später auch als Hilfeseite in der App
möglich).

- **iPad/iPhone:** Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen → Deutsch →
  z. B. „Anna (Premium)“ oder eine „Erweitert“-Stimme laden. Für Englisch genauso. Bei
  verwalteten Geräten kann die Geräteverwaltung (MDM) das vorgeben.
- **Android:** Einstellungen → Bedienungshilfen → Sprachausgabe → Google-Sprachausgabe →
  Sprachdaten installieren → Deutsch → hochwertige Stimme laden.
- **Windows:** Edge bringt die sehr guten „Natural“-Stimmen bereits mit, z. B. „Katja Online
  (Natural)“. In Chrome unter Windows zusätzlich: Einstellungen → Zeit und Sprache → Sprache →
  Deutsch → Sprachfeatures installieren.
- **Chromebook/Chrome:** Die „Google Deutsch“-Stimmen sind online immer vorhanden. Offline
  greift die Systemstimme.
- Hinweis für alle Geräte: Nach der Installation den Browser bzw. die App einmal neu starten und
  in den Einstellungen mit „Probe hören“ prüfen.

## 5. Tests

- Unit-Tests für `src/speech/`:
  - `normalizeSpeechLang` für kurze, lange und gemischt geschriebene Codes.
  - `rankVoice`/`pickVoice` mit nachgebauten Stimmenlisten: exakte Region vor anderer Region,
    „Premium“/„Natural“ vor einfacher Stimme, Wunschstimme vor Automatik, fremde Sprache nie,
    leere Liste ergibt `null`.
  - `speak`: Bei leerer Liste wird höchstens ca. 300 ms gewartet und dann trotzdem vorgelesen.
    Bei geladener Liste ist `utterance.voice` schon beim **ersten** Aufruf gesetzt (das ist
    der Regressionstest für den gemeldeten Fehler). Erst `cancel()`, dann `speak()`.
  - `spokenMath` mit den bisherigen Ersetzungen.
- Bestehende Tests (`live-parity.test.tsx`, `live-gesture.test.tsx`) auf den neuen Baustein
  anpassen. Die Stubs von `speechSynthesis` bekommen zusätzlich `getVoices` und
  `addEventListener`.
- Einstellungen: Komponententest für die Anzeige der gewählten Stimme, das Speichern und das
  Zurückfallen auf „Automatisch“. axe-Prüfung der Einstellungsseiten.

## 6. Abnahme auf echten Geräten

Auf jedem Gerätetyp, der im Unterricht genutzt wird:

1. App frisch öffnen und sofort einmal „Vorlesen“ tippen. Schon der **erste** Klick nutzt die
   gute Stimme.
2. Laufdiktat (live und Stationen), LernBox Deutsch und Englisch: richtige Sprache, gleiches
   Tempo.
3. Matheaufgabe im Stationsspiel wird mit „plus/minus/mal/geteilt durch“ vorgelesen.
4. Einstellungen zeigen die verwendete Stimme. Nach dem Wechsel der Stimme und „Probe hören“
   wird sie überall genutzt.
5. Nach Installation einer Premium-Stimme laut Abschnitt 4 wählt „Automatisch“ diese Stimme.

## 7. Reihenfolge

1. 3.1–3.3 mit Tests: behebt den Fehler mit dem ersten Klick. Kann als eigener PR zuerst gehen.
2. 3.4 (Einstellungen) und Abschnitt 4 (Anleitung).
3. Abnahme auf den Schulgeräten. Danach entscheiden, ob Weg 2 (Sprachmodell im Browser, z. B.
   Piper) geprüft werden soll.

## 8. Offene Punkte

1. **Gerätetypen im Unterricht** (iPad, Android, Windows, Chromebook)? Davon hängt ab, welche
   Teile der Anleitung zuerst gebraucht werden und worauf die Abnahme sich konzentriert.
2. **Einheitliches Tempo 0,9** für alle Stellen in Ordnung, oder im Diktat lieber etwas
   langsamer (z. B. 0,8)?
