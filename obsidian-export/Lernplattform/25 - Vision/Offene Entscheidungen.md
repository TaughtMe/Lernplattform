---
tags:
  - lernplattform
  - vision
  - entscheidungen
status: vorschlag
stand: 2026-11-11
umsetzungsstand: Vorgeschlagen
---

# Offene Entscheidungen

> **Dieses Kapitel ist ein Vorschlag des Expertengremiums vom 11.11.2026. Nichts davon ist beschlossen.** Maßgeblich bleiben das [[../19 - Entscheidungsprotokoll/Anwendung|Entscheidungsprotokoll]] und die Berichte unter `docs/vision/`. Die Protokolleinträge unten sind **Entwürfe**. Das Gremium hat nichts ins Entscheidungsprotokoll eingetragen.

## Was schon entschieden ist

Diese Punkte hat der Entwickler beantwortet (`docs/vision/01-planung.md`, Abschnitt 4). Sie stehen hier nur, damit niemand sie noch einmal aufrollt:

- Zielgruppe: bayerische Mittelschule, alle Klassen, dazu Grundlagen aus der Grundschule.
- Eigene und geteilte Geräte kommen beide vor. Auf fremden Geräten ist es freies Üben.
- Reihenfolge: Rechtschreibung, dann Englisch-Vokabeln, dann Mathe über das Kopfrechnen hinaus. **Lesen rückt nach hinten**, mit Schwerpunkt Leseverständnis. Deutsch als Zweitsprache steht auf der Warteliste. Häuser, Duell, Tastenwelt und Geräte-Abgleich ruhen.
- Rund 65 Bausteine in drei Etappen; eigene Schule und zwei bis drei Pilotschulen statt „Schulamtsbezirk“.
- Lizenz: Code EUPL-1.2, Inhalte CC BY-SA 4.0, in der ersten Etappe. Markenfiguren werden ersetzt.
- Elf Ja-Antworten vom 10.11.2026 (Mathe bis Klasse 9, Kernbestand von 30 Wörtern, Satzformate, 15 Texte, Klassentempo, Battle nach Genauigkeit, Auftrags-QR mit Kennungen, Klassengerät-Modus, gezählte Runden).

Mehrere dieser Antworten ändern frühere Entscheidungen. Dafür fehlen noch die Einträge im Protokoll (unten, „Entwürfe“).

## Was noch bei dir liegt

