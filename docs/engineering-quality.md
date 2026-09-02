# Technischer Qualitätsstandard

Dieser Standard ist verbindlich für Lernraum, Laufdiktat und LernBox. Er übersetzt Nutzerfreundlichkeit, pädagogische Qualität, Barrierefreiheit und Datensicherheit in überprüfbare Coding-Regeln.

## Architekturregeln

1. **Fachlicher Kern ohne UI-Framework:** Lernregeln, Datenmigrationen und Auswertungen liegen als reine TypeScript-Funktionen unter `src/domain`. React- oder Next-Importe sind dort per ESLint verboten.
2. **Schema-first an Systemgrenzen:** Importdateien, QR-Pakete, lokale Daten, Netzwerkantworten und Formulareingaben werden zur Laufzeit mit Zod geprüft. TypeScript-Typen allein reichen für fremde Daten nicht aus.
3. **Ereignisse sind unveränderlich:** Lernereignisse werden ergänzt, nicht nachträglich umgedeutet. Projektionen wie Fälligkeit und Boxstand müssen reproduzierbar neu berechnet werden können.
4. **Local-first über einen Adapter:** Direkter IndexedDB-Zugriff aus Komponenten ist verboten. Dexie wird ausschließlich hinter typisierten Repositories mit versionierten Migrationen verwendet.
5. **Abhängigkeiten zeigen nach innen:** Oberfläche und Speicher dürfen den fachlichen Kern verwenden; der fachliche Kern kennt Oberfläche, Browser und Speicher nicht.
6. **Explizite Zustände:** Laden, leer, erfolgreich, offline, eingeschränkt und fehlgeschlagen werden als eigene Zustände behandelt. Fehler dürfen nicht wie leere Daten aussehen.
7. **Keine eigene Kryptografie:** Signaturen, Verschlüsselung und Schlüsselgenerierung verwenden Web Crypto und geprüfte Standards. Eigene kryptografische Verfahren sind ausgeschlossen.

## Festgelegte Bibliotheken

| Aufgabe                       | Bibliothek                   | Verbindliche Verwendung                                          |
| ----------------------------- | ---------------------------- | ---------------------------------------------------------------- |
| Laufzeitvalidierung           | Zod                          | alle externen oder gespeicherten Daten                           |
| Lokale Datenbank              | Dexie                        | IndexedDB, Transaktionen und Migrationen                         |
| Unit-/Integrationstests       | Vitest                       | Fachlogik, Migrationen und Komponenten                           |
| Nutzernahe Komponententests   | Testing Library + user-event | Abfragen nach Rolle und Beschriftung; reale Interaktionsfolgen   |
| Generative Tests              | fast-check                   | Invarianten, Normalisierung, Idempotenz und Migrationsketten     |
| Browser-/Gerätetests          | Playwright                   | Chromium, Firefox, WebKit, Mobil- und Tabletprofile              |
| Automatische Barrierefreiheit | axe-core mit Playwright      | WCAG-A/AA-Prüfung wichtiger Zustände und Seiten                  |
| Statische Qualität            | TypeScript strict + ESLint   | Typfehler, Hook-Regeln, Barrierefreiheits- und Architekturregeln |
| Formatierung                  | Prettier                     | reproduzierbare Formatierung ohne Stil-Diskussionen              |

## Bibliotheken bei konkretem Bedarf

- **React Aria Components:** für komplexe Widgets wie Dialoge, ComboBoxen, Menüs, Tabs, Kalender oder Drag-and-drop. Einfache Links, Schaltflächen und Eingaben bleiben natives HTML.
- **Mock Service Worker:** sobald Räume oder andere Netzwerkabläufe entstehen; simuliert Erfolg, Verzögerung, Abbruch, ungültige Antworten und Offlinebetrieb.
- **React Hook Form:** nur für umfangreiche Lehrerformulare. Kleine Formulare bleiben nativ und werden nicht unnötig abstrahiert.
- **Internationalisierte Datumsbibliothek:** erst nach Festlegung der fachlichen Tages- und Zeitzonenregeln. Datumsarithmetik wird nicht verstreut selbst implementiert.

