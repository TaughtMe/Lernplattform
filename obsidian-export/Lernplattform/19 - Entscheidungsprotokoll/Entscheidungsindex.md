---
tags:
  - lernplattform
  - entscheidungsprotokoll
  - entscheidungsindex
  - audit
status: index
stand: 2026-10-20
audit: "[[21 - Qualitätsgrundlage und Freigabe/Lernraum – Gesamtaudit – 2026-10-19|Gesamtaudit 2026-10-19]]"
---

# Entscheidungsindex

Übersicht über alle Entscheidungen aus dem [[Anwendung|Entscheidungsprotokoll]]
mit ihrer heutigen Gültigkeit und ihrem Umsetzungsstand. Angelegt im
[[21 - Qualitätsgrundlage und Freigabe/Lernraum – Gesamtaudit – 2026-10-19|Gesamtaudit vom 19./20.10.2026]].

> **Wichtig:** Maßgeblich bleibt das Entscheidungsprotokoll selbst. Dieser Index
> verändert keine Entscheidung. Alle Empfehlungen in der Spalte bzw. im Abschnitt
> „Audit“ sind **Vorschläge zur Prüfung**, keine beschlossenen Aufgaben.

## Statuslegende

- **Gültigkeit:** gültig · teilweise ersetzt · ersetzt · überholt · offen
- **Umsetzung:** Implementiert (im Code vorhanden und im Audit geprüft) ·
  Teilweise · Geplant · Ungeklärt · historisch abgeschlossen
- Wo das Audit eine Entscheidung nicht einzeln abgenommen hat, stützt sich
  „Implementiert“ auf den vorhandenen Code und die bestandenen Tests
  (1 683 Unit-Tests, 346 Chromium-E2E-Tests am 20.10.2026), nicht auf eine
  fachliche Einzelabnahme.

## Alle Entscheidungen im Überblick