| Nr. | Frage | Empfehlung | Begründung | Wenn ja | Wenn nein oder offen | Berührt |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Wann sprichst du mit Schulleitung und Datenschutzbeauftragtem über den Einsatz? | Termin vor den Weihnachtsferien. | Alles mit Namen, jeder Kurzbericht und jede weitere Schule hängen daran. Das Impressum untersagt heute den Schulbetrieb. | Schulpaket auf zwei Seiten entsteht nach dem, was der Datenschutzbeauftragte verlangt. | Etappe 3 läuft ohne Klarnamen; Pilotschulen warten. | 9, 11; Audit S1 |
| 2 | Wie viele Stunden in der Woche hast du wirklich, und wie viele davon zum Prüfen? | Vier Wochen mitschreiben. | Alle Termine beruhen auf der Annahme „sechs Stunden, davon zwei für Inhalte“. | Termine werden belastbar. | Die Etappen bleiben Schätzungen. | – |
| 3 | Lizenz, die Einzelheiten: Bleiben Name und Logo „Lernraum“ geschützt? Wer malt die Ersatzfiguren? Fragst du eine Juristin? | Name und Logo ausnehmen. Figuren selbst erstellen. Juristin beim Gespräch aus Nr. 1 mitfragen. | Ob von einer KI geschriebener Code Urheberschutz genießt, ist offen. Für „jeder darf weiterführen“ schadet das nicht. Die Bedingungen von Coco Material und die Lizenz der Vorgänger-Repositories sind ungeprüft. | Lizenzdateien entstehen in Etappe 1. | Bei deinem Ausfall darf niemand übernehmen. | 41; neu |
| 4 | Gewinnst du eine Fachkollegin als zweite Prüferin für Inhalte? | Ja, für Kernwörter und Englisch. | Größter Hebel gegen den Engpass (Bericht 40). Kein Bericht hat es sonst vorgeschlagen. | Prüfzeit verdoppelt sich; Fehler fallen eher auf. | Es bleibt bei etwa 28 Stunden Inhalt in zwölf Monaten. | 54 (Prüfpflicht) |
| 5 | Wer bekommt als zweite Person Zugang zu Cloudflare, Supabase und Repository? | Eine Person deines Vertrauens, mit Notfallblatt. | Fällst du aus, pausiert der Live-Raum nach einer Ferienwoche und lässt sich nur von Hand wecken. | Lernraum überlebt einen Ausfall. | Der Türöffner fällt als Erstes aus. | – |
| 6 | Wie erklärst du die s-Schreibung, wenn deine Klassen das stimmhafte s („summen“) nicht hören? | Zwei Schritte: nach kurzem Vokal ss; nach langem Vokal sind ß und s Merkstellen mit Wortfamilie. | Du kennst die Aussprache deiner Klassen am besten (Bericht 20, Frage 7.5). | Die Korrektur der Wortbox „s, ss und ß“ kann beginnen. | Der Regeltext verlangt eine Unterscheidung, die viele nicht hören. | 55 |
| 7 | Sprachausgabe überall nur mit Stimmen des Geräts, auch wenn Vorlesen und „Hören und schreiben“ auf manchen Geräten dann fehlen? | Ja, nach der Prüfung an drei Gerätearten und mit sichtbarem Hinweis. | Entscheidung 58 sagt „nur lokale Stimmen“; der Code hält das an vier Stellen nicht ein. | Kein Wort geht an einen fremden Dienst. | Protokoll und Code widersprechen sich weiter. | 58 |
| 8 | Was kommt im zweiten Jahr zuerst: Großschreibung und das/dass im Satz oder Leseverständnis? | Großschreibung und das/dass. | Es ist der Stoff der Mittelschule und baut auf den Kernwörtern auf. Leseverständnis ist ein neuer Bereich mit 8 bis 10 Stunden Prüfzeit. | Rechtschreibung reicht bis Jahrgang 9. | Lesen käme früher, Lernraum bliebe in der Rechtschreibung bei Grundlagen. | 55; Nachtrag vom 11.11. |
| 9 | Sollen Lautlese-Formate (satzweises Vorlesen, Tandem-Begleiter) als Zusatz zum Leseverständnis bleiben oder ganz entfallen? | Als Zusatz beschrieben lassen, nicht einplanen. | Bericht 21: Für schwache Leser ist begleitetes Lautlesen am besten belegt; Verständnisaufgaben am Gerät allein wirken schwach [Fachstand]. Du hast erlebt, dass Tandems im Unterricht schwer laufen. | Die Tür bleibt offen, ohne Zeit zu binden. | Lesen in Lernraum hilft vor allem Kindern, die schon flüssig lesen. | – |
| 10 | Wird die Übung aus dem eigenen Fehlermuster gebaut? | Erst nach zwei Proben: 100 Falschschreibungen zuordnen; zählen, wie viele Kinder ein festes Gerät haben. | Teuerster Teil; nützt nur Kindern, die an mehreren Tagen am selben Gerät üben. | Bau am Ende von Etappe 3. | Strategie am Fehler und Kontrastrunden bleiben; sie wirken auf jedem Gerät. | 57, 59 |
| 11 | Kommt „Klasse gegen die Uhr“? | Erst je zwei Wochen „ruhig“ und „gegen die Uhr“ im Unterricht vergleichen. | Du hast Klassentempo erlaubt. Bericht 31 warnt: Auch gemeinsames Tempo kann Druck machen („Wegen dir schaffen wir es nicht“). | Bau in Etappe 3. | Es bleibt beim Klassenziel ohne Uhr. | 39; Vault 23 |
| 12 | Was geschieht mit der Schreiberleichterung? | Bis zum Gespräch aus Nr. 1 unverändert und im Alltag nicht nutzen; dann auslaufen lassen. | Das lesbare Zeichen im QR-Code ist das einzige LRS-Merkmal im System. Du hast gesagt, ein Umbau sei keine Priorität. | Ein Merkmal weniger; Entscheidung 50 wird zurückgenommen (Entwurf folgt nach dem Gespräch). | Das Merkmal bleibt; der Datenschutzbeauftragte wird danach fragen. | 50 |
| 13 | Häuser und Hauspunkte: bleiben sie ein Ziel? | Ruhen lassen; in zwölf Monaten neu fragen. | Dein Wunsch aus Frage 3 (Punkte ins Haus geben) braucht einen neuen Datenfluss zum Server. Das Red Team rät ab, solange es keine Nutzer gibt. Ein Hausbrief per QR ist schon gebaut. | – | Nichts geht verloren; nichts wird gelöscht. | 10, 39 |
| 14 | Koffer-Geräte dauerhaft als „Klassengerät“ markieren? | Erst zählen, wie viele Koffer-Geräte es gibt. | Du hast zugestimmt. Der Modus verlangt aber eine einmalige Einrichtung je Gerät. | Bau in Etappe 3. | Es bleibt beim Gast-QR. | 10, 59 |
| 15 | Darfst du echte Namen der Kinder verwenden? | Nicht vor dem Gespräch aus Nr. 1. | Bis dahin funktioniert alles mit Tieren. | – | – | 3, 9 |
| 16 | Drei Punkte aus Welle 3, die das Gremium nicht behandelt hat: „Beenden“ bietet 24 Stunden „Weitermachen“; Cloud-Abgleich aus den Kindereinstellungen verschieben; Uhr über Module hinweg. | Die Uhr geht im Schnellstart auf. Die beiden anderen entscheidest du unabhängig. | Kein Bericht hat sie geprüft. | – | Sie bleiben in `docs/umsetzungsplan-audit-welle-3.md` offen. | 59 |

