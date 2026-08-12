# Aufgabenübersicht

Diese Liste ist der kompakte Arbeitsüberblick. Details und fachliche Entscheidungen stehen in den verlinkten Kapiteln.

## Jetzt: Vokabel-Kern und Fehlerkreislauf

- [ ] Bestehendes Laufdiktat stabilisieren und automatisierte Basistests ergänzen
- [x] LearningBundle v1 mit stabilen Vokabel- und Ereignis-IDs festlegen
- [x] Herkunft, Runden-ID, Antwortform und verwendete Hilfe im Lernereignis speichern
- [x] „Gewusst“ und „geschrieben“ je Abfragerichtung getrennt abbilden
- [x] Leitner-Boxen und Fälligkeiten lokal aus Lernereignissen ableiten
- [ ] Vokabelmodus im Laufdiktat entwickeln
- [ ] Lehreroption „alle / nur fehlerhafte / keine Vokabeln übernehmen“ umsetzen
- [ ] Dublettenfreie Übergabe vom Laufdiktat an die LernBox umsetzen
- [ ] Falsche Testvokabeln automatisch als fällig markieren
- [ ] Schaltfläche **„Meine Fehler jetzt üben“** und persönliche Fehlerrunde umsetzen
- [ ] Nach Hilfen einen verdeckten Abruf erzwingen
- [x] Tagesauswahl aus Fälligkeiten und kurzfristigen Fehlerwiederholungen ergänzen
- [ ] Datei-Export und Wiederherstellung testen

## Danach: Lernwörter

- [ ] Lernobjekttyp „Lernwort“ im gemeinsamen Datenmodell ergänzen
- [ ] Merkstufe und Leitner-Box getrennt speichern
- [ ] Stufe 1: vollständiges Wort fehlerfrei abschreiben
- [ ] Stufe 2: wenige fehlende Buchstaben ergänzen
- [ ] Stufe 3: Wort mit vielen Lücken rekonstruieren
- [ ] Stufe 4: Wort ansehen, verdecken und mit Längenstrichen tippen
- [ ] Stufe 5: mehrere Wörter ansehen, merken und tippen
- [ ] Blockgrößen 1, 2, 3 und 5 ohne verpflichtende Reihenfolge anbieten
- [ ] Regeln für Aufstieg, Verbleib, Rückstufung und Hilfen implementieren
- [ ] Lernstand und Leistungswertung technisch trennen
- [ ] Selbstkorrekturen erfassen, aber die endgültig richtige Lösung als fachlich richtig werten
- [ ] 5.000-Punkte-Wertung und Sterneanzeige prototypisch umsetzen
- [ ] Punktabzüge und Merkbonus mit Schülern erproben und kalibrieren
- [ ] Feste Lernwortlisten nach Rechtschreibphänomenen anlegen
- [ ] Rechtschreibstrategien Silbieren, Verlängern, Ableiten und Merken taggen
- [ ] Lernwörter aus Tests, Lehrerzuweisungen und eigenen Texten übernehmen

## Später: automatische Fehleranalyse

- [ ] Zieltext und Eingabe wortweise vergleichen
- [ ] Einmalige Fehler zunächst nur als Lernwort vorschlagen
- [ ] Testfehler und wiederholte Übungsfehler automatisch aufnehmen
- [ ] Fehlerbilder wie Doppelkonsonant, ck/tz oder Dehnungs-h erkennen
- [ ] Herkunft, Datum, Einheit und Rechtschreibphänomen automatisch taggen
- [ ] Lehrkraft-Option „immer als Lernwort aufnehmen“ ergänzen

## Später: Tastschreiben

- [ ] Eigenen Bereich für Tastschreibtraining konzipieren
- [ ] Physische Tastatur und Bildschirmtastatur unterscheiden
- [ ] Grundstellung, Buchstabenreihen, Großbuchstaben, Umlaute und Satzzeichen abbilden
- [ ] Wörter, Sätze, kurze Texte und freies Abschreiben ergänzen
- [ ] Finger- und Tastenhinweise auf einer Bildschirmtastatur darstellen
- [ ] Anschläge pro Minute, Genauigkeit, Korrekturen und unsichere Tasten auswerten
- [ ] Geschwindigkeit nur informativ und Genauigkeit vorrangig behandeln

## Langfristig: Mathematik

- [ ] Kompetenz-IDs und Aufgabenfamilien fachlich definieren
- [ ] Metadaten für Thema, Schwierigkeit und Lösungsstrategie festlegen
- [ ] Fehler aus Aufgaben einer passenden Aufgabenfamilie zuordnen
- [ ] Neue passende Aufgaben statt einzelner Fehleraufgaben erzeugen
- [ ] Mathematische Lernwege und Hilfsstrategien prototypisch testen

## Plattform und Betrieb