| Nr. | Thema                                               | Gültigkeit                                         | Umsetzung                  | Audit-Hinweis (Befund-ID im Auditbericht)                                    |
| --- | --------------------------------------------------- | -------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------- |
| 1   | Gemeinsame App und Rollen                           | gültig; Authentifizierung durch 43 ersetzt        | Implementiert              | „Lehrer-Login“ auf der Startseite widerspricht 43 (B-009)                     |
| 2   | Local-first, drei getrennte Datenflüsse             | gültig                                             | Teilweise                  | Ranking-Klassenbeitrag fehlt; Speicherlöschung iPadOS unbehandelt (B-002)     |
| 3   | Individuelle Klasseneinschreibung                   | gültig                                             | Teilweise                  | Gerätebindung und Ersatzgerät-Freigabe nicht umgesetzt; LRS im QR (B-008)     |
| 4   | QR-Leistungsbrief (verschlüsselt, signiert)         | gültig                                             | Teilweise                  | nur Aufgaben-Abgabenachweis und Haus-Brief (aus); fälschbar (B-018)           |
| 5   | Air-Gap ohne Rückkanal                              | gültig                                             | Implementiert              | –                                                                            |
| 6   | Fortlaufender Scanmodus, Klassenbriefkasten         | gültig                                             | Teilweise                  | Ton/Vibration/Rahmen, Filter, Löschfrist offen (Vault 18)                    |
| 7   | Klassenranking lokal                                | gültig                                             | Geplant                    | Häuser gebaut, ausgeschaltet                                                 |
| 8   | QR-Formate                                          | gültig                                             | Teilweise                  | nur statische Codes                                                          |
| 9   | Datenschutzentscheidungen                           | gültig                                             | Teilweise                  | Löschfristen, Rechtsrahmen offen (B-011)                                     |
| 10  | Bewusst nicht übernommen                            | gültig                                             | –                          | –                                                                            |
| 11  | Noch offen (Liste)                                  | offen                                              | –                          | weiterhin offen                                                              |
| 12  | Mobile-first, geräteübergreifend                    | gültig                                             | Teilweise                  | keine Tests auf echten iPads/WebKit lokal (Audit-Grenze)                     |
| 13  | Qualitätskontrolle als Entwicklungsbestandteil      | gültig                                             | Teilweise                  | reale Geräte- und Nutzertests ausstehend                                     |
| 14  | Technischer Qualitäts- und Bibliotheksstandard      | gültig                                             | Teilweise                  | Abdeckung misst `app/` nicht (A-005)                                          |
| 15  | Erster vertikaler Lernweg                           | historisch abgeschlossen                           | Implementiert              | –                                                                            |
| 16  | Schülereinstieg, freies Üben, Klassenarbeitsraum    | teilweise ersetzt durch 40                         | –                          | –                                                                            |
| 17  | Reduzierte Hauptseite                               | ersetzt durch 40, 46, 48                           | –                          | –                                                                            |
| 18  | Lokale Lehrer-Konfiguration (Modulfreigaben)        | überholt durch 41                                  | –                          | –                                                                            |
| 19  | Übungsplattform statt Aufgabenplanung               | teilweise ersetzt durch 44                         | –                          | –                                                                            |
| 20  | Leitner-Fälligkeiten aus Ereignissen                | gültig (präzisiert durch 24, 57)                   | Teilweise                  | Zustände nur teilweise aus Ereignissen ableitbar (A-003); Lernwörter abweichend (A-004) |
| 21  | Sichtbare Lernbox und Theme                         | teilweise überholt (Farben durch 47)               | Teilweise                  | getrennte Fächerreihen Bedeutung/Schreiben fehlen im Kartenmodell (D-010)     |
| 22  | Dunkelmodus warmes Anthrazit                        | überholt durch 47                                  | –                          | –                                                                            |
| 23  | LernBox-Sitzung statt Ein-Karten-Demo               | gültig (präzisiert durch 24, 26)                   | Teilweise                  | Aufdecken hebt entgegen 23 bis Box 5 (D-010)                                  |
| 24  | Integrieren statt nachbauen                         | gültig (präzisiert durch 26)                       | Teilweise                  | mehrere parallele Wiederholungslogiken (A-004)                               |
| 25  | LernBoxV2 als isoliertes Quellmodul                 | ersetzt durch 26                                   | –                          | –                                                                            |
| 26  | LernBox und Laufdiktat als native Bestandteile      | gültig                                             | Implementiert              | –                                                                            |
| 27  | Laufdiktat als persönlicher Vertikalschnitt         | historisch abgeschlossen                           | Implementiert              | Textrunden allein erzeugen kein Lernsignal (D-011)                           |
| 28  | Fachfunktionen vor Rollen- und Plattformbetrieb     | historisch abgeschlossen                           | –                          | –                                                                            |
| 29  | Tastaturfluss und direkte Lernworteingabe           | gültig                                             | Implementiert              | Längenstriche verraten die Entscheidung (D-002)                              |
| 30  | Große Wortbanken, kleine Runden, Merkwörter         | gültig                                             | Implementiert              | fachliche Zuordnungsfehler (D-006)                                           |
| 31  | Adaptiver Lernkreislauf als Produktkern             | gültig                                             | Teilweise                  | kein geschlossener Kreislauf, keine Diagnostik (D-003, D-011)                |
| 32  | Direkter Fachzugang, separater Laufdiktat-Raum      | gültig (Navigation durch 48 neu)                   | Implementiert              | –                                                                            |
| 33  | QR-Scanner an allen Code-Einstiegen                 | gültig                                             | Implementiert              | –                                                                            |
| 34  | Nativer Laufdiktat-Raumbeitritt                     | gültig                                             | Implementiert              | –                                                                            |
| 35  | Autorisierte Live-Sitzung                           | gültig                                             | Teilweise                  | Weckruf ohne Inhalte korrekt; Realtime-Kanäle selbst unautorisiert (B-003)    |
| 36  | Nativer Lehrkraft-Raum                              | gültig                                             | Implementiert              | Lösungen für jeden mit Code lesbar (B-004)                                   |
| 37  | Dashboard, Stationen, Battle                        | gültig                                             | Implementiert              | Battle nach Tempo, Tempo-Punkte (D-012)                                      |
| 38  | Kopfrechnen als gemeinsamer Mathematikkern          | gültig                                             | Implementiert              | Aufgabenverteilung und Familien zu grob (D-009)                              |
| 39  | Ramagotchi erst nach stabilem Lernkern              | gültig                                             | Geplant                    | –                                                                            |
| 40  | Ein persönlicher Lernraum                           | gültig                                             | Teilweise                  | „Alles fällige“ in Fachblöcken, „Meine Inhalte“ nicht wie beschrieben         |
| 41  | Freie Grundfunktionen, konkrete Lehrkraftinhalte    | gültig                                             | Teilweise                  | Freigabe an Schüler nur für Vokabeln                                          |
| 42  | Supabase als verschlüsselter 24-h-Übergaberaum      | gültig                                             | Implementiert              | Geheimnisse serverseitig erzeugt, kein Rate-Limit beim Anlegen (B-006, B-017) |
| 43  | Lokaler Lehrerbereich ohne Login                    | gültig                                             | Implementiert              | auf geteilten Geräten/Tafeln ungeschützt (B-009)                             |
| 44  | Lehrerarbeitsplatz und strukturierte Aufgaben       | gültig                                             | Implementiert (`vorschau`) | –                                                                            |
| 45  | Aufgabenrückweg mit signiertem Abgabenachweis       | gültig                                             | Implementiert              | Schlüssel steht im gedruckten QR (B-018)                                     |
| 46  | Stufenweiser Produkteeinstieg                       | überholt durch 47/48                               | –                          | –                                                                            |
| 47  | Design „Lernraum UI“, Freigaberegister, Motivation aus | gültig (Standardstufe durch 48 geändert)        | Implementiert              | –                                                                            |
| 48  | Oberfläche vom Design aus („Lernraum UI“ v2)        | gültig                                             | Implementiert              | –                                                                            |
| 49  | Vokabelübernahme aus dem Laufdiktat nach Ergebnis   | gültig                                             | Implementiert              | –                                                                            |
| 50  | Schreiberleichterung über Klassenstempel            | gültig                                             | Implementiert              | LRS-Status am QR erkennbar (B-008); Toleranz bedeutungsblind (D-016)          |
| 51  | Lehrerbereich: Ablage aller Inhaltsarten            | gültig                                             | Implementiert              | –                                                                            |
| 52  | Raumcode 90 min, Raum schließt nach 120 min         | gültig                                             | Implementiert              | –                                                                            |
| 53  | Geräte-Abgleich der Lehrkraft                       | gültig; **nur in `docs/cloud-sync.md` dokumentiert** | Implementiert            | Umfang im Verhältnis zum Nutzen (A-008); Downgrade (B-014)                   |
| 54  | Textbox                                             | gültig                                             | Implementiert              | Hauptwert misst Textbehalten (D-005)                                         |
| 55  | Wortspeicher                                        | gültig                                             | Teilweise                  | Wiederholungsregeln widersprechen Vault 06 (A-004, D-001)                    |
| 56  | Textbox-Heft-Layout                                 | gültig                                             | Implementiert              | –                                                                            |
| 57  | Tagesportion 20 und Wiederholungsregeln             | gültig                                             | Implementiert              | Stückzahl statt Zeitbudget, Lernwörter ohne Fälligkeitsschutz (D-011, A-004) |