Annahmen, mit denen das Gremium gearbeitet hat, weil keine Antwort vorlag: Stifte und Tastaturen sind nicht überall vorhanden; feste Geräte gibt es eher in den höheren Jahrgängen; Schulgeräte haben nicht sicher eine deutsche Stimme. Alle drei klärt das Beobachtungsheft in Etappe 1.

## Entwürfe für das Entscheidungsprotokoll

Nach `AGENTS.md` braucht jede zurückgenommene oder umgedrehte Festlegung einen Eintrag mit „Zurückgenommen“ und „Nicht wieder einbauen“. Die Nummern vergibst du. Das Red Team rät, die Änderungen an Entscheidung 57 in **einem** Eintrag zu bündeln; nach seinen Empfehlungen bleibt 57 selbst unverändert.

### A. Einträge mit Rücknahme

**A1. Satzformate sind erlaubt** (berührt 55)

- **Beschlossen:** Satzdiktat und Lückensatz dürfen im Wortspeicher und in der LernBox kommen. Gebaut werden sie frühestens im zweiten Jahr.
- **Zurückgenommen:** Entscheidung 55, „Das Lückensatz-Design 4e wird nicht umgesetzt“.
- **Begründung:** Ohne Satz gibt es keine Großschreibung, kein das/dass, kein Komma.
- **Nicht wieder einbauen:** Sätze, die zur Laufzeit erzeugt werden. Nur feste, geprüfte Sätze.

**A2. „Erledigt“ ergibt sich aus gezählten Runden** (berührt 45)

- **Beschlossen:** Ein Auftrag nennt Übung und Ziel („3 Runden“). Die Abgabe zählt erledigte Runden.
- **Zurückgenommen:** Entscheidung 45, „Nach dem bewussten Markieren als erledigt“ als einziger Auslöser.
- **Begründung:** Selbstauskunft sagt der Lehrkraft nichts; ein Auftrag, der nur auf die Fachseite führt, ist langsamer als ein Arbeitsblatt.
- **Nicht wieder einbauen:** einen Erledigt-Knopf ohne Bezug zur Übung. Weiterhin keine Antworten und keine Fehlerwörter im Nachweis.

**A3. Auftrags-QR mit Kennungen** (berührt Welle 3, D4)

- **Beschlossen:** Ein QR-Code darf Kennungen mitgelieferter Übungen tragen (Wortbox, Stufe, Rechenvorgabe).
- **Zurückgenommen:** die Rücknahme des Auftrags per QR aus Welle 3, D4, soweit sie mitgelieferte Übungen betrifft.
- **Begründung:** Gedruckte Übungskarten lassen sich jedes Jahr wieder nutzen und brauchen kein Lehrergerät.
- **Nicht wieder einbauen:** eigene Wörter der Lehrkraft im Link. Dafür bleiben die Lernwortlisten.

**A4. Vokabelstapel werden mündlich nicht „sicher“** (berührt Welle 3, D2-3)

- **Beschlossen:** Selbsteinschätzung zählt als Üben und hebt bis Box 3. Ein so geübter Stapel heißt „mündlich gewusst“.
- **Zurückgenommen:** die Festlegung vom 27.10.2026, nach der ein Stapel mündlich „sicher“ werden kann.
- **Begründung:** Kinder überschätzen „Hab ich gewusst“. In der Rechtschreibung gilt die strengere Regel schon.
- **Nicht wieder einbauen:** „sicher“ aus Selbsteinschätzung, in keinem Fach.

**A5. Fehler an der Tafel erst ab sechs Teilnehmenden** (berührt Welle 3, D5-5)

- **Beschlossen:** „Häufigste Fehler“ und Fehlerzahlen erscheinen in der Projektion erst ab sechs Kindern. Die Ansicht „Braucht Hilfe“ wird nie projiziert.
- **Zurückgenommen:** die Projektion mit Fehlerzahlen ohne Mindestgröße (D5-5).
- **Begründung:** In einer Förderstunde mit vier Kindern ist sonst erkennbar, wessen Fehler es ist.
- **Nicht wieder einbauen:** Fehleranzeigen an der Tafel für Kleingruppen.

