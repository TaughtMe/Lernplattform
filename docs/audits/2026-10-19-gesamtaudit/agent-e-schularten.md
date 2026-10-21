# Prüfinstanz E – Schularten, Differenzierung, Unterrichtspraxis

Gesamtaudit Lernraum, Commit `c30b916` (App-Version 0.8.0), Stand 20.10.2026.
Rolle: Eignung für Schularten, Jahrgangsstufen und Leistungsniveaus im
bayerischen Schulsystem; Differenzierung und Inklusion; Unterrichtspraxis und
Lehrerperspektive. Nur lesend; keine Änderung an Code, Tests, Doku oder Vault.

Abgrenzung: Didaktik, Diagnostik und Inhaltsqualität hat D bewertet (D-001 bis
D-016), Architektur A, Sicherheit/Datenschutz/Offline B. Diese Befunde werden
hier nicht erneut geprüft, sondern nur nach ihrer Bedeutung für Schularten und
Unterrichtspraxis eingeordnet und per ID referenziert.

> Bearbeitungsstand: vollständig (20.10.2026). Die Datei wurde zur Ergebnissicherung fortlaufend geschrieben.

## 1 Untersuchte Dateien

- Audit-Grundlagen: `docs/audits/2026-10-19-gesamtaudit/00-stand.md`, `01-bestandsaufnahme.md`, `02-pruefauftraege.md`; Befundüberschriften, Top-5 und relevante Einzelbefunde von A (`agent-a-architektur.md`), B (`B-002`, `B-008` bis `B-011`, Abschnitt 5) und D (`D-003`, `D-007`, `D-011`, `D-012`, `D-014`, `D-016`, Modulbewertung)
- Vault (Repository-Kopie): `obsidian-export/Lernplattform/01`, `02`, `04`, `11`, `13` (vollständig), `17`, `18`, `00`, `19`, `22`, `24` (gezielte Suche nach Schulart, Jahrgangsstufe, LRS, DaZ, Inklusion, geteilten Geräten)
- Doku: `README.md`, `docs/device-support.md`, `docs/laufdiktat-pilot-product-contract.md`, `docs/laufdiktat-pilot-operations.md`, `docs/umsetzungsplan-lehrerbereich.md` (Lauf 2), `docs/umsetzungsplan-vokabeluebernahme-lrs.md` (1.6, 1.7, 2.14), `docs/umsetzungsplan-geraete-sync.md` (Abschnitt 8), `docs/umsetzungsplan-lernraum-ui.md:61`, `docs/inhalte/*.md` (Lauf 2)
- Lehrerseite: `app/components/teacher-class-configurator.tsx`, `app/components/teacher-workspace-manager.tsx` (Aufgaben, Leistungsbriefe), `app/lehrer/live/dictation-adapter.ts`, `app/lehrer/live/hooks/use-live-room-session.ts`, `app/views/laufdiktat/teacher-dictation/constants.ts`, `live-step.tsx`, `app/views/lehrer/start-sheet.tsx`, `app/lehrer/haeuser/teacher-houses.tsx` (nur Kopf)
- Schülerseite: `app/views/lernen/*`, `app/lernen/einstellungen/page.tsx`, `app/frei/mathematics/mental-math-app.tsx`, `app/frei/german/laufdiktat/running-dictation-app.tsx`, `app/components/learning-word-app.tsx`, `app/components/textbox-app.tsx`, `app/components/live-room-join.tsx`, `app/raum/spiel/live-game.tsx`, `app/raum/use-writing-relief.ts`, `app/views/laufdiktat/student-dictation-screen.tsx`, `app/views/wortspeicher/*` (Eingabefelder, Laufzettel), `app/views/textbox/*` (Eingabefelder)
- Fachlogik und Inhalte: `src/domain/learning-bundle.ts`, `teacher-content-library.ts`, `student-assignment.ts`, `release.ts`, `class-seal.ts`, `class-enrollment.ts` (über B), `daily-plan.ts`, `mental-math.ts`, `german-learning-content.ts`, `word-round.ts`, `textbox-library.ts`, `hold-to-reveal.ts`, `practice-bridge.ts`, `learner-profile.ts`, `vocabulary-catalog.ts` (Kopf), `running-dictation-input.ts`; `src/integrations/laufdiktat/live-session.ts`, `teacher-results.ts`, `word-store-transfer.ts`; `src/storage/student-classes.ts`; `src/tastschreiben/curriculum.ts` (Stationstitel)

## 2 Ausgeführte Prüfungen (mit echten Ergebnissen)

| Prüfung                                                                                                                                   | Ergebnis                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `repro-e/e-schularten.test.ts` (eigene Vitest-Reproduktion im Scratchpad, Audit-Konfiguration), erneut ausgeführt am 20.10.2026 12:16 UTC | 1 Datei, 4 Tests bestanden (1,5 s); Ausgaben identisch mit Lauf 2: E1 geteiltes Gerät (E-001), E2 Toleranz nur bei Vokabeln (E-006), E3 Wortboxen (E-005), E4 `DAILY_PLAN_SIZE = 20`                                                                                                               |
| `repro-e/browser-texts.mjs` (Lauf 2): Chromium 1194, iPad-Viewport, gegen Dev-Server `127.0.0.1:3002`, 13 Schülerrouten                   | sichtbare Texte und Bedienelemente erfasst (`student-texts.json`), 13 Bildschirmfotos (`shots/`); zwei davon in diesem Lauf gesichtet (Kopfrechnen, Wortspeicher)                                                                                                                                  |
| `repro-e/readability.mjs` (Lauf 2): LIX, 1. und 4. Wiener Sachtextformel, Fachbegriffsliste                                               | Oberflächentexte: Anteil langer Wörter 15–48 %, Fachbegriffe je Seite (`readability.out.txt`); LIX der Oberfläche wegen Textfragmenten nur grob deutbar (Textbox-Seite 385 = Messartefakt, nicht verwendet). Textbox-Texte: leicht Ø 43 Wörter / LIX 18,6; mittel Ø 70 / 24,7; schwer Ø 119 / 31,7 |
| Webrecherche (20.10.2026)                                                                                                                 | `gesetze-bayern.de` und `km.bayern.de` per DNS nicht abrufbar; Suchergebnisse mit Sekundärquellen zu BaySchO §§ 33, 34, 36 und zu „Digitale Schule der Zukunft“ genutzt und als nicht primär verifiziert gekennzeichnet                                                                            |
| Nicht wiederholt (laut Auftrag)                                                                                                           | `npm run check` (1683 Tests grün) und Chromium-E2E (346 bestanden) der Hauptinstanz; technische Prüfungen von B-008/B-009/B-010/B-002/B-011                                                                                                                                                        |

## 3 Nicht untersuchte Bereiche und Grenzen

- **Keine Erprobung mit Kindern oder Lehrkräften.** Alle Aussagen zur Wirkung auf Kinder einzelner Jahrgangsstufen, zu Bedienzeiten und Organisationsaufwand sind begründete Einschätzungen (gekennzeichnet), keine Messungen.
- **Keine echten iPads, kein WebKit, keine MDM-Umgebung.** Verhalten der Bildschirmtastatur, „Geteiltes iPad“, Kamerafreigabe und Druck über AirPrint auf Schulgeräten wurden nicht geprüft.
- **Live-Raum nicht im Browser durchgespielt** (Supabase nicht angebunden); Live-Ansichten nur per Code und vorhandener Unit-Tests beurteilt.
- **Rechtsfragen:** Keine Rechtsberatung. BaySchO-Normtexte und KM-Seiten nicht im Primärtext abrufbar; Aussagen stützen sich auf Sekundärquellen und sind als offen gekennzeichnet.
- **Bayerischer Grundwortschatz und LehrplanPLUS** nicht im Wortlaut abgeglichen (nicht abrufbar); die Wortlisten-Auswertung E-005 nutzt eigene, enge Prüflisten.
- **Häuser, Duell, Spiegelschrift, Demo-Klasse, Lehrer-Aufgaben** (Freigabestufe `aus`/`vorschau`) nur als Konzept berücksichtigt.
- Didaktische Qualität, Diagnostik, Inhaltsfehler (D), Architektur (A) und Sicherheit/Offline (B) nicht erneut geprüft, nur eingeordnet.

## 4 Befunde

### E-001 – Das Kernmodell „ein Gerät = ein Kind“ passt nicht zur Geräteausstattung der Grund- und Förderschulen; die LRS-Erleichterung hängt am Gerät statt am Kind

- **Bereich:** Unterrichtspraxis, Geräteorganisation, Inklusion (Grundschule, SFZ, Mittelschule ohne 1:1)
- **Status:** bestätigt (reproduziert) für die Erleichterung; bestätigt (Codeanalyse) für das Gerätemodell; Verbreitung geteilter Geräte an bayerischen Grundschulen ist Annahme (nicht verifiziert)
- **Schweregrad:** P1
- **Sicherheit der Einschätzung:** hoch (Technik), mittel (Verbreitung)
- **Fundstelle:** `src/domain/class-seal.ts:150-180` (`isWritingReliefActive`: aktiv, sobald **irgendeine** Mitgliedschaft auf dem Gerät eine gültige Freigabe trägt); `app/raum/use-writing-relief.ts:12-20` (`useWritingRelief` liest alle Mitgliedschaften des Geräts); `app/raum/spiel/live-game.tsx:145`; `src/integrations/laufdiktat/word-store-transfer.ts:140` (Übernahme in den Wortspeicher „im Stationsmodus nie (mehrere Kinder an einem Gerät)“); `app/frei/mathematics/mental-math-app.tsx` (Hinweis „Nutze auf gemeinsam genutzten Geräten ein eigenes Browserprofil“); `docs/device-support.md` (keine Aussage zu geteilten Geräten); technisch belegt in B-010 und B-008
- **Beschreibung:**
  - _Konzept:_ Vault 01/13 setzen „Geräteprofil = Person“. Ein persönlicher Lernraum mit Tagesportion, Wortspeicher, Fehlerliste, Tier und Klassenmitgliedschaft liegt im Browser des Geräts.
  - _Implementierung:_ Es gibt keine Profile je Kind (B-010). Die Schreiberleichterung prüft nicht, _wer_ tippt, sondern ob auf dem Gerät _irgendeine_ gültige Freigabe für die Raumklasse liegt. Der Code kennt das Problem selbst: Im Stationsmodus wird bewusst nichts in den Wortspeicher übernommen, „weil mehrere Kinder an einem Gerät“ arbeiten. Für den Normalfall „iPad-Koffer, wechselnde Kinder“ fehlt eine entsprechende Vorkehrung.
  - _Reproduktion:_ Mia (mit Freigabe) und Ben (ohne) schreiben sich nacheinander auf demselben iPad ein → 2 Mitgliedschaften, Erleichterung in jeder Live-Runde der Klasse **aktiv**, auch wenn Ben tippt. Nimmt Mia am nächsten Tag ein anderes iPad, auf dem nur Lea eingeschrieben ist → Erleichterung **inaktiv**.
  - _Einordnung nach Schulart:_ Grundschulen und Förderzentren arbeiten nach Annahme häufig mit Klassensätzen oder Koffern; das Förderprogramm „Digitale Schule der Zukunft“ (1:1, elternfinanziert mit max. 350 € Zuschuss) richtet sich laut Kultusministerium an Mittel-, Real- und Wirtschaftsschulen sowie Gymnasien und beginnt in der Regel ab Jahrgangsstufe 7/8, **nicht** an Grundschulen (Suchergebnis km.bayern.de, Primärseite per DNS nicht abrufbar; die im Prüfauftrag genannte Annahme „1:1 ab Jgst. 5“ ist damit nicht bestätigt). Damit trifft das Problem gerade die Zielgruppe der Rechtschreib- und Rechengrundlagen: Jgst. 1–6 und Förderschulen.
  - Apples Modus „Geteiltes iPad“ (verwaltete Apple-Accounts, eigener Datenbereich je Kind) würde das Problem auf Betriebssystemebene lösen; ob Grundschulen des Sachaufwandsträgers ihn nutzen, ist offen. Ohne ihn bleibt nur die feste Zuordnung „iPad 7 = Mia“, die bei Krankheit, defektem Gerät oder Lade-Engpass zusammenbricht.
