---
tags:
  - lernplattform
  - qualität
  - testing
  - freigabe
status: qualitätsgrundlage
stand: 2026-08-30
---

# Qualitätsgrundlage und Freigabe

## Zweck

Qualität ist kein letzter Prüfschritt vor der Veröffentlichung. Jede neue Funktion wird so geplant, gebaut und geprüft, dass Lernstände geschützt bleiben, die Bedienung verständlich ist und die Anwendung auf den vorgesehenen Geräten zuverlässig funktioniert.

## Kerngedanken

1. **Kein unbemerkter Datenverlust:** Lernereignisse, Lernstände und Lehrerinhalte dürfen bei Absturz, Update, Import oder Migration nicht still verloren gehen.
2. **Nachvollziehbare Lernlogik:** Gleiche Ereignisse führen reproduzierbar zu gleichen Lernständen. Regeln werden mit Beispielen und Tests dokumentiert.
3. **Local-first bleibt funktionsfähig:** Persönliche Lernrunden funktionieren nach dem ersten Laden ohne Verbindung. Ausfälle werden sichtbar und später sicher nachgeholt.
4. **Barrierearm und geräteübergreifend:** Kernfunktionen sind mit Touch, Maus und Tastatur sowie auf Smartphone, Tablet, Chromebook und Desktop bedienbar.
5. **Datensparsam und sicher:** Nur erforderliche Daten werden verarbeitet. Rollen- und Speichergrenzen werden technisch geprüft und nicht nur in der Oberfläche versteckt.
6. **Fehler sind reparierbar:** Nutzer erhalten verständliche Meldungen, behalten ihre Eingaben und bekommen einen sicheren Wiederholungs- oder Wiederherstellungsweg.
7. **Abwärtskompatible Entwicklung:** Datenformat und App-Version sind getrennt versioniert. Änderungen benötigen Migration, Rückwärtsprüfung und möglichst einen Rückweg.
8. **Pädagogische Qualität vor Spielmechanik:** Punkte, Hilfen und Wiederholungsregeln dürfen fachlich sinnvolles Lernen nicht verdrängen oder Schüler bloßstellen.

## Technische Qualitätssicherung im Code

Die Qualitätsziele werden durch verbindliche Architektur- und Werkzeugentscheidungen abgesichert:

- **TypeScript im strikten Modus** verhindert unklare optionale Werte, ungeprüfte Indexzugriffe und unbeabsichtigte Fall-through-Zweige.
- **Zod** prüft gespeicherte, importierte und übertragene Daten zur Laufzeit. TypeScript-Typen allein gelten nicht als Schutz für fremde Daten.
- **Dexie** kapselt IndexedDB, Transaktionen und versionierte Migrationen. Komponenten greifen nicht direkt auf IndexedDB zu.
- **Vitest** prüft Fachlogik, Migrationen und Komponenten schnell bei jeder Änderung.
- **Testing Library und user-event** prüfen Oberflächen über Rollen, Beschriftungen und reale Bedienabläufe statt über interne CSS-Strukturen.
- **fast-check** erzeugt viele Grenzfälle für Normalisierung, Dubletten, Idempotenz und Migrationsregeln.
- **Playwright** prüft vollständige Abläufe in Chromium, Firefox und WebKit sowie mobilen und Tablet-Profilen.
- **axe-core** sucht automatisiert nach WCAG-A/AA-Verstößen in den wichtigen Ansichten und Zuständen.
- **ESLint und Prettier** erzwingen Architektur-, React-, Barrierefreiheits- und Formatierungsregeln.
- **GitHub Actions** führt die Prüfungen bei Push und Pull Request automatisch aus.

Für komplexe, fehleranfällige Widgets wie Dialoge, ComboBoxen, Menüs, Tabs oder Drag-and-drop wird bei Bedarf **React Aria Components** eingesetzt. Einfache Bedienelemente bleiben natives HTML. Zusätzliche Bibliotheken werden nicht vorsorglich eingeführt, sondern benötigen einen klaren Qualitätsnutzen.

Der genaue technische Standard und die Quality-Gate-Kommandos stehen zusätzlich in `docs/engineering-quality.md` im Projektrepository.

## Architekturregeln für hohe Qualität

- Lernlogik bleibt als reine, framework-unabhängige TypeScript-Funktion testbar.
- Oberfläche, Speicher und Netzwerk dürfen den fachlichen Kern verwenden; der Kern kennt diese Schichten nicht.
- Lernereignisse bleiben unveränderlich und Projektionen reproduzierbar.
- Systemgrenzen akzeptieren ausschließlich validierte Daten.
- Fehler-, Leer-, Lade-, Offline- und Erfolgszustand werden technisch unterschieden.
- Nutzeraktionen und Importe bleiben bei Wiederholung idempotent.
- Eigene Kryptografie, direkte IndexedDB-Zugriffe aus Komponenten und verstreute Datumsarithmetik sind ausgeschlossen.
- Pädagogische Entscheidungen liefern einen nachvollziehbaren maschinenlesbaren Grund und passende Regressionstests.

