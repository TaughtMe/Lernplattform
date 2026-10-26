# Dokumentationsindex

Einstieg in die Projektdokumentation von Lernraum. Angelegt im Rahmen des
Gesamtaudits vom 19./20.10.2026 (`docs/audits/`). Der Index ordnet die
vorhandenen Dokumente ein; er ersetzt keines davon.

## Statuskennzeichnung

| Kennzeichen                 | Bedeutung                                               |
| --------------------------- | ------------------------------------------------------- |
| **Implementiert**           | im Code vorhanden und überprüft                         |
| **Teilweise implementiert** | vorhanden, aber unvollständig oder eingeschränkt        |
| **Geplant**                 | dokumentiert, aber noch nicht implementiert             |
| **Vorgeschlagen**           | neue Empfehlung aus einem Audit, noch nicht beschlossen |
| **Überholt**                | historischer Stand, gilt nicht mehr                     |
| **Ungeklärt**               | keine ausreichenden Informationen                       |

## Maßgebliche Quelle je Thema

| Thema                                       | Maßgeblich                                                                                 | Ergänzend                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Tatsächliches Verhalten                     | der Code (`src/`, `app/`, `supabase/`)                                                     | Tests                                                        |
| Produktentscheidungen                       | Vault: `obsidian-export/Lernplattform/19 - Entscheidungsprotokoll/Anwendung.md`            | `Entscheidungsindex.md` im selben Ordner                     |
| Entscheidung 53 (Geräte-Abgleich Lehrkraft) | [cloud-sync.md](cloud-sync.md)                                                             | fehlt im Vault-Protokoll                                     |
| Fachliche Festlegungen Textbox              | [umsetzungsplan-textbox.md](umsetzungsplan-textbox.md), Abschnitt 1                        | Vault 24, [inhalte/textbox.md](inhalte/textbox.md)           |
| Fachliche Festlegungen Wortspeicher         | [umsetzungsplan-wortspeicher.md](umsetzungsplan-wortspeicher.md), Abschnitt 2              | Vault 07, [inhalte/wortspeicher.md](inhalte/wortspeicher.md) |
| Tagesportion und Wiederholungsregeln        | [umsetzungsplan-tagesportion.md](umsetzungsplan-tagesportion.md), Entscheidung 57          | Vault 06                                                     |
| Architektur und Schichten                   | [architecture.md](architecture.md)                                                         | [upstream-integration.md](upstream-integration.md)           |
| Coding- und Teststandard                    | [engineering-quality.md](engineering-quality.md)                                           | `AGENTS.md`                                                  |
| Geräte und Browser                          | [device-support.md](device-support.md)                                                     |                                                              |
| Sicherheitsrisiken                          | [security-risk-register.md](security-risk-register.md)                                     | Audit 2026-10-19, Bericht B                                  |
| Freigabestufen der Lernbereiche             | `src/domain/release.ts`                                                                    | Tabelle im `README.md` (per Test abgeglichen)                |
| Gestaltung                                  | [design/README.md](design/README.md), `design/lernraum-ui.dc.html`                         | Vault 20 (Farbrollen dort überholt)                          |
| Inhalte (Wortlisten, Texte, Tastenwelt)     | Code (`src/domain/german-learning-content.ts`, `textbox-library.ts`, `src/tastschreiben/`) | [inhalte/](inhalte/README.md)                                |
| Audits                                      | [audits/2026-10-19-lernraum-gesamtaudit.md](audits/2026-10-19-lernraum-gesamtaudit.md)     | Arbeitsdateien unter `audits/2026-10-19-gesamtaudit/`        |

## Grundlagendokumente

| Dokument                                                                     | Inhalt                                           | Stand laut Audit                                                                                            |
| ---------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| [architecture.md](architecture.md)                                           | Architektur, Oberflächenschichten, Datenbereiche | gültig; Abschnitt „Aktueller fachlicher Stand“ teilweise veraltet (Hinweis im Dokument)                     |
| [engineering-quality.md](engineering-quality.md)                             | verbindlicher Standard                           | gültig; Regel 3 (Ereignisse) und Abdeckungsangabe weichen vom Code ab, siehe Audit A-003/A-005              |
| [security-risk-register.md](security-risk-register.md)                       | SR-001 bis SR-003                                | gültig, aber unvollständig (Realtime, Speicherlöschung, Cloud-Stimmen, QR-Offenlegung fehlen; Audit B)      |
| [cloud-sync.md](cloud-sync.md)                                               | Geräte-Abgleich, Anbieter                        | gültig                                                                                                      |
| [device-support.md](device-support.md)                                       | Geräte- und Browsermatrix                        | gültig; Speicherlebensdauer unter iPadOS fehlt (Audit B-002)                                                |
| [upstream-integration.md](upstream-integration.md)                           | Abgleich mit LernBoxV2 und Laufdiktat            | gültig                                                                                                      |
| [laufdiktat-parity.md](laufdiktat-parity.md)                                 | Abweichungen vom Original-Laufdiktat             | gültig                                                                                                      |
| [laufdiktat-pilot-product-contract.md](laufdiktat-pilot-product-contract.md) | Produktvertrag des Laufdiktat-Pilots             | **Überholt** als Beschreibung der Standardfreigaben (Hinweis im Dokument); Abnahmekriterien weiter nützlich |
| [laufdiktat-pilot-operations.md](laufdiktat-pilot-operations.md)             | Pilotbetrieb                                     | gültig für Live-Räume                                                                                       |
| [repair-plan.md](repair-plan.md)                                             | Reparaturplan September 2026                     | historisch (Schritte 1–4 umgesetzt)                                                                         |

