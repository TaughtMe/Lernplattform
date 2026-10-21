# Dokumentation: Bestandsaufnahme und Strukturplan (Phase VIII)

Arbeitsdokument der Hauptinstanz. Es wird vor jeder Änderung an der
Dokumentation erstellt und am Ende um die tatsächlich vorgenommenen Änderungen
ergänzt (siehe Abschnitt „Änderungsprotokoll“ im Abschlussbericht).

## 1. Wo liegt was?

| Ort                                      | Inhalt                                                                             | Rolle heute                                                                                           |
| ---------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| OneDrive-Vault des Nutzers               | `…\10.Obsidian\Schule 2.0\98.Ideen\01.Programmieren\Lernplattform`                 | maßgeblicher Vault laut Nutzer; vom Container aus nicht erreichbar                                    |
| `obsidian-export/Lernplattform/` (Repo)  | 00 Übersicht, 24 Bereiche je `Anwendung.md`, 2 Qualitätsberichte, 1 Bild           | Exportkopie; laut `docs/umsetzungsplan-geraete-sync.md` „von Hand nachzuziehen“, kann also nachhinken |
| `README.md`                              | Einstieg, Freigaberegister (testgesichert durch `src/domain/release-docs.test.ts`) | Einstieg für Entwickler                                                                               |
| `AGENTS.md`                              | Prüf- und CI-Regeln für Coding-Agenten                                             | verbindlich, wird vom Audit nicht verändert                                                           |
| `docs/architecture.md`                   | Architektur, Oberflächenschichten, Datenbereiche, fachlicher Stand, Matheüben      | Architekturreferenz                                                                                   |
| `docs/engineering-quality.md`            | verbindlicher Coding-/Teststandard                                                 | Standard                                                                                              |
| `docs/security-risk-register.md`         | SR-001 bis SR-003                                                                  | Risikoregister                                                                                        |
| `docs/cloud-sync.md`                     | Entscheidung 53 (Geräte-Abgleich), Anbieter, Grenzen                               | einzige Quelle für Entscheidung 53                                                                    |
| `docs/device-support.md`                 | Geräte- und Browsermatrix                                                          | Standard                                                                                              |
| `docs/laufdiktat-*.md`, `repair-plan.md` | Pilotvertrag, Pilotbetrieb, Parität zum Original, Reparaturplan September          | überwiegend historisch                                                                                |
| `docs/upstream-integration.md`           | Abgleich mit LernBoxV2/Laufdiktat                                                  | Referenz                                                                                              |
| `docs/umsetzungsplan-*.md` (22 Dateien)  | Arbeitsaufträge für KI-Agenten mit Entscheidungen                                  | teils verbindliche Fachfestlegungen (Textbox §1, Wortspeicher §2), überwiegend abgeschlossen          |
| `docs/inhalte/`                          | Fachwissen zu LernBox, Wortspeicher, Textbox, Tastenwelt                           | Inhaltsreferenz                                                                                       |
| `docs/design/`, `docs/brand/`            | Design-Canvas, Referenzbilder, Markenunterlagen                                    | Gestaltungsreferenz                                                                                   |

## 2. Erste Befunde zur Dokumentation (vor Abschluss der Fachprüfungen)

- **Kein Dokumentationsindex** in `docs/`: 39 Dateien ohne Übersicht, welche
  Pläne abgeschlossen, verbindlich oder historisch sind. Statusangaben stehen
  uneinheitlich im Kopf der Pläne („Fortschritt:“, „Stand:“, „Umgesetzt auf …“).
- **Entscheidung 53 fehlt im Vault-Entscheidungsprotokoll**; sie steht nur in
  `docs/cloud-sync.md`. Die Nummerierung springt von 52 auf 54.
- **Veraltete Vault-Übersicht** (`00 - Übersicht.md`): `status: prototyp`,
  Abschnitt „Aktuelle Priorität“ beschreibt den Stand vor der Sicherung,
  Wortspeicher, Textbox, Tastenwelt, Kopfrechnen und Tagesportion fehlen in der
  Leitidee, Duelle und Häuser stehen gleichrangig neben umgesetzten Bereichen.
- **Navigation in Vault 01 und 22** („Heute üben, Fächer, Meine Inhalte, Mein
  Fortschritt, Meine Klasse“) entspricht nicht mehr Entscheidung 48 und dem Code
  (`app/ui/shell/student-shell.tsx`: Lernen, Üben, Raum).
- **Vault 03** enthält den überholten Satz „Bis das Laufdiktat selbst nativ
  integriert ist …“ (Laufdiktat ist laut Entscheidungen 27–37 nativ integriert).