## Grundsatzentscheidungen mit Audit-Erkenntnissen

Die folgenden Einträge fassen die tragenden Entscheidungen zusammen. Der Punkt
„Vorschlag zur Prüfung“ gibt die Empfehlung des Audits wieder. Er ist **nicht
beschlossen**. Wo das Red Team eine weitergehende Alternative vorschlägt, ist
sie gesondert gekennzeichnet.

### G1 – Local-first ohne Konten; ein Gerät ist ein Kind (Entscheidungen 2, 9, 42, 43)

- **Bisherige Entscheidung:** Persönliche Lernstände bleiben auf dem Gerät,
  keine Schülerkonten, kein Lernraum-Server für Lerndaten. Eine Datenbank je
  Browser; der Browser-Speicher ist die einzige Kopie.
- **Ursprüngliche Begründung:** Datenminimierung, Datenschutz durch
  Technikgestaltung, kein Betriebsaufwand für Konten.
- **Umsetzungsstand:** Implementiert.
- **Vorteile:** keine zentrale Kinderdatenbank, keine Telemetrie, geringe
  Angriffsfläche.
- **Nachteile:** Datenverlust bei Speicherlöschung (iPadOS/Safari), keine
  Trennung mehrerer Kinder auf geteilten Geräten, Lehrerdaten auf
  Kindergeräten, die Lehrkraft sieht kaum Lernstände. Laut Red Team folgen
  sechs der sieben P1-Problemgruppen aus dieser einen Entscheidung.
