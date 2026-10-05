# Lernraum – Logo-Richtlinien

Kurzfassung für alle, die das Logo verwenden. Die Dateien liegen in `public/brand/`, eine Bildschirm-Übersicht mit Beispielen steht in `docs/brand/praesentation.html`.

## 1. Das Logo

**Idee:** Ein L aus Bausteinen. Oben sitzt eine Sprechblase mit drei Punkten, darunter folgen Quadrat, Viertel und Bogen. Lernen heißt miteinander sprechen: Austausch, Diktat, Gespräch zwischen Lehrkraft und Schülern. Die unterschiedlichen Formen machen das L eigenständig.

| Version      | Datei                 | Einsatz                                                  |
| ------------ | --------------------- | -------------------------------------------------------- |
| Quer         | `logo-horizontal.svg` | Standard: Kopfzeilen, Dokumente, Präsentationen          |
| Gestapelt    | `logo-stacked.svg`    | Hochformat, Titelseiten, Schilder                        |
| Symbol       | `symbol.svg`          | Profilbilder, Sticker, wenn der Name schon im Text steht |
| Symbol klein | `symbol-small.svg`    | Unter 32 px, ohne Punkte in der Blase                    |
| Wortmarke    | `wordmark.svg`        | Wenn das Symbol schon in der Nähe steht                  |

Jede Version gibt es in vier Ausführungen. Der Suffix steht im Dateinamen:

- ohne Suffix: Vollfarbe, für hellen Grund
- `-reversed`: für dunklen Grund (`#211f1b`), die Blase und die Schrift sind hell
- `-black`: einfarbig schwarz, zum Beispiel für Stempel oder Fax
- `-white`: einfarbig weiß, zum Beispiel auf Fotos oder Farbflächen

## 2. Freiraum

Rund um das Logo bleibt auf allen Seiten mindestens **die Breite eines Bausteins** frei, das ist etwa ein Viertel der Symbolhöhe. Der Freiraum wächst und schrumpft mit dem Logo und ist keine feste Pixelgröße.

## 3. Mindestgröße

| Version      | Bildschirm   | Druck       |
| ------------ | ------------ | ----------- |
| Quer         | 120 px breit | 30 mm breit |
| Gestapelt    | 80 px breit  | 20 mm breit |
| Symbol       | 32 px hoch   | 8 mm hoch   |
| Symbol klein | 16 px hoch   | 5 mm hoch   |

Unter 32 px immer `symbol-small.svg` verwenden. Die drei Punkte in der Blase sind dort nicht mehr erkennbar.

## 4. Farben

| Name   | HEX       | RGB             | CMYK (rechnerisch) | Verwendung                                 |
| ------ | --------- | --------------- | ------------------ | ------------------------------------------ |
| Tinte  | `#211f1b` | 33 / 31 / 27    | 0 / 6 / 18 / 87    | Blase, Schrift, dunkler Grund              |
| Gold   | `#e0a526` | 224 / 165 / 38  | 0 / 26 / 83 / 12   | Quadrat                                    |
| Korall | `#d9654a` | 217 / 101 / 74  | 0 / 53 / 66 / 15   | Viertel                                    |
| Grün   | `#4f9a7e` | 79 / 154 / 126  | 49 / 0 / 18 / 40   | Bogen                                      |
| Creme  | `#f7f4ee` | 247 / 244 / 238 | 0 / 1 / 4 / 3      | Heller Grund, Blase und Schrift auf Dunkel |

Die CMYK-Werte sind aus RGB umgerechnet und nicht farbverbindlich. Für Druck sollten sie mit der Druckerei abgestimmt werden. Pantone-Werte wurden nicht festgelegt.

**Freigegebene Kombinationen:**

- Vollfarbe auf Weiß oder Creme
- `-reversed` auf Tinte (`#211f1b`)
- `-black` auf Weiß oder Creme
- `-white` auf Tinte, auf Farbflächen oder auf ruhigen Bereichen eines Fotos

Auf unruhigen Fotos das Logo in eine ruhige Fläche setzen, zum Beispiel in eine Tinte-Kachel.

