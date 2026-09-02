# Integration der bestehenden Anwendungen

## Verbindliche Quellen

| Modul               | Repository               | abgeglichener Stand                           | Rolle                                                                                                                      |
| ------------------- | ------------------------ | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| LernBox             | `TaughtMe/LernBoxV2`     | `64051b6da45a9a29ce67cdecceef815718a13818`    | Referenz für Decks, Karten, Leitner-Lernen, Import/Export und lokale Speicherung                                           |
| Laufdiktat          | `TaughtMe/Laufdiktat`    | `6c2ade41eadd2721f051df168244ed09563cea21`    | vollständige Referenz für Dashboard, Räume, Spielmodi, Stationen, Battle, Importe, Feedback und Realtime                   |
| Claude-Arbeitsstand | `TaughtMe/Lernplattform` | `claude/lernplattform-aktueller-stand-8g8i2x` | Prüfquelle für Lernwort-Persistenz und den fachlichen Tastschreibkern; keine übergeordnete Produkt- oder Navigationsquelle |

Ein neuer Abgleich aktualisiert die Commit-IDs in diesem Dokument. Änderungen werden anschließend als Upstream-Differenz geprüft, statt Funktionen im Lernraum erneut zu entwerfen.

## Was gezielt übernommen wird

- fachliche Regeln und Zustandsübergänge
- vorhandene Lern- und Unterrichtsabläufe
- getestete Utility-Funktionen und Validierungen
- zugängliche Interaktionsmuster, soweit sie in die Lernraum-Komponenten passen
- vorhandene Unit-Tests als Integrationsschutz

## Was ausdrücklich nicht übernommen wird

- eigenständige App- und Layout-Hüllen
- eigener Router oder eingebettete Seiten per iframe
- eigenes PWA-Manifest und eigener Service Worker
- eigene Theme-, Navigations- oder allgemeine Einstellungsverwaltung
- parallele IndexedDB-Datenbank für denselben persönlichen Lernbereich

## Was der Lernraum bereitstellt

- gemeinsame Kopfzeile, Navigation und responsives Theme
- native Darstellung unter stabilen Lernraum-Routen
- Klassen- und Modulfreigaben
- Zuordnung zu Schüler, Klasse und Lehrkraft
- Übergabe vorhandener Ergebnisse an den gemeinsamen Lernverlauf und das optionale Klassenranking
- gemeinsame lokale Datenbereiche, Cache und Realtime-Konfiguration

Diese Ergänzungen dürfen das Verhalten des Quellmoduls nicht stillschweigend verändern. Abweichungen brauchen einen dokumentierten pädagogischen oder technischen Grund und einen Test.

## Selektive Übernahme aus dem Claude-Arbeitsstand

Aus dem divergierten Claude-Branch wurden bewusst nur fachlich passende Teile übernommen und an die bereits Vault-konforme Foundation angepasst:

- Lernwörter speichern Merkstufe und Leitner-Fälligkeit getrennt im gemeinsamen persönlichen Datenbereich.
- Lernwortversuche erzeugen typisierte lokale Lernereignisse; Fehler und fällige Wörter erscheinen dadurch im gemeinsamen Lernkreislauf.
- Tastschreiben folgt einem linearen Curriculum von der Grundstellung bis zum zusammenhängenden Text.
- Genauigkeit entscheidet über den Lernfortschritt; Tempo bleibt eine informative Zusatzkennzahl.
- Unsichere Tasten, Korrekturen und Rundenfortschritt bleiben lokal und fließen in den persönlichen Fortschritt ein.
- LernBox, Lernwörter, Kopfrechnen und Tastschreiben liefern ihre Fehler, Fälligkeiten und nächsten Schritte über denselben `LearningRecommendation`-Vertrag an **Heute üben**.

Nicht übernommen wurden die abweichende Startseite und Navigation, eine zweite IndexedDB-Abstraktion, Punkte, Abzeichen, Medaillen, Zeitrennen, Buchstabenregen, Häuser, Rankings, Duelle sowie eigene App- und Theme-Hüllen. Diese Teile würden vor dem funktionierenden adaptiven Kern zusätzliche Produktwelten eröffnen.

## Integrationsreihenfolge

1. LernBox-Fachlogik für Decks, Karten, Leitner-Stände, Richtungen und Sicherungen in den gemeinsamen Domänen- und Speicherbereich portieren.
2. Eine native LernBox-Oberfläche mit Lernraum-Theme und gemeinsamer Navigation bereitstellen.
3. Laufdiktat-Fachlogik und benötigte Unterrichtsabläufe ebenso gezielt integrieren.
4. Fehler und Ergebnisse über `LearningBundleV1` dublettenfrei an die persönliche LernBox übergeben.
5. Die Tests beider Quellprojekte in das gemeinsame Quality Gate aufnehmen.
6. Upstream-Änderungen regelmäßig commitgenau abgleichen.