- **Alternativen:** Installationspflicht und Persistenzanforderung; mehrere
  lokale Profile je Gerät (hilft nur bei festen Geräten); verschlüsselte,
  schulseitig verwahrte Sicherung; aggregierte Lernstandsbriefe.
  **Alternative des Red Teams:** Der Lernstand reist verschlüsselt mit dem
  Kind (Lernkarte mit QR, Chiffrat auf dem Server, kein Klartext beim
  Anbieter); Aufwand L, Auftragsverarbeiter nötig.
- **Neue Erkenntnisse des Audits:** B-001, B-002, B-009, B-010, E-001, E-003,
  G-010; Spannungsfeld Datenschutz ↔ Diagnosebedarf (Abschnitt M.5).
- **Vorschlag zur Prüfung:** zuerst die Geräteausstattung erheben. Bei fester
  Zuordnung beibehalten und um Speicherschutz und verlässliche Sicherung
  ergänzen; bei Koffer-iPads als Normalfall die Alternative des Red Teams
  prüfen, sobald der Einsatzrahmen geklärt ist.

### G2 – Lernstände aus unveränderlichen Ereignissen (Entscheidungen 20, 24, 57)

- **Bisherige Entscheidung:** Boxstand und Fälligkeit werden aus Ereignissen
  abgeleitet; es gibt keinen zweiten Lernstand.
- **Ursprüngliche Begründung:** Nachvollziehbarkeit, Reproduzierbarkeit,
  Zusammenführbarkeit.
- **Umsetzungsstand:** Teilweise. Nur Mathe ist eine echte Projektion; die
  übrigen Module führen veränderliche Zustände, das Nachspielen läuft nur in
  Tests.
- **Vorteile (im Konzept):** Regeländerungen ließen sich rückwirkend anwenden;
  Geräte ließen sich verlustfrei zusammenführen.
- **Nachteile (in der Umsetzung):** Kosten der Ereignisse fallen an, ihr
  Nutzen nicht; nach einem Abgleich widersprechen sich Kartenstand und
  Ereignisse (A-003); vier getrennte Wiederholungsregeln (A-004).
- **Alternativen:** Variante a – Ereignisse vollständig machen (Aufwand L);
  Variante b – Ereignisse ehrlich als Protokoll führen, feldweise
  zusammenführen, Stufe und Hilfe im Ereignis speichern.
- **Neue Erkenntnisse des Audits:** A-001, A-003, A-004, D-001, D-010, F-001.
- **Vorschlag zur Prüfung:** Variante b und ein gemeinsamer Wiederholungskern
  mit der Regeltabelle aus Vault 06 als Test; vorher tolerantes Lesen der
  Ereignisse.

### G3 – „Adaptiver Lernkreislauf“ als Produktkern (Entscheidung 31)

- **Bisherige Entscheidung:** Lernsignale aller Module aktivieren den fachlich
  passenden nächsten Schritt in einem gemeinsamen lokalen Förderkreislauf.
- **Ursprüngliche Begründung:** keine getrennten Lernwelten; Fehler aus dem
  Unterricht sollen persönlich wiederholt werden.
- **Umsetzungsstand:** Teilweise; regelbasierte Wiederholung ohne Diagnostik.
  Stufe, Wortbox und Zahlenraum wählt das Kind; die Wortauswahl im Wortspeicher
  ist zufällig.
- **Vorteile:** klare pädagogische Leitidee; Übernahme aus dem Laufdiktat
  funktioniert.
- **Nachteile:** „adaptiv“ und „diagnosegestützt“ versprechen mehr, als der
  Code leistet; Fortschrittsanzeigen messen teils Abschreiben oder Zufall.
- **Alternativen:** gelenkte Autonomie (Startpunkt per Auftrags-QR, Aufstieg
  nach transparentem Beherrschungskriterium, Anzeigen trennen „geübt“ und
  „gekonnt“); Lernverlaufsdiagnostik mit bestehenden, validierten Werkzeugen.