- **Reproduktion / Prüfweg:** `repro-e/e-schularten.test.ts` (Scratchpad), Test „Schreiberleichterung gilt für das Gerät, nicht für das Kind“, Ausgabe `e-schularten.out.txt` Zeilen E1; am 20.10.2026 erneut ausgeführt, 4/4 Tests grün, identische Ausgabe.
- **Betroffene Nutzergruppen:** Grundschulen und Förderzentren mit geteilten Geräten; Kinder mit LRS (Erleichterung fehlt auf „fremdem“ Gerät) und Kinder ohne LRS (erhalten sie fälschlich); Lehrkräfte, die Ergebnisse falsch deuten.
- **Mögliche Folgen:** Tagesportion, Fortschritt und Wortspeicher gehören dem Gerät, nicht dem Kind: Die adaptive Wiederholung wird zur Wiederholung der Fehler eines anderen Kindes. Die Lehrkraft sieht tolerant angenommene Wörter als „richtig“ (Vault 13) und kann nicht erkennen, dass ein Kind ohne Freigabe Toleranz erhielt. Die Erleichterung als Fördermaßnahme wird zufällig.
- **Empfehlung:** (1) Sofort in `device-support.md` und im Lehrerbereich ehrlich festlegen: „Persönlicher Lernraum nur bei fester Gerätezuordnung oder Geteiltem iPad (Betriebssystem)“; die Erleichterung bei mehr als einer Mitgliedschaft derselben Klasse auf dem Gerät **nicht** aktivieren und der Lehrkraft das melden. (2) Mittelfristig Profilwahl je Kind (Tier + Bild-PIN) mit getrennter Datenbank, wie in B-010 empfohlen; die Freigabe an das gewählte Profil binden. (3) Für Klassen ohne feste Geräte einen „Stationsmodus für alles“: kein persönlicher Lernstand, nur Übung im Moment, klar so benannt.
- **Aufwand (grob):** S (1), L (2), M (3)
- **Erfolgskriterium:** Test: Zwei Mitgliedschaften derselben Klasse auf einem Gerät → keine Erleichterung, Hinweis an die Lehrkraft. Doku nennt unterstützte Geräteszenarien. Nach (2): E2E-Test, in dem zwei Kinder auf einem Gerät getrennte Tagesportionen und nur das berechtigte Kind die Erleichterung erhält.

### E-002 – Die Lehrkraft kann Differenzierung außerhalb des Live-Raums kaum steuern: an Kinder übertragbar sind nur Vokabeln

- **Bereich:** Differenzierung, Lehrerperspektive, Grundschule (Rechtschreibung, Rechnen)
- **Status:** bestätigt (Codeanalyse)
- **Schweregrad:** P1
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `src/domain/learning-bundle.ts:49-62` (`vocabularyItemV1Schema`: einzige Elementart des übertragbaren Pakets ist `kind: "vocabulary"`); `src/domain/teacher-content-library.ts:8` (Ablage kennt `vocabulary | text | math`, Text und Mathe aber nur für Live-Räume); `src/integrations/laufdiktat/word-store-transfer.ts:96-140` (Wörter gelangen nur über eine Live-Textrunde in die Wortbox „Aus dem Unterricht“); `src/domain/student-assignment.ts:8-23` und `src/domain/release.ts:96-100` (Aufgaben nur Freitext mit `materialId`, das die Schülerseite nicht auswertet; Bereich steht auf `vorschau`); `app/frei/mathematics/mental-math-app.tsx:103` (Zahlenraum wählt das Kind, Vorgabe 0–20); `src/domain/practice-bridge.ts:34-82` (`?woerter=` als technischer Einstieg vorhanden, aber ohne Lehreroberfläche)
- **Beschreibung:**
  - _Konzept:_ Vault 01: „Die Lehrkraft … stellt konkrete Inhalte wie einen Vokabelstapel oder eine Lernwortliste bereit.“ Vault 04: Aus dem gemeinsamen Ausgangsinhalt entsteht „für jeden Schüler ein individueller Übungsweg“.
  - _Implementierung:_ Die 24-h-Inhaltsübergabe überträgt nur Vokabelpakete in die LernBox. Es gibt keinen Weg, eine **Lernwortliste** (z. B. Grundwortschatz der Woche, Wörter aus dem Sprachbuch), einen **Textbox-Text**, eine **Kopfrechen-Einstellung** (Zahlenraum, Einmaleinsreihe) oder eine **Tastenwelt-Station** gezielt einem Kind oder einer Gruppe zuzuweisen. Lernwörter erreichen den Wortspeicher nur, wenn die Lehrkraft einen Live-Textraum öffnet, alle Kinder gleichzeitig online sind und die Übernahme eingestellt ist. Die Arbeitsaufträge (nur Vorschau) enthalten Freitext; die verknüpfte Material-ID nutzt die Schülerseite nicht.
  - _Folge für Differenzierung:_ Alle Niveauentscheidungen in Wortspeicher, Textbox und Kopfrechnen trifft das Kind selbst: Wortbox, Zahlenraum (frei 0 bis beliebig), Rechenarten, Textschwierigkeit. Das ist für selbstständige, gut organisierte Kinder ab Jgst. 4/5 tragfähig. Für Jgst. 1–3, Kinder mit Förderbedarf Lernen und viele DaZ-Kinder ist es das Gegenteil von Differenzierung: Sie wählen erfahrungsgemäß zu leicht, zu schwer oder nach dem ersten Bild. Diese Einschätzung ist eigene Hypothese aus Unterrichtserfahrung, nicht empirisch geprüft.
  - D-003/D-011 beschreiben die fehlende Diagnostik und den fehlenden Förderkreislauf; dieser Befund betrifft die **Steuerbarkeit durch die Lehrkraft**, die auch ohne automatische Diagnostik möglich wäre.
- **Reproduktion / Prüfweg:** Schemata und Übernahmewege wie angegeben lesen; Suche nach weiteren Elementarten im Bündel ergibt nur `vocabulary`.
- **Betroffene Nutzergruppen:** Lehrkräfte aller Schularten; besonders Grundschule, Förderschule, Deutschklassen; Kinder, die Struktur brauchen.
- **Mögliche Folgen:** Die Lehrkraft kann die Plattform nicht in ihre Wochenplanung („Gruppe A: ZR 20 mit Zehnerübergang; Gruppe B: Einmaleins 7er; Lea: Wortbox ie, nur 5 Wörter“) einbinden. Sie fällt auf analoge Pläne zurück und nutzt die App nur als Live-Laufdiktat. Der beworbene Nutzen „differenziertes, selbstständiges Arbeiten“ entsteht nicht.
- **Empfehlung:** (1) Kurzfristig, kleinster Hebel: Im Lehrerbereich einen **Auftragslink/QR** erzeugen, der vorhandene Parameter nutzt (`/frei/german?woerter=…`, Kopfrechnen mit festen Optionen, Textbox-Text-ID) und keine Personendaten enthält. Dazu die Kopfrechen-Optionen als URL-Parameter lesbar machen. Druckbar als Kärtchen je Gruppe. (2) Mittelfristig das Übertragungspaket um die Elementarten `learning-word-list`, `textbox-selection` und `math-preset` erweitern (A-009 beschreibt den fehlenden Modulvertrag). (3) Arbeitsaufträge erst freigeben, wenn ein Auftrag das Kind direkt in die passende Übung führt.
- **Aufwand (grob):** S–M (1), L (2), M (3)
- **Erfolgskriterium:** Eine Lehrkraft kann in unter 3 Minuten für drei Leistungsgruppen je einen QR erzeugen, der das Kind ohne weitere Auswahl in die vorgesehene Übung (Wortliste, Zahlenraum, Text) führt; E2E-Test für jeden Auftragstyp.

### E-003 – Die Lehrkraft erfährt aus der Plattform fast nichts über Lernstände; die Live-Ergebnisse sind nur Tiernamen ohne Verlauf

- **Bereich:** Lehrerperspektive, Diagnostik im Unterricht, Spannungsfeld Datenschutz–Förderbedarf
- **Status:** bestätigt (Codeanalyse)
- **Schweregrad:** P1
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `src/integrations/laufdiktat/teacher-results.ts:40-98` (`csvParticipantLabel`: Spalte „Name“ = Tier mit Nummer, z. B. „Fuchs 2“; `buildTeacherResultCsv`: Fortschritt, Fehler, Versuche, Spicker, Sterne, darunter nur klassenweite „Häufigste Fehler“; kein Inhaltstitel, keine Klasse, keine Fehlerwörter je Kind); `app/components/live-room-join.tsx:575-583` (Raumidentität anonym, Tier aus dem Geräteprofil); `app/lehrer/live/dictation-adapter.ts:87-104` (`strugglingNames`: „Braucht Hilfe“ nur für die aktuelle Aufgabe); `src/integrations/laufdiktat/live-session.ts:28-30` (Modus `TEST` wird auf `LAUFDIKTAT` umgeschrieben; ein Lernstandscheck existiert nicht mehr); `app/views/laufdiktat/teacher-dictation/constants.ts:41-86` (Modi: Laufdiktat, Freie Übung, Battle, Stationen); Leistungsbriefe nur in Häusern (`aus`) und Aufgaben (`vorschau`)
- **Beschreibung:**
  - _Konzept:_ Vault 02 und 04 nennen vier Modi einschließlich **Lernstandscheck** und versprechen ein Dashboard mit „aggregiertem Live-Fortschritt“; Vault 11 beschreibt QR-Statistiken der Kinder an die Lehrkraft. Der Auftrag nennt „Kompetenzchecks und Fortschrittsdarstellung“.
  - _Implementierung im Freigabestand:_
    - Aus dem **freien Üben** (Wortspeicher, Textbox, Kopfrechnen, Tastenwelt, Tagesportion) erreicht die Lehrkraft **kein** Signal. Einziger Weg ist der vom Kind gedruckte „Laufzettel“ (`app/views/wortspeicher/worksheet-screen.tsx`, Feld „Name oder Kennung“), der Drucker am Schülergerät voraussetzt und Selbstauskunft bleibt.
    - Aus dem **Live-Raum** sieht die Lehrkraft während der Runde Tiere mit Fortschritt, Sternen und „Braucht Hilfe“. Der CSV-Export enthält ebenfalls nur Tiere („Fuchs 2“), keine Namen, keinen Inhaltstitel, keine Klasse und keine Fehlerwörter je Kind. Eine Zuordnung zu Kindern muss die Lehrkraft selbst mitschreiben; auf geteilten Geräten wechselt das Tier mit dem Gerät (E-001).
    - Ein **Verlauf über Runden** fehlt vollständig: Jede Runde ist nach höchstens 24 h gelöscht (Pilotvertrag), eine lokale Ergebnisablage beim Lehrer gibt es nicht.
    - Der **Lernstandscheck** ist im Code entfallen (`TEST` → `LAUFDIKTAT`), steht aber weiter in Vault 02 und 04 sowie in der Bestandsaufnahme (Dokumentationsdrift).
  - _Spannungsfeld:_ Die Datensparsamkeit ist bewusst gewählt und für das freie Üben richtig. Für die Lehrkraft entsteht aber ein Diagnoseloch: Gerade die Kinder, die Hilfe brauchen (LRS, Rechenschwäche, Förderbedarf), fallen in der Plattform nicht auf. Für Förderpläne (Förderschule, Inklusion, Lernentwicklungsgespräche) liefert sie keine verwertbaren Belege. Die Lehrkraft braucht keine Klickhistorie, wohl aber **wenige, aussagekräftige, freiwillig übergebene Kennwerte je Kind** (z. B. sichere Wörter je Phänomen, Rechenarten mit Fehlern).
