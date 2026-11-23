# Umsetzungsplan: Vorlesen mit einem Sprachmodell im Browser (KittenTTS)

Stand: 23.11.2026 · Ausgangsstand `claude/laughing-mendel-chvwke` @ `56439ba`

Dieser Plan setzt „Weg 2“ aus `docs/umsetzungsplan-vorlesen.md` (Abschnitt 2 und 7.3) um. Er
baut auf dem Prototyp der Lehrkraft auf (eigenständige Testanwendung „kitten-nano-de-en-test“,
nicht Teil dieses Repos).

## 0. Arbeitsweise

- Branch `claude/laughing-mendel-chvwke`. Übernahme per Pull Request.
- Regeln: `AGENTS.md`, `docs/engineering-quality.md`, `docs/umsetzungsplan-lernraum-ui-v2.md`
  (Ansichten bleiben rein).
- **Kein Text verlässt das Gerät.** Alle Dateien kommen vom eigenen Ursprung, die Erzeugung
  läuft in einem Web Worker. Es gibt keinen Server-Endpunkt und keine Datenbankänderung.
- Alles Neue steht hinter dem Freigabebereich `sprachmodell` mit Stufe `vorschau`
  (Entscheidung 47). Ohne Vorschau ändert sich am Vorlesen nichts.
- Vor dem Push: `npm run check`. Browser-Tests gezielt für die geänderten Stellen.

## 1. Befund

- **B-012 wirkt nur im Knopf „Vorlesen“.** `ReadAloudButton` ruft `speak(…, { localOnly: true })`
  auf. In Edge und Chrome am Desktop sind die guten Stimmen Netzwerkstimmen und fallen damit weg.
  Gibt es keine lokale deutsche Stimme, fehlt der Knopf ganz (Entscheidung 58). Der Knopf ist
  derzeit **nirgends eingebaut**: Entscheidung 58 hat ihn von Start- und Einstellungsblättern
  genommen, die Komponente blieb.
- **Stufe 6 „Hören und schreiben“** (`app/components/use-speech.ts`) nutzt `speak()` **ohne**
  `localOnly`. Sie kann deshalb Netzwerkstimmen wählen. Ohne deutsche Stimme gibt es Stufe 6 gar
  nicht.
- LernBox (`learning-box-app.tsx`), Live-Spiel und Stationsspiel (`app/raum/spiel/`) rufen
  `speechSynthesis` weiterhin direkt auf. Schritt 3.3 aus `docs/umsetzungsplan-vorlesen.md` ist
  dort noch offen. Diese drei Stellen sind die wichtigsten für den Hörtest. Sie bekommen deshalb
  nur in der Vorschau einen Weg über `speak(…, { model: true })`, ohne Vorschau bleibt ihr Code
  unverändert (3.4).
- Der Prototyp hat gezeigt: KittenTTS 2 Nano erzeugt Deutsch und Englisch im Browser, auch
  offline und mit blockierter System-Sprachausgabe. Getestet wurde das in Safari, Chrome und
  Firefox, auch auf Android und dem iPad.
- **Lizenz des Prototyps:** Der Phonemizer `@diffusionstudio/piper-wasm@1.0.0` nennt MIT,
  enthält aber eSpeak NG (GPL-3.0) und keine Lizenzdatei. Die Quellen sind ohne
  Commit-Angabe geklont (`git clone --depth 1`), das Binary lässt sich also keiner Quelle
  zuordnen. Seine Datendatei enthält alle 113 Sprachen (18,1 MB).

## 2. Entscheidungen

1. **Weg 2 wird gebaut, zunächst nur in der Vorschau.** Das ändert die Festlegung „keine
   Sprachmodelle im Browser“ aus `docs/umsetzungsplan-vorlesen.md` Abschnitt 2. Das ist dort als
   spätere Option vorgesehen, bekommt aber einen Eintrag im Entscheidungsprotokoll.