- **Neue Erkenntnisse des Audits:** D-003, D-004, D-011, E-002.
- **Vorschlag zur Prüfung:** Selbstbeschreibung auf „wiederholungsgestützt“
  korrigieren, zuerst Datenvalidität herstellen, dann einen ehrlichen
  Beherrschungsstand zeigen; keinen Eingangstest bauen.

### G4 – Lehrerbereich ohne Login (Entscheidung 43)

- **Bisherige Entscheidung:** Das entsperrte Gerät ist die Schutzgrenze; die
  Navigation heißt „Lehrerbereich“.
- **Ursprüngliche Begründung:** keine scheinbar sichere Prototyp-PIN, kein
  Betriebsaufwand; Neubewertung, „sobald Schüler dasselbe Geräteprofil
  verwenden“.
- **Umsetzungsstand:** Teilweise. Die Startseite verlinkt weiterhin
  „Lehrer-Login“ (Abweichung von der Entscheidung).
- **Vorteile:** keine Konten, keine Kosten.
- **Nachteile:** Die in der Entscheidung genannte Bedingung für eine
  Neubewertung ist eingetreten: Das Pilotszenario „Tafel in der Schule“
  (`docs/cloud-sync.md`) ist ein Gerät, das Kinder bedienen. Die Ergebnis-CSV
  wird dort automatisch gespeichert (F-002).
- **Alternativen:** Tafelmodus „nur Material“; lokale Sperre mit PIN oder
  Passkey; Verschlüsselung der Lehrerdaten.
- **Neue Erkenntnisse des Audits:** B-009, F-002.
- **Vorschlag zur Prüfung:** Startseite auf „Lehrerbereich“ ändern; zuerst
  Tafelmodus „nur Material“ auf geteilten Geräten, danach lokale Sperre.

### G5 – Framework und Hosting (vinext, Cloudflare Worker, RSC)

- **Bisherige Entscheidung:** Next-kompatibles vinext als bewusst gewählte
  junge Abhängigkeit (Vault 17).
- **Ursprüngliche Begründung:** Next-Kompatibilität, Hosting auf Cloudflare.
- **Umsetzungsstand:** Implementiert.
- **Vorteile:** moderne Werkzeugkette; RSC-Versionsschutz durch das Framework.
- **Nachteile:** Für eine überwiegend clientseitige Local-first-PWA erzeugt
  dynamisches Server-Rendering Abhängigkeiten ohne fachlichen Nutzen; der
  Produktionsserver ist lokal nicht startbar; die Browser-Tests prüfen nicht
  das ausgelieferte Artefakt (A-006, A-007).
- **Alternativen:** statischer Build, hosterunabhängig.
- **Neue Erkenntnisse des Audits:** A-006, A-007, A-017.
- **Vorschlag zur Prüfung:** Ausstiegspfad mit Auslösekriterien festlegen, den
  Wechsel aber vertagen, bis Lernkern und Datenhaltung korrigiert sind; jetzt
  nur Vorlagenreste und Server-APIs im Root-Layout bereinigen.

### G6 – Laufdiktat-Battle und Tempo-Wertung (Entscheidung 37)

- **Bisherige Entscheidung:** Battle und Stationen aus dem Original übernehmen.
- **Ursprüngliche Begründung:** vollständiger, erprobter Funktionsumfang des
  Laufdiktats ohne zweite App.
- **Umsetzungsstand:** Implementiert.
- **Vorteile:** abwechslungsreiche Unterrichtsformen.
- **Nachteile:** Tempo-Punkte und Tempo-Wettbewerb widersprechen Vault 10 und
  23 („Genauigkeit vor Geschwindigkeit“) (D-012); Realtime-Kanäle ohne
  Autorisierung erlauben Nachrichten mit frei gewähltem Absender (B-003).
- **Alternativen:** Battle nach Genauigkeit oder als Teamwertung.
- **Neue Erkenntnisse des Audits:** B-003, D-012.
- **Vorschlag zur Prüfung:** Tempo-Punkte abschaltbar und standardmäßig aus,
  Projektionsmodus ohne Fehlerzahlen, Absendertext nicht anzeigen.

### G7 – Geräte-Abgleich der Lehrkraft (Entscheidung 53)

