# Aufgabenübersicht

Diese Liste ist der kompakte Arbeitsüberblick. Details und fachliche Entscheidungen stehen in den verlinkten Kapiteln.

## Jetzt: Vokabel-Kern und Fehlerkreislauf

- [x] Bestehendes Laufdiktat stabilisieren und automatisierte Basistests ergänzen
- [x] LearningBundle v1 mit stabilen Vokabel- und Ereignis-IDs festlegen
- [x] Herkunft, Runden-ID, Antwortform und verwendete Hilfe im Lernereignis speichern
- [x] „Gewusst“ und „geschrieben“ je Abfragerichtung getrennt abbilden
- [x] Leitner-Boxen und Fälligkeiten lokal aus Lernereignissen ableiten
- [x] Persönlichen Vokabelmodus im Laufdiktat mit beiden und gemischten Richtungen integrieren
- [x] Lehreroption „alle / nur fehlerhafte / keine Vokabeln übernehmen“ umsetzen
- [x] Dublettenfreien LernBox-Eingangsadapter für Laufdiktat-Fehler umsetzen
- [x] Persönlichen Laufdiktat-Ergebnisfluss an den gemeinsamen LernBox-Eingangsadapter anschließen
- [x] Falsche Vokabeln aus persönlichen Laufdiktat-Runden automatisch als fällig markieren
- [x] Schaltfläche **„Meine Fehler jetzt üben“** nach persönlichen Vokabelrunden umsetzen
- [x] Nach Hilfen einen verdeckten Abruf erzwingen
- [x] Tagesauswahl aus Fälligkeiten und kurzfristigen Fehlerwiederholungen ergänzen
- [x] Fällige Mehrkarten-Lernrunde für Vokabelstapel umsetzen
- [x] Schreib- und Karteikartenmodus mit unterschiedlicher Nachweisstärke umsetzen
- [x] Beide Vokabelrichtungen mit getrennten Fälligkeiten anbieten
- [x] Sitzungsfortschritt und Rundenabschluss anzeigen
- [x] Datei-Export und Wiederherstellung testen

## Danach: Lernwörter

**Aktueller Stand:** Die fünf Merkstufen können im freien Deutschbereich mit eigenen Wörtern vollständig durchlaufen werden. Merkstufe, Leitner-Fälligkeit und typisierte Lernereignisse werden dauerhaft im gemeinsamen persönlichen Datenbereich gespeichert. Die Punktewertung ist bewusst noch nicht angebunden.

- [ ] Lernobjekttyp „Lernwort“ im gemeinsamen Datenmodell ergänzen
- [x] Merkstufe und Leitner-Box getrennt speichern
- [x] Stufe 1 als überprüfbaren Funktionsprototyp: vollständiges Wort fehlerfrei abschreiben
- [x] Stufe 2 als überprüfbaren Funktionsprototyp: wenige fehlende Buchstaben ergänzen
- [x] Stufe 3 als überprüfbaren Funktionsprototyp: Wort mit vielen Lücken rekonstruieren
- [x] Stufe 4 als überprüfbaren Funktionsprototyp: Wort ansehen, verdecken und mit Längenstrichen tippen
- [x] Stufe 5 als überprüfbaren Funktionsprototyp: mehrere Wörter ansehen, merken und tippen
- [x] Blockgrößen 1, 2, 3 und 5 ohne verpflichtende Reihenfolge prototypisch anbieten
- [x] Regeln für Aufstieg, Verbleib, Rückstufung und Hilfen im Funktionsprototyp implementieren
- [x] Tastaturfluss mit Autofokus, Enter-Bestätigung und automatischem Weitergehen nach richtigen Antworten umsetzen
- [x] Stufe 4 als direkte Eingabe auf den Längenstrichen statt als getrenntes Eingabefeld umsetzen
- [x] Lernstand und Leistungswertung technisch trennen
- [x] Selbstkorrekturen erfassen, aber die endgültig richtige Lösung als fachlich richtig werten
- [ ] 5.000-Punkte-Wertung und Sterneanzeige prototypisch umsetzen
- [ ] Punktabzüge und Merkbonus mit Schülern erproben und kalibrieren
- [ ] Feste Lernwortlisten nach allen vorgesehenen Rechtschreibphänomenen anlegen
- [x] Wortbanken mit jeweils mindestens 100 eindeutigen Wörtern für Doppelkonsonanten, ck/tz, Auslautverhärtung, Umlaute, langes i und Dehnungs-h anlegen
- [x] Eigene Wortbank „Merkwörter & Fremdwörter“ für Wörter ohne verlässliche Regel anlegen
- [x] Überschaubare Rundengrößen 5, 10, 20 oder gesamte Wortbank anbieten
- [x] Erste Sammlungen mit den Rechtschreibstrategien Silbieren, Verlängern, Ableiten und Merken taggen
- [ ] Lernwörter aus Tests, Lehrerzuweisungen und eigenen Texten übernehmen