## Umsetzungspläne

Die Pläne sind Arbeitsaufträge für Coding-Agenten. Ihr Status ist hier nach
Plankopf, Commit-Historie und Stichproben im Code eingeordnet; die einzelnen
Funktionen wurden im Audit nicht vollständig nachgeprüft.

| Plan                                                                                       | Gegenstand                             | Status (Quelle)                                                  |
| ------------------------------------------------------------------------------------------ | -------------------------------------- | ---------------------------------------------------------------- |
| [umsetzungsplan-lernraum-ui.md](umsetzungsplan-lernraum-ui.md)                             | Oberflächenumbau v1 (Entscheidung 47)  | abgeschlossen, durch v2 abgelöst (Plankopf)                      |
| [umsetzungsplan-lernraum-ui-v2.md](umsetzungsplan-lernraum-ui-v2.md)                       | Oberfläche vom Design aus (E 48)       | laufende Grundlage (Plan)                                        |
| [umsetzungsplan-lehrerbereich.md](umsetzungsplan-lehrerbereich.md)                         | Lehrerbereich (E 51, 52)               | weitgehend umgesetzt (Commits; Sichtprüfung offen laut Vault 18) |
| [umsetzungsplan-vokabeluebernahme-lrs.md](umsetzungsplan-vokabeluebernahme-lrs.md)         | Vokabelübernahme, Schreiberleichterung | Teile 1–2 umgesetzt, Probedurchlauf offen (Plankopf)             |
| [umsetzungsplan-csv-mobil.md](umsetzungsplan-csv-mobil.md)                                 | CSV-Export mobil                       | umgesetzt (Commit `1dc9b46`)                                     |
| [umsetzungsplan-laufdiktat-geste.md](umsetzungsplan-laufdiktat-geste.md)                   | Zwei-Finger-Geste im Laufdiktat        | umgesetzt (Test `e2e/live/two-finger-gesture.spec.ts`)           |
| [umsetzungsplan-abhaengigkeiten.md](umsetzungsplan-abhaengigkeiten.md)                     | Abhängigkeitspflege                    | Stufen 0–3 umgesetzt, Stufe 4 offen (Plankopf)                   |
| [umsetzungsplan-pwa-installierbarkeit.md](umsetzungsplan-pwa-installierbarkeit.md)         | Installierbarkeit                      | umgesetzt (Test `e2e/installability.spec.ts`)                    |
| [umsetzungsplan-vorlesen.md](umsetzungsplan-vorlesen.md)                                   | Vorlesen                               | umgesetzt (`src/speech/`)                                        |
| [umsetzungsplan-geraete-sync.md](umsetzungsplan-geraete-sync.md)                           | Geräte-Abgleich Lehrkraft (E 53)       | umgesetzt, Bereich `frei` (Plankopf, `cloud-sync.md`)            |
| [umsetzungsplan-textbox.md](umsetzungsplan-textbox.md)                                     | Textbox (E 54)                         | Pakete A–D umgesetzt; fachliche Textprüfung offen (Plankopf)     |
| [umsetzungsplan-wortspeicher.md](umsetzungsplan-wortspeicher.md)                           | Wortspeicher (E 55)                    | Pakete A–E umgesetzt; Probedurchlauf offen (Plankopf)            |
| [umsetzungsplan-textbox-layout.md](umsetzungsplan-textbox-layout.md)                       | Textbox-Heft-Layout (E 56)             | umgesetzt (Commits Pakete C–F)                                   |
| [umsetzungsplan-code-analyse.md](umsetzungsplan-code-analyse.md) mit Teilplänen 1–5        | Code-Analyse                           | Teilpläne 1–5 erledigt (Statustabelle im Plan)                   |
| [umsetzungsplan-vokabelauswahl-laufdiktat.md](umsetzungsplan-vokabelauswahl-laufdiktat.md) | Vokabelauswahl im Live-Raum            | Schritte 1–4 umgesetzt (Plankopf, Merge #27)                     |
| [umsetzungsplan-spiegelschrift.md](umsetzungsplan-spiegelschrift.md)                       | Spiegelschrift (Textbox)               | umgesetzt, Freigabe `vorschau` (Merge #28, `release.ts`)         |
| [umsetzungsplan-tagesportion.md](umsetzungsplan-tagesportion.md)                           | Tagesportion 20 (E 57)                 | umgesetzt (Commits 19.10.2026)                                   |
| [umsetzungsplan-audit-welle-2.md](umsetzungsplan-audit-welle-2.md)                         | Audit Welle 2 (C1–C7)                  | Plan, Stand 26.10.2026, noch nicht umgesetzt                     |

## Hinweise zur Pflege

- Wer einen Umsetzungsplan abschließt, trägt das Ergebnis in diese Tabelle und
  in das Vault-Entscheidungsprotokoll ein.
- Fachliche Regeln sollten nur an einer Stelle stehen (Entscheidungsprotokoll
  oder benannter Planabschnitt); andere Dokumente verweisen darauf.
- Die Vault-Kopie unter `obsidian-export/` ist eine Exportkopie des Vaults der
  projektverantwortlichen Lehrkraft und kann hinter diesem zurückliegen.
