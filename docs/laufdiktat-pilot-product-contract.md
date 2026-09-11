# Produktvertrag Laufdiktat-Pilot

## Ziel

Der Pilot macht Laufdiktat in seinem vollständigen, im Quellrepository erprobten Umfang zum einzigen sichtbaren Kern des Lernraums. Die vorhandene Plattform bleibt über den Git-Tag `pre-laufdiktat-pilot` vollständig wiederherstellbar; ihre Komponenten, Fachlogik, Tests und Datenmodelle bleiben im Repository.

## Freigegebene Nutzerwege

- Öffentliche Startseite mit vierstelligem Raumcode, QR-Scanner, kurzer Hilfe sowie eindeutigen Offline- und Fehlerhinweisen.
- Schülerlobby mit pseudonymer Geräteidentität, Warten auf den Start sowie klassischem Laufdiktat, freiem Üben, Battle und Stationsmodus.
- Lehrkraftweg Inhalt → Einstellungen → Lobby → Durchführung → Auswertung.
- Text-, Vokabel- und Kopfrecheninhalte mit Import, konfigurierbaren Trennregeln, manuellen Abschnitten und sicherer Antwortprüfung.
- Kurzlebige Supabase-Räume mit getrennten Lehrkraft- und Teilnehmertoken.
- Datenschutz und Impressum.

Nicht freigegeben sind persönliches Dashboard, Klassenverwaltung, allgemeine Material- und Aufgabenverwaltung, LernBox, Lernwörter außerhalb des Laufdiktats, eigenständiges Kopfrechnen außerhalb des Laufdiktats, Tastschreiben, Häuser, Duelle, Rankings, Ramagotchi, Cloud-Backup und automatische Förderzuweisung. Direkte Alt-URLs werden im Pilot zentral auf den passenden Pilot-Einstieg umgeleitet. Gespeicherte Altdaten werden nicht gelöscht oder migriert.

## Abnahmekriterien Schüler

1. Ein vierstelliger Code kann per Tastatur, Einfügen oder QR eingegeben werden.
2. Ein Name oder Pseudonym wird vor dem Beitritt verlangt; ein doppelter Name erhält serverseitig eine eindeutige Identität.
3. Lobby, noch nicht gestartet, beendet, ungültig, offline und Verbindungsabbruch sind unterscheidbare Zustände.
4. Nach Neuladen oder kurzer Unterbrechung werden gerätegebundene Identität und erreichbarer Rundenfortschritt wiederverwendet.
5. Jede Aufgabe zeigt nacheinander Merk- und Schreibphase. Richtiges und falsches Feedback sind eindeutig verschieden.
6. Der Abschluss nennt Aufgaben und Fehler und führt zurück zur Pilotstartseite.

## Abnahmekriterien Lehrkraft

1. Ein Text kann eingegeben oder als Textdatei importiert und in Aufgaben zerlegt werden.
2. Klassisches Laufdiktat, freies Üben, Battle und Stationen sind auswählbar; Reihenfolge, Hilfen, Vorlesen, strikte Eingabe, Sterne und modusspezifische Regeln sind konfigurierbar.
3. Eine Lobby kann ohne zusätzliche Freigabe geöffnet werden, sobald mindestens eine gültige Aufgabe vorliegt.
4. QR-Code und vierstelliger Raumcode enthalten niemals Lehrkraft- oder Teilnehmertoken.
5. Geräte, Verbindung, Fortschritt und Abschluss sind live erkennbar; die Runde kann beendet werden.
6. Ohne Supabase-Konfiguration oder bei Verbindungsfehler wird kein Erfolg simuliert.

## Daten- und Sicherheitsgrenze

- Raumkonfiguration, pseudonyme Teilnehmende und Fortschritt werden spätestens 24 Stunden nach Rundenende gelöscht; verlassene Räume enden nach drei Stunden.
- Teilnehmertoken sind raum- und gerätegebunden und nur gehasht gespeichert.
- Lehrkraft-Raumerstellung verlangt einen gesonderten Pilotfreigabecode. Er wird im HTTPS-RPC-Body übertragen, nicht in URLs, QR-Codes oder lokalem Langzeitspeicher.
- Im Pilot wird keine persönliche Lernhistorie und keine automatische Fehlerübergabe in die LernBox erzeugt. Diese bleibt einem späteren Ausbau-Gate vorbehalten.

## Freigabe-Gate

Der Pilot ist erst freigegeben, wenn Unit- und Integrationstests, Supabase-Grenztests, ein vollständiger E2E-Ablauf, Wiederaufnahme-, Fehler-, 320-Pixel-, Tastatur- und Axe-Prüfungen sowie Produktions-Build und statische Checks erfolgreich sind. Reale Geräte- und Unterrichtstests bleiben zusätzlich erforderlich.