## Später: automatische Fehleranalyse

- [ ] Zieltext und Eingabe wortweise vergleichen
- [ ] Einmalige Fehler zunächst nur als Lernwort vorschlagen
- [ ] Testfehler und wiederholte Übungsfehler automatisch aufnehmen
- [ ] Fehlerbilder wie Doppelkonsonant, ck/tz oder Dehnungs-h erkennen
- [ ] Herkunft, Datum, Einheit und Rechtschreibphänomen automatisch taggen
- [ ] Lehrkraft-Option „immer als Lernwort aufnehmen“ ergänzen

## Später: Tastschreiben

- [x] Eigenen Bereich für Tastschreibtraining konzipieren
- [ ] Physische Tastatur und Bildschirmtastatur unterscheiden
- [x] Grundstellung, Buchstabenreihen, Großbuchstaben, Umlaute und Satzzeichen abbilden
- [x] Wörter, Sätze, kurze Texte und freies Abschreiben ergänzen
- [x] Finger- und Tastenhinweise auf einer Bildschirmtastatur darstellen
- [x] Anschläge pro Minute, Genauigkeit, Korrekturen und unsichere Tasten auswerten
- [x] Geschwindigkeit nur informativ und Genauigkeit vorrangig behandeln

## Langfristig: Mathematik

- [x] Erste stabile Kompetenz-IDs für Plus, Minus, Mal und Geteilt samt Zahlenraum definieren
- [ ] Metadaten für Thema, Schwierigkeit und Lösungsstrategie festlegen
- [x] Fehler aus Kopfrechenaufgaben einer passenden Grundrechenfamilie zuordnen
- [x] Neue passende Aufgaben statt einzelner Fehleraufgaben erzeugen
- [x] Vollständigen Kopfrechenprototyp aus Laufdiktat nativ integrieren
  - [x] Zahlenraum von/bis und alle vier Grundrechenarten
  - [x] Negative Ergebnisse sowie Null als Operand oder Ergebnis steuerbar machen
  - [x] Einmaleins-Reihen für Mal und Geteilt auswählbar machen
  - [x] Lückenaufgaben an erstem Operand, zweitem Operand oder Ergebnis erzeugen
  - [x] Eigene Aufgaben mit Dezimalzahlen, Klammern, Potenzen, Brüchen und Wurzeln sicher ohne `eval` auswerten
  - [x] Aufgabenliste erzeugen, einzelne Aufgaben neu würfeln oder löschen
  - [x] Tastaturfluss mit Enter, Autofokus und automatischem Weitergehen umsetzen
- [ ] Weiterführende mathematische Lernwege und Hilfsstrategien außerhalb des Kopfrechnens prototypisch testen

## Plattform und Betrieb

- [x] Adaptiven Lernkreislauf als übergeordnete Produkt- und Facharchitektur dokumentieren
- [x] Klassenansicht auf „Heute üben / Frei üben / Mein Fortschritt“ reduzieren
- [x] Erste lokale Fortschrittsübersicht für Aktivität, aktive Tage und bewältigte frühere Fehler umsetzen
- [x] LernBox, Lernwörter, Kopfrechnen und Tastschreiben über ein gemeinsames typisiertes Lernsignal- und Empfehlungsmodell an den adaptiven Kern anbinden
- [x] Digitale Hausaufgaben und Lehrerimpulse aus der Klassenansicht entfernen; Aufgaben werden klassisch mitgeteilt
- [x] Deutsch direkt mit Lernwörtern, Vokabeln direkt mit LernBox und Mathematik direkt mit Kopfrechnen verknüpfen
- [x] Separaten Laufdiktat-Raumcode in Klassenraum und freiem Bereich platzieren
- [ ] Klassen-QR und Raumcode für Einschreibung und Inhaltsübertragung umsetzen
- [ ] Aggregierten QR-Klassenbeitrag mit persönlichem Lob und gedeckelten Punkten umsetzen