- **Reproduktion / Prüfweg:** Codelesung der genannten Stellen; CSV-Kopfzeile in `teacher-results.ts:61-69`.
- **Betroffene Nutzergruppen:** Lehrkräfte aller Schularten, besonders Förderlehrkräfte und Klassenleitungen in Grund- und Mittelschule; Kinder mit Förderbedarf.
- **Mögliche Folgen:** Die Lehrkraft muss Lernprobleme weiterhin analog erheben; die Plattform erzeugt Übungszeit ohne pädagogische Rückkopplung. Nach wenigen Wochen entsteht der Eindruck „die Kinder tippen, aber ich weiß nicht, was es bringt“ – ein typischer Grund, ein Werkzeug wieder aufzugeben (eigene Hypothese).
- **Empfehlung:** (1) CSV-Export um Inhaltstitel, Datum, Klasse und Fehlerwörter je Teilnehmer ergänzen; im Klassenraum die Spalte optional mit dem lokal beim Lehrer bekannten Namen füllen, wenn sich das Kind per Einschreibe-Mitgliedschaft (nicht nur per Tier) ausweist – Zuordnung nur auf dem Lehrergerät (Vault 13, Stufe „Persönliche Lehrerübersicht“). (2) Eine lokale Ergebnisablage auf dem Lehrergerät je Klasse, mit Löschfrist. (3) Den QR-Leistungsbrief aus Vault 11 für **wenige Kennwerte** freigeben, die das Kind bewusst übergibt (Vorschlag D-003, Abschnitt 9). (4) Vault 02/04 und `01-bestandsaufnahme.md` zum entfallenen Lernstandscheck korrigieren.
- **Aufwand (grob):** M (1), M (2), M–L (3), S (4)
- **Erfolgskriterium:** Nach einer Live-Runde kann die Lehrkraft ohne Mitschrift sagen, welches Kind welche Wörter falsch schrieb; nach vier Wochen kann sie je Kind mindestens einen nachvollziehbaren Lernstandswert aus freiwillig übergebenen Daten ablesen, ohne dass Lernhistorien das Schülergerät verlassen.

### E-004 – Kein Zielgruppen- und Niveaumodell: Sprache, Mengen und Eingabeform setzen selbstständige Leser und Tipper voraus

- **Bereich:** Eignung nach Jahrgangsstufe und Förderbedarf (Jgst. 1/2, Förderschwerpunkte Lernen, Sprache, geistige Entwicklung, DaZ-Anfänger)
- **Status:** bestätigt (Codeanalyse und Textmessung); Wirkung auf die Kinder begründetes Risiko (keine Erprobung mit Kindern möglich)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch für den Befund, mittel für die Wirkung
- **Fundstelle:** Klassenmodell ohne Jahrgangsstufe/Schulart (`app/components/teacher-class-configurator.tsx:420-461`: Name, Lehrkraft, Schuljahr); `src/domain/daily-plan.ts` (`DAILY_PLAN_SIZE = 20`, für alle gleich); `src/domain/german-learning-content.ts:136-190` (8 feste Wortboxen à 104–133 Wörter, ohne Niveaustufe); `app/frei/mathematics/mental-math-app.tsx:395-405` und Feineinstellungen (Zahlenraum, „0 als Rechenzahl vermeiden“, „Lückenaufgaben“, Hinweis „eigenes Browserprofil“); `app/lernen/einstellungen/page.tsx` mit `StudentSettingsPanel` (OneDrive, Google Drive, WebDAV, App-Passwort im Kinderprofil); Sprachausgabe nur in LernBox, Wortspeicher (Hörstufe) und Live-/Stationsspiel (`app/components/learning-box-app.tsx:332`, `learning-word-app.tsx:131`, `app/raum/spiel/live-game.tsx:617`, `station-game.tsx:141`), nicht für Anleitungen, Textbox, Kopfrechnen, Tastenwelt; keine Einstellung für Schriftgröße, Silbenhilfe oder Mengenreduktion (Suche ohne Treffer)
- **Beschreibung:**
  - Weder Vault noch Doku definieren eine Zielgruppe (Suche nach „Grundschule“, „Jahrgangsstufe“, „Förderschule“, „DaZ“ in Vault 00–24, README, `docs/*.md`: kein Treffer außer LRS-Bezügen). Das erklärt, warum Inhalte und Oberfläche keine Altersstufe kennen.
  - **Sprache der Oberfläche:** Die Schülerseiten verwenden Fachbegriffe wie Merkstufe, Box, Wortbox, fällig, Zahlenraum, Lückenaufgabe, Rechenzahl, Browserprofil, Synchronisation, WebDAV, App-Passwort, Lernverlauf. Messung der sichtbaren Texte (iPad-Ansicht, Lauf 2): Anteil langer Wörter (> 6 Buchstaben) 38 % auf `/ueben`, 48 % auf `/frei/mathematics`, 45 % auf `/raum`, 40 % in den Einstellungen; die Einstellungsseite hat 80 Bedienelemente. Die LIX-Werte der Oberfläche sind wegen kurzer Textfragmente nur grob deutbar und werden hier nicht als Beleg verwendet.
  - **Mengen und Ziele:** Eine Wortbox zeigt „0 / 105 sicher“; die Tagesportion ist für ein Kind der 1. wie der 9. Klasse 20 Aufgaben (D-011). Textbox „leicht“ hat 36–51 Wörter und vier Durchgänge; die Textbox-Texte selbst sind sprachlich altersgerecht (LIX Ø 18,6 / 24,7 / 31,7 für leicht/mittel/schwer).
  - **Eingabeform:** Jede Antwort wird auf der Bildschirmtastatur getippt, mit Umschalttaste für Großbuchstaben (Großschreibung ist Lerngegenstand, `autoCapitalize: "none"`). Für Kinder im ersten Schriftspracherwerb, die Buchstaben über Anlauttabelle und Handschrift lernen, ist das eine zusätzliche, fachfremde Hürde. Auswahl-, Lege- oder Silbenformate fehlen.
  - **Fehlende Hilfen:** keine Vorlesefunktion für Anleitungen und Rückmeldungen, keine Bildunterstützung (Inhaltsschemata kennen keine Bilder), keine Schrift- oder Mengeneinstellungen.
  - Positiv: Startseite und Tagesbereich sind knapp und ruhig („Weiter als Lama“, „Heute ist nichts dran – frei üben“), die Bedienflächen groß (Sichtprüfung der Bildschirmfotos aus Lauf 2).
- **Reproduktion / Prüfweg:** `repro-e/browser-texts.mjs` (Chromium, iPad-Viewport, Dev-Server 3002) → `student-texts.json`; `repro-e/readability.mjs` → `readability.out.txt` (Silbenzählung heuristisch, Werte sind Näherungen); Bildschirmfotos `repro-e/shots/`.
- **Betroffene Nutzergruppen:** Jgst. 1/2; Kinder mit Förderschwerpunkt Lernen, Sprache oder geistige Entwicklung; DaZ-Kinder in Deutschklassen; Kinder mit Leseschwäche.
- **Mögliche Folgen:** Diese Kinder können nur mit Begleitung arbeiten; das Ziel „selbstständig“ wird verfehlt, die Lehrkraft wird zur Bedienhilfe. Kinder scheitern an der Bedienung und nicht am Lerngegenstand; Ergebnisse spiegeln Lesefähigkeit statt Rechtschreib- oder Rechenkompetenz.
- **Empfehlung:** (1) Zielgruppe ausdrücklich festlegen (Vorschlag: „Jgst. 3–6 und Basisförderung Sek I; Jgst. 1/2 und Förderschwerpunkt geistige Entwicklung nicht Ziel der Version 1“) und in README/Vault 00 nennen. (2) Eine „einfache Ansicht“ als Kindeinstellung oder Lehrervorgabe per QR: Fachbegriffe ersetzen (z. B. „Wörter, die du sicher kannst“ statt „Merkstufe“), Einstellungen für Sicherung und Cloud ausblenden, Portion 10 statt 20, Vorlesen-Schaltfläche an jeder Anleitung. (3) Wortboxen in Niveaustufen teilen (siehe D-007) und Startauswahl nach Stufe anbieten.
- **Aufwand (grob):** S (1), M–L (2), M (3)
- **Erfolgskriterium:** Zielgruppe dokumentiert. In einer Beobachtung mit fünf Kindern der Zielstufe startet jedes Kind die vorgesehene Übung ohne Erwachsenenhilfe; die einfache Ansicht enthält keinen Begriff aus der Fachbegriffliste oben.

### E-005 – Feste Wortboxen enthalten Kriegs-, Gewalt- und Todeswörter in zufälligen Runden – belastend für Grundschulkinder und Kinder mit Fluchterfahrung

- **Bereich:** Altersangemessenheit, DaZ/Deutschklassen, traumasensibler Unterricht
- **Status:** bestätigt (reproduziert) für die Häufigkeit; Bewertung als belastend ist eigene Einschätzung (Hypothese, keine Normliste)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch (Häufigkeit), mittel (Wirkung)
- **Fundstelle:** `src/domain/german-learning-content.ts:48` (Auslautverhärtung: „Krieg“), `:64` (Umlaute: „quälen … lähmen“), `:81-84` (langes i: „Diebstahl“, „Friedhof“, „Krieg Krieger“), `:92` (Dehnungs-h: „Gewehr“); Auswahl `src/domain/word-round.ts:86-99` (`sampleRoundWords`, reiner Zufall)
- **Beschreibung:** D-007 belegt bereits die Mischung von Grundschul- und Sek-I-Wortschatz. Ergänzend aus Sicht der Schularten:
  - Die Wahrscheinlichkeit, dass eine zufällige 10er-Runde **mindestens ein belastendes Wort** (Krieg, Krieger, Gewehr, Friedhof, Dieb, Diebstahl, Raub, Räuber, räuberisch, Feind, Drohung, drohen, quälen, lähmen) enthält, beträgt je Box: langes i 39 %, Umlaute 34 %, Auslautverhärtung 33 %, Dehnungs-h 27 %; in drei weiteren Boxen 0 %.
  - Mindestens ein für die Grundschule untypisches, abstraktes Wort (z. B. Tugend, Vertrag, Gesetz, Gewohnheit, Universität, Praktikum, Portemonnaie, Charakter, Niveau, Ruhestand) steht in 75–84 % der Runden der Boxen Auslautverhärtung, Umlaute, langes i, Dehnungs-h und Merkwörter.
  - In Deutschklassen und Übergangsklassen sitzen in Bayern viele Kinder mit Kriegs- und Fluchterfahrung (Ukraine, Syrien, Afghanistan; allgemein bekannt, nicht online verifiziert). Ein Diktatwort „Krieger“ oder „Gewehr“ ohne Kontext und ohne pädagogische Rahmung ist dort vermeidbar belastend. Für DaZ-Lernende sind zudem abstrakte Wörter ohne Bild und Bedeutungshilfe reines Buchstabenkopieren.
  - Das Beispielwort auf der Kachel „Langes i“ ist bereits „Dieb“ (Bildschirmfoto `shots/_frei_german_lernwoerter.png`).
