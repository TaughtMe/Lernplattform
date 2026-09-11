# Entwicklungsplan

## Aktueller nächster Meilenstein

Vor den ersten Live-Tests wird der bestehende Lernkern stabilisiert. Die E2E-Suite muss auf Desktop, Mobilgeräten und bei 320 CSS-Pixeln wieder zuverlässig grün laufen; veraltete Erwartungen werden an den persönlichen Lernraum angepasst und echte mobile Überlagerungen behoben. Der Vault wird bei diesem Stabilisierungsschritt gegen den Code abgeglichen.

Der lokale Lehrerbereich wurde am 28. August 2026 vom Prototyp-Einstieg zu einem vollständigen ersten Arbeitsstand ausgebaut: persönliches Profil, mehrere Klassen, Schülerverwaltung, Materialbibliothek, Aufgaben mit Klassen- oder Einzelschülerzuteilung, QR-Generator und -Leser sowie eine auf Schema-Version 5 migrierte IndexedDB mit Gesamt-Export und geprüftem Import. Zugewiesene Aufgaben werden auf passenden Schülergeräten dublettenfrei in **Meine Aufgaben** übernommen. Ein erster signierter QR-Abgabenachweis mit fortlaufender Standnummer und lokalem Protokoll schließt diesen Weg; der umfangreichere verschlüsselte Ranking-Leistungsbrief bleibt davon getrennt.

Vinext bleibt mangels stabiler 1.0-Version vorerst eine bewusst gewählte Beta-Abhängigkeit. Am 28. August 2026 wurde kontrolliert auf `vinext@1.0.0-beta.8`, `@vitejs/plugin-rsc@0.5.34` und `vite@8.2.2` aktualisiert. Die vorherige transitive `image-size`-Warnung entfällt damit; `npm audit` meldet keine bekannte Schwachstelle. Vorabstände werden weiterhin nur zusammen mit passender RSC-/Vite-Version und nach vollständigem Quality Gate aktualisiert. Eine Alpha-Version gilt nicht als sicherere Alternative, sondern als experimenteller als eine Beta-Version.

Die E2E-Ausfälle vor diesem Update hatten zwei voneinander getrennte Ursachen: veraltete Erwartungen an die neue Klassen-/Raumcode-Struktur und ein Service Worker, der bereits beim erstmaligen Übernehmen der Seite neu lud. Ein automatisches Neuladen erfolgt nun nur noch nach der ausdrücklichen Aktion **„Update laden“**. Browserläufe arbeiten seriell, weil Vinext RSC-Routen im Entwicklungsbetrieb bei Bedarf kompiliert und parallele Erstaufrufe Navigationen abbrechen konnten.

Das abschließende Quality Gate am 28. August 2026 ist vollständig grün: Formatierung, Lint, Typprüfung, 153 Unit-/Integrationstests, Produktions-Build und Renderprüfungen bestanden. In der vollständigen E2E-Matrix über Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari, Tablet Safari und 320 CSS-Pixel bestanden nach dem lokalen Aufgabenrückweg 142 Tests; 5 nicht passende Geräteszenarien wurden planmäßig übersprungen, kein Test schlug fehl.

Danach hat die freiwillige Sicherung persönlicher Schülerdaten Vorrang. Vorgesehen sind ein lokales Verzeichnis, Google Drive, Microsoft OneDrive und ein frei konfigurierbares WebDAV-Ziel für Dienste wie Nextcloud oder ownCloud. Eine zusätzliche anwendungsseitige Verschlüsselung ist optional und keine Voraussetzung. Die Sicherung muss von Klasseneinschreibung, Lehrer-Ranking und dem kurzlebigen Supabase-Übergaberaum technisch getrennt bleiben. Die OAuth-Registrierung bei Google und Microsoft bleibt ein späteres Konfigurations-To-do. Der lokale Lehrerbereich kommt ohne eigenen Login aus. Ein Lehrerlogin bleibt ebenfalls im späteren Backlog, wird aber erst für gemeinsam genutzte Geräte oder mehrere Lehrkräfte neu bewertet und nur umgesetzt, wenn Anbieter-, Wiederherstellungs-, Betriebs- und Kostenfragen tragfähig gelöst sind; eine eigene Login-Infrastruktur ist derzeit nicht vorgesehen.

Das Supabase-Projekt `Lernraum` ist seit dem 25. August 2026 in `eu-west-1` aktiv. Der vorhandene Dienst bleibt ein kurzlebiger Übergaberaum und wird nicht stillschweigend zum dauerhaften Schüler-Backup umgewidmet. Seine tatsächliche Backup-Aufbewahrung und Löschfrist werden weiterhin betrieblich dokumentiert.

## Rahmenplan für den sichtbaren Produkteeinstieg