Gold auf Weiß hat nur ein Kontrastverhältnis von 2,2 : 1. Das reicht für ein Bildzeichen, aber nicht für Text. Text nie in den Logofarben auf hellem Grund setzen.

## 5. Schrift

Die Wortmarke ist aus **Fredoka SemiBold** gezeichnet und als Pfade umgewandelt. Fredoka steht unter der SIL Open Font License und darf für Logos genutzt werden. Die Plattform setzt Fredoka bereits für Überschriften ein (`@fontsource-variable/fredoka`). Die Wortmarke wird nie neu getippt, sondern immer aus der Datei verwendet.

## 6. App-Icons und Favicon

Das Favicon und die App-Icons nutzen das Symbol ohne Punkte, mit heller Blase auf Tinte.

| Datei                                            | Verwendung                                       |
| ------------------------------------------------ | ------------------------------------------------ |
| `public/favicon.svg`                             | Favicon für moderne Browser                      |
| `public/favicon.ico`                             | Favicon mit 16, 32 und 48 px                     |
| `public/icon-180.png`                            | iOS-Homescreen (180 px)                          |
| `public/icon-192.png`, `icon-512.png`            | Web-App-Manifest (`public/manifest.webmanifest`) |
| `public/icon-maskable-512.png`                   | Maskable-Icon für Android                        |
| `public/brand/app-icon.svg`, `icon-maskable.svg` | Quellen der Icons                                |

Die Einbindung steht in `app/layout.tsx` (Metadaten) und `public/manifest.webmanifest`.

## 7. Bitte nicht

- Das Logo dehnen, stauchen, drehen oder verzerren
- Farben außerhalb der Palette verwenden
- Schatten, Konturen, Verläufe oder Effekte hinzufügen
- Die Teile eines Lockups neu anordnen oder in der Größe verändern
- Die Wortmarke neu tippen
- Das Logo auf unruhigen Hintergründen ohne Kachel platzieren
- Die Punkte in der Blase unter 32 px erzwingen (dafür `symbol-small.svg` nehmen)

## 8. Technische Hinweise

- Alle Logos sind reine Pfade: kein Text, keine Rasterbilder, keine Filter. Die Dateien sind klein und skalieren ohne Verlust.
- Die Sprechblase ist um 8° gekippt. Die zwei leicht schiefen Kanten an der Spitze (etwa 122° und 73°) sind die Folge davon und gewollt.
- Es wurde keine Markenrecherche durchgeführt. Vor einer Anmeldung als Marke ist eine Recherche in den Markenregistern und per Rückwärts-Bildersuche nötig.
- Die Dateien werden mit `docs/brand/tools/build_brand.py` erzeugt (Icons mit `raster_icons.py`). Änderungen bitte am Symbol dort machen und alle Varianten neu erzeugen, nicht von Hand an einzelnen Dateien.

## 9. Logo in der App

Die Komponenten in `app/ui/brand.tsx` wählen die Variante nach der Höhe:

- ab 32 px Höhe: mit Punkten (`mark.svg`, `logo-horizontal.svg`)
- unter 32 px: ohne Punkte (`symbol-small.svg`, `logo-horizontal-small.svg`)
- auf dunklem Grund (`onDark`): jeweils die Datei mit `-reversed`

`mark.svg` und `mark-reversed.svg` sind das Symbol eng zugeschnitten, im Unterschied zu `symbol.svg`, das für Icons und Profilbilder auf ein Quadrat zentriert ist.

| Stelle                       | Komponente    | Höhe               |
| ---------------------------- | ------------- | ------------------ |
| Schüler-Seitenleiste         | `BrandSymbol` | 40 px, mit Punkten |
| Schüler-Kopfzeile am Handy   | `BrandSymbol` | 26 px, ohne Punkte |
| Startbildschirm              | `BrandLogo`   | 28 px, ohne Punkte |
| Lehrer-Leiste und -Schublade | `BrandSymbol` | 26 px, ohne Punkte |
