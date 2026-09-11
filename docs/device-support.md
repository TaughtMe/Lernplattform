# Geräte- und Browserstrategie

Lernraum wird mobile-first entwickelt. Mobil- und Tablet-Nutzung ist keine spätere Anpassung, sondern Teil der Definition of Done jeder Funktion.

## Verbindliche Grundregeln

- Jede neue Ansicht funktioniert ab 320 CSS-Pixel Breite ohne horizontales Scrollen.
- Bedienflächen sind mindestens 44 × 44 CSS-Pixel groß; auf Touch-Geräten werden 48 Pixel angestrebt.
- Die Hauptnavigation bleibt auf Smartphones und Tablets erreichbar.
- Eingabefelder verwenden mindestens 16 Pixel Schriftgröße, damit mobile Browser nicht unerwartet hineinzoomen.
- Safe Areas von Geräten mit Aussparungen oder Home-Indikator werden berücksichtigt.
- Hoch- und Querformat sowie dynamische Browserleisten dürfen keine zentralen Aktionen verdecken.
- Hover ist niemals Voraussetzung für Bedienung oder Information.
- Tastatur, Touch, Maus, Zoom bis 200 Prozent und reduzierte Bewegung werden berücksichtigt.
- PWA- und Offline-Funktionen erhalten eine verständliche Web-Fallback-Erfahrung.

## Testmatrix für jede größere Ausbaustufe

| Klasse                     |  Zielgrößen | Primäre Umgebung               |
| -------------------------- | ----------: | ------------------------------ |
| Kleines Smartphone         |  320–390 px | iOS Safari, Android Chrome     |
| Großes Smartphone          |  390–480 px | iOS Safari, Android Chrome     |
| Kleines Tablet             |  600–820 px | iPadOS Safari, Android Chrome  |
| Großes Tablet / Chromebook | 820–1180 px | iPadOS Safari, ChromeOS Chrome |
| Notebook / Desktop         |  ab 1180 px | Chrome, Edge, Firefox, Safari  |

Die Breiten sind CSS-Pixel und keine bestimmten Gerätemodelle. Zusätzlich werden mindestens Hochformat, Querformat, Bildschirmtastatur und langsame beziehungsweise zeitweise fehlende Verbindung geprüft.

## Definition of Done für neue Funktionen

Eine Funktion gilt erst dann als fertig, wenn Layout, Navigation, Fokusreihenfolge, Touch-Ziele, Bildschirmtastatur und Offline-Verhalten für die betroffenen Geräteklassen festgelegt und geprüft wurden. Automatisierte Tests decken stabile Strukturregeln ab; echte Browser- und Gerätetests bleiben für größere Meilensteine verpflichtend.
