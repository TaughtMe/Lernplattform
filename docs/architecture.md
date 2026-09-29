# Architekturgrundlage

## Gewählter Schnitt

Lernraum wird als eine gemeinsame PWA aufgebaut. LernBoxV2 und Laufdiktat sind verbindliche, bereits funktionsfähige Quellreferenzen für die Fachmodule:

- `app/` enthält die gemeinsame Navigation und die Lernraum-Einstiege.
- Wiederverwendbare Fachlogik, Bedienabläufe und Tests werden gezielt portiert.
- App-Hüllen, Router, PWA-Manifeste, Service Worker, eigene Themes und doppelte Einstellungen werden nicht übernommen.
- `src/domain/` enthält die framework-unabhängige Lernlogik und die plattformweiten Verträge für Klasse, Freigabe, Herkunft und Ergebnisübergabe.
- `src/storage/` stellt gemeinsame persönliche, Klassen- und Lehrerdatenbereiche bereit.

## Integrationsregel

Vor einer neuen Fachimplementierung wird immer zuerst im jeweiligen Quellrepository geprüft, ob die Funktion dort bereits vorhanden ist. Geeigneter Code wird auf seine Abhängigkeiten geprüft, gezielt portiert und an das gemeinsame Routing, Theme, Datenmodell, die Identität, Klassenfreigaben und den Ergebnisfluss angepasst. Eine zweite Anwendung innerhalb des Lernraums und eine parallele Eigenimplementierung derselben Fachregel sind nicht vorgesehen.

Die aktuell abgeglichenen Quellstände und die Übernahmeregeln stehen in [upstream-integration.md](upstream-integration.md).

## Oberfläche

Die Oberfläche folgt dem Design „Lernraum UI“ (`docs/design/`, Entscheidung 47). Es gibt genau eine Gestaltungsschicht: Tokens und Klassen mit Präfix `ui-` in `app/ui/lernraum-ui.css`, React-Bausteine in `app/ui/` und die beiden Rahmen in `app/ui/shell/`. Bausteine sind reine Darstellung ohne Speicherzugriff. Ältere Seiteninhalte, die noch nicht umgebaut sind, laufen im neuen Rahmen als `.ui-legacy`; `app/globals.css` enthält nur noch deren tatsächlich verwendete Regeln. Kontraste beider Farbmodi prüft `app/ui/contrast.test.ts` gegen WCAG AA.

## Datenbereiche

1. **Persönlich:** Vokabeln, Lernereignisse, Projektionen und Einstellungen.
2. **Klasse:** veröffentlichte Inhaltspakete und pseudonyme Mitgliedschaften.
3. **Lehrer:** Klassenlisten, Namenszuordnungen und Abgabeprotokolle.

Kein Bereich erhält automatisch Zugriff auf einen anderen. Übertragungen verwenden ein explizites, versioniertes Format.

## Geräteübergreifende Grundlage

Alle Module werden mobile-first und responsiv entwickelt. Gemeinsame Navigation, Layout-Tokens und Bedienregeln liegen im Plattformkern, damit Laufdiktat und LernBox keine abweichenden mobilen Sonderlösungen benötigen. Die verbindliche Geräte- und Browsermatrix steht in [device-support.md](device-support.md).

Der verbindliche Coding-, Bibliotheks- und Teststandard steht in [engineering-quality.md](engineering-quality.md).

## Aktueller fachlicher Stand

Welche Bereiche sichtbar sind, steuert das Freigaberegister `src/domain/release.ts` (Entscheidung 47). Jeder Bereich steht auf `aus`, `vorschau` oder `frei`; der Proxy (`proxy.ts`) leitet nicht sichtbare Routen um, Navigation und Kacheln blenden sie aus. Im Schulbetrieb sind Start, Raumbeitritt, Lehrkraft-Laufdiktat, Kopfrechnen, Datenschutz und Impressum frei; der übrige Lernraum liegt in der Vorschau, Motivation und Duell sind aus. Damit ist der Umfang aus dem [Pilot-Produktvertrag](laufdiktat-pilot-product-contract.md) die Standardeinstellung, ohne dass Komponenten, Fachlogik, Tests oder lokale Daten entfernt werden. Das Register regelt Sichtbarkeit, nicht Zugriffsrechte.

