---
tags:
  - lernplattform
  - qualitätsbericht
status: offen
---

# Qualitätsbericht – Oberflächenumbau „Lernraum UI“

## Stand

- **Meilenstein:** Oberflächenumbau nach [[../19 - Entscheidungsprotokoll/Anwendung|Entscheidung 47]], Phasen 0–11 aus `docs/umsetzungsplan-lernraum-ui.md`
- **App-Version:** 0.5.0
- **Datenformat-Version:** unverändert (IndexedDB-Schema 5, `LearningEventV1`, `LearningBundleV1`); der Umbau ändert keine Datenverträge
- **Prüfdatum:** 29. September 2026
- **Verantwortlich:** Umsetzung durch Claude Code, Freigabe durch die Projektverantwortliche Lehrkraft
- **Branch:** `claude/lernraum-ui` (abgezweigt von `codex/repair-room-contracts`)
- **Vorgesehene Freigabestufe:** interne Vorschau

## Umfang

### Neu oder geändert

- Gestaltungssystem: Tokens hell/dunkel (Anthrazit, Bernstein, warmes Papier), Grundbausteine in `app/ui/`, automatische Kontrastprüfung
- Schüler- und Lehrerrahmen mit dunkler Leiste und mobiler Navigation
- Freigaberegister `src/domain/release.ts` (`aus` / `vorschau` / `frei`) ersetzt das Pilot-Gate; Vorschau per Cookie `?vorschau=an`
- Startseite nach Entwurf 2a mit zufälligem Tier und Raumcode; Laufdiktat für Schüler und Lehrkraft im Design (Tiernamen statt technischer Schlüssel in Lobby, Live-Ansicht und CSV)
- LernBox, Wortspeicher und Tastenwelt im Design; Fachwissen exemplarisch gefüllter Teile unter `docs/inhalte/`
- Dashboard „Heute“, Profil mit Tierraster, Farbschema und persönlicher Datensicherung (Download, Ordner, Wiederherstellung, Erinnerung nach 14 Tagen)
- Lehrerbereich mit Übersicht und Klassenliste; Häuser (Schüler und Lehrkraft) im Design
- Aufräumen: alte Kopfzeilenkette und ungenutzte Icons entfernt, 820 ungenutzte Regeln aus `app/globals.css` gelöscht

### Bewusst nicht enthalten

- Duell (bleibt `aus`, fachlich nicht vorhanden)
- Motivation (Häuser, Serie) ist gebaut, aber standardmäßig `aus` (Entscheidungen 39 und 47)
- Vollständiger Umbau älterer Seiteninhalte (Klassenbereich, Kopfrechnen, Lehrer-Unterseiten Klassen/Material/Aufgaben/Einstellungen): sie laufen im neuen Rahmen als `.ui-legacy` mit Design-Typografie
- Änderungen an Supabase-Verträgen, Datenformaten oder Migrationen

## Automatisierte Prüfungen

- [x] Produktions-Build
- [x] Typ- und statische Prüfungen (Prettier, ESLint inkl. jsx-a11y, TypeScript strikt)
- [x] Datenmodell- und Lernlogiktests (348 Unit-/Komponententests, 15 Datenbankvertragstests)
- [x] Rendering- und Komponententests (Render-Tests inkl. Freigabe- und Umleitungsprüfung)
- [ ] Migrations- und Rückwärtstests – entfällt, keine Formatänderung
- [x] bekannte Fehlerfälle gegen Rückschritte (Live-e2e 10/10 in Chromium)

Die Plattformsuite (`ENABLE_PRE_PILOT_E2E=1`) lief lokal in Chromium mit 28 bestandenen und 2 übersprungenen Fällen. Zwei Fälle schlagen nur in der Entwicklungsumgebung fehl, weil dort Google Fonts per Zertifikat blockiert wird und der Test Konsolenfehler verbietet („the native LernBox creates…“, „teachers can prepare every native live-room…“). In GitHub Actions ist dieser Fehler nicht zu erwarten; bestätigt wird das erst durch den CI-Lauf.

Nach dem Entfernen der ungenutzten Stilregeln wurden 22 Seiten in hell/dunkel und bei 1280/390 px vor und nach der Änderung pixelgenau verglichen. Abweichungen gab es nur beim zufällig gewählten Tier.

## Daten und Wiederherstellung

- [x] Speichern, Neuladen und Wiederaufnahme (Live-e2e, Profil-e2e)
- [ ] Offlinebetrieb und spätere Synchronisation – unverändert, nicht erneut geprüft
- [x] Import, Export und Dubletten (Datensicherung nutzt die bestehenden, getesteten Funktionen)
- [x] ungültige oder beschädigte Daten (Wiederherstellung meldet ungültige Dateien)
- [ ] Migration der vorherigen Datenformat-Version – entfällt
- [ ] Wiederherstellung einer realistischen Sicherung – auf realem Gerät noch offen
- [ ] Abbruch oder Fehler während einer Migration – entfällt

## Geräte und Browser

| Umgebung | Hochformat | Querformat | Touch/Tastatur | Ergebnis / Hinweis |
|---|---|---|---|---|
| kleines Smartphone · iOS Safari | ☐ | ☐ | ☐ | über CI (Mobile Safari) und reales Gerät offen |
| kleines Smartphone · Android Chrome | ☐ | ☐ | ☐ | lokal nur Chromium mit 390 px geprüft |
| Tablet · iPadOS Safari | ☐ | ☐ | ☐ | offen |
| Tablet/Chromebook · Chrome | ☐ | ☐ | ☐ | offen |
| Desktop · Chrome/Edge | – | – | ☑ | Chromium lokal, 1280 px, hell und dunkel |
| Desktop · Firefox | – | – | ☐ | über CI offen |
| Desktop · Safari | – | – | ☐ | über CI (WebKit) offen |