## Aktueller Laufdiktat-Port

Der erneute Abgleich für den Laufdiktat-Pilot am 31. August 2026 bestätigt weiterhin Commit `6c2ade41eadd2721f051df168244ed09563cea21`; das Upstream-Repository enthält keinen neueren Stand. Der Pilot verwendet den echten klassischen Modusnamen `LAUFDIKTAT`. Der frühere Lernraum-Alias `TEST` wird an der Sessiongrenze rückwärtskompatibel eingelesen und auf `LAUFDIKTAT` normalisiert.

Aus Laufdiktat `6c2ade4` sind jetzt nativ übernommen und durch gemeinsame Tests geschützt:

- typabhängige Antwortprüfung für Text und Vokabeln
- Vokabelimport mit Alternativantworten und drei Abfragerichtungen
- deterministische, stufenweise Hinweise im freien Üben
- Textzerlegung für Sätze und Zeilen im persönlichen Einstieg
- ursprüngliche Fünf-Sterne-Berechnung nach Fehlerquote
- Ablauf Ansehen → Verdecken → Schreiben → Rückmeldung → Abschluss
- gesicherter Raumbeitritt über `join_room_secure` mit wiederverwendbarer, sitzungsgebundener Teilnehmeridentität
- native Lobby mit Supabase Presence sowie Übernahme der vorhandenen Ereignisse `session-start` und `session-ended`
- autorisierter Sitzungsabruf über `get_room_state_secure`; öffentliche Broadcasts enthalten weiterhin weder Aufgaben noch Lösungen
- natives Live-Spiel für Text, Vokabeln und Kopfrechnen mit ursprünglicher Antwortprüfung, Fortschrittsrückgabe, Wiederaufnahme und Teilnehmer-Heartbeat
- native Lehrkraft-Erstellung für Text-, Vokabel- und Kopfrechenrunden mit Übungsmodus und Lernstandscheck
- scanbare QR-/Code-Lobby mit kombinierter Presence- und Heartbeat-Teilnehmeranzeige
- sicherer Sitzungsstart über `update_session_secure`; das anschließende Broadcast-Ereignis enthält keine Aufgaben oder Lösungen
- vollständiger nativer Lehrer-Wizard mit Dateiimport, Kopfrechengenerator, Hilfen, vier Spielmodi und wiederaufnehmbarem Lehrerraum
- Stationsmodus mit Schülernummern, stabiler optionaler Reihenfolge, Spickerzählung und sicherem Stationsfortschritt
- Battle mit fairer Ladung, Tinte, Flimmern, Schild und zielgerichteten Realtime-Ereignissen
- detaillierte Live-Auswertung mit Aktiv-/Fertig-Status, Fortschritt, Sternen, Fehlerhäufigkeiten und CSV-Export
- vollständiger gemeinsamer Kopfrechenkern mit Zahlenraum, Null-/Negativregeln, Einmaleinsreihen, Lückenaufgaben und sicherem Ausdrucksparser für Dezimalzahlen, Klammern, Potenzen, Brüche und Wurzeln
- vollständiger Texteditor mit Zeichen-, Zeilen- und eigenen Trennern, manuellen Bereichen, Ausschluss und Reihenfolge
- strenger Eingabemodus mit Paste-/Drop-/Autokorrektur-Schutz und mobilem Fallback gegen Masseneinfügungen
- faire Battle-Zielauswahl, Schild, Tinte und Flimmern mit den ursprünglichen Aufholregeln
- kurzer Retry für kritischen Beitritt und Sitzungsstart sowie ein Live-Debounce mit Maximalwartezeit
- Exit-Warnung, Bildschirm-Wake-Lock und sprachgerechtes Vorlesen während aktiver Runden

Die App-Hülle, ihr Router, Service Worker, eigenes Theme und allgemeine Einstellungen wurden bewusst nicht übernommen. Laufdiktat läuft als fester Bestandteil des Lernraums und verwendet dessen Theme, Navigation und responsive Qualitätsgrundlage. Noch offen bleibt die vollständige lokale Übergabe aller Live-Fehler an die jeweiligen persönlichen Fördermodule; dafür ist weiterhin ein ausdrücklicher, datensparsamer Rückgabeweg nötig.

Der Raumbeitritt lädt nur dann den Browserclient, wenn `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` gesetzt sind. Ein Service-Role-Schlüssel darf niemals im Browser liegen. Ohne Konfiguration bleibt die lokale Anwendung vollständig nutzbar und nennt die fehlende Live-Verbindung verständlich; sie simuliert keinen erfolgreichen Raumbeitritt.