LernBox, Laufdiktat, Kopfrechnen, Lernwörter und Tastschreiben laufen nativ unter gemeinsamen Lernraum-Routen. Lernwörter speichern Merkstufe und Wiederholungsfälligkeit getrennt; Tastschreiben bewertet Genauigkeit vor Geschwindigkeit. LernBox, Lernwörter, Kopfrechnen und Tastschreiben schreiben typisierte Ereignisse in den persönlichen Lernverlauf oder stellen ihre nativen Fälligkeiten über einen Modul-Adapter bereit.

`LearningRecommendation` ist der gemeinsame Vertrag für **Heute üben**. Der Empfehlungskern priorisiert frühere Fehler vor Fälligkeiten und Fälligkeiten vor neuen Lernschritten. Er zeigt pro aktivem Klassenmodul höchstens eine klare Empfehlung mit Begründung und passender Zielroute. Ein fest eingebauter Demo-Katalog gehört nicht mehr zur Tagesauswahl.

`LearningBundleV1` bleibt das versionierte Austauschformat zwischen Modulen und transportiert beispielsweise fehlerhafte Laufdiktat-Vokabeln dublettenfrei in die persönliche LernBox. Vollständige persönliche Antworten bleiben lokal.

Der nächste fachliche Schritt ist, Lernwortrunden direkt aus den empfohlenen individuellen Merkstufen zusammenzustellen und Tippsequenzen aus den tatsächlich unsicheren Tasten zu erzeugen. Danach werden lokale Klassenmitgliedschaften und versionierte Klassenpakete anstelle der fest eingebauten Demo-Klasse angebunden. Häuser, Serie und Abzeichen sind gebaut, bleiben aber bis zu einem stabilen Lernkern ausgeschaltet (Entscheidungen 39 und 47); Duelle folgen später.

## Persönliches Matheüben

Matheversuche erweitern `LearningEventV1` additiv um den optionalen `math`-Datensatz. Bestehende Ereignisse bleiben gültig; es entsteht weder eine zweite Datenbank noch eine neue Tabelle. Das Repository prüft gespeicherte Daten zur Laufzeit. Stabile Versuch-IDs verhindern doppelte Einträge bei erneuter Speicherung. Die Projektion lässt sich aus den unveränderten Ereignissen wiederherstellen.

Fehler, Korrekturen und Lösungen mit Hilfe bleiben fällig. Zwei sichere Antworten erlauben eine Wiederholung nach einem Tag; ein erfolgreicher späterer Abruf in einer neuen Runde verlängert auf drei Tage. Ein neuer Fehler macht die Aufgabe erneut fällig. Varianten werden dem ursprünglichen Lernobjekt zugeordnet; andere Fehler werden dadurch nicht erledigt. Eine Runde umfasst höchstens zehn Wiederholungsaufgaben, eigene Runden höchstens fünfzig.

Der gemeinsame Aufgabengenerator bleibt die Quelle. Einfache Aufgaben erhalten Varianten nach Rechenart, Zahlenraum, Einmaleinsreihe und Lückenposition. Dezimalzahlen und komplexe Ausdrücke werden vorerst exakt wiederholt. Bei alten Räumen ohne Generatoreinstellungen werden diese aus der Aufgabe abgeleitet. Nicht erzeugbare Kombinationen melden einen Fehler, statt still Aufgaben außerhalb der gewählten Regeln zu liefern.

Die Raumwertung endet vor dem Wechsel zur persönlichen Übung. Die persönlichen Antworten bleiben lokal. Gemeinsam genutzte Stationsgeräte erzeugen keine persönliche Mathehistorie.