- [x] LernBoxV2 und Laufdiktat als verbindliche Quellmodule statt als Vorbilder für einen Nachbau festlegen
- [x] Aktuelle Upstream-Repositories und Commitstände dokumentieren
- [x] LernBox-Leitnerlogik, Decks, Karten und Sicherungen gezielt in den gemeinsamen Lernraum portieren
- [x] Eigenständige LernBox-PWA-Hülle, iframe, Router, Service Worker und doppelte Einstellungen entfernen
- [x] Native LernBox-Oberfläche an globales Theme, Navigation und persönliche Lerndatenbank anbinden
- [x] Laufdiktat-Fachlogik und benötigte Schüler-/Lehrerabläufe gezielt nativ integrieren
- [x] Ersten nativen persönlichen Laufdiktat-Weg für Text und Vokabeln integrieren
- [x] Antwortprüfung, Hinweise, Vokabelimport und Sterneberechnung aus Laufdiktat `6c2ade4` portieren und testen
- [x] Live-Raum, Lehrer-Dashboard, Stationen und Battle nativ integrieren
  - [x] Sicheren Schülerbeitritt und native Wartelobby aus Laufdiktat portieren
  - [x] Autorisierte Sitzungsdaten in ein natives Spiel für Text, Vokabeln und Kopfrechnen übernehmen
  - [x] Fortschritt, Wiederaufnahme und Teilnehmer-Heartbeat an den bestehenden sicheren Raumvertrag anbinden
  - [x] Lehrerraum mit Inhaltserstellung, QR-/Code-Lobby, Teilnehmerliste und sicherem Sitzungsstart überführen
  - [x] Stationsmodus in die Lernraum-Oberfläche überführen
  - [x] Battle in die Lernraum-Oberfläche überführen
- [ ] Vorhandene Tests beider Anwendungen in das gemeinsame Quality Gate übernehmen
- [ ] Upstream-Abgleich als wiederholbaren Integrationsablauf einrichten
- [x] Historischen Schülereinstieg mit getrennten Bereichen für Klasse und freies Üben anlegen; durch die neue gemeinsame Lernraumstruktur zu ersetzen
- [x] Historische Klassenansicht mit „Heute üben“ und „Aufgaben“ als Grundstruktur anlegen; durch die neue gemeinsame Lernraumstruktur zu ersetzen
- [x] Aktivierbare Klassenmodule prototypisch validieren; Produktmodell durch freie Grundfunktionen und konkrete Lehrkraftinhalte ersetzt
- [x] Lokale Lehreroberfläche für Modulfreigaben prototypisch bauen; nicht als endgültigen Veröffentlichungsweg weiterführen
- [x] Allgemeine Aufgabenplanung zugunsten des Übungs- und Wiederholungskreislaufs entfernen
- [x] Fehlerhaften Klassenversuch automatisch in „Heute üben“ aufnehmen
- [x] Fehlerwiederholung nach einem späteren richtigen Abruf wieder schließen
- [x] Fälligkeiten aus Leitner-Boxen zusätzlich in „Heute üben“ aufnehmen
- [x] Leitner-Prinzip als sichtbare Fünf-Boxen-Reihen für Bedeutung und Schreiben darstellen
- [x] Konkrete Lehrkraftinhalte als verschlüsseltes, versioniertes und höchstens 24 Stunden verfügbares Transferpaket veröffentlichen
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
- [x] Hellen, dunklen und systemabhängigen Darstellungsmodus als Plattformgrundlage umsetzen
- [x] Gemeinsame Mobil- und Tablet-Navigation mit Safe-Area-Unterstützung anlegen
- [x] Jede neue Ansicht ab 320 CSS-Pixel Breite und ohne horizontales Scrollen prüfen
- [ ] Hochformat, Querformat und eingeblendete Bildschirmtastatur pro Lernmodus testen
- [ ] Geräte- und Browsermatrix vor jedem größeren Meilenstein vollständig durchlaufen
- [ ] Lehrer-Cockpit und Rollenmodell entwickeln
- [ ] Gemeinsame App mit getrennten privaten, Klassen- und Lehrerarbeitsbereichen umsetzen
- [ ] Lehrerbereich mit eigener Authentifizierung schützen
- [ ] Sicherstellen, dass das Verlassen des Klassenmodus niemals Lehrerrechte erteilt
- [x] Schüler in einer Klasse lokal anlegen und individuelle Einschreibungs-QR-Codes erzeugen
- [x] Wiederholtes Scannen derselben Einschreibung ohne doppeltes Schülerprofil behandeln
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
- [x] Module unter einer gemeinsamen Plattformoberfläche zusammenführen

## Nächste Architekturänderung: ein persönlicher Lernraum