- [x] Minimalistischen Schülereinstieg mit Klasse und freiem Üben anlegen
- [x] Klassenansicht mit „Heute üben“ und „Aufgaben“ als Grundstruktur anlegen
- [x] Aktivierbare Klassenmodule im Domänenmodell validieren
- [x] Erste lokale Lehreroberfläche für Modulfreigaben mit Schülervorschau bauen
- [x] Allgemeine Aufgabenplanung zugunsten des Übungs- und Wiederholungskreislaufs entfernen
- [x] Fehlerhaften Klassenversuch automatisch in „Heute üben“ aufnehmen
- [x] Fehlerwiederholung nach einem späteren richtigen Abruf wieder schließen
- [x] Fälligkeiten aus Leitner-Boxen zusätzlich in „Heute üben“ aufnehmen
- [ ] Modulfreigaben als versioniertes Klassenpaket auf Schülergeräte veröffentlichen
- [x] Lernereignisse optional einem rankingfähigen Klassenkontext zuordnen
- [x] Verbindlichen Coding-, Bibliotheks- und Teststandard festlegen
- [x] Strikte TypeScript- und Architekturregeln aktivieren
- [x] Laufzeitvalidierung für LearningBundle v1 mit Zod anlegen
- [x] Unit-, Nutzerinteraktions- und Eigenschaftstests einrichten
- [x] Browser-, Mobil- und automatische Barrierefreiheitstests einrichten
- [x] Automatische Quality Gates für Push und Pull Request anlegen
- [x] Abhängigkeiten prüfen und vor Bild-Uploads eine erneute Sicherheitsbewertung festhalten
- [x] Ersten vollständigen Lernweg Material → Aufgabe → lokales Ergebnis → Lernstand umsetzen
- [ ] React-Aria-Grundkomponenten erst mit dem ersten komplexen Widget einführen
- [ ] Netzwerkfehler-Simulation mit Mock Service Worker beim ersten Raumabruf ergänzen
- [x] Verbindliche Qualitätsgrundlage und Definition of Done dokumentieren
- [x] Vorlage für einen Qualitätsbericht pro Meilenstein anlegen
- [ ] Testdatensätze für leere, kleine, große, alte und beschädigte Datenbestände erstellen
- [ ] Migrations- und Rückfallstrategie vor der ersten Datenformatänderung umsetzen
- [ ] PWA-Update- und Cache-Strategie festlegen und testen
- [ ] Speicherknappheit und gelöschten Browserspeicher erkennbar behandeln
- [ ] Zeit-, Zeitzonen- und Tagesgrenzen für Fälligkeiten festlegen
- [ ] Unicode-, Tastatur- und Autokorrekturregeln für Lernantworten definieren
- [ ] Datenschutzfreundliche Fehlerdiagnose ohne vollständige Schülerantworten konzipieren
- [ ] Leistungsbudgets für schwächere Schulgeräte und große Datenbestände festlegen
- [x] Mobile-first als verbindliche Entwicklungs- und Abnahmegrundlage festlegen
- [x] Gemeinsame Mobil- und Tablet-Navigation mit Safe-Area-Unterstützung anlegen
- [x] Jede neue Ansicht ab 320 CSS-Pixel Breite und ohne horizontales Scrollen prüfen
- [ ] Hochformat, Querformat und eingeblendete Bildschirmtastatur pro Lernmodus testen
- [ ] Geräte- und Browsermatrix vor jedem größeren Meilenstein vollständig durchlaufen
- [ ] Lehrer-Cockpit und Rollenmodell entwickeln
- [ ] Gemeinsame App mit getrennten privaten, Klassen- und Lehrerarbeitsbereichen umsetzen
- [ ] Lehrerbereich mit eigener Authentifizierung schützen
- [ ] Sicherstellen, dass das Verlassen des Klassenmodus niemals Lehrerrechte erteilt
- [ ] Schüler in einer Klasse lokal anlegen und individuelle Einschreibungs-QR-Codes erzeugen
- [ ] Wiederholtes Scannen derselben Einschreibung ohne doppeltes Schülerprofil behandeln
- [ ] Ersatz- oder Zweitgerät nur nach ausdrücklicher Lehrerbestätigung koppeln
- [ ] Verschlüsselten und signierten QR-Leistungsbrief definieren
- [ ] Turnus- und Aufgabenpaket-ID sowie fortlaufende Standnummer implementieren
- [ ] Kontinuierlichen Klassen-Scanmodus ohne einzelnen Bestätigungsdialog entwickeln
- [ ] Erfolgreichen Scan mit Ton oder Vibration, grünem Rahmen und lokalem Namen bestätigen
- [ ] Doppelte, veraltete, ungültige und klassenfremde Codes unterscheiden
- [ ] Lokales Abgabeprotokoll „abgegeben / ausstehend“ je Turnus führen
- [ ] Fortschritt „x von y abgegeben“ und Liste fehlender Schüler anzeigen
- [ ] Erneutes Einlesen desselben QR-Codes ohne doppelte Wertung erlauben
- [ ] Löschfrist und manuelles Löschen von Abgabeprotokollen umsetzen
- [ ] Statischen QR als Standard und animierten QR nur für größere Lernhistorien vorsehen
- [ ] Lokales Klassenranking aus aggregierten Wochenwerten berechnen
- [ ] Tageslimits, Aliasdarstellung und motivierende Ranggruppen erproben
- [ ] Häuser und datensparsame Gruppenpunkte ergänzen
- [ ] Duelle und QR-Auswertung entwickeln
- [ ] Verschlüsselten Export und Cloud-Backup ergänzen
- [ ] Persönliches Cloud-Backup technisch von Klasseneinschreibung und Lehrer-Ranking trennen
- [ ] Barrierefreiheit und gemeinsame Geräteprofile testen
- [ ] Module unter einer gemeinsamen Plattformoberfläche zusammenführen

## Noch zu entscheiden

- [ ] Verbindliche Abzüge für Selbstkorrekturen, Fehlversuche und Hilfen festlegen
- [ ] Grenzen des Merkbonus bestimmen
- [ ] Regeln für automatische Rückstufung bei Lernwörtern festlegen
- [ ] Umfang der ersten festen Lernwortlisten auswählen
- [ ] Erstes produktives Minimum endgültig abgrenzen
