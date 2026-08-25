# Entwicklungsplan

## Aktueller nächster Meilenstein

Das Supabase-Projekt `Lernraum` ist seit dem 25. August 2026 in `eu-west-1` aktiv. Datenbankschema, Migration, fähigkeitsgebundene RPCs, Ablaufbereinigung und clientseitige Verschlüsselung sind umgesetzt und technisch getestet. Supabase bleibt dabei ein höchstens 24 Stunden gültiger Übergaberaum für clientseitig verschlüsseltes Chiffrat; Lehrkraftbibliothek und persönlicher Schülerlernstand bleiben lokal.

Als nächstes werden Projekt-URL und Publishable Key in Entwicklung und Hosting konfiguriert. Danach werden Lehrkraftfreigabe, QR-/Codeanzeige, Schülerabruf und der vorhandene idempotente LernBox-Eingangsadapter zu einem sichtbaren Ende-zu-Ende-Weg verbunden. Netzabbruch, beschädigte Pakete, Ablauf und erneute Freigabe bleiben bis dahin ausdrücklich offen.

## Empfohlene Reihenfolge

0. Gemeinsamen persönlichen Schülereinstieg mit **Heute üben**, Fachauswahl, eigenen und übernommenen Inhalten als Plattformrahmen umsetzen.
1. LernBoxV2 und Laufdiktat commitgenau prüfen und geeignete Fachlogik, Abläufe und Tests gezielt in den gemeinsamen Lernraum integrieren.
2. LearningBundle v1 und stabile IDs definieren.
3. LernBox auf Tags, Herkunft und getrennte Lernstände vorbereiten.
4. Vokabelmodus im Laufdiktat entwickeln.
5. Übertragung Laufdiktat → LernBox umsetzen.
6. Persönliche Runde **„Meine Fehler jetzt üben“** und kurzfristige Wiederholung ergänzen.
7. Tagesauswahl und adaptive Wiederholung ergänzen.
8. Lernwörter mit fünfstufiger Merkstrecke entwickeln.
9. Fehler aus Texten als Lernwörter vorschlagen und Rechtschreibphänomene zuordnen.
10. Lernwort-Wertung mit 5.000 Punkten, Sternen und Merkspanne erproben.
11. Lehrer-Cockpit und Rollen entwickeln.
12. Häuser und Gruppenpunkte ergänzen.
13. Duelle einbauen.
14. Individuelle Klasseneinschreibung und QR-Auswertung mit lokalem Abgabeprotokoll entwickeln.
15. Verschlüsselten Export und Cloud-Backup ergänzen.
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