2. **Reihenfolge der Stimmen in der Vorschau:** Gibt es ein Modell für die Sprache, spricht
   zuerst das Sprachmodell, dann eine lokale Gerätestimme. Eine Netzwerkstimme kommt dann nie.
   Ohne Modell für die Sprache bleibt alles wie vor dem Plan. So hören Testgeräte mit guter Gerätestimme
   (iPad) trotzdem das Modell, und Hörtests sind auf allen Geräten möglich. Die Reihenfolge für
   die spätere Freigabe wird nach dem Hörtest entschieden.
3. **Eigener Phonemizer statt `piper-wasm`:**
   - Quelle ist eSpeak NG 1.51 aus dem Ubuntu-24.04-Quellpaket `espeak-ng_1.51+dfsg-12build1`
     (feste Version, Prüfsummen in der `.dsc`).
   - Werkzeug ist Emscripten `3.1.6~dfsg-7` aus Ubuntu 24.04.
   - Ein kleiner eigener C-Wrapper (`lr_phonemize`) ersetzt `piper-phonemize`.
   - Der Build enthält nur Deutsch und US-Englisch, ohne Klatt, speechPlayer, MBROLA und Sonic.
   - Ergebnis: drei Dateien, etwa 1,3 MB statt 18,8 MB.
4. **Lizenzpflichten:** Neben dem Binary liegen der GPL-Text, ein Hinweis auf die
   Drittkomponenten, das Build-Skript, die SHA-256-Prüfsummen und **das vollständige Quellpaket**
   (`.dsc`, `.orig.tar.gz`, `.debian.tar.xz`). Die Quelle ist am selben Ort abrufbar wie das
   Binary (GPL-3 Abschnitt 6 d). Der Wrapper steht unter GPL-3.0-or-later. Lernraum selbst lädt
   den Phonemizer nur als getrennte Datei in einem Worker.
5. **Laden erst bei Bedarf.** Die Dateien kommen nicht in den App-Vorabcache. Sie liegen in
   einem eigenen Cache, der App-Updates übersteht. Jede Datei wird vor dem Speichern gegen ihre
   SHA-256-Prüfsumme aus dem Manifest geprüft.
6. **Freigabe für alle** (`frei`) erst nach den Kriterien in Abschnitt 7.

## 3. Bausteine

### 3.1 Phonemizer-Build (`scripts/phonemizer/`)

- `build.sh`:
  - Lädt das Quellpaket direkt aus `archive.ubuntu.com/ubuntu/pool/main/e/espeak-ng/`. So
    braucht es keine `deb-src`-Einträge.
  - Prüft die drei Dateien gegen die eingecheckten SHA-256-Werte. Die `.dsc` hat
    `7d7e4f7606f1ddf3eb497a4848649eb72fc0acf70caccd9a61987f4d4444d688`, die übrigen Werte stehen
    in der `.dsc`.
  - Baut eSpeak NG einmal nativ, um die Sprachdaten zu übersetzen.
  - Baut eSpeak NG dann mit `emconfigure` als statische Bibliothek.
  - Linkt `phonemize.c` mit festen Emscripten-Optionen.
  - Schreibt nach `public/speech/phonemizer/`.
- `phonemize.c` stellt drei Funktionen bereit: `lr_init`, `lr_set_voice` und `lr_phonemize`.
  Letztere ruft `espeak_TextToPhonemes` mit IPA-Ausgabe auf und verbindet die Satzteile mit
  Leerzeichen.
- `public/speech/phonemizer/` enthält:
  - `lernraum-phonemizer.js`, `.wasm` und `.data`
  - `SHA256SUMS`, `LIZENZ-GPL-3.0.txt`, `HINWEISE.md`
  - `quellen/` mit dem Quellpaket
- CI: Ein Job in `quality.yml` baut den Phonemizer auf `ubuntu-24.04` neu und vergleicht die
  Prüfsummen. Weichen sie ab, schlägt der Job fehl.