- **Bisherige Entscheidung:** automatischer Abgleich zwischen den Geräten einer
  Lehrkraft über ihren eigenen Cloudspeicher.
- **Ursprüngliche Begründung:** Arbeit zu Hause und in der Schule mit demselben
  Stand (`docs/cloud-sync.md`).
- **Umsetzungsstand:** Implementiert, Bereich `frei`.
- **Vorteile:** kein eigener Server, Daten im Speicher der Lehrkraft.
- **Nachteile:** größer als alle Schüler-Lerncontainer zusammen (A-008);
  Abgleich auf unverschlüsselt möglich (B-014); bringt Lehrerdaten auf den
  Tafelrechner (B-009); Schülerliste und LRS-Haken können in private Clouds
  gelangen (B-011, rechtlich zu prüfen).
- **Alternativen:** verschlüsselte Datei-Übergabe statt Daueranbindung.
- **Neue Erkenntnisse des Audits:** A-008, B-009, B-011, B-014.
- **Vorschlag zur Prüfung:** Funktionsstopp bis zur Stabilisierung des
  Lernkerns; verschlüsselt erzwingen, sobald Personendaten enthalten sind.

### G8 – Leitner-Bewertung: zeichengenauer Vergleich und Rückstufung auf Box 1 (Vault 06, Entscheidung 57)

- **Bisherige Entscheidung:** Abstände 1/3/7/14/30 Tage; ein Fehler setzt auf
  Box 1; geprüft wird zeichengenau ohne Fehlerart.
- **Ursprüngliche Begründung:** einfache, nachvollziehbare Regeln; Fehler
  sollen schnell wiederholt werden.
- **Umsetzungsstand:** Teilweise (Lernwörter weichen ab, A-004).
- **Vorteile:** leicht erklärbar, bewährtes Grundmuster.
- **Nachteile:** Scheinfehler aus der Eingabeprüfung kosten den ganzen
  Lernstand eines Wortes (G-001, G-002, G-003, G-008, G-012); die Abstände
  setzen tägliche Nutzung voraus und verschieben sich um einen Tag (G-006).
- **Alternativen (Red Team):** Box − 1 bei Einzelfehlern außerhalb der
  kritischen Stelle; Fälligkeit in Übungseinheiten statt Kalendertagen.
- **Neue Erkenntnisse des Audits:** A-004, D-001, F-001, G-001, G-006.
- **Vorschlag zur Prüfung:** Eingaben vor der Prüfung normalisieren und im
  Ereignis zwischen Abruf, Hilfe und Abschreiben unterscheiden. Box − 1 und
  Übungseinheiten sind eine Option, die nach einer Beobachtungsphase geprüft
  werden kann; sie ist keine Empfehlung.

### G9 – Breite vor Tiefe (Entscheidungen 41, 47, 48, 53–56)

- **Bisherige Entscheidung:** acht freigegebene Lernbereiche und mehrere
  Randfunktionen (Geräte-Abgleich, Spiegelschrift, Aufgaben, Häuser in
  Wartestellung) bei einer Einzelperson als Entwickler.
- **Ursprüngliche Begründung:** vollständige Plattform für den eigenen
  Unterricht.
- **Umsetzungsstand:** Implementiert.
- **Vorteile:** großer Funktionsumfang; viel Erfahrung mit den Modulen.
- **Nachteile:** Die Kernversprechen Rechtschreibung und Mathematik haben die
  schwersten Korrektheitsmängel; jede neue Funktion vermehrt die Regelkopien
  (A-008, A-017).
- **Alternativen:** Funktionsstopp außerhalb des Kerns (Wortspeicher,
  Kopfrechnen, LernBox, Live-Laufdiktat); Randfunktionen einfrieren statt
  löschen.
- **Neue Erkenntnisse des Audits:** A-004, A-008, A-017, D-001, G-001, G-008.
- **Vorschlag zur Prüfung:** Funktionsstopp für Randfunktionen, bis Lernkern
  und Datensicherheit korrigiert sind.

## Pflegehinweis

Neue Entscheidungen werden weiterhin im Entscheidungsprotokoll eingetragen und
hier mit einer Zeile ergänzt. Entscheidung 53 sollte zusätzlich in das
Entscheidungsprotokoll übernommen werden (Vorschlag zur Prüfung).