- **Reproduktion / Prüfweg:** `repro-e/e-schularten.test.ts`, Test „Anteil langer, abstrakter und belastender Wörter je Box“: 2 000 simulierte Runden je Box mit `sampleRoundWords` und festem Zufallsstart; Ausgabe E3 in `e-schularten.out.txt`. Die Listen „nicht GS-typisch“ und „belastend“ sind bewusst eng und subjektiv; sie ersetzen keine Prüfung gegen den bayerischen Grundwortschatz.
- **Betroffene Nutzergruppen:** Grundschulkinder, Kinder in Deutschklassen, Kinder mit Fluchterfahrung, Förderschulen.
- **Mögliche Folgen:** Belastung einzelner Kinder ohne Wissen der Lehrkraft (das freie Üben ist für sie unsichtbar, E-003). Lehrkräfte, die eine Liste prüfen, verlieren Vertrauen in die Inhalte.
- **Empfehlung:** Wortboxen gegen den bayerischen Grundwortschatz (Jgst. 1/2 und 3/4) und einen Sek-I-Wortschatz neu ordnen; Gewalt-, Kriegs- und Todeswörter aus Grundstufenboxen entfernen oder in eine ausdrücklich gewählte Sek-I-Box legen; je Wort optional ein Bild oder Beispielsatz für DaZ.
- **Aufwand (grob):** M
- **Erfolgskriterium:** Jede feste Wortbox trägt eine Niveaustufe; ein Test stellt sicher, dass Grundstufenboxen keine Wörter einer gepflegten Ausschlussliste enthalten.

### E-006 – LRS-Unterstützung setzt an der falschen Stelle an: Toleranz nur bei Vokabeln im Live-Raum, keine Anpassung in den Deutsch-Modulen

- **Bereich:** Inklusion, LRS, Nachteilsausgleich/Notenschutz (Bayern), Datensparsamkeit
- **Status:** bestätigt (reproduziert) für die Wirkungsgrenze; rechtliche Einordnung offene Frage (keine Rechtsberatung)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch (Technik), mittel (pädagogische und rechtliche Einordnung)
- **Fundstelle:** `src/integrations/laufdiktat/live-session.ts:101-130` (`evaluateLiveAnswer`: Toleranz nur im Zweig `kind === "vocabulary"`); `docs/umsetzungsplan-vokabeluebernahme-lrs.md:121-148` (1.6 „Gilt nur für `kind === "vocabulary"`“); Vault 24 (Textbox „besonders für Schüler mit LRS“) gegenüber `app/components/textbox-app.tsx` (keine Sprachausgabe, keine LRS-Anpassung); `app/raum/spiel/live-game.tsx:444-508` (Tempo-Punkte, siehe D-012); `app/components/teacher-class-configurator.tsx:593-623` (Haken je Kind, QR größer, siehe B-008)
- **Beschreibung:**
  - _Konzept:_ Die „Schreiberleichterung“ ist das einzige Inklusionsmerkmal der Plattform. Sie bildet die Idee des Notenschutzes nach (Rechtschreibung nicht werten), aber nur für Fremdsprachenvokabeln im Live-Raum.
  - _Implementierung:_ Im deutschen Textdiktat wirkt sie nicht: „Der Hund belt laut.“ → falsch; fehlender Schlusspunkt → falsch; Vokabel „Biblothek“ → toleriert. Im Wortspeicher, in der Textbox, im Laufdiktat allein und in der Tagesportion gibt es keine Anpassung für Kinder mit LRS. Die Textbox wird im Vault als LRS-Werkzeug beschrieben, hat aber außer der Textwahl nach Schwierigkeit weder Vorlesen noch eine Mengen- oder Zeitanpassung.
  - _Einordnung:_ Dass Rechtschreibfehler in einer **Rechtschreibübung** nicht toleriert werden, ist pädagogisch richtig (Toleranz würde das Üben entwerten). Für Kinder mit LRS hilft beim Üben aber anderes: kleinere Mengen, kein Zeitdruck (keine Tempo-Punkte, kein Battle), Vorlesen von Aufgaben, größere Schrift und Zeilenabstand, Silbengliederung, Fehlerrückmeldung mit Strategie (D-008). Diese Hilfen nützen auch DaZ-Kindern und Kindern mit Förderbedarf Lernen und sind **nicht diagnosegebunden**.
  - _Rechtsrahmen (offene Frage):_ Nach Sekundärquellen (Bayernportal, Antragsformulare bayerischer Kommunen und Schulen, Stand 2026) regeln §§ 31–36 BaySchO individuelle Unterstützung, Nachteilsausgleich (§ 33, z. B. Zeitzuschlag, Hilfsmittel; Anforderungen bleiben gleich) und Notenschutz (§ 34; bei LRS nur Verzicht auf die Bewertung der Rechtschreibung bzw. stärkere Gewichtung mündlicher Leistungen in Fremdsprachen); der Nachweis erfolgt nach § 36 über eine schulpsychologische Stellungnahme, gewährt werden Nachteilsausgleich und Notenschutz durch die Schulleitung (Primärtext gesetze-bayern.de nicht abrufbar, nicht online verifiziert). Daraus folgt: (a) Ein Übungswerkzeug braucht keinen formalen LRS-Status, um Übungshilfen zu geben. (b) Der Haken „Schreiberleichterung“ macht die Lehrkraft dennoch zur Verwalterin eines sensiblen Merkmals (B-008), obwohl die Plattform keine Leistungsfeststellung vornimmt. Ob ein in der App gesetzter Haken einen gewährten Nachteilsausgleich voraussetzt oder ihm gleichkommt, ist ungeklärt.
- **Reproduktion / Prüfweg:** `repro-e/e-schularten.test.ts`, Test „Toleranz nur bei Vokabeln, Text immer zeichengenau“ (Ausgabe E2).
- **Betroffene Nutzergruppen:** Kinder mit LRS, DaZ-Kinder, Kinder mit Förderschwerpunkt Lernen; Lehrkräfte und Schulleitungen (Rechtsunsicherheit).
- **Mögliche Folgen:** Die Kinder, für die Rechtschreibtraining am wichtigsten ist, erhalten in den Deutsch-Modulen keine Unterstützung; gleichzeitig entsteht ein datenschutzrechtlich sensibles LRS-Kennzeichen (B-008) für einen engen Nutzen (Englischvokabeln live). Kosten und Nutzen stehen in Schieflage.
- **Empfehlung:** (1) Das LRS-Kennzeichen durch neutrale, nicht diagnosegebundene **Übungsanpassungen** ersetzen, die die Lehrkraft (oder das Kind selbst) für jedes Kind wählen kann: „weniger auf einmal“, „ohne Tempo“, „Vorlesen“, „große Schrift“, „Silbenhilfe“; die Vokabeltoleranz wird eine davon. Damit entfällt der Rückschluss auf eine Diagnose (löst B-008 an der Wurzel). (2) Diese Anpassungen in allen Modulen wirken lassen, nicht nur im Live-Raum. (3) Rechtliche Frage an die behördliche Datenschutzbeauftragte und die Schulleitung: Ist ein Übungsmerkmal ohne Bewertungsfolge überhaupt an einen Nachweis nach § 36 BaySchO gebunden?
- **Aufwand (grob):** M (1), L (2), S (3)
- **Erfolgskriterium:** Kein Datenfeld mehr, das „LRS“ oder eine Diagnose bedeutet; mindestens drei Übungsanpassungen wirken in Wortspeicher, Textbox und Live-Raum; Test je Anpassung.

### E-007 – Das klassische Laufdiktat verlangt eine Zwei-Hand-Geste ohne Alternative für Kinder mit motorischen Einschränkungen oder Bildschirmleser

- **Bereich:** Inklusion, Barrierefreiheit, Förderschwerpunkt körperliche und motorische Entwicklung, Sehen
- **Status:** bestätigt (Codeanalyse)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `src/domain/hold-to-reveal.ts:1-35` (`isHolding`: zwei Touch-Kontakte oder Tasten A und L gleichzeitig; Mauszeiger zählen nicht); `app/views/laufdiktat/student-dictation-screen.tsx:310-358` (`HoldPhase`: „Mit zwei Fingern an den Rändern halten“); Modusauswahl nur je Raum (`app/views/laufdiktat/teacher-dictation/constants.ts:41-86`)
- **Beschreibung:** Im Modus „Laufdiktat“ sieht das Kind den Satz nur, solange zwei Finger an den Bildschirmrändern liegen (Tablet) bzw. A und L gedrückt sind (Hardwaretastatur). Das soll Abschreiben während des Tippens verhindern und ist als Idee schlüssig. Es gibt aber keine Alternative je Kind: Einhändige Kinder, Kinder mit Spastik oder Tremor, Kinder mit Schaltersteuerung oder Bildschirmleser können den Satz nicht sehen. Die Lehrkraft kann nur für den **ganzen Raum** auf „Freie Übung“ ausweichen. Mausbedienung zählt ausdrücklich nicht.
- **Reproduktion / Prüfweg:** Codelesung; Unit-Tests `app/raum/spiel/live-gesture.test.tsx` belegen die Geste.
- **Betroffene Nutzergruppen:** Kinder mit Förderschwerpunkt körperliche und motorische Entwicklung oder Sehen in inklusiven Klassen; Kinder mit Gipsarm (temporär).
- **Mögliche Folgen:** Ausschluss einzelner Kinder von einer gemeinsamen Klassenaktivität oder Wechsel der ganzen Klasse in einen anderen Modus; Widerspruch zu Art. 2 BayEUG-Inklusionsauftrag (allgemein bekannt, nicht online verifiziert) und zu WCAG 2.1 Erfolgskriterium 2.5.1 „Zeigergesten“ (Stufe A: Gesten mit mehreren Kontaktpunkten brauchen eine Einzelzeiger-Alternative).
- **Empfehlung:** Eine Alternative je Gerät: „Aufdecken“-Schaltfläche mit gezählter Ansichtszeit (Spickerzählung bleibt), aktivierbar als Übungsanpassung (E-006) oder automatisch bei aktivem Bildschirmleser bzw. Mausbedienung.
- **Aufwand (grob):** S–M
- **Erfolgskriterium:** Ein Kind kann den Laufdiktat-Modus mit einem einzelnen Zeiger oder per Tastatur mit einer Taste vollständig bearbeiten; axe- und Playwright-Test für diesen Weg.