### 3.2 Sprachmodell-Dateien (`public/speech/kitten/`) und Manifest

- Modell (`.onnx`) und Stimmen für Deutsch und Englisch stammen aus dem Prototyp. Ihre Herkunft
  (Hugging-Face-Repo und Revision) und Lizenz (Apache-2.0 laut Modellkarte) stehen in der
  eingecheckten Datei `src/speech/model/sources.json`.
- `scripts/generate-speech-assets.mjs` läuft in `predev` und `prebuild`, wie der Service Worker:
  - Kopiert die WASM-Datei von `onnxruntime-web` nach `public/speech/ort/<version>/`.
  - Schreibt `public/speech/manifest.json` mit Pfad, Größe und SHA-256 jeder Datei.
  - Beide Ergebnisse sind erzeugt und stehen in `.gitignore`, wie `public/sw.js`.
- Grenze: Cloudflare Workers liefern statische Dateien bis 25 MiB je Datei aus.
- **Fehlt das Manifest oder eine Sprache darin,** meldet die Engine diese Sprache als nicht
  verfügbar. Lernraum fällt dann wie heute auf die Gerätestimme zurück.

### 3.3 Engine im Browser (`src/speech/model/`)

Diese Teile sind rein und ohne Browserzugriff testbar:

- `symbols.ts` und `tokenize.ts`: die Symboltabelle von KittenTTS (178 Zeichen) und Lautschrift
  → Token-IDs mit `[0, …, 10, 0]`.
- `text.ts`:
  - Satzzeichen erhalten: Der Text wird an Satzzeichen geteilt, die Teile werden phonemisiert
    und wieder zusammengesetzt, wie bei `phonemizer` mit `preserve_punctuation`.
  - Satzweise in Stücke teilen (höchstens 400 Zeichen) und ein Satzende ergänzen.
  - Sprachwechsel-Marken von eSpeak wie `(en)` entfernen.
- `manifest.ts`: das Manifest mit zod prüfen und die Dateien zu einer Sprache finden.
- `route.ts`: wählt `model`, `system` oder `none` aus Freigabe, Modellverfügbarkeit und lokaler
  Gerätestimme.

Diese Teile laufen im Browser:

- `assets.ts`:
  - Lädt die Dateien in den Cache `sprachmodell-v1`. Der Name beginnt bewusst nicht mit
    `lernraum-`, weil der Service Worker diese Caches bei jedem Update löscht.
  - Prüft SHA-256 mit `crypto.subtle` und gibt `ArrayBuffer` zurück.
  - Holt das Manifest zuerst aus dem Netz, mit 3 s Zeitlimit (schlechtes Schul-WLAN, siehe
    B-013), sonst aus dem Cache.
  - Löscht Einträge, die nicht mehr im Manifest stehen.
- `kitten.worker.ts`:
  - ONNX Runtime Web (`onnxruntime-web/wasm`, festgepinnt) und der Phonemizer laufen im Worker.
  - ONNX Runtime läuft mit `numThreads = 1`. Lernraum ist nicht `crossOriginIsolated`, also
    gibt es keinen `SharedArrayBuffer`.
  - Der Phonemizer-Code wird aus den Cache-Bytes als `blob:`-URL importiert. `wasmBinary` und
    das Datenpaket (`getPreloadedPackage`) kommen ebenfalls aus dem Cache, ohne Netzabruf.
    Der GPL-Code wird so nicht in Lernraums Bundle eingebaut.
  - Es ist immer nur das Modell einer Sprache geladen. Beim Sprachwechsel wird die vorige
    Sitzung freigegeben, denn der Speicher auf dem iPad ist knapp.
  - Nachrichten: `load(lang)`, `synthesize(id, text, lang, voice, speed)` → `Float32Array`
    (24 kHz).
- `player.ts`: spielt das Audio über einen gemeinsamen `AudioContext` ab. Der wird beim ersten
  Tippen freigeschaltet, was iOS verlangt. `stop()` beendet die Wiedergabe sofort.
