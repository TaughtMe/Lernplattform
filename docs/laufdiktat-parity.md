# Laufdiktat: Angleichung an das Original

Referenz: `TaughtMe/Laufdiktat` bei
`6c2ade41eadd2721f051df168244ed09563cea21` (4.2.2).
Ausgangspunkt: Lernplattform `c483907` zusammengeführt mit den Reparaturen
aus `30b1b3c`. Lokale, nicht veröffentlichte Änderungen im Original-Checkout
wurden ausdrücklich nicht als Referenz verwendet.

## Ziel und Umfang

Der Nutzer möchte den Funktionsumfang des Originals im Lernraum behalten.
Die gemeinsame Oberfläche, Speicherung und Aktualisierungsverwaltung bleiben
die der Lernplattform. Die übrigen persönlichen Lernmodule bleiben vom
Laufdiktat-Pilot getrennt.

| Bereich                | Angleichung                                                                                                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Freie Übung            | Schrittweise Buchstaben-/Worthilfe, anschließend sichtbare Abschreibvorlage; korrekte Zeichen werden hervorgehoben. Eingaben bleiben bei Korrekturen in dieser Phase stehen. |
| Klassisches Laufdiktat | Falsche Antworten führen nicht mehr zur nächsten Aufgabe. Erst eine richtige Antwort schließt die Aufgabe ab.                                                                |
| Erneutes Nachschauen   | Zwei Finger decken die Aufgabe auch während des Schreibens auf; die angefangene Antwort bleibt erhalten.                                                                     |
| Stationen              | Zwei-Finger-Aufdecken, Verdecken beim Loslassen, Rückkehr nach drei Sekunden Untätigkeit, Vorlesen und Erinnerung an angesehene Aufgaben je Nummer.                          |
| Stationsfehler         | Fehlgeschlagene Wiederherstellung verhindert neue Fortschrittsmeldungen, bis der Stand erfolgreich geladen wurde.                                                            |
| Abschluss              | Sterne und längenbezogene Tempo-Punkte. Tempo verändert keinen persönlichen Lernstand.                                                                                       |
| Battle                 | Aufholbonus wie im Original erst bei mindestens der Hälfte der Teilnehmer voraus; laufende Angriffe werden nicht durch weitere verlängert.                                   |
| Versionen              | Abweichende Unterrichtsversion verhindert den Start. Ältere Schülergeräte suchen eine Aktualisierung; neuere Geräte verweisen an die Lehrkraft.                              |
| Speicherung            | Die bereits geprüften Abschluss-, Wiederaufnahme-, Wiederholungs- und Berechtigungsreparaturen bleiben erhalten.                                                             |

Text-, Vokabel- und Matheimport, Bearbeitung von Abschnitten und Lücken,
Lobby, Ergebnisübersicht und Tabellenausgabe stammen aus dem zusammengeführten
Lernplattform-Stand. Vorhandene Tests dieser Bereiche bleiben aktiv.

## Ausdrückliche Entscheidung zum Lehrerzugang

Der Nutzer hat die offene Raumerstellung wie im Original ausdrücklich bestätigt:
keine zusätzliche Lehrkraftfreigabe, weiterhin Anfragelimit und getrennte
Raumverwaltungs- und Teilnehmertokens. Die Reparaturmigration ersetzt die neue
Ein-Parameter-Funktion und führt die entfernte Freigabe nicht wieder ein.
Abgelehnte Raumkonfigurationen verbrauchen ebenfalls ihr Anfragelimit.

## Erhaltene Verbesserungen und Prüfgrenzen

Maus- und Tastaturbedienung bleiben zusätzlich zur Zwei-Finger-Bedienung möglich.
Fehlermeldungen, Wiederholungsversand und Laufzeitvalidierung werden nicht
zugunsten einer Nachbildung von Fehlern des Originals entfernt.

SQL-Verhalten wird nach der vollständigen Migrationskette in PGlite geprüft.
Browserprüfungen verwenden kontrollierte Antworten für Erfolg, Fehler und
Versionswechsel. Ein echter Mehrgeräte-Unterrichtstest mit Supabase und die
produktive Anwendung der Migration sind davon getrennte Betriebsprüfungen.
Die Versandwarteschlange bleibt an den geöffneten Tab gebunden.

## Prüfergebnis

- Vollständiger lokaler Qualitätscheck bestanden: Formatierung, Lint,
  Typprüfung, 218 Unit-/Komponententests, sechs SQL-Verhaltenstests,
  Produktions-Build und sechs Renderingprüfungen.
- 15 gezielte Live-Browsertests bestanden: freie Übung, Stationen,
  Versionsabweichung, Wiederaufnahme nach Update sowie fehlgeschlagener Versand
  mit Wiederholung und Neuladen; jeweils Desktop, Pixel-Profil und 320 Pixel.
- Bestehende Chromium-Pilotprüfung: zwölf Fälle bestanden; die drei zunächst
  veralteten Lehrerprüfungen nach Anpassung an die neue Oberfläche ebenfalls
  bestanden. 69 vorhandene Fälle bleiben durch Pilot-/Konfigurationsbedingungen
  übersprungen und zählen nicht als Funktionsnachweis.
- Barrierefreiheitsprüfung mit axe sowie Sichtprüfung der veränderten
  Abschreibvorlage, Stationsansicht und Versionshinweise durchgeführt.
- Stationsgeste zusätzlich in der gesamten Sieben-Profil-Matrix bestanden:
  Chromium, Firefox, WebKit, Pixel, iPhone, iPad und 320 Pixel. Die Tests
  liefern zwei Berührungskontakte an die Ereignisverarbeitung; ein echter
  Zwei-Finger-Test auf Schulgeräten bleibt Teil der Unterrichtsabnahme.