### E-008 – Organisationsaufwand: Einschreibung je Kind und Gerät, keine Übergabe an Vertretung, Teamteaching oder neues Schuljahr

- **Bereich:** Lehrerperspektive, Schulorganisation
- **Status:** bestätigt (Codeanalyse); Zeitaufwand geschätzt (nicht gemessen)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch (Abläufe), mittel (Zeitaufwand)
- **Fundstelle:** `app/components/teacher-class-configurator.tsx:532-545` (Kinder einzeln anlegen, kein Listenimport), `:355-400` (QR-Bogen drucken: gut), `:593-623` (Änderung der Erleichterung → Kind muss neuen QR scannen), `:640-734` (Archiv, Entfernungscode); `docs/umsetzungsplan-geraete-sync.md:588-589` (Teamteaching ausdrücklich nicht vorgesehen); Vault 04 (Klassenschlüssel nur im Lehrer-Datenbereich, Übergabe nur über Gesamtsicherung); `docs/umsetzungsplan-vokabeluebernahme-lrs.md:166-167` („Geht er verloren, stellt die Lehrkraft den LRS-Kindern neue QR-Codes aus“)
- **Beschreibung:** Realistischer Ablauf für eine 3. Klasse mit 25 Kindern und iPad-Koffer:
  1. Klasse anlegen, 25 Namen **einzeln** eintippen (kein Einfügen einer Liste), Haken für Erleichterung setzen, QR-Bogen drucken (gut gelöst).
  2. Jedes Kind scannt seinen QR **auf jedem Gerät**, das es benutzt, und bestätigt; bei geteilten Geräten entstehen Mehrfachmitgliedschaften (E-001).
  3. Inhalte: Vokabeln per 24-h-Transfer; alles andere nur über Live-Raum (E-002).
  4. Ändert sich die Erleichterung, muss das Kind einen neuen QR scannen.
  5. **Vertretung / Mobile Reserve / Förderlehrkraft / MSD:** haben weder Schülerliste noch Klassenschlüssel. Sie können nur einen „Raum ohne Klasse (keine Schreiberleichterung)“ öffnen oder bekommen die Gesamtsicherung der Klassenlehrkraft – mit Namen und LRS-Haken, also personenbezogene Daten auf einem Fremdgerät. Teamteaching ist im Plan ausdrücklich ausgeschlossen.
  6. **Schuljahres- oder Klassenwechsel:** Es gibt kein „Klasse ins neue Schuljahr übernehmen“ und kein „Kind in andere Klasse verschieben“. Neue Klasse, neue Namen, neue QR-Codes, erneutes Scannen auf allen Geräten; die alte Mitgliedschaft bleibt auf den Schülergeräten, bis der Entfernungscode gescannt wird.
  7. **Lehrerwechsel:** Die Übergabe erfolgt per Datei (Export/Import) außerhalb der Plattform; Regeln dafür fehlen.
  - Geschätzter Einrichtungsaufwand ohne Störungen: 30–45 Minuten Lehrerzeit plus eine Unterrichtsstunde für das Einschreiben in Jgst. 3 (eigene Schätzung, nicht gemessen). Für eine 10-Minuten-Übungsroutine ist das tragbar, wenn es einmal im Schuljahr anfällt; mit Gerätewechsel, Vertretung und Fachlehrkräften fällt es wiederholt an.
- **Reproduktion / Prüfweg:** Codelesung der Klassenverwaltung; Suche nach Übernahme-, Verschiebe- und Mehrlehrkraftfunktionen ohne Treffer.
- **Betroffene Nutzergruppen:** Klassenleitungen, Fachlehrkräfte (z. B. Englisch in Jgst. 3/4), Förderlehrkräfte, MSD, Mobile Reserven, Schulleitungen.
- **Mögliche Folgen:** Die Plattform bleibt an eine einzelne, technikaffine Lehrkraft gebunden; fällt sie aus, ruht der digitale Teil. Personenbezogene Daten wandern per Datei zwischen Privatgeräten (verstärkt B-009/B-011).
- **Empfehlung:** (1) Namensliste einfügen (eine Zeile je Kind). (2) „Klasse ins neue Schuljahr übernehmen“ mit Behalt der Mitgliedschaften und Klassenschlüssel. (3) Eine **Vertretungsfreigabe**: QR/Datei mit Klassenstempel und Tiernamen, ohne Klarnamen und ohne LRS-Merkmale, damit die Vertretung einen Klassenraum öffnen kann. (4) Schriftliche Übergaberegel für Lehrerwechsel im Betriebshandbuch.
- **Aufwand (grob):** S (1), M (2), M (3), S (4)
- **Erfolgskriterium:** Neues Schuljahr ohne erneutes Scannen; eine Vertretung kann mit einem Übergabecode ohne Personendaten einen Klassenraum mit Wirkung des Klassenstempels öffnen.

### E-009 – „Schulartübergreifend“ ist nicht eingelöst: Inhalte und Ansprache passen faktisch zu Jgst. 3–6; in Sek I und Gymnasium trägt nur die LernBox

- **Bereich:** Eignung Sekundarstufe I, Realschule, Gymnasium (G9), Grenzen der schulartübergreifenden Nutzung
- **Status:** bestätigt (Codeanalyse und Inhaltsdurchsicht); Akzeptanzfragen begründetes Risiko
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** mittel–hoch
- **Fundstelle:** `src/domain/textbox-library.ts` (50 Texte mit Grundschul-Lebenswelt: „Der kleine Hund“, „Der Hase im Wald“, „Einkaufen mit Oma“, „Auf dem Spielplatz“, „Die Maus und der Mond“ …); `src/domain/mental-math.ts:1-35, 440-500` (Generator nur ganze Zahlen der vier Grundrechenarten, optional negativ; Brüche, Wurzeln, Potenzen nur in selbst getippten Aufgaben in LaTeX-Schreibweise `\frac{…}{…}`, `\sqrt`, `^`, Z. 120-140); `src/domain/german-learning-content.ts` (Wortboxen mischen Grundschul- und Sek-I-Wortschatz, D-007); `src/domain/learner-profile.ts:15` (Tierprofile, z. B. „Listiges Lama“); `src/domain/learning-bundle.ts` (nur Vokabeln übertragbar, E-002); `app/frei/german/laufdiktat/running-dictation-app.tsx:33-36` (Laufdiktat allein mit einem Beispieltext, sonst eigene Eingabe)
- **Beschreibung:**
  - **Grundschule 3/4 und Förderschule (Lernen):** Textbox-Themen, Kopfrechen-Generator (Zahlenraum frei, Vorgabe 0–20, Einmaleinsreihen) und ein Teil der Wortboxen passen gut; Jgst. 1/2 siehe E-004.
  - **Mittelschule 5–7, Förderunterricht Rechtschreibung:** Wortspeicher passt inhaltlich teils besser als in der Grundschule (Vertrag, Übersetzung, Gesetz); die Textbox-Themen wirken für 12- bis 14-Jährige kindlich (eigene Einschätzung). Kopfrechnen ist als Basistraining (Einmaleins, frei wählbare große Zahlenräume, negative Zahlen) brauchbar, deckt aber Bruch-, Dezimal- und Prozentrechnung, die in Jgst. 5–7 zentral sind, nur über selbst getippte LaTeX-Aufgaben ab – für Kinder und viele Lehrkräfte keine realistische Eingabeform.
  - **Mittelschule 8–10 / M-Zug, Realschule, Gymnasium:** Wirklich tragfähig sind die **LernBox** (Englisch, Französisch, Latein über Lehrkraftpakete oder eigene Stapel) und das **Live-Laufdiktat** als Unterrichtsmethode. Tastenwelt passt, wenn Hardwaretastaturen vorhanden sind (D-014). Wortspeicher, Textbox und Kopfrechnen liegen meist unter dem Niveau.
  - **Gymnasiale Oberstufe:** Tierprofile, Sterne und „Geschafft!“-Ansprache sind für 16- bis 19-Jährige erwartbar unpassend (Hypothese); fachlich bleibt nur die LernBox.
  - **Deutschklassen (DaZ):** Lebensweltliche Textbox-Texte sind ein Pluspunkt; es fehlen Bilder, Vorlesen der Anleitungen und Grundwortschatz-Niveaus (E-004, E-005).
- **Reproduktion / Prüfweg:** Durchsicht der Titel und Generatoroptionen; `readability.out.txt` für Textbox-Texte (LIX Ø 18,6 / 24,7 / 31,7 – Kinderliteratur-Niveau).
- **Betroffene Nutzergruppen:** Lehrkräfte der Sek I und des Gymnasiums; Schulleitungen, die über eine schulweite Einführung entscheiden.
- **Mögliche Folgen:** Wird die Plattform als „für alle Schularten“ vorgestellt, entstehen Erwartungen, die nur die LernBox erfüllt. Eine gemeinsame Oberfläche für 6- und 18-Jährige erzeugt Kompromisse, die beiden Gruppen schaden (zu viel Text für die Kleinen, zu kindlich für die Großen).
- **Empfehlung:** (1) Ehrliche Positionierung: Version 1 = Grundlagen Deutsch/Mathe für Jgst. 3–6 und Förderbedarf, plus LernBox für alle Schularten. (2) Eine gemeinsame Datenbasis beibehalten (Lernereignisse, LernBox, Live-Raum), aber **zwei Oberflächenprofile** anbieten: „Grundstufe“ (Bilder, Vorlesen, wenig Text, Tiere) und „Sekundarstufe“ (sachlich, ohne Tiere, mehr Selbststeuerung). (3) Für Sek-I-Mathe einen Generator für Bruch-, Dezimal- und Prozentaufgaben erst bauen, wenn ein konkreter Bedarf in einer Pilotklasse belegt ist.
- **Aufwand (grob):** S (1), L (2), L (3)
- **Erfolgskriterium:** README und Vault 00 nennen Zielschularten und -stufen; jede Funktion trägt im Freigaberegister eine Zielstufe; eine Sek-I-Lehrkraft findet ohne Erklärung, welche Teile für ihre Klasse gedacht sind.

### E-010 – Differenzierung nach oben und für Motivationsschwache fehlt weitgehend

- **Bereich:** Differenzierung (leistungsstarke und hochbegabte Kinder, Motivationsschwache)
- **Status:** bestätigt (Codeanalyse); Wirkung begründetes Risiko
- **Schweregrad:** P3
- **Sicherheit der Einschätzung:** mittel
- **Fundstelle:** `src/domain/release.ts` (Häuser/Motivation `aus`, Duell `aus`); `src/domain/daily-plan.ts` (feste Portion); `src/domain/word-round.ts:86-99` (Zufallsauswahl ohne Niveau); `app/views/laufdiktat/teacher-dictation/constants.ts:63-72` (Battle als einziges Wettbewerbsformat, D-012)
- **Beschreibung:**
  - **Leistungsstarke Kinder:** Es gibt keine Aufstiegsstufen, keine Knobel- oder Transferaufgaben, keine Zeitersparnis durch Überspringen sicherer Inhalte (Einstufung fehlt, D-003). Wer die Wortbox kann, übt sie trotzdem in voller Länge; einzige Steigerung ist die Selbstwahl (größerer Zahlenraum, schwerer Text). Für Kinder, die sich selbst herausfordern, reicht das; für unterforderte, sich zurückziehende Kinder nicht.
  - **Motivationsschwache Kinder:** Die Motivationsfunktionen (Häuser, Abzeichen) sind bewusst ausgeschaltet. Übrig bleiben Lernserie im Kalender, Sterne und im Live-Raum Tempo-Punkte und Battle, die eher die ohnehin Starken belohnen (D-012). Lehrkraftgesetzte Wochenziele („3 × 10 Minuten“) oder sichtbarer persönlicher Zuwachs ohne Vergleich fehlen.
