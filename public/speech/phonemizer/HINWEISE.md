# Lernraum-Phonemizer: Herkunft und Lizenzen

Der Phonemizer wandelt Text auf dem Gerät in Lautschrift (IPA) um. Daraus erzeugt das Sprachmodell
KittenTTS den Ton. Der Phonemizer selbst erzeugt keinen Ton und sendet nichts ins Netz.

## Dateien

| Datei                      | Inhalt                                                                  |
| -------------------------- | ----------------------------------------------------------------------- |
| `lernraum-phonemizer.js`   | Lade-Code (Emscripten)                                                  |
| `lernraum-phonemizer.wasm` | eSpeak NG 1.51 und `phonemize.c`, übersetzt zu WebAssembly              |
| `lernraum-phonemizer.data` | Sprachdaten von eSpeak NG, nur Deutsch (`de`) und US-Englisch (`en-US`) |
| `SHA256SUMS`               | Prüfsummen dieser drei Dateien                                          |
| `LIZENZ-GPL-3.0.txt`       | GNU General Public License, Version 3                                   |
| `quellen/`                 | vollständige Quellen und Build-Skript (siehe unten)                     |

## Lizenzen

- **eSpeak NG** (Programm und Sprachdaten): GNU General Public License, Version 3 oder später
  (`LIZENZ-GPL-3.0.txt`). Copyright der eSpeak-NG-Mitwirkenden, siehe Quellpaket.
- Einzelne Teile des eSpeak-NG-Quellpakets stehen zusätzlich unter Apache-2.0
  (`quellen/COPYING.APACHE`), BSD-2-Clause (`quellen/COPYING.BSD2`) und der Unicode-Lizenz
  (`quellen/COPYING.UCD`).
- **`phonemize.c`** (Lernraum): GPL-3.0-or-later, weil es mit eSpeak NG gelinkt ist.
- **Emscripten-Laufzeit** im Lade-Code: MIT/University of Illinois NCSA.

Diese Software wird ohne Gewährleistung bereitgestellt, siehe Abschnitt 15 und 16 der GPL.

## Weitere Komponenten des Vorlesens (nicht in diesem Ordner)

- **ONNX Runtime Web 1.31.1** (`/speech/ort/`, und Teile im Sprachmodell-Worker): MIT,
  Copyright Microsoft Corporation. Das WASM enthält Drittkomponenten, die ONNX Runtime in seiner
  Datei `ThirdPartyNotices.txt` (Version 1.31.1) aufführt.
- **KittenTTS** (Modelle unter `/speech/kitten/`, Symboltabelle in
  `src/speech/model/symbols.ts`): Apache-2.0, Copyright KittenML / Stellon Labs. Herkunft und
  Revision jedes Modells stehen in `src/speech/model/sources.json`.

## Quellen (Corresponding Source)

`quellen/` enthält alles, was für einen Neubau nötig ist:

- das Ubuntu-24.04-Quellpaket `espeak-ng_1.51+dfsg-12build1` (`.dsc`, `.orig.tar.gz`,
  `.debian.tar.xz`), Herkunft `http://archive.ubuntu.com/ubuntu/pool/main/e/espeak-ng/`
- `sources.sha256` mit den Prüfsummen dieser Quelldateien
- `phonemize.c`, `build.sh` und `check.mjs`

Neubau auf Ubuntu 24.04 mit Emscripten `3.1.6~dfsg-7`:

```bash
sudo apt-get install -y emscripten=3.1.6~dfsg-7 build-essential autoconf automake libtool pkg-config dpkg-dev curl
```

```bash
bash quellen/build.sh ./neu
```

Der Build ist reproduzierbar: `./neu/SHA256SUMS` stimmt mit `SHA256SUMS` überein. Das Build-Skript
im Repository liegt unter `scripts/phonemizer/build.sh`.