- [x] Gemeinsamen persönlichen Lernraum als verbindliches Produktmodell dokumentieren
- [x] Getrennten Haupteinstieg „Freies Üben“ entfernen und als Aktion innerhalb eines Fachs einordnen
- [x] Auswahl **Alles fällige** oder einzelnes Fach vor der Lernrunde umsetzen
- [ ] Fachübergreifende Tagesauswahl in überschaubaren Fachblöcken erzeugen
- [ ] Manuell angelegte und von der Lehrkraft übernommene Fächer gemeinsam darstellen
- [ ] Eigene und übernommene Stapel auf denselben persönlichen Lernstand abbilden
- [ ] Quellenbeziehungen getrennt von Lernobjekt und Lernstand speichern
- [ ] Vokabeldubletten anhand von Sprachpaar, Grundform, Bedeutung und Richtung prüfen
- [ ] Vorhandenen Lernstand bei Paketaktualisierungen vollständig bewahren

## Nächste Architekturänderung: temporäre Inhaltsübertragung

- [x] Supabase als kurzlebigen Übergaberaum statt als Dauerbibliothek festlegen
- [x] Supabase-Projekt `Lernraum` in der EU-Region `eu-west-1` anlegen und gesunden Ausgangszustand prüfen
- [x] Leeren Ausgangszustand ohne Anwendungstabellen, Migrationen oder Edge Functions dokumentieren
- [x] Lokale Entwicklung und Hosting über Projekt-URL und modernen Publishable Key verbinden; keine Secret- oder `service_role`-Schlüssel im Client verwenden
- [x] Supabase-Migrationen und lokale Projektkonfiguration nachvollziehbar im Repository anlegen
- [x] Automatische Data-API-Standardrechte für neue Tabellen, Sequenzen und Funktionen projektweit entziehen
- [x] Lokale und dateibasierte Lehrkraftbibliothek mit stabilem Exportformat umsetzen
- [x] Unveränderliches `LearningBundle` vor dem Upload auf dem Lehrergerät verschlüsseln
- [x] Temporären Transferraum mit maximal 24 Stunden Ablaufzeit implementieren
- [x] QR-Nutzlast mit ausreichend zufälligem Abrufnachweis erzeugen
- [x] Sicheren manuellen Transfercode mit raumbezogener Fehlversuchsgrenze entwickeln
- [x] Paket ohne Schülerkonto oder dauerhafte Klassenmitgliedschaft abrufen
- [x] Paket lokal entschlüsseln, validieren und idempotent integrieren
- [x] Paket lokal entschlüsseln und als `LearningBundleV1` validieren
- [x] Entschlüsseltes Paket idempotent in die persönliche LernBox integrieren
- [x] Abruf nach Ablauf technisch verweigern
- [ ] Backup-Aufbewahrung und tatsächliche Löschfrist des Dienstes betrieblich dokumentieren
- [x] Abgelaufene aktive Pakete über einen stündlichen Löschauftrag automatisch entfernen
- [x] RLS, minimale API-Rechte und fehlende Schülerzuordnung automatisiert prüfen
- [x] Sicherstellen, dass weder Schülerliste noch Abrufhistorie oder Lernstand im Transferraum gespeichert werden
- [x] Netzabbruch, abgelaufenen Code, beschädigtes Paket und erneute Freigabe testen

## Langfristig: Ramagotchi und nachhaltige Gamification

- [x] Positive Leitidee und pädagogische Schutzregeln dokumentieren
- [x] Gamification als spätere Ausbaustufe nach dem stabilen Lernkern einordnen
- [ ] Messbare Reife- und Freigabekriterien für den Lernkern festlegen
- [ ] Abschaltbaren Prototyp für persönliche Entwicklungsstufe und Wochenziel entwerfen
- [ ] Erfahrung ausschließlich aus typisierten, sinnvollen Lernsignalen ableiten
- [ ] Tages- und Wochenlimits gegen Punktesammeln festlegen
- [ ] Ramagotchi ohne Krankheit, Verlust oder Bestrafung bei Pausen prototypisieren
- [ ] Kosmetische Entwicklung und persönlichen Lernraum barrierearm gestalten
- [ ] Aggregierte Haus- und Klassenquests mit freiwilliger Teilnahme erproben
- [ ] Wirkung, Druckempfinden und unerwünschtes Farmverhalten mit Schülern evaluieren

## Noch zu entscheiden

- [ ] Verbindliche Abzüge für Selbstkorrekturen, Fehlversuche und Hilfen festlegen
- [ ] Grenzen des Merkbonus bestimmen
- [ ] Regeln für automatische Rückstufung bei Lernwörtern festlegen
- [ ] Umfang der ersten festen Lernwortlisten auswählen
- [ ] Erstes produktives Minimum endgültig abgrenzen