- **Reproduktion / Prüfweg:** Codelesung.
- **Betroffene Nutzergruppen:** leistungsstarke und hochbegabte Kinder; Kinder mit geringer Lernmotivation, besonders in der Mittelschule.
- **Mögliche Folgen:** Starke Kinder langweilen sich, schwache meiden die Übung; die Plattform verstärkt die Schere, statt sie zu schließen (Hypothese, entspricht der allgemeinen Befundlage zu frei gewählten Übungsangeboten; nicht spezifisch belegt).
- **Empfehlung:** Einstufung je Modul (kurzer Einstieg, siehe D-003 Abschnitt 9), Überspringen sicherer Inhalte, eine „Profi“-Stufe je Modul; für Motivationsschwache persönliche Wochenziele mit Lehrkraft und ruhige Zuwachsanzeige ohne Vergleich.
- **Aufwand (grob):** M–L
- **Erfolgskriterium:** Ein Kind, das eine Wortbox im Einstieg fehlerfrei bewältigt, erhält sie nicht als Übungsportion; die Lehrkraft kann ein Wochenziel je Kind setzen.

## 5 Eignungsmatrix nach Schulart und Funktion

Legende: **G** geeignet · **A** mit Anpassungen geeignet · **U** ungeeignet · **–** nicht freigegeben bzw. nicht anwendbar.
Grundlage: Code und Inhalte im Freigabestand (Commit `c30b916`), keine Erprobung mit Kindern. Die Bewertung „G“ heißt „passt zu Alter und Fach“, nicht „lernwirksam belegt“ (dazu D).

| Funktion                    | GS 1/2 | GS 3/4 | MS 5–7 | MS 8–10 / M-Zug | RS  | Gym 5–10 | Gym Oberstufe | SFZ Lernen | SFZ Sprache | Förderschw. geistige Entwicklung | inklusive Gruppen | DaZ / Deutschklasse |
| --------------------------- | ------ | ------ | ------ | --------------- | --- | -------- | ------------- | ---------- | ----------- | -------------------------------- | ----------------- | ------------------- |
| LernBox (Vokabeln)          | U      | A      | G      | G               | G   | G        | A             | A          | A           | U                                | A                 | A                   |
| Wortspeicher                | U      | A      | A      | A               | A   | U        | U             | A          | A           | U                                | A                 | A                   |
| Textbox                     | U      | A      | A      | U               | U   | U        | U             | A          | A           | U                                | A                 | A                   |
| Kopfrechnen                 | A      | G      | A      | U               | U   | U        | U             | A          | A           | U                                | A                 | G                   |
| Laufdiktat live             | U      | G      | G      | G               | G   | G        | A             | A          | A           | U                                | A                 | A                   |
| Laufdiktat allein           | U      | U      | A      | A               | A   | A        | A             | U          | U           | U                                | U                 | U                   |
| Tastenwelt                  | U      | A      | G*     | G*              | G*  | A*       | U             | A          | A           | U                                | A                 | A                   |
| Tagesportion                | U      | A      | A      | A               | A   | A        | U             | A          | A           | U                                | A                 | A                   |
| Fortschritt (Kind)          | A      | A      | A      | A               | A   | A        | A             | A          | A           | U                                | A                 | A                   |
| Lehrerbereich               | A      | A      | A      | A               | A   | A        | A             | A          | A           | U                                | A                 | A                   |
| QR-Abgabe (Aufgaben/Häuser) | –      | –      | –      | –               | –   | –        | –             | –          | –           | –                                | –                 | –                   |
| Schreiberleichterung        | U      | A      | A      | A               | A   | A        | A             | A          | U           | –                                | A                 | –                   |

\* nur mit Hardwaretastatur (D-014); auf der Bildschirmtastatur U.

**Begründungen je Funktion (kurz):**

- **LernBox:** Leitner mit Sprachausgabe, Alternativen und beiden Richtungen ist die schulartübergreifend stärkste Funktion. Englisch in der Grundschule (Bayern ab Jgst. 3) setzt nach LehrplanPLUS den Schwerpunkt auf Hören und Sprechen; Tippen englischer Schreibweisen ist dort kein Kernziel (Fachkenntnis, nicht online verifiziert) → GS 3/4 nur mit Hören und Wiedererkennen. Für DaZ als Wortschatztrainer Deutsch–Herkunftssprache brauchbar, aber ohne Bilder (E-004). Oberstufe: fachlich gut, Ansprache kindlich (E-009).
- **Wortspeicher:** Merkstufen-Idee stark (D), aber keine Niveaus, Fachbegriffe, 105–133 Wörter je Box, belastende Wörter (E-005), nur Tippen. GS 3/4 und Förderschule erst mit Grundwortschatz-Stufen und Lehrkraftvorgabe (E-002). Gymnasium: nur Einzelförderung bei LRS.
- **Textbox:** Texte lebensweltlich und sprachlich passend für Jgst. 2–4 (LIX 19–32), aber vier Durchgänge dauern weit über 10 Minuten (D-005) und es fehlt Vorlesen. Sek I: Themen kindlich.
- **Kopfrechnen:** Grundrechenarten mit frei wählbarem Zahlenraum, Lückenaufgaben, Einmaleinsreihen: Kernstoff GS 2–4 und Förderschule. Jgst. 1/2 nur, wenn die Lehrkraft die Einstellungen vorgibt (heute nicht möglich, E-002). Für DaZ gut, weil spracharm im Üben (die Einstellungsseite bleibt sprachlastig). Sek I nur als Basistraining (E-009). Dyskalkulie: keine Anschauungsmittel, keine Strategiehilfen (D-009).
- **Laufdiktat live:** Etablierte Unterrichtsmethode, lehrkraftgesteuert, gut für GS 3/4 bis Sek I. Grenzen: Zwei-Finger-Geste (E-007), Tempo und Battle (D-012), Internetpflicht (B-013), Ergebnisse nur als Tiernamen (E-003). Jgst. 1/2 nur im Modus „Freie Übung“ mit Wörtern statt Sätzen.
- **Laufdiktat allein:** Kind muss den Text selbst eingeben (ein Beispieltext vorgegeben). Sinnvoll nur für selbstständige Lernende ab Sek I, die Texte einfügen; erzeugt kein Lernsignal (D-011).
- **Tastenwelt:** Systematischer Zehnfingerlehrgang; auf iPads ohne Tastatur nicht sinnvoll. Für Grundschulkinder vor dem gesicherten Schriftspracherwerb verfrüht (eigene Einschätzung).
- **Tagesportion:** feste 20 Aufgaben für alle Altersstufen, für neue Kinder anfangs leer („Heute ist nichts dran“), speist sich nur aus Modulen mit Lernsignal (D-011). Für Jgst. 1/2 zu groß und zu abstrakt.
- **Fortschritt:** Zählwerte („Übungen bearbeitet“, „aktive Tage“) sind auch für Jüngere verständlich; Diagramme, Prozentwerte (Tastenwelt) und Merkstufen sind es für Jgst. 1/2 und Förderschwerpunkt GE nicht. Aussagekraft siehe D-004.
- **Lehrerbereich:** Klassen, QR-Bogen, Inhaltsablage, Live-Start sind brauchbar für eine einzelne Lehrkraft; es fehlen Vertretung, Teamteaching, Schuljahreswechsel (E-008) und Ergebnisablage (E-003). Für Förderschwerpunkt GE (individuelle Förderpläne, Unterstützte Kommunikation) gibt es keine passenden Funktionen.
- **QR-Abgabe:** Aufgaben (`vorschau`) und Häuser (`aus`) sind nicht freigegeben; nur als Konzept bewertet.
- **Schreiberleichterung:** wirkt nur bei Vokabeln im Live-Raum (E-006), gerätegebunden (E-001), im QR erkennbar (B-008). In GS 1/2 ohne Anwendungsfall; für DaZ nicht vorgesehen, obwohl DaZ-Kinder von Toleranz bei Fremdsprachenvokabeln ebenso profitieren könnten.

**Gemeinsame Plattform – ja, aber nicht eine Oberfläche.** Eine gemeinsame Datenbasis und gemeinsame Kernfunktionen (Lernereignisse, LernBox, Live-Raum, Klassenverwaltung) sind sinnvoll und vermeiden Doppelpflege. Nötig sind aber getrennte **Oberflächenprofile** (Grundstufe mit Bild, Vorlesen, wenig Text, Lehrkraftvorgaben; Sekundarstufe sachlich mit mehr Selbststeuerung) und **niveaugestufte Inhalte** (E-004, E-009). Für den Förderschwerpunkt geistige Entwicklung ist die Plattform in der heutigen Form kein passendes Werkzeug; das sollte ausdrücklich so gesagt werden, statt Inklusion für alle Gruppen zu suggerieren.

**Grenzen schulartübergreifender Nutzung:** (1) Altersgerechte Ansprache lässt sich nicht für 6- bis 19-Jährige in einer Oberfläche lösen. (2) Geräteausstattung unterscheidet sich grundlegend (Koffer in GS/SFZ, 1:1 eher ab Jgst. 7/8 an MS/RS/Gym, E-001). (3) Datenschutzlage unterscheidet sich (Einwilligungsfähigkeit, Volljährigkeit in der Oberstufe, Sensibilität von Förderdaten in SFZ). (4) Die Wartung niveaugestufter Inhalte für alle Schularten übersteigt die Kapazität einer Einzelperson (vgl. A-017).

## 6 Lehrerperspektive: realistischer Durchgang

Szenario (Annahme): Klassenleitung einer 3. Klasse, 25 Kinder, davon 3 mit LRS-Verdacht, 4 DaZ-Kinder, ein Kind mit Förderbedarf Lernen; iPad-Koffer mit 16 Geräten für zwei Klassen; 10 Minuten digitale Übungszeit drei Mal pro Woche.

