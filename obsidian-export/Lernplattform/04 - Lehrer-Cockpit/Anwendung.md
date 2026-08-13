# Lehrer-Cockpit

## Zweck

Das Lehrer-Cockpit bündelt Planung, Durchführung und datensparsame Auswertung des Unterrichts.

## Funktionen

- Vokabeln, Lerninhalte und Stapel verwalten
- Inhalte importieren und korrigieren
- Räume und Laufdiktate starten
- Lernhilfen konfigurieren
- Gruppen und Häuser verwalten
- Live-Fortschritt visualisieren
- QR-Statistiken einlesen
- individuelle Schüler-QR-Codes für die Einschreibung erzeugen
- QR-Abgaberunden mit Fortschritt „abgegeben / ausstehend“ verwalten
- Scanergebnisse akustisch, haptisch und visuell bestätigen
- Inhalte freigeben und versionieren
- pro Klasse Module wie Vokabeln, Deutsch, Kopfrechnen und Tipptraining aktivieren und deaktivieren
- bei Bedarf klar definierte, modulspezifische Trainingspakete freischalten
- lokale Namens- oder Aliaszuordnungen verwalten
- gespeicherte Daten exportieren und löschen

## Anwendung

Die Lehrkraft entscheidet vor einer Aktivität, welche Inhalte, Hilfen, Sozialform und Auswertung verwendet werden. Persönliche Zuordnungen müssen ausdrücklich aktiviert und lokal geschützt werden.

Der erste umgesetzte Cockpit-Baustein ist die lokale Modulkonfiguration einer Klasse. Die Lehrkraft kann Vokabeln, Deutsch, Kopfrechnen und Tipptraining einzeln aktivieren. Eine reduzierte Schülervorschau zeigt sofort, welche Bereiche sichtbar wären. Mindestens ein Modul bleibt aktiv. Die tatsächliche Veröffentlichung auf Schülergeräte erfolgt später über ein versioniertes Klassenpaket; eine lokale Lehreränderung greift nicht unbemerkt auf Schülerdaten zu. Das klassische Laufdiktat wird nicht als dauerhaftes Klassenmodul geschaltet, sondern über eine von der Lehrkraft gestartete Lobby und deren Raumcode betreten.

Die Lehrkraft erstellt im Normalfall keine freien Aufgabenpakete. Der Lernraum erzeugt Übungsbedarf aus Fälligkeiten und Fehlern und führt passende Inhalte automatisch in **Heute üben** zurück. Die Lehrkraft entscheidet vor allem, welche der vier Übungsbereiche eine Klasse verwendet, und erhält eine datensparsame Übersicht über Aktivität und Lernentwicklung. Nur dort, wo ein Modul fachlich festgelegte Trainingspakete vorsieht – beispielsweise Schreibtrainings in Deutsch –, kann sie eines davon auswählen und freischalten.

## Lokaler Klassenbriefkasten

Für einen Turnus oder ein Aufgabenpaket startet die Lehrkraft eine Abgaberunde. Das Dashboard zeigt die erwarteten Klassenmitglieder und aktualisiert beim fortlaufenden Scannen unmittelbar den Status:

- **ausstehend:** noch kein gültiger Code für diesen Turnus
- **abgegeben:** aktueller Stand wurde übernommen
- **doppelt:** derselbe Stand wurde bereits verarbeitet
- **veraltet:** ein neuerer Stand liegt bereits vor
- **ungültig:** falsche Klasse, Signatur oder beschädigter Code

Nach einem erfolgreichen Scan erscheinen ein kurzer Ton oder eine Vibration, ein grüner Rahmen und der lokale Schülername beziehungsweise Alias. Die Lehrkraft sieht jederzeit beispielsweise **„18 von 26 abgegeben“** und eine Liste der noch fehlenden Schüler.

## Datenschutz

Standardmäßig werden Pseudonyme, Teams und aggregierte Lernereignisse angezeigt. Klarnamen und dauerhafte Leistungsübersichten sind eine zusätzliche, schulrechtlich zu prüfende Funktion.