- `model-speaker.ts`: `prepareModel(lang)`, `speakWithModel(text, lang)` und `stopModel()`.
  Ein Zwischenspeicher nach Text, Sprache und Stimme verhindert doppelte Erzeugung.

### 3.4 Anbindung in `src/speech/speaker.ts`

- `speak()`, `prepareSpeech()`, `hasVoiceFor()` und `hasLocalVoiceFor()` bekommen die Option
  `model: true`. Die Aufrufer geben sie nur mit sichtbarer Vorschau mit
  (`useAreaVisible("sprachmodell")`). Ohne Vorschau sind die Aufrufe dieselben wie vorher.
- Mit `model: true` lädt `speak()` zuerst das Manifest. Gibt es ein Modell für die Sprache,
  spricht das Modell. Fällt es aus, übernimmt eine lokale Gerätestimme. Gibt es kein Modell,
  geht der Aufruf unverändert an das bisherige `speak()`.
- Mit Modell für die Sprache melden `hasVoiceFor()` und `hasLocalVoiceFor()` eine Stimme. Stufe 6
  und der Knopf erscheinen dann auch ohne Gerätestimme.
- `prepareSpeech()` gibt den `AudioContext` **synchron** frei, also vor dem ersten `await`,
  noch in der Nutzergeste. Für das Modell gilt ein eigenes Zeitlimit von 30 s, weil das erste
  Laden dauert. Solange zeigt „Starten“ den vorhandenen Ladezustand. Bei Zeitüberschreitung
  oder Fehler übernimmt nur eine lokale Gerätestimme, sonst gilt wie heute „no-voice“.
- Sobald eine Ansicht mit Vorlesen öffnet, lädt `preloadModelSpeech(lang)` das Manifest und im
  Hintergrund das Modell. Das Laden braucht keine Nutzergeste.
- Wirkung in der Vorschau mit Modell: Stufe 6 nutzt keine Netzwerkstimmen mehr, B-012 gilt
  dort dann ebenfalls.
- Angebunden sind Stufe 6 (`useSpeech`), `ReadAloudButton` sowie, nur in der Vorschau, LernBox,
  Live-Spiel und Stationsspiel.
- Der Knopf zeigt während des ersten Ladens wie bisher „Stopp“. Ein Klick bricht also auch das
  Laden ab. Eine eigene Anzeige „Lädt …“ folgt, sobald der Knopf wieder eingebaut ist.

### 3.5 Service Worker

- Der Fetch-Handler lässt `/speech/` unangetastet. Diese Dateien verwaltet `assets.ts` selbst.

### 3.6 Hinweis in der App

- Das Impressum bekommt einen Abschnitt „Software für das Vorlesen“ mit Verweisen auf
  `public/speech/phonemizer/HINWEISE.md`, den GPL-Text und die Quellen.
- `HINWEISE.md` nennt alle Lizenzen im Quellpaket:
  - GPL-3.0-or-later (eSpeak NG)
  - Apache-2.0, BSD-2-Clause und Unicode (`COPYING.*` im Quellpaket)
  - MIT (Emscripten-Laufzeit, ONNX Runtime Web)
  - Apache-2.0 (KittenTTS: Modelle und die übernommene Symboltabelle)

## 4. Abhängigkeiten

- `onnxruntime-web` wird festgepinnt (MIT, Microsoft, aktiv gewartet) und **nur im Worker**
  geladen. So bleibt das Haupt-Bundle unverändert.
- Begründung nach `docs/engineering-quality.md`: Es gibt keine Alternative, ein ONNX-Modell im
  Browser auszuführen.

## 5. Tests