## Automatische Quality Gates

Bei jeder Änderung müssen mindestens Formatierung, Linting, strikte Typprüfung, Unit- und Eigenschaftstests, Testabdeckung, Produktions-Build und Server-Rendering erfolgreich sein. Änderungen an Oberfläche oder Abläufen benötigen zusätzlich Browser- und Barrierefreiheitstests.

Für den fachlichen Kern gelten zunächst mindestens 90 Prozent Zeilen-, Statement- und Funktionsabdeckung sowie 85 Prozent Zweigabdeckung. Parser, Rollenentscheidungen und Migrationen erhalten bei ihrer Einführung strengere modulspezifische Anforderungen. Die Prozentzahl ersetzt niemals fachliche oder reale Nutzertests.

### Token-effizienter Prüf- und Freigabeablauf

Die Tiefe lokaler Prüfungen richtet sich nach Risiko und Umfang der Änderung. Während der Umsetzung werden gezielte Tests für die betroffenen Funktionen ausgeführt. Vor einem Push folgen die für die Änderung relevanten statischen Prüfungen, der Produktions-Build sowie bei Oberflächenänderungen fokussierte Browser- und Barrierefreiheitstests.

Nach dem Push laufen die vollständigen GitHub-Actions- und Cloudflare-Prüfungen selbstständig weiter. Codex fragt ihren Status nicht fortlaufend ab und richtet dafür keine Automation oder Heartbeat-Aufgabe ein. Ein erneuter Abruf erfolgt nur auf ausdrücklichen Wunsch oder sobald ein konkreter Fehlschlag gemeldet wurde. Dann wird zunächst ausschließlich der fehlgeschlagene Job samt Log untersucht und die Ursache gezielt behoben.

Die vollständige Browsermatrix in Chromium, Firefox und WebKit bleibt Bestandteil der automatischen Quality Gates und ist weiterhin für Zusammenführung und Freigabe maßgeblich. Der Verzicht auf aktives Polling reduziert ausschließlich den Tokenverbrauch; er schwächt keine Qualitätsanforderung ab.

## Definition of Done für jede Funktion

Eine Funktion gilt erst als fertig, wenn die zutreffenden Punkte erfüllt sind:

### Fachlichkeit

- erwartetes Verhalten und Grenzfälle sind beschrieben
- Lernstand und Leistungswertung bleiben getrennt
- fachliche Regeln besitzen konkrete Beispiele
- keine widersprüchlichen Zustände oder unklaren automatischen Entscheidungen

### Daten und Offlinebetrieb

- Speichern, Neuladen, Abbruch und erneuter Start sind geprüft
- doppelte Ereignisse und wiederholte Importe bleiben idempotent
- alte Daten können migriert oder verständlich abgelehnt werden
- Offlineverhalten und spätere Synchronisation sind festgelegt
- Export und Wiederherstellung werden bei Änderungen des Datenmodells mitgeprüft

### Bedienung und Barrierefreiheit

- verständliche Beschriftungen, Fokusreihenfolge und sichtbare Fokuszustände
- Bedienung ohne Hover und ohne ausschließlich farbliche Bedeutung
- sinnvolle Touch-Ziele und Unterstützung der Bildschirmtastatur
- Zoom bis 200 Prozent, Hoch- und Querformat ohne Funktionsverlust
- Fehler- und Erfolgszustände werden für Screenreader verständlich angekündigt
- reduzierte Bewegung und ausreichende Kontraste werden berücksichtigt

### Geräte und Browser

- kein horizontales Scrollen ab 320 CSS-Pixel Breite
- Smartphone, Tablet und Desktop entsprechend der Geräte-Testmatrix geprüft
- iOS Safari und Android Chrome für Schülerfunktionen berücksichtigt
- Chrome, Edge, Firefox und Safari für die jeweils unterstützten Lehrerfunktionen berücksichtigt
- Installation als PWA und normale Browsernutzung besitzen einen sicheren Fallback

### Sicherheit und Datenschutz

- Rollenprüfung findet an der tatsächlichen Funktions- und Datengrenze statt
- Eingaben, Importdateien und QR-Pakete werden validiert
- keine geheimen Schlüssel oder Klarnamen in Logs, URLs oder ungeschützten Exporten
- Löschung, Aufbewahrung und Datenminimierung sind geklärt
- neue Datenflüsse werden vor Umsetzung dokumentiert

### Technik und Freigabe

- automatisierte Tests für Kernregeln und bekannte Fehlerfälle
- Produktions-Build und statische Prüfungen erfolgreich
- relevante bestehende Funktionen wurden gegen Rückschritte geprüft
- offene Einschränkungen und bekannte Risiken sind dokumentiert
- Änderung ist zunächst in einer Testumgebung oder mit Testdaten erprobt

