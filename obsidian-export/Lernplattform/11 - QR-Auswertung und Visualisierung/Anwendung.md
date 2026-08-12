# QR-Auswertung und Visualisierung

## Zweck

Ein Schüler kann bewusst ausgewählte lokale Statistiken als QR-Code an das Lehrergerät übertragen. So entsteht eine Klassen- oder Hausvisualisierung ohne dauerhaftes zentrales Schülerkonto.

## Mögliche Daten

- Zufallsalias
- XP
- gelernte Wörter
- richtig geschriebene Wörter
- Siege und Niederlagen
- durchschnittliche Antwortzeit
- Hauspunkte
- persönliche Verbesserungen

## Anwendung

1. Die Lehrkraft legt jeden Schüler lokal an und erzeugt einen individuellen Einschreibungs-QR-Code.
2. Das Schülergerät übernimmt Klassen-ID und feste Mitgliedschafts-ID. Wiederholtes Scannen erzeugt keinen weiteren Schülerdatensatz.
3. Der Schüler wählt die freizugebenden Werte und erzeugt einen verschlüsselten, signierten QR-Code.
4. Der QR-Code zeigt einen vollständigen versionierten Zwischenstand für den aktuellen Turnus oder Berichtszeitraum.
5. Die Lehrkraft scannt die Codes im fortlaufenden Klassenmodus.
6. Das Lehrergerät bestätigt jeden gültigen Scan mit Ton oder Vibration, grünem Rahmen und Name beziehungsweise Alias.
7. Standnummern und Paket-IDs verhindern doppelte oder veraltete Übernahmen.
8. Ranking, Abgabestatus und lokale Zuordnungen werden ausschließlich auf dem Lehrergerät gespeichert.

## Abgabeprotokoll

Für jeden Turnus oder jedes Aufgabenpaket speichert das Lehrergerät minimal:

- Klassen- und Mitgliedschafts-ID
- Turnus- oder Aufgabenpaket-ID
- höchste akzeptierte Standnummer
- Paket-ID beziehungsweise Paket-Hash
- Eingangszeitpunkt
- Ergebnis: abgegeben, doppelt, veraltet oder ungültig

Der vollständige QR-Inhalt und die persönliche Lernhistorie werden nicht unnötig im Protokoll abgelegt. Die Lehrkraft kann offene Abgaben filtern, den Turnus abschließen und das Protokoll nach einer festgelegten Frist löschen.

## Kein Rückkanal erforderlich

Das Schülergerät kann bei einer Air-Gap-Übertragung nicht erkennen, ob sein Code gelesen wurde. Der Code bleibt daher ruhig sichtbar, bis der Schüler ihn schließt. Die Bestätigung erscheint ausschließlich auf dem Lehrergerät. Im Zweifel darf derselbe Code erneut gezeigt werden; die Übernahme bleibt durch Standnummer und Paket-ID idempotent.

## Datenumfang

Ein statischer QR-Code reicht für Rankingbeiträge und kleine Zwischenstände. Größere Lernhistorien können später über einen animierten QR-Code übertragen werden. Mehrfachcodes oder eigene optische Partikelcodes gehören nicht zum ersten produktiven Umfang.

## Grenzen

Lokal erzeugte Werte sind grundsätzlich manipulierbar. Für spielerische Motivation ist das vertretbar. Verlässliche Ergebnisse aus Lehrer-Räumen können später digital bestätigt und getrennt ausgewiesen werden.