- **Unit:**
  - Tokenizer: bekannte IPA-Zeichen, unbekannte Zeichen fallen weg, Rand-Token.
  - `text.ts`: Satzzeichen bleiben, Stücke, `(en)`-Marken.
  - Manifest: gültig, ungültig, fehlende Sprache.
  - `route.ts`: Vorschau an und aus, Modell da und nicht da, lokale Stimme da und nicht da.
  - `assets.ts`: Prüfsumme ok, falsch, Cache-Treffer.
  - `speaker.ts`: Modellweg, Rückfall auf die Gerätestimme, `stopSpeaking` stoppt beides.
- **Phonemizer:** ein Node-Test über eine Node-Variante des Builds im CI-Job. Erwartete
  Lautschrift für einige Wörter, z. B. „Straße“ → `ʃtɾˈɑːsə`.
- **Browser:** `e2e/sprachmodell.spec.ts` mit einem winzigen Test-Modell aus
  `e2e/speech-fixtures/`. Es gibt die Token-IDs als „Audio“ zurück. Der Test prüft Stufe 6 ohne
  Gerätestimme über die ganze Kette: Manifest, Cache mit Prüfsumme, eSpeak NG, Tokenizer,
  Stilzeile, ONNX Runtime im Worker und Wiedergabe. Mit den echten Modelldateien kommt ein
  Hörtest dazu, kein automatischer Test.
- **Service Worker:** `tests/rendered-html.test.mjs` prüft, dass `/speech/` ausgenommen ist.

## 6. Reihenfolge

1. Plan, Entscheidungseintrag, Freigabebereich `sprachmodell`.
2. Phonemizer-Build mit Quellen und Hinweisen (3.1).
3. Reine Engine-Teile mit Tests (3.3, rein).
4. Worker, Laden, Wiedergabe, Anbindung (3.3 Browser, 3.4, 3.5).
5. Impressum-Hinweis (3.6), Doku.
6. **Braucht Material der Lehrkraft:** Modell- und Stimmdateien eintragen (3.2), Browser-Test
   mit echter Inferenz.

## 7. Freigabekriterien (Vorschau → frei)

1. Lizenzklärung für diese Einbindung abgeschlossen (Phonemizer GPL-3, Modelle Apache-2.0).
2. Hörtest mit echten Wortlisten aus LernBox und Laufdiktat: Komposita, Umlaute, ß/ss,
   Dehnungs-h, gleich klingende Wörter, Namen. Fehlerliste mit Entscheidung je Fall.
3. Ausdrücklicher Offline-Test auf dem iPad: einmal laden, Flugmodus, neu öffnen, vorlesen.
4. Gemessen auf dem ältesten Schulgerät: Zeit bis zum ersten Ton (kalt und warm), Speicher,
   Ladezeit im Schul-WLAN.
5. Entscheidung über die Reihenfolge Modell oder Gerätestimme für alle.

## 8. Nicht Teil dieses Plans

- LernBox, Live- und Stationsspiel **ohne Vorschau** auf `speak()` umstellen (offener Schritt
  3.3 aus `docs/umsetzungsplan-vorlesen.md`). Erst danach gilt B-012 überall.
- Auswahl der Modellstimme in den Einstellungen.
- Weitere Sprachen.

## 9. Prüfung des Plans (23.11.2026)

Geprüft gegen den Code, `AGENTS.md`, das Entscheidungsprotokoll und einen Probebau. Die Befunde
sind oben eingearbeitet.