| Schritt                         | Was die Plattform heute leistet                                                    | Aufwand / Problem                                                                                                                                       | Befund       |
| ------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Vorbereitung Klasse             | Klasse anlegen, Namen einzeln eintippen, LRS-Haken, QR-Bogen drucken               | ca. 30–45 min (Schätzung); QR-Bogen verrät LRS-Kinder durch Größe                                                                                       | E-008, B-008 |
| Einschreiben                    | Jedes Kind scannt seinen QR auf seinem Gerät                                       | Bei Koffer: jedes Gerät sammelt Mitgliedschaften; Kamera-Freigabe per MDM ungeprüft; manuelle Eingabe des langen Codes ist für Kinder nicht realistisch | E-001, B-010 |
| Differenzierte Übung            | Kinder wählen selbst Modul, Wortbox, Zahlenraum, Text                              | Lehrkraft kann keine Gruppenvorgaben machen; erster Start zeigt „Heute ist nichts dran“                                                                 | E-002, E-004 |
| 10-Minuten-Fenster              | Tagesportion 20 Aufgaben, Textbox-Einheit deutlich länger                          | Kein Zeitbudget, Unterbrechung mitten in der Einheit                                                                                                    | D-011, D-005 |
| Live-Laufdiktat                 | Raum öffnen, Kinder per 4-stelligem Code/QR, Modi wählbar                          | gut in einer Doppelstunde; Internetpflicht; Geste für einzelne Kinder unbedienbar                                                                       | E-007, B-013 |
| Lernprobleme erkennen           | Live: Tiere mit Fehlerzahlen; frei: nichts                                         | Kein Verlauf, keine Namen, keine Fehlerwörter je Kind                                                                                                   | E-003        |
| Ergebnisse dokumentieren        | CSV mit Tiernamen; Laufzettel vom Kind gedruckt                                    | für Förderplan oder Elterngespräch unbrauchbar                                                                                                          | E-003        |
| Datenschutz                     | Freigabe durch Schulleitung, AVV, DSFA fehlen                                      | Lehrkraft trägt persönliches Risiko                                                                                                                     | B-011        |
| Vertretung / Fachlehrkraft      | keine Übergabe ohne Personendaten                                                  | digitaler Teil ruht bei Ausfall                                                                                                                         | E-008        |
| Schuljahreswechsel              | neue Klasse, alles neu scannen                                                     | wiederkehrender Aufwand                                                                                                                                 | E-008        |
| Verbindung zu analogem Material | QR-Bogen, Laufzettel druckbar; Wortspeicher-Brücke `?woerter=` technisch vorhanden | Lernwörter aus dem Sprachbuch können nicht per QR verteilt werden                                                                                       | E-002        |

**Zusatznutzen für die Lehrkraft heute:** vor allem das Live-Laufdiktat (weniger Organisationsaufwand als das analoge Laufdiktat, automatische Korrektur, Übernahme der Fehlerwörter auf das Gerät des Kindes) und die LernBox mit Vokabelübergabe. Für Rechtschreibung und Rechnen außerhalb des Live-Raums entsteht kaum Zusatznutzen, weil Steuerung (E-002) und Rückmeldung (E-003) fehlen.

**Spannungsfeld Datenschutz vs. Diagnosebedarf:** Die Entscheidung, freie Übung lokal zu halten, ist datenschutzrechtlich klug und senkt das Risiko für die Lehrkraft. Sie verschiebt aber die gesamte diagnostische Arbeit zurück ins Analoge. Ein vertretbarer Mittelweg ist der freiwillige, vom Kind ausgelöste **Kurzbericht** mit wenigen Kennwerten (Vault 11 beschreibt ihn bereits), verbunden mit einer lokalen Ergebnisablage beim Lehrer mit Löschfrist (E-003). Ohne diesen Mittelweg bleibt die Plattform für die Lehrkraft eine Übungsmaschine ohne Rückkanal.

**iPad-Koffer vs. 1:1:** Mit fester 1:1-Ausstattung (Sek I, ab etwa Jgst. 7/8 über „Digitale Schule der Zukunft“, Sekundärquelle) funktioniert das Modell „Gerät = Kind“; dort fehlen aber die passenden Inhalte (E-009). Wo die Inhalte passen (GS, SFZ), fehlt meist die 1:1-Ausstattung (E-001). Diese Schere ist der zentrale strukturelle Befund dieser Prüfinstanz.

## 7 Was braucht eine Lehrkraft wirklich – und was erzeugt nur Komplexität?

**Wirklich gebraucht (eigene Einschätzung aus Unterrichtsperspektive):**

1. Kinder schnell und ohne Personendaten auf ein Gerät bringen, auch bei wechselnden Geräten (E-001).
2. Einer Gruppe oder einem Kind mit einem QR eine konkrete Übung geben (E-002).
3. Nach der Übung wissen, wer wo Schwierigkeiten hat – wenige, verständliche Werte (E-003).
4. Ein verlässliches Live-Format für die ganze Klasse (vorhanden: Laufdiktat).
5. Übungsanpassungen ohne Diagnosestempel (E-006).
6. Übergabe an Vertretung und neues Schuljahr (E-008).

**Erzeugt eher Komplexität als Nutzen (im heutigen Stand):**

- **Geräteabgleich der Lehrkraft über Cloud** (OneDrive, Google Drive, WebDAV) mit Verschlüsselung, Schlüsselverwaltung und Tafel-Szenario: hoher Bau- und Erklärungsaufwand (A-008), Datenschutzfolgen auf geteilten Tafeln (B-009); eine einfache Exportdatei auf einen USB-Stick deckt den Bedarf der meisten Lehrkräfte.
- **Cloud-Synchronisation im Kinderprofil** (OneDrive, Google Drive, WebDAV, App-Passwort): für Grundschulkinder unverständlich, für die Schule rechtlich heikel (private Konten); gehört hinter eine Lehrkraft- oder Elternfreigabe.
- **Battle mit Störangriffen und Tempo-Punkte:** motivierend für Starke, belastend für Schwache (D-012). Battle ist als ausdrücklich gewählter Spaßmodus vertretbar; Tempo-Punkte erscheinen dagegen am Ende jeder Live-Runde und sollten abschaltbar bzw. standardmäßig aus sein.
- **Vier Live-Modi plus „Alle Optionen“:** Die Lehrkraft braucht zwei klar benannte Standardabläufe (Laufdiktat, Üben mit Hilfe); die übrigen Optionen gehören in eine Expertenansicht.
- **Spiegelschrift, Häuser, Duell, Aufgaben-QR** im Wartestand: richtig, dass sie nicht freigegeben sind; vor Freigabe jeweils den konkreten Unterrichtsnutzen belegen.

**Was eine Lehrkraft nach vier Wochen realer Nutzung voraussichtlich kritisiert (Hypothesen, nicht erhoben):**

1. „Ich weiß nicht, was die Kinder in der Übungszeit eigentlich machen und ob es etwas bringt.“ (E-003)
2. „Auf dem iPad von gestern sind die Wörter eines anderen Kindes.“ / „Ben hatte die Erleichterung, die Mia gehört.“ (E-001)
3. „Ich kann den Kindern nicht einfach die Wörter der Woche geben.“ (E-002)
4. „Die Kleinen kommen ohne mich nicht zurecht; die Großen finden es kindisch.“ (E-004, E-009)
5. „Die Textbox wird in 10 Minuten nie fertig.“ (D-005)
6. „Bei schwachem WLAN bricht das Laufdiktat ab.“ (B-013, B-019)
7. „Nach den Ferien war auf einigen iPads alles weg.“ (B-002, bei seltener Nutzung in der GS besonders wahrscheinlich)
8. „Die Liste nach dem Laufdiktat zeigt nur Tiere; wer war Fuchs 2?“ (E-003)
9. „Vertretung konnte nichts damit machen.“ (E-008)

## 8 Differenzierung und Inklusion nach Gruppen

| Gruppe                                    | Was vorhanden ist                                                                                        | Was fehlt                                                                                                                                                            | Bewertung       | Befunde                    |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | -------------------------- |
| LRS                                       | Vokabeltoleranz live; Textbox mit Durchgängen; ausgeschaltete Autokorrektur in Rechtschreibfeldern (gut) | Anpassungen in Deutsch-Modulen, Vorlesen, Mengenreduktion, kein Tempo; Merkmal stigmatisiert                                                                         | unzureichend    | E-006, E-001, B-008, D-016 |
| Dyskalkulie / Rechenschwäche              | Fehlerwiederholung im Kopfrechnen, frei wählbarer Zahlenraum                                             | Anschauungsmittel (Zehnerfeld, Rechenstrich), Strategiehilfen, Zählstrategie-Erkennung, Flüssigkeitsmessung; schulrechtliche Regelungen in Bayern hier nicht geprüft | unzureichend    | D-009, E-002               |
| Förderschwerpunkt Lernen                  | kleine Zahlenräume, leichte Texte wählbar                                                                | Lehrkraftvorgaben, einfache Sprache, Mengen, Vorlesen                                                                                                                | mit Anpassungen | E-002, E-004               |
| Förderschwerpunkt Sprache                 | Sprachausgabe in LernBox und Hörstufe                                                                    | Vorlesen der Anleitungen, Bildunterstützung, Silbenhilfe                                                                                                             | mit Anpassungen | E-004                      |
| Geistige Entwicklung                      | –                                                                                                        | elementare Formate (Bild, Antippen, Unterstützte Kommunikation)                                                                                                      | ungeeignet      | E-004                      |
| Körperliche/motorische Entwicklung, Sehen | große Bedienflächen, Tastaturbedienung                                                                   | Einzelzeiger-Alternative zur Zwei-Finger-Geste                                                                                                                       | mit Anpassungen | E-007                      |
| DaZ / Deutschklassen                      | lebensweltliche Texte, spracharmes Kopfrechnen, LernBox für Wortschatz                                   | Bilder, Vorlesen der Anleitungen, Grundwortschatz-Stufen, belastungsfreie Wortlisten                                                                                 | mit Anpassungen | E-004, E-005               |
| Hochbegabte / Leistungsstarke             | Selbstwahl größerer Zahlenräume und schwerer Texte                                                       | Einstufung, Überspringen, Profi-Stufen                                                                                                                               | schwach         | E-010                      |
| Motivationsschwache                       | Lernserie, Sterne                                                                                        | Wochenziele, ruhige Zuwachsanzeige; Battle/Tempo wirken gegenläufig                                                                                                  | schwach         | E-010, D-012               |

## 9 Bedeutung der technisch belegten B-Befunde nach Schularten

Nicht erneut technisch geprüft; Einordnung der Tragweite für die Praxis.

| Befund                                      | Grundschule                                                                                                                        | Förderschule (SFZ)                        | Mittelschule                         | Realschule / Gymnasium                                                    | Kern der Einordnung                                                           |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **B-002** Speicherlöschung iPadOS           | sehr hoch: seltene Nutzung (1–3 × pro Woche, Ferien) macht die 7-Tage-Regel wahrscheinlich, Kinder können keine Sicherung bedienen | sehr hoch, wie GS                         | hoch                                 | mittel: 1:1-Geräte täglich genutzt, Jugendliche können Sicherung bedienen | Verlust trifft gerade die Lernenden, für die Kontinuität am wichtigsten ist   |
| **B-008** LRS im QR erkennbar               | hoch: QR-Bogen wird im Klassenzimmer verteilt, Kinder vergleichen                                                                  | sehr hoch: Förderdaten besonders sensibel | hoch                                 | hoch: Jugendliche erkennen Unterschiede und reagieren sozial empfindlich  | Lösung über neutrale Übungsanpassungen (E-006)                                |
| **B-009** Lehrerdaten auf geteilten Geräten | hoch: Lehrkraft bereitet oft auf einem Koffer-iPad oder an der Tafel vor                                                           | hoch                                      | mittel–hoch                          | mittel: eher Dienstgeräte                                                 | Klarnamen und LRS-Haken auf Kindergeräten                                     |
| **B-010** keine Profiltrennung              | **kritisch**: Koffer ist der Normalfall (Annahme)                                                                                  | **kritisch**                              | hoch bis Jgst. 6, danach je nach 1:1 | gering bei 1:1                                                            | strukturelle Schere aus E-001                                                 |
| **B-011** Rechtsrahmen                      | hoch: Eltern besonders aufmerksam, Einwilligungsfragen bei Grundschulkindern                                                       | sehr hoch: besondere Kategorien möglich   | hoch                                 | hoch; in der Oberstufe Volljährige mit eigener Einwilligung               | ohne Freigabe der Schulleitung kein regulärer Einsatz in irgendeiner Schulart |