## Prüfstrategie

### 1. Schnelle Prüfungen bei jeder Änderung

- Datenmodell- und Lernlogiktests
- Komponenten- und Renderingtests
- Typ-, Format- und Buildprüfung
- Prüfung bekannter Fehlerfälle

### 2. Funktionsprüfung vor Zusammenführung

- vollständiger Hauptablauf und Abbruchstellen
- Offline, Neuladen und Wiederaufnahme
- Import, Export, Dubletten und ungültige Daten
- Tastatur- und Touchbedienung
- kleine, mittlere und große Ansicht

### 3. Meilensteinprüfung

- vollständige Geräte- und Browsermatrix
- Wiederherstellung einer realistischen Sicherungsdatei
- Migration von mindestens der vorherigen Datenformat-Version
- Barrierefreiheitsprüfung mit Tastatur und mindestens einem Screenreader
- Prüfung langsamer, abbrechender und fehlender Verbindung
- Sicherheits- und Datenschutzprüfung der neuen Datenflüsse
- fachliche Erprobung mit Testnutzern beziehungsweise Lehrkraft und Schülern

## Freigabestufen

1. **Entwicklung:** Testdaten; Änderungen und Datenverlust sind noch möglich.
2. **Interne Vorschau:** Hauptabläufe funktionieren; bekannte Einschränkungen sind sichtbar dokumentiert.
3. **Pilot:** begrenzte reale Nutzung mit Exportmöglichkeit, Rückfallplan und enger Fehlerbeobachtung.
4. **Produktiv:** Qualitätscheckliste erfüllt, Migration getestet, Datenschutz und organisatorische Freigabe geklärt.

Keine Pilot- oder Produktivfreigabe darf nur aufgrund eines erfolgreichen Builds erfolgen.

## Frühzeitig zu berücksichtigende Risiken

### PWA-Updates und Zwischenspeicher

Ein neues Programm darf nicht unbemerkt mit einem alten Datenformat oder veralteten Dateien arbeiten. Updates benötigen eine erkennbare Version, kontrollierte Cache-Aktualisierung und einen sicheren Neustartpunkt nach abgeschlossenen Lernrunden.

### Speichergrenzen und private Browsermodi

Browser können lokalen Speicher löschen oder begrenzen. Lernraum soll Speicherprobleme erkennen, vor gefährdeten Daten warnen und regelmäßig einen Export anbieten, ohne falsche Sicherheit zu versprechen.

### Datum, Uhrzeit und Zeitzonen

Fälligkeiten dürfen durch Sommerzeit, falsche Gerätezeit oder Reisen nicht unkontrolliert springen. Gespeichert werden eindeutige Zeitpunkte; Tagesgrenzen und Anzeigezeitzonen werden getrennt behandelt.

### Sprache und Texteingabe

Unicode, Umlaute, Akzente, verschiedene Tastaturen, typografische Apostrophe und Normalisierung müssen definiert sein. Automatische Korrektur des Betriebssystems darf eine Lernwertung nicht unbemerkt verfälschen.

### Rückfall und Wiederherstellung

Vor riskanten Migrationen wird automatisch eine lokale Sicherung angeboten oder angelegt. Eine beschädigte Datenbasis darf nicht still durch einen leeren Stand ersetzt werden.

### Beobachtbarkeit ohne Überwachung

Fehlerdiagnose soll ohne vollständige Schülerantworten oder personenbezogene Lernhistorien auskommen. Diagnosedaten sind freiwillig, minimiert und vor einer Übertragung verständlich erklärt.

### Leistungsgrenzen

Startzeit, Speicherbedarf und Reaktionszeit werden auf schwächeren Schulgeräten geprüft. Große Stapel, lange Historien und viele Klassenmitglieder gehören zu den Testfällen und nicht nur kleine Beispieldaten.

## Qualitätsnachweis pro Meilenstein

Für jeden größeren Meilenstein entsteht ein kurzer Prüfbericht mit:

- geprüfter Version und Datenformat-Version
- verwendeten Geräten und Browsern
- bestandenen und offenen Prüfungen
- bekannten Risiken und vorläufigen Einschränkungen
- Entscheidung: Entwicklung, interne Vorschau, Pilot oder produktiv

Vorlage: [[Qualitätsbericht - Vorlage]]

Siehe auch [[../13 - Datenschutz und Rollen/Anwendung|Datenschutz und Rollen]], [[../14 - Lokale Daten, Export und Cloud-Backup/Anwendung|Lokale Daten, Export und Cloud-Backup]], [[../15 - Gemeinsames Datenmodell/Anwendung|Gemeinsames Datenmodell]] und [[../16 - PWA, Offlinebetrieb und Sicherheit/Anwendung|PWA, Offlinebetrieb und Sicherheit]].
