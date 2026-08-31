---
name: lernraum-feature
description: Implementiere oder ändere Funktionen der Lernplattform einschließlich Fachlogik, Benutzeroberfläche und Lernabläufen. Verwende diesen Skill bei Features, UI-Änderungen und Fehlerbehebungen im Lernraum; nicht für reine Recherche oder allgemeine Codex-Fragen.
---

# Lernraum-Feature

Setze Lernraum-Änderungen als überprüfbare Nutzerergebnisse um. Ermittle zuerst, was Schüler oder Lehrkräfte nach der Änderung zuverlässig tun können sollen, und leite daraus konkrete Akzeptanzkriterien ab.

## Relevanten Kontext laden

- Beachte `AGENTS.md` und behandle es als aktuellen Einstieg in die Projektregeln.
- Lies `docs/architecture.md` bei Änderungen an Modulen, Datenbereichen, Speicherung oder Integration.
- Lies `docs/engineering-quality.md` für die betroffenen Architektur-, Test-, Barrierefreiheits- und Sicherheitsregeln.
- Lies `docs/device-support.md` bei Änderungen an Oberfläche oder Bedienablauf.
- Suche bei fachlichen oder pädagogischen Entscheidungen gezielt unter `obsidian-export/Lernplattform`. Lade nur die für die Aufgabe relevanten Dokumente.
- Prüfe vor einer neuen Fachimplementierung die in `docs/upstream-integration.md` beschriebenen Quellreferenzen und Übernahmeregeln.

## Umsetzen

1. Untersuche den bestehenden Nutzerablauf, die Implementierung und die zugehörigen Tests.
2. Formuliere die überprüfbaren Akzeptanzkriterien. Frage nur nach, wenn eine fehlende Entscheidung das Ergebnis wesentlich verändern würde.
3. Verwende vorhandene Fachmodelle, Komponenten und Muster. Führe keine parallele Fachlogik oder zweite App-Hülle ein.
4. Halte Fachlogik framework-unabhängig und Systemgrenzen laufzeitvalidiert. Respektiere die getrennten persönlichen, Klassen- und Lehrerdatenbereiche.
5. Ergänze fokussierte Tests für geändertes Verhalten, relevante Grenzfälle und Regressionen.
6. Führe während der Umsetzung zuerst gezielte Prüfungen für den betroffenen Bereich aus.

## Oberfläche selbst prüfen

Wenn sichtbare Oberfläche oder Bedienablauf betroffen sind:

- Starte die Anwendung und durchlaufe den geänderten Ablauf im Browser.
- Prüfe die betroffenen Zustände in einer passenden Desktop- und Mobilansicht sowie ab 320 CSS-Pixel Breite.
- Prüfe Tastaturbedienung, Fokusführung, zugängliche Namen, Touch-Ziele und horizontales Scrollen.
- Berücksichtige je nach Ablauf Laden, leer, erfolgreich, offline, eingeschränkt und fehlgeschlagen. Fehler dürfen nicht wie leere Daten wirken; behebbar fehlerhafte Eingaben müssen erhalten bleiben.
- Verwende DOM-Zustand und Screenshots als Nachweis, wenn Layout oder visuelle Hierarchie betroffen sind.
- Behebe reproduzierbare Regressionen, die durch die Änderung entstanden sind, und wiederhole die betroffene Prüfung.
- Führe fokussierte Playwright- und Barrierefreiheitsprüfungen gemäß den Projektregeln aus. Die vollständige Cross-Browser-Suite bleibt dem vorgesehenen Quality Gate vorbehalten.

## Risiko angemessen behandeln

Behandle Schülerdaten, Rollenentscheidungen, Authentifizierung, Freigabecodes, Synchronisierung, lokale Migrationen, Kryptografie und Datenübertragung als risikoreich. Mache Datenfluss und Vertrauensgrenzen vor der Änderung nachvollziehbar und teste unerlaubte Zugriffe, ungültige Daten, Wiederholungen sowie Fehlerfälle. Verwende keine eigene Kryptografie.

## Abschließen

- Wähle lokale Prüfungen proportional zu Risiko und Umfang.
- Prüfe vor einem Push die relevanten statischen Checks und den Produktions-Build; ergänze bei UI-Änderungen fokussierte Browser- und Barrierefreiheitstests.
- Frage externe CI-Ergebnisse nur auf ausdrücklichen Wunsch oder bei einem gemeldeten konkreten Fehlschlag ab. Erstelle dafür keine Automation.
- Berichte knapp das erreichte Nutzerergebnis, die wesentlichen Änderungen und die tatsächlich ausgeführten Prüfungen. Nenne verbleibende Unsicherheiten ausdrücklich.
