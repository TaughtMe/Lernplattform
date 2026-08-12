# Lehrer-Cockpit

## Zweck

Das Lehrer-Cockpit bündelt Planung, Durchführung und datensparsame Auswertung des Unterrichts.

## Funktionen

- Vokabeln, Aufgaben und Stapel erstellen
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
- pro Klasse Module wie Vokabeln, Deutsch, Mathematik, Tipptraining oder Laufdiktat aktivieren und deaktivieren
- Aufgaben veröffentlichen und festlegen, welche Inhalte in „Heute üben“ einfließen
- lokale Namens- oder Aliaszuordnungen verwalten
- gespeicherte Daten exportieren und löschen

## Anwendung

Die Lehrkraft entscheidet vor einer Aktivität, welche Inhalte, Hilfen, Sozialform und Auswertung verwendet werden. Persönliche Zuordnungen müssen ausdrücklich aktiviert und lokal geschützt werden.

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