## Barrierefreiheit

- [x] vollständige Tastaturbedienung der Hauptwege (e2e: Profil, Raumbeitritt)
- [x] sichtbare Fokusreihenfolge (einheitlicher Fokusring in `lernraum-ui.css`)
- [ ] Zoom bis 200 Prozent – nicht gesondert geprüft
- [ ] Screenreader-Hauptablauf – nicht mit echtem Screenreader geprüft
- [x] Kontraste und nicht ausschließlich farbliche Bedeutung (Kontrasttest, axe ohne Befund auf allen umgebauten Seiten)
- [x] reduzierte Bewegung (Animationen im `.ui`-Bereich werden abgeschaltet)
- [x] verständliche Fehler- und Erfolgsmeldungen

## Sicherheit und Datenschutz

- [x] Rollen- und Datenbereichsgrenzen unverändert; das Freigaberegister regelt nur Sichtbarkeit
- [x] Validierung von Eingaben, Importen und QR-Paketen unverändert
- [x] keine sensiblen Inhalte in Logs, URLs oder ungeschützten Exporten; Lobby und CSV zeigen Tiernamen statt technischer Schlüssel
- [x] Löschung und Aufbewahrung unverändert
- [x] neue Datenflüsse: keine. Die Datensicherung bleibt lokal (Download oder gewählter Ordner)
- [ ] rechtliche oder organisatorische Prüfung – für den Umbau nicht erforderlich; Pilotbedingungen gelten weiter

## Leistungs- und Belastungsprüfung

- [ ] schwächeres Schulgerät
- [ ] großer Vokabelstapel
- [ ] lange Lernhistorie
- [ ] große Klasse beziehungsweise viele Abgaben
- [ ] langsame, abbrechende und fehlende Verbindung

Durch das Entfernen von rund 5 000 Zeilen Stilregeln ist das Stylesheet deutlich kleiner geworden. Gemessen auf Schulgeräten wurde noch nicht.

## Fachliche und pädagogische Prüfung

- [x] Lernregeln unverändert (keine Änderungen an `src/domain`-Lernlogik außer Freigaberegister und Tastenwelt-Stationen)
- [x] Lernstand und Leistungswertung bleiben getrennt
- [x] Hilfen, Fehler und Selbstkorrekturen werden wie bisher behandelt
- [x] keine Bloßstellung: Häuser ohne Einzelrangliste, Motivation standardmäßig aus
- [ ] Rückmeldung aus Testnutzung festgehalten

## Befunde

| Priorität | Befund | Auswirkung | Entscheidung / Aufgabe |
|---|---|---|---|
| mittel | Ältere Seiteninhalte nutzen noch `app/globals.css` | zwei Stilschichten bleiben bestehen | Folgeschritt: Seiten auf `ui-`-Bausteine umstellen, dann `globals.css` auflösen |
| niedrig | Häuser zeigen auf Schülergeräten einen Beispielstand der anderen Häuser | kann ohne Hinweis missverstanden werden | Hinweis „Beispielstand“ ist sichtbar; echter Stand nur am Beamer (Air-Gap) |
| niedrig | Tastenwelt-Stationen und Teile des Wortspeichers sind exemplarisch gefüllt | Inhalte noch nicht fachlich vollständig | Wissen in `docs/inhalte/`, Anbindung als eigener Schritt |
| niedrig | Zwei Plattformtests scheitern nur in der Sandbox (Fonts blockiert) | lokale Prüfung unvollständig | in GitHub-CI bestätigen |

## Bekannte Einschränkungen

- Die vollständige Cross-Browser-Suite läuft nur in GitHub Actions und nur für `main`, `codex/**` und Pull Requests. Für diesen Branch ist dafür ein Pull Request gegen `main` nötig.
- Motivation lässt sich für Vorschaugeräte mit `LERNRAUM_FREIGABE="motivation=vorschau"` einschalten; im Entwicklungsmodus ist sie ohne diese Einstellung ebenfalls aus.

## Rückfallplan

- **Sicherung vorhanden:** ja, alle Phasen sind einzelne Commits; `codex/repair-room-contracts` bleibt unverändert
- **Rückkehr zur vorherigen Version möglich:** ja, durch Zurücksetzen auf den Stand vor Phase 1 oder einzelne Reverts
- **Vorgehen bei Datenproblemen:** Datenformate sind unverändert; persönliche Daten lassen sich über die Datensicherung im Profil sichern und wiederherstellen

## Freigabeentscheidung

- [ ] Entwicklung
- [x] interne Vorschau (vorgeschlagen)
- [ ] Pilot
- [ ] produktiv
- [ ] nicht freigegeben

**Begründung:** Alle lokalen automatischen Prüfungen sind grün (bis auf die sandbox-bedingten Font-Fälle), axe meldet auf den umgebauten Seiten keine Befunde, und Datenverträge sind unverändert.

**Offene Bedingungen:** grüne Cross-Browser-Suite in GitHub, Sichtprüfung auf realen Schulgeräten, Wiederherstellung einer realen Sicherung.
