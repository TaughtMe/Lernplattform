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

## Gerätelokale Einstellung: Spiegelschrift im Lesetext

Das Kind schaltet in „Profil und Einstellungen“ → „Darstellung“ selbst, ob der Lesetext der Textbox (Ansicht „Einprägen“) gespiegelt erscheint. Die Einstellung liegt nur im `localStorage` dieses Geräts (`lernraum-spiegelschrift-bis`), gilt 7 Tage und schaltet sich danach selbst aus. Sie geht nicht in Cloud-Abgleich, Sicherungsdatei, Klassen- oder Lehrkraftansichten. Der Bereich `spiegelschrift` steht im Freigaberegister auf `vorschau`.

## Speicherlebensdauer

Der gesamte Lernstand liegt nur auf dem Gerät (IndexedDB). Was das für die Lebensdauer heißt, besonders auf iPad und iPhone:

- **7-Tage-Regel von Safari:** WebKit löscht Daten einer Website, wenn sie sieben Tage mit Safari-Nutzung nicht besucht wurde. Gezählt werden Tage, an denen Safari benutzt wird, ohne dass die Seite geöffnet wird, keine Kalendertage. Ein iPad, das in den Ferien ungenutzt liegt, zählt nichts. Riskant sind vor allem Geräte, die andere in Safari nutzen, während Lernraum eine Woche ausgesetzt wird.
- **Home-Bildschirm-App:** Eine zum Home-Bildschirm hinzugefügte Web-App hat einen eigenen Zähler und laut Apple keine Löschung von Erstanbieterdaten nach dieser Regel.
- **Eigener Speicher je App:** Die App auf dem Home-Bildschirm und der Browser teilen sich keinen Speicher. Wer erst im Browser lernt und dann installiert, startet in der App leer. Darum empfiehlt die Lernen-Startseite auf iPad und iPhone im Browser, vor dem ersten Lernen zu installieren; „Trotzdem im Browser lernen“ merkt sich die Entscheidung in `localStorage` (nur diese, nie den Lernstand). Mit vorhandenem Lernstand steht in den Einstellungen nur ein dezenter Hinweis.
- **`navigator.storage.persist()`:** Nach dem ersten Lernen bittet die Startseite still um dauerhaften Speicher. Das ist ein Zusatz ohne Erfolgsversprechen; wie es unter iOS mit der 7-Tage-Regel zusammenwirkt, ist nicht dokumentiert. Die Oberfläche meldet kein Ergebnis.
- **Gelöscht oder neu?** Ein geleertes und ein neues Gerät sind lokal nicht zu unterscheiden. Darum bietet die Lernen-Startseite auf einem Gerät ohne Lernstand immer „Ich habe schon gelernt – Sicherung einspielen“ an. Der Knopf führt zum vorhandenen Einspielen in den Einstellungen (`restorePersonalLearningBackup`).
- **Sicherung:** Die Sicherungsdatei ist die einzige Zweitkopie des Lernstands. Wer von Browser zur App wechselt, nimmt den Lernstand ebenfalls über eine Sicherung mit.