- **Vault 15** („Version 1 bleibt bewusst auf Vokabeln begrenzt“) ist überholt:
  Lernereignisse tragen Mathe-, Textbox- und Lernwortdaten.
- **Vault 17** nennt den Meilenstein vom 29.09.2026 als „aktuell“.
- **`docs/laufdiktat-pilot-product-contract.md`** beschreibt „der übrige
  Lernraum auf `vorschau`“ als Standard; laut README/`release.ts` sind die
  Lernbereiche seit Entscheidung 48 `frei`.
- **`docs/architecture.md`, Abschnitt „Aktueller fachlicher Stand“** nennt als
  nächsten Schritt lokale Klassenmitgliedschaften anstelle der Demo-Klasse; diese
  existieren inzwischen (`src/storage/student-classes.ts`).
- **Mehrfachbeschreibungen derselben Regeln** (Driftgefahr): Leitner-Regeln in
  Vault 06, Entscheidungen 20/49/50/57, `docs/umsetzungsplan-tagesportion.md`;
  Textbox in Vault 24, Entscheidungen 54/56, zwei Umsetzungsplänen und
  `docs/inhalte/textbox.md`; Freigabestufen in README, Entscheidungen 47/48,
  Vault 17 und Pilotvertrag.
- **Interne Links:** Linkprüfung (Skript im Scratchpad) über Vault (73 Links)
  und `docs/` (24 Links): keine defekten Links. Einzige Meldung war ein
  Bildanhang, den Obsidian über den Dateinamen auflöst.

## 3. Strukturplan (minimal-invasiv)

Leitlinien: keine Ordner umbenennen oder verschieben (Wikilinks und der
abweichende OneDrive-Vault würden sonst brechen), keine Notiz löschen,
überholte Inhalte nicht entfernen, sondern kennzeichnen; neue Inhalte in
bestehende Ordner einordnen.

1. **Statuskennzeichnung je Vault-Notiz:** YAML-Eigenschaft `umsetzungsstand`
   (Implementiert | Teilweise implementiert | Geplant | Überholt | Ungeklärt;
   bei Mischformen die Hauptaussage) und `audit` (Wikilink auf das
   Audit-Protokoll), dazu ein kurzer Hinweisblock direkt unter dem Titel im
   bestehenden Stil der Notizen („> **Umsetzungsstand laut Audit …**“).
   Bestehende Eigenschaften (`status`, `stand`, `tags`) bleiben unverändert.
2. **Audit-Protokoll** als neue Notiz im bestehenden Qualitätsordner:
   `21 - Qualitätsgrundlage und Freigabe/Lernraum – Gesamtaudit – 2026-10-19.md`.
3. **Entscheidungsindex** als neue Notiz im bestehenden Ordner:
   `19 - Entscheidungsprotokoll/Entscheidungsindex.md` (alle Entscheidungen
   1–57 mit Gültigkeit; Grundsatzentscheidungen mit Audit-Erkenntnissen und
   ausdrücklich als „Vorschlag zur Prüfung“ gekennzeichneten Empfehlungen).
   Das Entscheidungsprotokoll selbst bleibt unverändert.
4. **Zentrale Übersicht:** `00 - Übersicht.md` erhält oben einen Einstiegsblock
   (Statuslegende, Modulstatus, Wegweiser zu Vision, Architektur, Modulen,
   Diagnostik, Roadmap, Entscheidungen, Risiken, Audits). Der bisherige Inhalt
   bleibt erhalten; „Aktuelle Priorität“ wird als historischer Stand markiert.
5. **`docs/README.md`** (neu): Dokumentationsindex mit maßgeblicher Quelle je
   Thema und Status aller Umsetzungspläne.
6. **Korrekturen an bestehender Repo-Doku** nur dort, wo der Code den
   Widerspruch eindeutig belegt, und nur als datierter Hinweis.
7. **Keine Übernahme von Audit-Empfehlungen als verbindliche Aufgaben:** Vault
   17/18 erhalten nur einen Verweis auf die Audit-Roadmap als „Vorschlag zur
   Prüfung“.

## 4. Wiederherstellbarkeit

Alle Änderungen sind im Arbeitsbaum gegenüber Commit `c30b916`
nachvollziehbar (`git diff`) und mit `git checkout -- <datei>` umkehrbar. Neue
Dateien sind mit `git status` auffindbar. Weil der Nutzer ohne Commit arbeiten
will, werden zusätzlich ein Patch und eine Dateiliste mitgeliefert, damit die
Änderungen in den abweichenden OneDrive-Vault von Hand übernommen werden
können, ohne neuere Notizen dort zu überschreiben.
