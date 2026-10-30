# Technischer Qualitätsstandard

Dieser Standard ist verbindlich für Lernraum, Laufdiktat und LernBox. Er übersetzt Nutzerfreundlichkeit, pädagogische Qualität, Barrierefreiheit und Datensicherheit in überprüfbare Coding-Regeln.

## Architekturregeln

1. **Fachlicher Kern ohne UI-Framework:** Lernregeln, Datenmigrationen und Auswertungen liegen als reine TypeScript-Funktionen unter `src/domain`. React- oder Next-Importe sind dort per ESLint verboten.
2. **Schema-first an Systemgrenzen:** Importdateien, QR-Pakete, lokale Daten, Netzwerkantworten und Formulareingaben werden zur Laufzeit mit Zod geprüft. TypeScript-Typen allein reichen für fremde Daten nicht aus.
3. **Ereignisse sind unveränderlich:** Lernereignisse werden ergänzt, nicht nachträglich umgedeutet. Projektionen wie Fälligkeit und Boxstand müssen reproduzierbar neu berechnet werden können. Für die LernBox gilt: Der gespeicherte Kartenstand ist ein Zwischenspeicher. Ab dem letzten Ausgangsstand ergibt er sich vollständig aus den LernBox-Ereignissen (`replayLearningBoxCard`, geprüft per Eigenschaftstest). Ausgangsstände ohne Ereignis sind: neue Karte, Platzierung aus einer Unterrichtsrunde (Entscheidung 49) und Zusammenführen einer Sicherung.
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

`e2e/platform-quality.spec.ts` (axe-Prüfung aller Hauptseiten, LernBox, Lehrer-Arbeitsbereich, Einschreibung, Kopfrechnen) ist wieder Teil der Pflichtsuite und läuft in `npm run test:e2e` über alle Browser-Projekte. Die frühere Sperre über `ENABLE_PRE_PILOT_E2E` ist entfernt, weil seit Entscheidung 48 alle Lernbereiche freigegeben sind (`src/domain/release.ts`).

`npm run test:e2e:production` (`playwright.production.config.ts`, Spezifikation `e2e/production/hauptseiten.spec.ts`) prüft die Hauptseiten gegen den **Produktions-Build**: Nach `npm run build` läuft das Worker-Artefakt `dist/server` mit `wrangler dev --local` (kein Login, keine Netzressourcen); `vinext start` scheitert unter Node an `cloudflare:`-Importen (`ERR_UNSUPPORTED_ESM_URL_SCHEME`). Anders als die Entwicklungs-Suite gibt es hier weder Vorschau-Cookie noch `LERNRAUM_VORSCHAU`, und der Service Worker ist erlaubt. Geprüft werden je Hauptseite Status 200, Überschrift, axe (WCAG A/AA 2.2), eine Interaktion, die erst nach der Hydration reagiert (Hell/Dunkel-Umschalter, Plus-Menü der LernBox, clientseitige Navigation ohne Neuladen), keine Konsolen- und Laufzeitfehler; außerdem, dass Bereiche mit Stufe `vorschau` oder `aus` umleiten, und dass sich `/sw.js` registriert. In GitHub läuft der Lauf als Job `production` und gehört zum Sammelstatus `browser-quality`. Je Engine laufen zwei Projekte gegen denselben Build: Chromium als `production-chromium` (Desktop) und `production-mobile-chrome` (Pixel 7), WebKit als `production-webkit` (Desktop Safari) und `production-iphone` (iPhone 14); die Spezifikation ist unverändert und gilt für alle vier. Eine Wiederholung gibt es nur in CI und nur für die Spur; `failOnFlakyTests` lässt den Lauf trotzdem scheitern. Die Default-Suite sammelt `e2e/production` nicht ein.

Zusätzlich muss mindestens `npm run test:e2e:chromium` laufen. Vor einem Meilenstein läuft `npm run quality` über die vollständige Browser- und Gerätematrix.

### Mindestabdeckung

