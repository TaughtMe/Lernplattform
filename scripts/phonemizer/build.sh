#!/usr/bin/env bash
# Baut den Lernraum-Phonemizer (eSpeak NG → WebAssembly, nur Deutsch und
# US-Englisch) aus festgelegten Quellen. Plan: docs/umsetzungsplan-sprachmodell.md, 3.1.
#
# Voraussetzung (Ubuntu 24.04):
#   sudo apt-get install -y emscripten=3.1.6~dfsg-7 build-essential autoconf \
#     automake libtool pkg-config dpkg-dev curl
#
# Aufruf: scripts/phonemizer/build.sh [Zielordner]
# Ohne Zielordner schreibt es nach public/speech/phonemizer/.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd "$here/../.." && pwd)"
out="${1:-$root/public/speech/phonemizer}"
pool="http://archive.ubuntu.com/ubuntu/pool/main/e/espeak-ng"
emscripten_version="3.1.6"

# Gleiche Eingaben, gleiche Ausgabe: feste Zeit, Sprache und Arbeitsordner.
export SOURCE_DATE_EPOCH=1651276800
export LC_ALL=C TZ=UTC
# Der Arbeitsordner ist fest; LERNRAUM_PHONEMIZER_WORK nur zum Gegenprüfen
# auf einem anderen Dateisystem.
work="${LERNRAUM_PHONEMIZER_WORK:-/tmp/lernraum-phonemizer-build}"
rm -rf "$work"
mkdir -p "$work/quellen"
trap 'rm -rf "$work"' EXIT

if ! emcc --version | head -n 1 | grep -q " $emscripten_version "; then
  echo "Emscripten $emscripten_version wird gebraucht:" >&2
  emcc --version | head -n 1 >&2
  exit 1
fi

echo "== Quellen laden und prüfen"
while read -r _ file; do
  curl -fsSL --retry 3 -o "$work/quellen/$file" "$pool/$file"
done < "$here/sources.sha256"
(cd "$work/quellen" && sha256sum --check --strict "$here/sources.sha256")
dpkg-source --no-check -x "$work/quellen/espeak-ng_1.51+dfsg-12build1.dsc" \
  "$work/src" > /dev/null

configure_flags=(
  --without-mbrola --without-sonic --without-pcaudiolib --without-async
  --with-speechplayer=no --without-klatt
  --with-extdict-ru=no --with-extdict-cmn=no --with-extdict-yue=no
)

echo "== eSpeak NG nativ bauen (übersetzt die Sprachdaten)"
cp -a "$work/src" "$work/native"
(
  cd "$work/native"
  ./autogen.sh > /dev/null 2>&1
  ./configure "${configure_flags[@]}" > /dev/null
  make -j"$(nproc)" src/espeak-ng phsource/phonemes.stamp > /dev/null 2>&1
  make espeak-ng-data/de_dict espeak-ng-data/en_dict > /dev/null 2>&1
)

echo "== eSpeak NG für WebAssembly bauen"
cp -a "$work/src" "$work/wasm"
(
  cd "$work/wasm"
  ./autogen.sh > /dev/null 2>&1
  emconfigure ./configure --host=wasm32 --disable-shared --enable-static \
    "${configure_flags[@]}" > /dev/null 2>&1
  emmake make -j"$(nproc)" src/libespeak-ng.la > /dev/null 2>&1
)

echo "== Sprachdaten auswählen (de, en-US)"
# Feste Reihenfolge: file_packager liest Ordner ungeordnet (os.walk), die
# Reihenfolge hinge sonst vom Dateisystem ab. Darum jede Datei einzeln.
data_files=(
  de_dict en_dict intonations phondata phondata-manifest phonindex phontab
  lang/gmw/de lang/gmw/en-US
)
data="$work/data/espeak-ng-data"
mkdir -p "$data/lang/gmw"
preload=()
embed=()
for file in "${data_files[@]}"; do
  cp "$work/native/espeak-ng-data/$file" "$data/$file"
  preload+=(--preload-file "data/espeak-ng-data/$file@/espeak-ng-data/$file")
  embed+=(--embed-file "data/espeak-ng-data/$file@/espeak-ng-data/$file")
done
find "$work/data" -exec touch -h -d "@$SOURCE_DATE_EPOCH" {} +

common=(
  -O3 "$here/phonemize.c" "$work/wasm/src/.libs/libespeak-ng.a"
  -I"$work/wasm/src/include"
  -s MODULARIZE=1 -s EXPORT_NAME=createPhonemizer -s ALLOW_MEMORY_GROWTH=1
  -s "EXPORTED_FUNCTIONS=[_lr_init,_lr_set_voice,_lr_phonemize]"
  -s "EXPORTED_RUNTIME_METHODS=[ccall]"
)

echo "== Phonemizer linken"
mkdir -p "$work/web" "$work/node"
(
  cd "$work"
  emcc "${common[@]}" -s EXPORT_ES6=1 -s ENVIRONMENT=web,worker \
    "${preload[@]}" \
    -o web/lernraum-phonemizer.js 2> /dev/null
  emcc "${common[@]}" -s ENVIRONMENT=node \
    "${embed[@]}" -o node/p.cjs 2> /dev/null
)

# Emscripten schreibt eine zufällige package_uuid in den Lade-Code. Sie wird
# durch einen Wert aus der Prüfsumme der Daten ersetzt, damit jeder Build
# dieselben Bytes liefert.
data_hash="$(sha256sum "$work/web/lernraum-phonemizer.data" | cut -c1-32)"
uuid="${data_hash:0:8}-${data_hash:8:4}-${data_hash:12:4}-${data_hash:16:4}-${data_hash:20:12}"
sed -i -E "s/\"package_uuid\":\"[0-9a-f-]{36}\"/\"package_uuid\":\"$uuid\"/" \
  "$work/web/lernraum-phonemizer.js"
grep -q "\"package_uuid\":\"$uuid\"" "$work/web/lernraum-phonemizer.js"

echo "== Lautschrift prüfen"
node "$here/check.mjs" "$work/node/p.cjs"

echo "== Ergebnis schreiben nach $out"
mkdir -p "$out/quellen"
cp "$work/web/lernraum-phonemizer.js" "$work/web/lernraum-phonemizer.wasm" \
  "$work/web/lernraum-phonemizer.data" "$out/"
cp "$work/quellen/"* "$out/quellen/"
cp "$here/build.sh" "$here/phonemize.c" "$here/check.mjs" \
  "$here/sources.sha256" "$out/quellen/"
cp "$work/src/COPYING" "$out/LIZENZ-GPL-3.0.txt"
for file in COPYING.APACHE COPYING.BSD2 COPYING.UCD; do
  cp "$work/src/$file" "$out/quellen/$file"
done
(
  cd "$out"
  sha256sum lernraum-phonemizer.js lernraum-phonemizer.wasm \
    lernraum-phonemizer.data > SHA256SUMS
  cat SHA256SUMS
)