Lernraum wächst in drei sichtbaren Ausbaustufen. Die Oberfläche zeigt in jeder Stufe nur Funktionen, die bereits zuverlässig nutzbar sind. Noch nicht freigegebene Lernbereiche erscheinen weder als leere noch als deaktivierte Kacheln.

### Stufe 1: Laufdiktat als einziger Schülereinstieg

Die öffentliche Startseite zeigt Lernraum als gemeinsame Marke und unmittelbar den Beitritt zu einem Laufdiktat-Raum per vierstelligem Code oder QR-Code. Der Ablauf wird als **Raum beitreten** und nicht als Login bezeichnet, weil kein Schülerkonto angemeldet wird.

Codeeingabe beziehungsweise QR-Scan, Wahl des Tiernamens und Lobby bilden einen zusammenhängenden Ablauf. Ein bereits übernommener gültiger Raumcode wird nicht auf einer zweiten Seite erneut abgefragt oder bestätigt. Ein direkter Raumlink führt ohne Umweg über die Startseite zur Namenswahl; eine bereits gespeicherte gültige Raumidentität kann unmittelbar in die Lobby zurückkehren. Nur ein ungültiger, nicht erreichbarer oder beendeter Raum führt zurück zu einer bearbeitbaren Codeeingabe.

### Stufe 2: Auswahl freigegebener Lernbereiche

Sobald mit der LernBox ein zweiter vollständig nutzbarer Schülerbereich integriert ist, wird die Startseite zu einer einfachen Auswahl der verfügbaren Lernbereiche. Zunächst stehen dort **Laufdiktat** und **LernBox**. Wortschatz, Tipptraining und freie Aufgaben kommen erst hinzu, wenn ihr jeweiliger Ablauf produktiv freigegeben ist.

Die Auswahl ist eine bewusste Zwischenstufe und verwendet bereits die gemeinsame Lernraum-Gestaltung, Navigation und stabilen Routen. QR- und Raumlinks öffnen weiterhin direkt den Laufdiktat-Beitritt. Die Lernbereiche erhalten keine getrennten App-Hüllen, Themes oder parallelen Datenmodelle.

### Stufe 3: gemeinsames Schülerdashboard

Das persönliche Schülerdashboard wird erst zum Haupteinstieg, wenn mehrere Lernbereiche sowie ihre fachlichen Verknüpfungen einen echten gemeinsamen Nutzen bieten. Dazu gehört insbesondere, dass Ergebnisse aus dem Laufdiktat kontrolliert in die LernBox übernommen und daraus sinnvolle persönliche Wiederholungen erzeugt werden können.

Das Dashboard priorisiert dann heutige Lernschritte, Aufgaben und Fortschritt. Die Auswahl aus Stufe 2 bleibt innerhalb des Dashboards als **Alle Lernbereiche** erhalten und wird nicht verworfen. Laufdiktat, LernBox, Wortschatz, Tipptraining und freie Aufgaben bleiben erkennbare Wege unter einem gemeinsamen Lernraum-Dach und verwenden denselben persönlichen Lernkern, soweit ihre Daten fachlich zusammengehören.

### Übergangskriterien

- Stufe 1 bleibt aktiv, solange Laufdiktat der einzige freigegebene Schülerbereich ist.
- Stufe 2 beginnt mit der produktiv nutzbaren LernBox, nicht allein mit bereits vorhandenem Quellcode oder unfertigen Modulen.
- Die Ergebnisübergabe Laufdiktat → LernBox wird innerhalb von Stufe 2 ergänzt und vor dem Dashboard stabilisiert.
- Stufe 3 beginnt erst, wenn das Dashboard mehr leistet als eine Sammlung von App-Kacheln: Es muss aus mehreren Lernbereichen konkrete nächste Schritte, Aufgaben oder Fortschritt ableiten können.
- Stabile Direktlinks, gemeinsame Gestaltung, Barrierefreiheit und mobile Bedienbarkeit werden von Stufe zu Stufe weiterverwendet.

## Empfohlene Reihenfolge