Für `src/domain`, `src/storage` und `src/speech` gelten derzeit mindestens:

- 90 Prozent Zeilen, Statements und Funktionen
- 85 Prozent Verzweigungen
- 100 Prozent für sicherheitskritische Parser, Migrationen und Rollenentscheidungen wird pro Modul angestrebt und bei deren Einführung gesondert festgelegt

Für `src/integrations` (Cloud-Sync, Kryptografie, Raum-API, Inhaltsübertragung, Sicherung) gelten eigene Grenzen in `vitest.config.ts`: 95 Prozent Zeilen und Statements, 93 Prozent Funktionen, 90 Prozent Verzweigungen. Für den Sicherheitskern (`crypto/`, `content-transfer/crypto.ts` sowie Merge, Engine, Umschlag, Uhr, Hash und Deduplizierung in `cloud-sync/`) gilt strenger: 93 Prozent Zeilen, 90 Prozent Statements, 95 Prozent Funktionen, 88 Prozent Verzweigungen. Ausgenommen sind Tests, der Testaufbau `cloud-sync/testing/` und reine Browser-Anbindung ohne eigene Logik (`google-identity.ts`, `live-room-client.ts`); jede Ausnahme steht mit Begründung in der Konfiguration.

Hinweis zum Lesen des Berichts: Läuft Vitest unter einem KI-Agenten, blendet die Text-Tabelle vollständig gedeckte Dateien aus (`skipFull`). Das Fehlen einer Datei im Bericht heißt dann nicht, dass sie nicht gemessen wird; `coverage/coverage-summary.json` enthält alle Dateien.

Abdeckung beweist keine Qualität. Sie ist eine Untergrenze gegen ungetesteten Kerncode und wird durch Eigenschafts-, Browser- und manuelle Tests ergänzt.

### Datenbankverträge

`npm run test:database` führt die gesamte SQL-Migrationskette in einer isolierten
PostgreSQL-WASM-Instanz (PGlite, ausschließlich Entwicklungsabhängigkeit) aus.
Die Tests rufen Funktionen als `anon` in getrennt abgeschlossenen Transaktionen
auf und prüfen Fortschritt, Wiederaufnahme, Tokenrechte, Zugriffslimits und
Materialtransfer. Nur die Registrierung von Cron-Jobs ist im Test nachgebildet;
zeitgesteuerte Ausführung, PostgREST-Gateway und Parallelität mehrerer
Datenbankverbindungen benötigen weiterhin einen Supabase-Integrationstest vor
Produktivfreigabe. PGlite ersetzt weder die produktive Datenbank noch Dexie.

`npm run test:e2e:live` prüft zusätzlich den Browserablauf mit kontrollierten
HTTP-Antworten einschließlich Übertragungsfehler, Wiederholung und Neuladen.
Seine Testkonfiguration setzt ausschließlich lokale Test-Verbindungsdaten.

## Abhängigkeiten und Sicherheit

- Direkte Abhängigkeiten werden auf feste Versionen gepinnt; die Lockdatei wird committed.
- Dependabot prüft wöchentlich npm- und GitHub-Actions-Abhängigkeiten.
- Sicherheitsupdates werden getrennt von Funktionsänderungen geprüft und zeitnah eingespielt.
- Neue Produktionsabhängigkeiten benötigen einen klaren Nutzen, aktive Wartung, passende Lizenz und eine kurze Architekturbegründung.
- Eine nicht sofort behebbare Meldung wird mit Reichweite, tatsächlichem Einsatzpfad, Gegenmaßnahme und Neubewertungsdatum dokumentiert.

## Grenzen automatisierter Qualität

Axe erkennt nur einen Teil möglicher Barrieren. Playwright-Emulation ersetzt kein reales iPhone, iPad oder schwaches Schulgerät. Pädagogische Wirkung lässt sich nicht aus Testabdeckung ableiten. Vor Pilot und Produktivbetrieb bleiben daher reale Geräte-, Screenreader- und Nutzertests verpflichtend.