## 10 Bewertung der Dimensionen (0–5)

| Dimension                        | Wert | Begründung                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Differenzierung und Inklusion    | 1,5  | Differenzierung geschieht fast nur durch Selbstwahl des Kindes (Zahlenraum, Textstufe, Wortbox). Die Lehrkraft kann außer Vokabelpaketen nichts zuweisen (E-002). Das einzige Inklusionsmerkmal wirkt eng, gerätegebunden und stigmatisierend (E-006, E-001, B-008). Keine Vorlese-, Bild-, Mengen- oder Einzelzeigeralternativen (E-004, E-007). Positiv: gestufte Textbox-Texte, frei wählbare Zahlenräume, abgeschaltete Autokorrektur. |
| Praktischer Unterrichtseinsatz   | 2,5  | Live-Laufdiktat, Stationsmodus, QR-Bogen und LernBox-Übergabe sind unterrichtsnah und in einer Stunde einsetzbar. Für die tägliche 10-Minuten-Routine fehlen Steuerung (E-002), Rückmeldung an die Lehrkraft (E-003), Zeitbudget (D-011) und Übergaben (E-008). Ohne Freigabe der Schulleitung ist regulärer Einsatz nicht vertretbar (B-011).                                                                                             |
| Eignung Grundschule              | 2    | Jgst. 3/4: Kopfrechnen, Textbox-Texte und Live-Laufdiktat passen inhaltlich; Wortboxen nur eingeschränkt (E-005, D-007). Jgst. 1/2: Sprache, Tippen und Mengen ungeeignet (E-004). Das Gerätemodell passt nicht zu Koffer-iPads (E-001, B-010), Speicherlöschung trifft seltene Nutzung (B-002).                                                                                                                                           |
| Eignung Sekundarstufe I          | 2    | LernBox und Live-Laufdiktat sind schulartübergreifend tragfähig, 1:1-Ausstattung passt zum Gerätemodell. Wortspeicher, Textbox und Kopfrechnen liegen für Jgst. 7–10, RS und Gymnasium meist unter Niveau, Ansprache teils kindlich (E-009). Sek-I-Mathe nur über LaTeX-Eingabe.                                                                                                                                                           |
| Eignung Förderschule / Inklusion | 1    | Für Förderschwerpunkt Lernen und Sprache mit erheblichen Anpassungen nutzbar; für geistige Entwicklung ungeeignet; Zwei-Hand-Geste ohne Alternative (E-007); Förderdaten im QR erkennbar (B-008); keine Lehrkraftvorgaben und keine Förderplan-taugliche Rückmeldung (E-002, E-003); geteilte Geräte (E-001).                                                                                                                              |

## 11 Die fünf wichtigsten Befunde

1. **E-001 (P1):** Das Modell „ein Gerät = ein Kind“ passt nicht zur Ausstattung der Grund- und Förderschulen; die LRS-Erleichterung gilt für das Gerät statt für das Kind (reproduziert). Wo die Inhalte passen, fehlt die 1:1-Ausstattung, und umgekehrt.
2. **E-003 (P1):** Die Lehrkraft erfährt aus dem freien Üben nichts und aus dem Live-Raum nur Tiernamen ohne Verlauf; der Lernstandscheck ist entfallen, steht aber noch im Vault. Diagnose bleibt vollständig analog.
3. **E-002 (P1):** Außerhalb des Live-Raums kann die Lehrkraft nur Vokabeln übertragen. Lernwörter, Textbox-Texte und Rechenvorgaben lassen sich keiner Gruppe zuweisen; Differenzierung ist Selbstwahl des Kindes.
4. **E-006 (P2):** Die LRS-Unterstützung wirkt nur bei Fremdsprachenvokabeln im Live-Raum, erzeugt aber ein sensibles Diagnosemerkmal. Neutrale Übungsanpassungen für alle Kinder würden Inklusion verbessern und B-008 an der Wurzel lösen.
5. **E-004 (P2) mit E-009:** Kein Zielgruppen- und Niveaumodell. Für Jgst. 1/2, Förderschwerpunkt GE und DaZ-Anfänger zu text- und tipplastig, für Sek I und Oberstufe zu kindlich. Ehrliche Positionierung (Jgst. 3–6 und Förderbedarf, LernBox für alle) und zwei Oberflächenprofile empfohlen.

Direkt dahinter: E-005 (Kriegs- und Gewaltwörter in 27–39 % der Runden einzelner Boxen), E-007 (Zwei-Hand-Geste), E-008 (Vertretung, Schuljahreswechsel).

## 12 Echte Stärken (geprüft, nicht nur behauptet)

- **Rechtschreibfelder ohne Autokorrektur:** Alle geprüften Eingabefelder in Wortspeicher, Textbox und Live-Raum setzen `autoComplete`, `autoCorrect`, `autoCapitalize` und `spellCheck` ab und blockieren Einfügen, Ziehen und `insertReplacementText` (`src/domain/running-dictation-input.ts:1-6`, `app/views/wortspeicher/input-guards.ts:11-20`). Auf iPads ist das entscheidend; viele Übungsangebote scheitern daran.
- **Live-Laufdiktat als echte Unterrichtsmethode:** lehrkraftgesteuert, vier Modi, Stationsmodus für Klassen ohne eigenes Gerät je Kind, Übernahme der Fehlerwörter auf das Gerät des Kindes. Der Stationsmodus verzichtet bewusst auf die Übernahme, weil mehrere Kinder ein Gerät teilen – das Problembewusstsein ist im Code vorhanden.
- **Datensparsamkeit im Live-Raum:** Server und andere Geräte sehen nur Tiere und anonyme Schlüssel, keine Namen und keinen LRS-Status (bestätigt durch Codelesung von `live-room-join.tsx:575-583`). Die Kehrseite für die Diagnostik ist in E-003 beschrieben.
- **QR-Bogen zum Drucken:** Einschreibung ohne Konten, mit druckbarem Bogen je Klasse; Klassenarchiv und Entfernungscode für das Schuljahresende sind mitgedacht.
- **Kopfrechen-Generator:** Rechenarten, frei wählbarer Zahlenraum, Nullregeln, Einmaleinsreihen, Lückenaufgaben – deckt den Grundschulstoff der Grundrechenarten ab und ist spracharm im Üben (gut für DaZ).
- **Textbox-Texte:** 50 lebensweltliche Texte in drei Stufen, sprachlich auf Kinderliteratur-Niveau (LIX Ø 18,6 / 24,7 / 31,7), ohne belastende Themen in den Titeln.
- **Ruhige Schülerstartseite:** wenige Elemente, große Bedienflächen, kein Konto („Weiter als Lama“), Raumcode mit QR-Kamera.
- **Ehrliche Selbstdokumentation an mehreren Stellen:** Textbox-Plan und Vault 24 sagen, dass die Wirksamkeit der Methode für LRS nicht belegt ist; `docs/umsetzungsplan-lernraum-ui.md:61` benennt das Problem geteilter Geräte.

## 13 Quellen

Webrecherche am 20.10.2026. Primärseiten `gesetze-bayern.de` und `km.bayern.de` waren aus der Prüfumgebung per DNS nicht erreichbar; Inhalte stammen aus Suchergebnissen bzw. Sekundärquellen und sind **nicht im Primärtext verifiziert**.

- BaySchO §§ 33, 34, 36 (Nachteilsausgleich, Notenschutz, Nachweis bei LRS) – Sekundärquellen: Bayernportal, Leistungsbeschreibung „Nachteilsausgleich und Notenschutz“ (https://www.bayernportal.de/dokumente/leistung/937101518206); Antragsformulare Stadt Regensburg (https://www.regensburg.de/sixcms/media.php/464/Antrag%20Nachteilsausgleich%20Notenschutz.pdf), VGem Marktheidenfeld (https://www.vgem-marktheidenfeld.de/media/6556/antrag-auf-erteilung-von-nachteilsausgleich-und-ggf-notenschutz-lrs.pdf), FOS/BOS Nürnberg „Antrag LRS 2026“ (https://www.fos-n.de/fileadmin/Dokumente/Downloads/LRS_und_Inklusion/Antrag_LRS_2026.pdf); Auszug BaySchO (https://www.iflw.de/service/auszug_aus_der_bayscho_nachteilsausgleich.pdf); VG München, Beschluss v. 12.05.2025 – M 3 E 25.1173 (https://www.gesetze-bayern.de/Content/Pdf/Y-300-Z-BECKRS-B-2025-N-25186?all=False). Grenzen: Verfahrensdetails unterscheiden sich je Schulart; keine Rechtsberatung.
- „Digitale Schule der Zukunft“ (1:1-Ausstattung, Zuschuss max. 350 €, beteiligte Schularten MS/RS/WS/Gym, Einstieg i. d. R. Jgst. 7/8) – Suchergebnisse zu https://www.km.bayern.de/digitale-schule-der-zukunft/allgemein, https://www.km.bayern.de/digitale-schule-der-zukunft/erziehungsberechtigte/geraetekauf und Förderrichtlinie BayVV 2230-1-3-K (https://www.gesetze-bayern.de/Content/Document/BayVV_2230_1_3_K_14543-21). Grenzen: Jahrgangsstufen können je Schuljahr wechseln; Grundschulen in den Treffern nicht genannt.
- WCAG 2.1, Erfolgskriterium 2.5.1 „Zeigergesten“ (W3C) – Fachkenntnis, nicht online verifiziert.
- LIX nach Björnsson (1968); Wiener Sachtextformeln nach Bamberger/Vanecek (1984) – Fachkenntnis; die Silbenzählung im Skript ist heuristisch.
- LehrplanPLUS Grundschule Englisch (Schwerpunkt Hören/Sprechen ab Jgst. 3), Art. 2 BayEUG (Inklusion als Aufgabe aller Schulen), Apple „Geteiltes iPad“ – Fachkenntnis, nicht online verifiziert.
- Annahmen ohne Beleg: Verbreitung von iPad-Koffern an bayerischen Grundschulen; Anteil von Kindern mit Fluchterfahrung in Deutschklassen; Einrichtungs- und Bedienzeiten.

## 14 Reproduktionsartefakte (Scratchpad, nicht im Repository)

Verzeichnis: `/tmp/claude-0/-home-user-Lernplattform/c2fe15db-371c-56e7-8bd8-eafd11c1a5af/scratchpad/repro-e/`

- `e-schularten.test.ts` – Vitest-Reproduktionen E1–E4; Ausführung: `cd /home/user/Lernplattform && AUDIT_DIR=<repro-e> npx vitest run --config <scratchpad>/repro/vitest.audit.config.mts e-schularten`
- `e-schularten.out.txt` (Lauf 3) und `e-schularten.out.lauf2.txt` (Lauf 2) – identische Ausgaben
- `browser-texts.mjs`, `student-texts.json`, `shots/*.png` – sichtbare Schülertexte und Bildschirmfotos (Chromium, iPad-Viewport, Dev-Server 3002)
- `readability.mjs`, `readability.out.txt`, `readability.out.json` – Lesbarkeits- und Fachbegriffsmessung
- `notizen-lauf2.txt` – Arbeitsprotokoll des abgebrochenen Laufs 2