Nicht ohne neue Architekturentscheidung eingeführt werden globale State-Manager, vollständige UI-Frameworks, zusätzliche Datenbanken, eigene Kryptobibliotheken oder eine zweite Validierungsbibliothek.

## Coding-Regeln für pädagogische Qualität

- Lernregeln werden als benannte, reine Funktionen formuliert.
- Jede Regel besitzt Positiv-, Negativ- und Grenzbeispiele.
- „fachlich richtig“, „selbst korrigiert“, „mit Hilfe“ und „leistungsbewertet“ bleiben getrennte Werte.
- Zeit und Geschwindigkeit dürfen nicht implizit den Lernstand verändern.
- Zufällige Auswahl ist über einen injizierbaren Zufallsgenerator reproduzierbar testbar.
- Jede automatische Rückstufung oder Punkteänderung liefert einen maschinenlesbaren Grund.
- Änderungen der Lernlogik benötigen Regressionstests mit bestehenden Lernhistorien.

## Coding-Regeln für Nutzerfreundlichkeit

- Komponenten werden nach semantischer Rolle und zugänglichem Namen getestet, nicht nach CSS-Klassen.
- Tastatur, Touch und Bildschirmtastatur gehören zum normalen Testfall.
- Eine Aktion darf bei Doppeltippen, erneutem Senden oder Neuladen keine doppelten Ereignisse erzeugen.
- Nutzereingaben bleiben bei behebbaren Fehlern erhalten.
- Gefährliche Aktionen benötigen eindeutiges Ziel, Bestätigung und möglichst Wiederherstellbarkeit.
- Fehlermeldungen erklären Handlung und nächsten Schritt in kurzer Sprache.
- Animationen sind verzichtbar und respektieren reduzierte Bewegung.

## Quality Gates

### Bei jeder Änderung

`npm run check` muss erfolgreich sein. Es prüft Formatierung, Linting, strikte Typen, Testabdeckung, Produktions-Build und Server-Rendering.

### Bei jeder Änderung an Oberfläche oder Ablauf

Zusätzlich muss mindestens `npm run test:e2e:chromium` laufen. Vor einem Meilenstein läuft `npm run quality` über die vollständige Browser- und Gerätematrix.

### Mindestabdeckung

Für `src/domain` und `src/storage` gelten derzeit mindestens:

- 90 Prozent Zeilen, Statements und Funktionen
- 85 Prozent Verzweigungen
- 100 Prozent für sicherheitskritische Parser, Migrationen und Rollenentscheidungen wird pro Modul angestrebt und bei deren Einführung gesondert festgelegt

Abdeckung beweist keine Qualität. Sie ist eine Untergrenze gegen ungetesteten Kerncode und wird durch Eigenschafts-, Browser- und manuelle Tests ergänzt.

## Abhängigkeiten und Sicherheit

- Direkte Abhängigkeiten werden auf feste Versionen gepinnt; die Lockdatei wird committed.
- Dependabot prüft wöchentlich npm- und GitHub-Actions-Abhängigkeiten.
- Sicherheitsupdates werden getrennt von Funktionsänderungen geprüft und zeitnah eingespielt.
- Neue Produktionsabhängigkeiten benötigen einen klaren Nutzen, aktive Wartung, passende Lizenz und eine kurze Architekturbegründung.
- Eine nicht sofort behebbare Meldung wird mit Reichweite, tatsächlichem Einsatzpfad, Gegenmaßnahme und Neubewertungsdatum dokumentiert.

## Grenzen automatisierter Qualität

Axe erkennt nur einen Teil möglicher Barrieren. Playwright-Emulation ersetzt kein reales iPhone, iPad oder schwaches Schulgerät. Pädagogische Wirkung lässt sich nicht aus Testabdeckung ableiten. Vor Pilot und Produktivbetrieb bleiben daher reale Geräte-, Screenreader- und Nutzertests verpflichtend.