**A6. Textbox: 15 geprüfte Texte** (berührt 54; zugleich Berichtigung)

- **Beschlossen:** 15 Texte werden fachlich geprüft und bleiben sichtbar. Die übrigen werden ausgeblendet, bis sie geprüft sind.
- **Zurückgenommen:** die Auslieferung aller 50 Texte. Berichtigt wird die Aussage in Entscheidung 54, die Texte seien „von der Lehrkraft fachlich geprüft“; laut `docs/inhalte/textbox.md` sind sie es nicht.
- **Nicht wieder einbauen:** ungeprüfte Inhalte vor Kindern, auch nicht als Vorschau.

**A7. Battle: Störangriffe standardmäßig aus** (berührt 37)

- **Beschlossen:** Tinte und Flimmern sind aus, bis die Lehrkraft sie einschaltet. Angriffe laden über richtige Antworten in Folge, nicht über Tempo.
- **Zurückgenommen:** der Standard „an“.
- **Nicht wieder einbauen:** Störungen als Voreinstellung; Ladung, die Schnelligkeit belohnt.

**A8. Lesen: Verständnis vor Lautlesen** (berührt Nachtrag nach Phase 2, Nr. 5)

- **Beschlossen:** Lesen kommt nach den drei Etappen, mit Schwerpunkt Leseverständnis.
- **Zurückgenommen:** die Antwort vom 10.11.2026, zuerst Tandem-Begleiter, Chorlesen und Wort-Blitz zu bauen.
- **Begründung:** Lesetandem und Chorlesen sind im Unterricht schwer umzusetzen (Entwickler, 11.11.2026).
- **Nicht wieder einbauen:** Lautlese-Formate als erster Schritt. Als Zusatz bleiben sie möglich.
- **Bekannte Grenzen:** Für schwache Leser ist begleitetes Lautlesen besser belegt als Aufgaben am Gerät.

### B. Ergänzungen ohne Rücknahme

| Entwurf | Inhalt | Berührt |
| --- | --- | --- |
| B1 Kernbestand | Eine Rechtschreib-Wortbox darf mit etwa 30 ausgezeichneten Kernwörtern starten. Die großen Boxen bleiben als Wortbank. | 30 |
| B2 Mathe bis Klasse 9 | Grundrechnen bis Klasse 9: Stellenwert, Zehnereinmaleins, Kommazahlen, Größen; Brüche und Prozent später. Ohne Geometrie und Prüfungsstoff. | 38 |
| B3 Klassentempo | „Schnelle Antwort: kein eigener Bonus“ meint das einzelne Kind. Die Klasse darf gemeinsam gegen die Uhr und den eigenen Rekord spielen, ohne Rangliste. Bau erst nach der Erprobung. | Vault 23; 7, 10, 39 |
| B4 Vorlesen | Der Knopf wird in Aufgaben eingebaut. „Nur lokale Stimmen“ gilt für jede Sprachausgabe, nach der Geräteprüfung. | 58 |
| B5 Lizenz | Code EUPL-1.2, Inhalte CC BY-SA 4.0 in eigenen Dateien; Name und Logo ausgenommen. | 41 |
| B6 Sprache | „Mein Stand“ statt „Kompetenzprofil“; Wortliste aus [[Förderkreislauf]]. Die interne Kennung `diagnostik` bleibt. | 31, 59 |
| B7 Zuschnitt | Rund 65 Bausteine in drei Etappen; eigene Schule und zwei bis drei Pilotschulen; eine Inhaltslinie zur Zeit. | 39; Audit I.6 |
| B8 Nachträge | Entscheidung 53 fehlt im Protokoll (Inhalt nur in `docs/cloud-sync.md`). Die Festlegungen vom 27.10.2026 stehen nur in den Wellen-Plänen. Der Entscheidungsindex ist an mehreren Zeilen veraltet. | 53; Index |

## Siehe auch

- [[Anwendung|Vision]] · [[Roadmap]] · [[Förderkreislauf]] · [[Kompetenzlandkarte]] · [[Wettbewerbsvergleich]]
- [[../19 - Entscheidungsprotokoll/Anwendung|Entscheidungsprotokoll]], [[../19 - Entscheidungsprotokoll/Entscheidungsindex|Entscheidungsindex]], [[../13 - Datenschutz und Rollen/Anwendung|Datenschutz und Rollen]]
- Repository: `docs/vision/01-planung.md` (Abschnitt 4), `docs/vision/40-red-team.md` (Abschnitte 11 bis 13)