0. Den Laufdiktat-Beitritt als einzigen sichtbaren Schülereinstieg vereinfachen und die doppelte Codebestätigung entfernen.
1. LernBoxV2 und Laufdiktat commitgenau prüfen und geeignete Fachlogik, Abläufe und Tests gezielt in den gemeinsamen Lernraum integrieren.
2. LearningBundle v1 und stabile IDs definieren.
3. LernBox auf Tags, Herkunft und getrennte Lernstände vorbereiten.
4. Vokabelmodus im Laufdiktat entwickeln.
5. Übertragung Laufdiktat → LernBox umsetzen.
6. Persönliche Runde **„Meine Fehler jetzt üben“** und kurzfristige Wiederholung ergänzen.
7. Nach mehreren verknüpften Lernbereichen die Tagesauswahl und adaptive Wiederholung als Grundlage des Schülerdashboards ergänzen.
8. Lernwörter mit fünfstufiger Merkstrecke entwickeln.
9. Fehler aus Texten als Lernwörter vorschlagen und Rechtschreibphänomene zuordnen.
10. Lernwort-Wertung mit 5.000 Punkten, Sternen und Merkspanne erproben.
11. Lehrer-Cockpit und Rollen entwickeln.
12. Häuser und Gruppenpunkte ergänzen.
13. Duelle einbauen.
14. Individuelle Klasseneinschreibung und QR-Auswertung mit lokalem Abgabeprotokoll entwickeln.
15. Lokale Verzeichnissicherung sowie Google-Drive-, OneDrive- und WebDAV-Backup ergänzen; zusätzliche Dateiverschlüsselung optional halten.
16. Tastschreibtraining als getrennten Schreibbereich entwickeln.
17. Mathematik über Kompetenz-IDs und Aufgabenfamilien integrieren.
18. Übernommene Anwendungen dauerhaft mit ihren Upstream-Repositories abgleichen.
19. Getrennte Einstiege für Klasse und freies Üben zu einem persönlichen Lernraum mit Fachfiltern zusammenführen.
20. Stabile Quellenverknüpfung und Dublettenabgleich für eigene und übernommene Inhalte umsetzen.
21. Verschlüsselten Supabase-Übergaberaum mit maximal 24 Stunden Laufzeit implementieren und sicherheitstechnisch prüfen.
22. Lokale oder frei gewählte Lehrkraftablagen über Import und Export anbinden, ohne Supabase als Dauerbibliothek vorauszusetzen.
23. Erst nach einem stabilen, vollständig nutzbaren Lernkern die nachhaltige Gamification als abschaltbaren Prototyp ergänzen.
24. Persönliche Entwicklungsstufe und verzeihende Wochenziele erproben.
25. Ramagotchi und kosmetisch gestaltbaren Lernraum ergänzen.
26. Kooperative Haus- und Klassenquests datensparsam erproben.

## Sinnvolles erstes Minimum

- Schüler sieht nach dem Einstieg seine Klasse und das freie Üben klar getrennt.
- Innerhalb einer Klasse steht „Heute üben“ im Mittelpunkt; „Aufgaben“ erscheint nur bei tatsächlich freigeschalteten, modulspezifischen Trainingspaketen.
- Die Lehrkraft kann konkrete Vokabelstapel oder andere fachliche Sammlungen temporär bereitstellen; Grundfunktionen bleiben frei zugänglich.
- Lehrer erstellt einen Vokabelstapel.
- Schüler tritt per Code bei.
- Vokabeln werden lokal übernommen.
- Schüler übt beide Richtungen.
- „Gewusst“ und „geschrieben“ werden getrennt erfasst.
- Leitner-Boxen und Fälligkeiten funktionieren.
- Daten lassen sich als Datei sichern und wiederherstellen.
- Falsche Testvokabeln lassen sich ohne Dubletten direkt als persönliche Fehlerübung starten.
- Individuelle Schüler-QR-Codes erzeugen keine doppelten Klassenmitglieder.
- Das Lehrergerät kann QR-Abgaben pro Turnus vollständig, doppelt und ausstehend unterscheiden.

## Fachliche Ausbaufolge

1. Vokabeln vollständig verbinden.
2. Lernwörter und ihre fünf Merkstufen ergänzen.
3. Fehler aus Texten automatisch als Lernwörter vorschlagen.
4. Tastschreiben als eigenen Kompetenzbereich ergänzen.
5. Mathematik erst danach über Aufgabenfamilien integrieren.

## Qualitätskriterien

- offline nutzbare LernBox
- nachvollziehbare Lernregeln
- keine unbemerkten Datenverluste
- datensparsame Voreinstellungen
- barrierearme, einfache Schüleroberfläche
- gemeinsame Tests für Datenmodell und Synchronisation
- Gamification bleibt abschaltbar, bestraft keine Pausen und belohnt ausschließlich sinnvolle Lernsignale

## Späte Ausbaustufe: nachhaltige Gamification

Das Ramagotchi wird ausdrücklich **nicht** in das erste produktive Minimum aufgenommen. Zuerst müssen die fachlichen Lernwege, lokale Speicherung, Rollen, Datenschutz, Barrierefreiheit und Betrieb zuverlässig funktionieren. Erst danach wird die in [[../23 - Ramagotchi und nachhaltige Gamification/Anwendung|Ramagotchi und nachhaltige Gamification]] beschriebene Motivationsschicht prototypisch getestet.

Die laufende Umsetzungsübersicht mit abhakterauglichen Einzelschritten steht unter [[../18 - Aufgabenübersicht/Anwendung|Aufgabenübersicht]].

Bereits getroffene Architekturentscheidungen und bewusst verworfene Varianten stehen unter [[../19 - Entscheidungsprotokoll/Anwendung|Entscheidungsprotokoll]].