| Nr. | Befund                                                                                                               | Folge im Plan                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| P1  | Der Service Worker löscht bei jedem Update alle Caches, deren Name mit `lernraum-` beginnt.                          | Cache `sprachmodell-v1`, `/speech/` im Fetch-Handler ausgenommen. |
| P2  | `AGENTS.md`: Erzeugte Dateien in `public/` werden nicht eingecheckt.                                                 | Manifest und ONNX-WASM entstehen in `prebuild` (3.2).             |
| P3  | `prepareSpeech` wartet höchstens 3 s, das erste Laden des Modells dauert länger.                                     | Eigenes Zeitlimit, Vorladen, Rückfall (3.4).                      |
| P4  | iOS gibt Ton nur in der Nutzergeste frei.                                                                            | `AudioContext` wird synchron vor dem ersten `await` freigegeben.  |
| P5  | `apt-get source` braucht `deb-src`, das auf CI-Läufern fehlt.                                                        | Direkter Abruf aus `pool/main` mit SHA-256 (3.1).                 |
| P6  | Ohne `crossOriginIsolated` gibt es keine Threads in ONNX Runtime.                                                    | `numThreads = 1`, Messung in 7.4.                                 |
| P7  | Zwei Modelle gleichzeitig belasten den Speicher auf dem iPad.                                                        | Nur eine Sprache geladen (3.3).                                   |
| P8  | Das Quellpaket enthält neben GPL-3 weitere Lizenzen (`COPYING.APACHE`, `COPYING.BSD2`, `COPYING.UCD`).               | Vollständige Liste in `HINWEISE.md` (3.6).                        |
| P9  | `AGENTS.md`: Eine zurückgenommene Festlegung braucht einen Eintrag mit „Zurückgenommen“ und „Nicht wieder einbauen“. | Entscheidung 60.                                                  |
| P10 | Das Manifest muss offline verfügbar sein, bei schlechtem WLAN darf es nicht hängen (B-013).                          | Netz zuerst mit 3 s Zeitlimit, dann Cache (3.3).                  |

**Probebau (Machbarkeit):** eSpeak NG 1.51 und Emscripten 3.1.6 aus Ubuntu 24.04, Wrapper
`lr_phonemize`, nur `de` und `en-US`. Ergebnis: `.js` 75 KB, `.wasm` 311 KB, `.data` 905 KB.
Die Ausgabe gleicht der nativen eSpeak-Ausgabe, zum Beispiel:

- „Die Straße, das Fahrrad und der Schmetterling!“ → `diː ʃtɾˈɑːsə das fˈɑːrɑːt ʊnt dɛɾ ʃmˈɛtɜlˌɪŋ`
- „12 Äpfel“ → `tsvˈœlf ˈɛpfəl`
- „Hello, how are you?“ (en-us) → `həlˈoʊ hˈaʊ ɑːɹ juː`

**Bekannte Abweichung zum Prototyp:** Der Prototyp nutzt die eSpeak-Fassung von rhasspy über
`piper-phonemize`. Hier läuft das offizielle eSpeak NG 1.51. Einzelne Lautschriften können sich
unterscheiden. Der Hörtest (7.2) deckt das ab.

**Befunde aus der Umsetzung:**

| Nr. | Befund                                                                                                                      | Folge                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| P11 | `onnxruntime-web/wasm` verweist statisch auf die 15-MB-WASM. Vite kopierte sie zusätzlich in Client- und Server-Bundle.     | Alias auf die Variante ohne Verweise (`ort.wasm.min.mjs`) in `vite.config.ts`. |
| P12 | Der Dev-Server entdeckte ONNX Runtime erst beim ersten Worker und lud die Seite neu.                                        | `optimizeDeps.include` in `vite.config.ts`.                                    |
| P13 | Im Dev-Modus ist die Vorschau immer an, also auch in allen Browser-Tests.                                                   | Ohne Modell für die Sprache bleibt alles wie vorher (2.2, 3.4).                |
| P14 | `ReadAloudButton` ist derzeit nirgends eingebaut. Die eigentlichen Vorlese-Stellen sind LernBox, Live- und Stationsspiel.   | Diese drei bekommen den Weg über das Modell nur in der Vorschau (3.4).         |
| P15 | `file_packager` von Emscripten liest Ordner ungeordnet (`os.walk`). Auf dem CI-Runner entstand dadurch eine andere `.data`. | Jede Datei einzeln in fester Reihenfolge; ext4 und tmpfs geprüft.              |

**Offen und blockiert:** Die Modell- und Stimmdateien (3.2) liegen nur im Prototyp. Ohne sie
meldet die Engine „nicht verfügbar“, und das Vorlesen bleibt wie heute.
