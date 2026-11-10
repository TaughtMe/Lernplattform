# Vision Lernraum – Rolle 30: Lernpsychologie, Förderkreislauf und Lernstand

Stand: 10.11.2026. Grundlage: Code der Version 0.9.7, Berichte 10 bis 12 und
20 bis 25, `01-planung.md`, Abschnitt 4 mit beiden Nachträgen. Die roten Linien
aus Bericht 12 (RL-1 bis RL-13) gelten.

Kennzeichen: [Beleg] Repository, [Fachstand] Forschung oder anerkannte Praxis
mit Quelle, [Vermutung] plausibel, nicht belegt, [Empfehlung] Vorschlag dieser
Rolle. Webangaben stammen aus Suchauszügen vom 10.11.2026; `levumi.de` war aus
der Sitzung nicht erreichbar, kein Original wurde vollständig gelesen.

## 1. Kurzfazit

1. Der Kreislauf ist heute an drei Stellen geschlossen: Fehler werden fällig,
   Abstände wachsen, Unterrichtsfehler wandern ins eigene Üben. Er reißt beim
   **nächsten Lernschritt** (die Portion kennt Neues nur als LernBox-Karte),
   beim **Auftrag** (öffnet keine Übung) und bei der **Rückmeldung** an die
   Lehrkraft.
2. Die vier Fachberichte brauchen kein viertes und fünftes Datenmodell. Es
   genügen drei gemeinsame Begriffe: **Lernobjekt**, **Teilkompetenz** und
   **Nachweisstufe**. Alles Weitere bleibt Sache des Fachs.
3. Die Fachberichte widersprechen sich an acht Stellen (4.1). Die wichtigsten:
   Bericht 25 nennt auf fremden Geräten „9 von 12 sicher“, obwohl „sicher“ zwei
   Tage braucht; Selbsteinschätzung macht Vokabelstapel „sicher“, Rechtschreibung
   nicht; Lesezeit wird als Fortschritt gezeigt und zugleich als Ziel abgelehnt.
4. Die Regel „sicher“ ist im Kern richtig und soll bleiben. Sie braucht eine
   sichtbare Herleitung, kleinere Einheiten und eine vierte Stufe „gefestigt“.
   Ein Abruf nach drei Tagen trägt das Wort „sicher“ nur knapp.
5. Ein Fehlermuster ist ab der Schwelle aus Bericht 20 eine brauchbare
   **Übungsempfehlung**, mehr nicht: Ein Kind mit 10 % Flüchtigkeitsfehlern
   löst sie in etwa 5 von 100 Fällen aus [eigene Rechnung]. Das reicht für
   zehn Minuten Übung, nicht für eine Aussage an Dritte.
6. „Heute“ soll eine **Zeiteinheit aus drei Blöcken** werden (Wiederholen,
   Weiter, Abschluss). Die Regeln der Entscheidung 57 bleiben; neu ist nur das
   Auffüllen mit dem nächsten Lernschritt.
7. Eigene Lernverlaufstests baut Lernraum nicht. Redlich möglich ist ein
   **Rückblick** auf geübte Inhalte. Für Messung verweist Lernraum auf Levumi;
   die Lehrkraft überträgt das Ergebnis von Hand in eine Übungswahl.
8. Ob Lernraum wirkt, kann eine Lehrkraft mit zwei Wortsätzen und zwei
   Papierdiktaten in vier Wochen prüfen (4.7).
9. Die Wörter „Diagnose“, „Test“, „adaptiv“ und „Kompetenzprofil“ gehören nicht
   in die Vision; „Übungsstand“ und „Übungsempfehlung“ schon.

## 2. Ist-Stand in Lernraum

### 2.1 Was es gibt

| Baustein          | Regel heute [Beleg]                                                                                                                                                                                             | Datei                                      |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Wiederholungskern | Eine reine Funktion für LernBox, Lernwörter, Mathe; Abstände 1/3/7/14/30 Tage; kein Aufstieg vor Fälligkeit, mit Hilfe oder nach Fehler; Selbsteinschätzung höchstens Box 3; je Modul eine benannte Regelzeile  | `spaced-repetition.ts`, Z. 1–24, 130–200   |
| Regeltabelle      | Zehn Fälle aus Vault 06 als gemeinsamer Test für alle Module                                                                                                                                                    | `testing/repetition-rule-table.ts`         |
| Tagesportion      | 20 Elemente, fest je Tag: bis 6 Fehler (jüngster zuerst), dann Fälliges (ältestes zuerst), bis 4 Neue (10 ohne Rückstand); Module wechseln ab; erledigt ist ein Element nach einem Ereignis, gleich ob richtig  | `daily-plan.ts`, Z. 7–14, 137–230          |
| Tagestraining     | 10 oder 20 Minuten aktive Zeit; Fehler vor Fälligem vor Neuem, schwache Teilbereiche zuerst; Schätzwerte 20/45/75 Sekunden; laufende Aufgabe wird fertig gemacht                                                | `daily-training.ts`, Z. 27–37, 118–185     |
| Startpunkt        | Je 12 Aufgaben aufsteigend, zwei je Stufe, Ende nach zwei Fehlern einer Stufe; Ergebnis ist ein Vorschlag                                                                                                       | `start-point.ts`, Z. 11–34                 |
| Kompetenzprofil   | Objekt „sicher“: Box ≥ 3 und richtiger Abruf ohne Hilfe an ≥ 2 Tagen. Teilbereich „sicher“: ≥ 80 % der Objekte, mindestens 5. Mathe: ≥ 5 verschiedene Aufgaben, ≥ 2 Tage, kein offener Fehlerposten unter Box 3 | `competence-profile.ts`, Z. 15–47, 286–323 |
| Lernereignis      | Trägt Quelle, Antwortform (getippt, Auswahl, Selbsteinschätzung), Hilfe, Bewertung, Runde, Zeitpunkt                                                                                                            | `learning-bundle.ts`, Z. 74–109            |

### 2.2 Was fehlt oder schief ist

| Nr. | Befund [Beleg, wo nicht anders markiert]                                                                                                                                                                                                                                         | Beleg                                                                                      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| B1  | **Das Ereignis kennt die Nachweisstärke nicht.** Abschreiben (Stufe 1) und Hören-und-Schreiben (Stufe 6) erzeugen dasselbe Ereignis „getippt, ohne Hilfe“. Das Profil zählt beide als Tag mit Abruf. Die Box schützt (sie steigt nur auf Stufe 4 bis 6), die Tageszählung nicht. | `personal-learning-events.ts`, `recordAttempt`; `competence-profile.ts`, `isUnaidedRecall` |
| B2  | „Sicher“ ist frühestens nach vier Tagen erreicht; der letzte Abruf liegt dann drei Tage nach dem vorigen. Das Audit hatte sieben Tage vorgeschlagen (Abschlussbericht, F.4).                                                                                                     | Regelzeilen `lernwort`, `lernbox`                                                          |
| B3  | Die Einheit ist zu groß: Eine Wortbox mit 105 Wörtern wird erst mit 84 sicheren Wörtern „sicher“. Schwache Kinder sehen diesen Wechsel praktisch nie [Vermutung zur Wirkung].                                                                                                    | `COMPETENCE_SAFE_SHARE`                                                                    |
| B4  | Ein Vokabelstapel kann allein über Selbsteinschätzung „sicher“ werden (bewusste Ausnahme aus Welle 3, D2).                                                                                                                                                                       | `competence-profile.ts`, Z. 28–35                                                          |
| B5  | Der Startpunkt Rechtschreibung misst je nach Gerät Verschiedenes: mit deutscher Stimme ein Diktat, ohne Stimme ein Lückenwort („B_e_e“). Ein einzelner Fehler auf Stufe 1 setzt den Vorschlag auf Stufe 1, auch wenn alles Weitere richtig war.                                  | `start-point-app.test.tsx`, Z. 87; `startPointLevel`                                       |
| B6  | Die Portion bringt Neues nur aus LernBox-Karten. Rechtschreibung und Mathe haben keinen „nächsten Schritt“; ohne Lernstand ist die Portion leer.                                                                                                                                 | Bericht 10, Abschnitt 4; `src/storage/daily-plan.ts`, Z. 77–81                             |
| B7  | Die Schätzwerte des Trainings sind unkalibriert; 20 Elemente reichen für 7 bis 25 Minuten.                                                                                                                                                                                       | `daily-training.ts`, Kopfkommentar; Bericht 10, 4c                                         |
| B8  | Die Mathe-Familie folgt der Einstellung, nicht der Aufgabe; Zählen und Abrufen sind nicht unterscheidbar.                                                                                                                                                                        | Bericht 22, 2.2                                                                            |
| B9  | Die Reflexionsfrage „Ist dein Ergebnis bei jeder Übung gestiegen?“ setzt einen Maßstab, den Messfehler unerfüllbar macht.                                                                                                                                                        | `progress-reflection.ts`                                                                   |
| B10 | Sprache: App-Texte sind bereinigt, aber Freigabebereich `diagnostik`, „Kompetenzprofil“ und die Vault-Kapitel 07 und 22 („Adaptiv…“) tragen die alten Begriffe.                                                                                                                  | `release.ts`; Bericht 10, S12                                                              |

**Bewertung der heutigen Regeln.** Kern, Portion und Training sind fachlich
tragfähig: Abruf, wachsende Abstände, gedeckelte Menge, kein sichtbarer
Rückstand. Ich schlage keine Änderung an Abständen, Kontingenten oder der
Rückstufung auf Box 1 vor. Dafür fehlen Daten; das Audit behandelt Box − 1 als
Option nach der Beobachtungsphase (Abschlussbericht, M.8 Nr. 4).

## 3. Fachstand und Vorbilder

| Aussage                                                                                                                                                                                                                                                                                                      | Einordnung                                                    | Quelle (Abruf 10.11.2026)                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Abrufübung wirkt auch im Klassenzimmer; eine Übersicht angewandter Studien fällt günstig aus, mit oder ohne Rückmeldung. Ob sie anderen aktiven Lernformen überlegen ist, bleibt offen.                                                                                                                      | [Fachstand], gut gestützt                                     | Moreira u. a. 2019, frontiersin.org/articles/10.3389/feduc.2019.00005                                                                  |
| Quiz im Unterricht: etwa eine halbe Standardabweichung (g = 0,50). Verteiltes gegenüber gebündeltem Üben: g = 0,74; wachsende Abstände sind gleichbleibenden nicht klar überlegen.                                                                                                                           | [Fachstand], nur Suchauszug bzw. Audit                        | Yang u. a. 2021 (Fundstelle nicht zugeordnet); Latimier u. a. 2021, zitiert im Abschlussbericht, F.2                                   |
| Rückmeldung wirkt im Mittel mittelstark (d = 0,48), aber sehr uneinheitlich; es kommt auf den Informationsgehalt an. In einer älteren Übersicht war etwa ein Drittel der Effekte negativ.                                                                                                                    | [Fachstand]                                                   | Wisniewski, Zierer, Hattie 2020, frontiersin.org/articles/10.3389/fpsyg.2019.03087 (Kluger und DeNisi dort zitiert)                    |
| Lernverlaufsdiagnostik (curriculumbasierte Messung: kurze, gleich schwere Proben in festen Abständen) verlangt neben Objektivität, Zuverlässigkeit und Gültigkeit auch Änderungssensitivität, also dass echte Fortschritte sichtbar werden.                                                                  | [Fachstand]                                                   | Klauer 2006, 2011; Walter 2008, zitiert in Lehrmaterial der Universität Frankfurt (Suchauszug)                                         |
| Gleich schwere Paralleltests müssen empirisch geprüft werden: Eine Studie ließ dafür rund 200 Kinder über 19 Wochen zehn Formen mit je 24 Aufgaben bearbeiten. Für Rechtschreibung gelten vergleichbare Parallelformen als Forschungslücke.                                                                  | [Fachstand], Suchauszug                                       | Vanauer u. a. 2022, pedocs.de/volltexte/2022/24873; zweite Fundstelle nicht zugeordnet                                                 |
| Kinder überschätzen ihre Leistung.                                                                                                                                                                                                                                                                           | [Fachstand], n. o. v.                                         | Destan und Roebers 2015, zitiert im Audit                                                                                              |
| **Levumi:** nach kostenloser Registrierung frei nutzbar; Lesen, Rechtschreiben, Mathematik (Zahlen und Operationen) in Niveaustufen; gedacht für Grundschule und Sekundarstufe I, besonders bei Lernschwierigkeiten; Kinder melden sich mit Code oder QR an, Ergebnisse liegen im Klassenbuch der Lehrkraft. | [Fachstand], Suchauszug; Stand 2026 am Original **ungeprüft** | Testbeschreibungen epub.uni-regensburg.de/51916 und /52570; Handbuch epub.ub.uni-muenchen.de/107880; friedrich-verlag.de (Levumi 8154) |

Folgerungen [Empfehlung]:

- Abruf und Abstand sind die am besten gestützten Hebel. Lernraum hat beide.
  Der Engpass ist nicht der Algorithmus, sondern die Güte der Signale (B1).
- Rückmeldung nützt, wenn sie sagt, was zu tun ist (Strategie am Fehlerort,
  R20-5, MA-8). Eine Zahl ohne Handlung nützt nicht und kann schaden.
- Eine Einzelperson kann keine Paralleltests eichen. Das bestätigt die Linie
  des Audits (F.4) und des Entwicklers („Startpunkt statt Test“).

## 4. Zielbild

### 4.1 Widersprüche zwischen den Fachberichten und ihre Auflösung

| Nr. | Widerspruch                                                                                                                                                                                                   | Auflösung [Empfehlung]                                                                                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W1  | **„Sicher“ auf fremden Geräten.** Bericht 25 (4.4) zeigt nach 20 Minuten „9 von 12 sicher“. „Sicher“ verlangt Abruf an zwei Tagen (Code; Bericht 20, 4.3).                                                    | Ohne Lernstand heißt es „9 von 12 beim ersten Versuch richtig“. „Sicher“ gibt es nur auf festen Geräten.                                                                                                                                          |
| W2  | **Selbsteinschätzung.** Bericht 20: nie „sicher“ über Selbstkontrolle. Code und Bericht 23 (R23-8): Stapel wird mündlich „sicher“.                                                                            | Eine Regel für alle: Selbsteinschätzung zählt als Üben, „Falsch“ wird geglaubt, „Richtig“ hebt bis Box 3, macht aber nicht „sicher“. Mündlich gewusste Stapel heißen „mündlich gewusst“. Entscheidungsvorlage E30-2.                              |
| W3  | **Richtiges wiederholen.** Entscheidung 57: Mathe wiederholt nur Fehler. Bericht 22 (MA-7): Basisfakten auch nach richtiger Antwort. Wörter und Karten laufen ohnehin alle durch Leitner.                     | Unterschied nach Art des Lernobjekts: **geschlossene Menge** (Wort, Karte, 100 Einmaleins-Fakten, Plus/Minus bis 20) = jedes Objekt im Wiederholungsplan; **offene Menge** (erzeugte Aufgaben) = Fehlerreparatur je Familie. Vorlage E30-3.       |
| W4  | **Zeit.** Bericht 22 misst Antwortzeit und zeigt „flüssig“. Bericht 24 zeigt dem Kind keine Zeit. Bericht 21 zeigt Lesezeiten als Verlauf und lehnt Tempo als Ziel ab. Bericht 25 nennt Minuten Datenballast. | Eine Zeitregel: Zeit darf lokal gemessen werden; gezeigt wird sie nie allein, nur zusammen mit Genauigkeit und nur im Vergleich mit sich selbst. Lesen allein zeigt Durchgänge, keine Zeiten; Wörter pro Minute nur im Tandem mit Stolperstellen. |
| W5  | **Stufennamen.** Bericht 23 nennt Stufen „Klasse 5/6“. Berichte 12 und 20 schließen Jahrgangsniveaus aus. Bericht 25 braucht für die Drei-Tipp-Wahl eine Liste nach Jahrgang.                                 | Stufen sind Lernschritte mit neutralen Namen („Grundlagen“, „Aufbau 1“). Das Kind sieht nie einen Jahrgang. „Üblich in Jahrgang …“ steht nur in der Auswahl der Lehrkraft.                                                                        |
| W6  | **Einheit von „Heute“.** Entscheidung 57 zählt 20 Aufgaben. Berichte 25 und 21 planen Minuten. Bericht 23: vier neue Karten füllen keine 20 Minuten.                                                          | „Heute“ ist eine Zeiteinheit; die Portion bleibt ihr Wiederholungsteil (4.4).                                                                                                                                                                     |
| W7  | **Startpunkt.** Bericht 25: zwei Minuten. Bericht 20: drei Wörter je Stufe bis Stufe E (über 20 Wörter). Bericht 22: Einstieg in der Mitte. Code: aufsteigend, zwei je Stufe.                                 | Eine gemeinsame Regel (4.5): höchstens 12 Aufgaben, drei je Stufe, Einstieg in der Mitte, auf und ab. Die Genauigkeit kommt aus dem Nachsteuern in der Übung, nicht aus einem längeren Startpunkt.                                                |
| W8  | **Vier Datenformate.** R20-2, L21-5, R23-1 und M24-7 bauen je ein eigenes Paketformat und warten je auf den Modulvertrag.                                                                                     | Ein Inhaltspaket mit gemeinsamen Kopffeldern und fachlichem Rumpf, eine Prüfansicht (F30-1).                                                                                                                                                      |

Kein Widerspruch, aber gleichzurichten: Berichte 12, 20, 21 und 25
beschreiben den Kurzbericht je anders. Er bekommt ein Format (F30-11).

### 4.2 Das kleinste gemeinsame Modell

| Begriff           | Bedeutung                                                              | Rechtschreibung (20)                                    | Lesen (21)                         | Mathe (22)                                 | Vokabeln (23)         |
| ----------------- | ---------------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------- | ------------------------------------------ | --------------------- |
| **Lernobjekt**    | kleinste Einheit mit eigenem Lernstand                                 | Kernwort                                                | Text (nur Zähler, kein Lernstand)  | Basisfakt oder Aufgabenfamilie (W3)        | Eintrag je Richtung   |
| **Teilkompetenz** | Einheit für „sicher“, Startpunkt, Auftrag, Übungskarte und Kurzbericht | Phänomen (etwa 30 Kernwörter)                           | keine; Lesestufe dient der Auswahl | Familie mit Merkmal (z. B. „mit Übergang“) | Thema und Stufe       |
| Stufe             | Platz im Lernpfad, ohne Jahrgang                                       | A bis G                                                 | 1 bis 3                            | Pakete                                     | Grundlagen, Aufbau    |
| Voraussetzung     | grobe Reihenfolge, keine Sperre                                        | B vor C                                                 | –                                  | bis 20 vor bis 100                         | Grundlagen vor Aufbau |
| Merkmal           | macht Fehler deutbar                                                   | Stelle mit Phänomen, Strategie, erwarteter Verwechslung | –                                  | Übergang, Stellenwerttyp                   | Wortart, Formen       |
| Fehlermuster      | Merkmal und Verwechslung, gezählt je Gelegenheit                       | ja                                                      | nein                               | ja                                         | nein                  |

Gemeinsame Kopffelder jedes ausgelieferten Lernobjekts: Kennung, Revision,
Teilkompetenz, Stufe, Quelle, Lizenz, geprüft am und durch. Ungeprüftes wird
nicht ausgeliefert (Nachtrag 2, Nr. 4). Der Rumpf bleibt fachlich: Stellen
(Bericht 20, 4.2), Satz und Lücke (Bericht 23, 4.1), Aufgaben zum Text (L21-5).
Mathe braucht kein Paket je Aufgabe, nur die Liste der Familien.

**Wo die Fächer verschieden bleiben müssen.** Lesen hat keinen
Beherrschungsstand: Das Gerät hört nicht zu (Bericht 21, 4.3). Vokabeln haben
keine Fehlermuster. Mathe erzeugt Aufgaben, statt sie zu speichern. Eine
gemeinsame „Kompetenzlandkarte“ über alle Fächer wäre Scheingenauigkeit.

**Nachweisstufen** (ersetzt die verstreuten Einzelregeln der Berichte):

| Stufe | Signal                                                    | Belastbarkeit                                             | Verwendung                                          |
| ----- | --------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------- |
| N0    | Abschreiben, Vorlage sichtbar                             | zeigt Sorgfalt, kein Können                               | erster Kontakt; nie Box, nie „sicher“, kein Muster  |
| N1    | Auswahl, Entscheidungslücke, Kennenlernen                 | Wiedererkennen; bei zwei Möglichkeiten 50 % Ratequote     | Üben; Fehler machen fällig, Richtiges hebt nichts   |
| N2    | Richtig mit Hilfe oder im zweiten Anlauf                  | Hilfe wirkt, Abruf fehlt                                  | zählt für den Plan wie nicht gewusst                |
| N3    | Selbsteinschätzung                                        | „Falsch“ verlässlich, „Richtig“ überschätzt               | bis Box 3; nie „sicher“ (W2)                        |
| N4    | Getippter Abruf ohne Hilfe, erster Versuch, am selben Tag | Kurzzeitgedächtnis                                        | Fehler zählen für Muster; Aufstieg nur, wenn fällig |
| N5    | Getippter Abruf nach Abstand (fällige Wiederholung)       | einziges Signal für Behalten                              | Aufstieg, „sicher“, „gefestigt“                     |
| N6    | Abruf im Satz (Satzdiktat)                                | Anwendung                                                 | später: Bedingung für „sicher“ der Stufen E und F   |
| Z     | Antwortzeit, Lesezeit                                     | enthält Tippzeit und Ablenkung                            | nur lokal, nur als Mittelwert vieler Antworten (W4) |
| R     | Ergebnisse im Live-Raum                                   | unter Zeit- und Gruppenbedingungen, teils mit Merkaufgabe | Fehler werden fällig; keine Aussage über „sicher“   |

### 4.3 Der Kreislauf als Datenfluss

| Schritt                   | Was geschieht                                | Signal                                 | Wo es liegt                            | Wer es sieht                                     | Heute                                                                   |
| ------------------------- | -------------------------------------------- | -------------------------------------- | -------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| 1 Unterricht              | Live-Raum, Laufdiktat, Kopfrechnen           | R: Fehlerwörter, erste falsche Antwort | Supabase, 24 Stunden; danach Kindgerät | Lehrkraft je Tier; Klasse als Summe an der Tafel | geschlossen                                                             |
| 2 Übernahme               | Fehler werden Lernobjekte                    | Lernwort oder Karte, fällig            | Kindgerät                              | Kind                                             | geschlossen, nur feste Geräte                                           |
| 3 Startpunkt oder Auftrag | Vorschlag einer Teilkompetenz                | Startvorschlag; Kennung der Übung      | Kindgerät; Übungskarte auf Papier      | Kind, Lehrkraft daneben                          | **reißt**: Vorschlag wird nicht eingestellt, Auftrag öffnet keine Übung |
| 4 Üben                    | Strategie, Kontrast, Abruf                   | N0 bis N4, Fehler mit Merkmal          | Kindgerät                              | Kind: Rückmeldung mit Strategie                  | Rechtschreibung ohne Merkmal                                            |
| 5 Wiederholen             | Fälliges aus dem Plan                        | N5, Box, Fälligkeit                    | Kindgerät                              | Kind: „heute dran“                               | geschlossen                                                             |
| 6 Muster                  | Fehler je Gelegenheit über Tage              | Übungsempfehlung                       | Kindgerät, wird neu berechnet          | Kind: „Hier lohnt sich Üben“                     | **fehlt** (Mathe nur in der CSV)                                        |
| 7 Stand                   | Ableitung aus N5                             | neu, im Aufbau, sicher, gefestigt      | Kindgerät, nicht gespeichert           | Kind; Lehrkraft, wenn das Kind es zeigt          | vorhanden, nicht verlinkt                                               |
| 8 Rückmeldung             | Kind zeigt Stand; nach S1 Kurzbericht per QR | Teilkompetenz, Zahl, Übungstage        | Lehrergerät mit Löschfrist             | Lehrkraft                                        | **reißt**                                                               |
| 9 Nächster Schritt        | Lehrkraft wählt Übung, Liste oder Live-Runde | Auftrag                                | Papier, Kopf, Lehrergerät              | –                                                | nur Lernwortlisten                                                      |

### 4.4 „Heute“ wählt selbst

| Block         | 20 Minuten    | 10 Minuten | Inhalt                                                                                                                  | Regel                                                                                                                                 |
| ------------- | ------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Wiederholen | bis etwa 8    | bis 5      | Tagesportion wie heute: Fehler, dann Fälliges                                                                           | Entscheidung 57 unverändert. Gibt es für Block 2 einen Auftrag oder eine Empfehlung, endet Block 1 nach 60 % der Zeit.                |
| 2 Weiter      | etwa 8 bis 10 | etwa 4     | **eine** Teilkompetenz. Rang: Auftrag der Lehrkraft, dann Übungsempfehlung, dann nächster Schritt im gewählten Lernpfad | Zuerst Strategie und Kontrast (N1), dann Abruf (N4). Neue Objekte je Tag: 4 Vokabeln (wie heute), 5 Kernwörter [Vermutung, erproben]. |
| 3 Abschluss   | etwa 2        | etwa 1     | Fehler dieser Einheit noch einmal; ein Satz Rückblick                                                                   | Ohne Boxwirkung (Erholungsregel des Kerns). Kein Rückstand als Zahl.                                                                  |

- **Vermischen** geschieht in Block 2 zwischen ähnlichen Fällen (Biene neben
  Kino), wo es belegt ist (Abschlussbericht, F.2). Zwischen Fächern wechselt
  die Portion nur ab; das ist Abwechslung, kein Lerneffekt.
- **Schluss** ist, wenn die Zeit um ist; die laufende Aufgabe wird fertig
  (`trainingStatus`, unverändert). Danach ist alles Weitere ein Extra.
- **Entlastung:** Sind fünf der letzten acht Erstversuche falsch, wechselt
  Block 2 in dieselbe Teilkompetenz mit Hilfe [Vermutung, erproben].
- **Zeit schätzen:** Statt fester Sekunden nutzt das Training den eigenen
  Mittelwert des Geräts je Modul, sobald zehn Antworten vorliegen (B7).
- **Lesen** ist kein Element der Portion. Es kann Block 2 ersetzen (E21-5).
- **Gerät ohne Lernstand:** Block 1 entfällt. Schnellstart (L25-1) wählt die
  Teilkompetenz über Startpunkt, Drei-Tipp-Wahl oder Startkarte; Block 2 füllt
  die Zeit und wechselt nach acht bis zehn Minuten das Format; Block 3 bleibt.
  Es gibt keine Empfehlung aus Mustern und kein „sicher“ (W1). Das ist
  ehrlich und entspricht Nachtrag 1, Nr. 2.

### 4.5 Startpunkt und „sicher“

**Startpunkt** [Empfehlung, zur Bestätigung]:

- Höchstens 12 Aufgaben, drei je Stufe, feste und fachlich gewählte Aufgaben
  (R20-9, MA-4). Einstieg in der Mitte oder auf der Stufe, die die Lehrkraft
  antippt. Zwei von drei falsch: eine Stufe tiefer. Drei richtig: eine höher.
- Ein einzelner Fehler legt keine Stufe fest (heute tut er das, B5).
- Drei Aufgaben tragen keine Aussage über ein Kind. Deshalb steuert die Übung
  nach: Nach acht Aufgaben bietet sie bei über der Hälfte Fehlern die leichtere
  Stufe an, bei fast allem richtig die nächste.
- Ohne deutsche Stimme gibt es für Rechtschreibung keinen Startpunkt, sondern
  die Wahl durch Kind oder Lehrkraft. Ein Lückenwort misst etwas anderes (B5).
- Das Ergebnis bleibt ein Vorschlag ohne Zahl. Es geht in keinen Bericht.

**Regel „sicher“** [Empfehlung, zur Bestätigung]:

| Punkt           | Heute                       | Vorschlag                                                                                                  | Grund                                      |
| --------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Objekt „sicher“ | Box ≥ 3 und zwei Tage Abruf | unverändert, aber nur N5 zählt als Tag                                                                     | B1                                         |
| Neue Stufe      | –                           | „gefestigt“: Box 5 oder Lernarchiv, also Abruf nach mindestens 14 Tagen                                    | B2; das Wort „sicher“ wird nicht überdehnt |
| Einheit         | Wortbox, 80 %               | Teilkompetenz mit etwa 30 Kernwörtern; 80 % bleibt                                                         | B3; Nachtrag 2, Nr. 2                      |
| Anzeige         | Stufe des Teilbereichs      | zuerst die Zahl der Objekte („14 Wörter sicher, 3 neu seit Montag“), darunter die Herleitung in einem Satz | wahr auch für schwache Kinder; Audit M5    |
| Mathe           | 5 Aufgaben, 2 Tage          | dazu MA-5 (Merkmal, Familie nach Aufgabe); „flüssig“ als eigener Zusatz nur für Basisfakten (MA-6)         | B8                                         |
| Rückfall        | Objekt fällt still zurück   | Wortlaut „wieder dran“ und „lange nicht geübt“, nie „vergessen“ oder „verloren“                            | Festlegung L-7 der LernBox                 |
| Lesen, Textbox  | höchstens „im Aufbau“       | unverändert; Lesen zeigt nur Zähler                                                                        | kein Abrufsignal                           |

Fortschritt für schwache Kinder ist wahr und ermutigend, wenn er in
**Objekten** zählt (ein Wort mehr ist ein Wort mehr), mit sich selbst
vergleicht und nie einen Abstand zu einem Ziel zeigt. Der Wochenrückblick
M24-11 baut darauf auf.

### 4.6 Vom Fehler zur Übung, ohne Etikett

Die Schwelle aus Bericht 20 (3.3) gilt für Rechtschreibung und Mathe gleich:
mindestens 3 sichere Fehler desselben Merkmals, an 3 verschiedenen Objekten,
an 2 Tagen, bei mindestens einem Drittel von mindestens 9 Gelegenheiten.
Gezählt werden die letzten 12 Gelegenheiten; das Muster verfällt von selbst.

Was sie trägt [eigene Rechnung, Binomialmodell]: Bei 9 Gelegenheiten löst ein
Kind mit 10 % Fehlerquote sie in etwa 5 % der Fälle aus, ein Kind mit 50 % in
etwa 91 %. Drei von neun Fehlern lassen aber eine wahre Quote zwischen etwa
8 % und 70 % zu. Die Schwelle trennt also „kaum Fehler“ von „viele Fehler“,
mehr nicht. Für eine Übung genügt das, weil ein falscher Alarm nur zehn
Minuten kostet.

| Wer                              | Sieht                                                                                                                       | Sieht nie                                                             |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Kind                             | sofort die Strategie am Fehlerort; ab der Schwelle „Hier lohnt sich Üben: d oder t am Wortende“ mit Belegwörtern; ablehnbar | Fehlerart als Urteil, Quote, Zahl der Muster, Vergleich               |
| Lehrkraft, Kind zeigt Gerät      | dasselbe wie das Kind                                                                                                       | –                                                                     |
| Lehrkraft, Kurzbericht (nach S1) | Teilkompetenz, „4 von 11 falsch“, Datum, Übungstage der Woche; dazu in Worten „noch wenig Belege“ (unter 9) oder „Hinweis“  | Belegwörter, Verlauf über Wochen, Ursache, Gesamturteil über ein Fach |
| Lehrkraft, Klasse                | Merkmal als Summe ohne Kindbezug (MA-14, R20-15)                                                                            | Rangfolge von Kindern                                                 |

Sechs Regeln gegen das Etikett [Empfehlung]: (1) Jede Aussage nennt einen
Inhalt, nie eine Eigenschaft des Kindes. (2) Immer Zähler, Nenner und Datum.
(3) Muster verfallen; es gibt keine Liste früherer Muster. (4) Keine Summe
über Teilkompetenzen („Rechtschreibung schwach“). (5) Keine Ursache, keine
Norm, kein Jahrgang (RL-13; Bericht 12, 5.1). (6) Beim Lehrergerät nur
Momentaufnahmen mit Löschfrist.

### 4.7 Rückblick, Levumi und Wirksamkeit

**Was von der curriculumbasierten Messung übernommen wird:** gleiche
Bedingungen (ohne Hilfe, gleiches Format), kurze und regelmäßige Durchgänge,
Vergleich nur mit sich selbst, Zählen je Gelegenheit, rohe Zahlen statt
Prozenten. **Was nicht:** Parallelformen, Normen, Ziellinie, Entscheidungsregel
über ein Kind. Dafür fehlen Eichdaten (Abschnitt 3).

**Rückblick** [Empfehlung]: Einmal im Monat bietet ein festes Gerät zehn
Wörter oder Fakten an, die seit mindestens vier Wochen „sicher“ sind, als
Diktat ohne Hilfe. Ergebnis: „9 von 10 kannst du noch.“ Das ist eine wahre
Aussage über diese zehn Objekte und keine Messung der Rechtschreibung.

**Mit Levumi arbeiten, ohne Daten zu tauschen:**

1. Die Lehrkraft testet mit Levumi im eigenen Zugang. Das ist ein eigenes
   Verfahren der Schule mit Daten auf Hochschulservern und gehört ins
   Schulpaket (R12-2).
2. Sie liest das Ergebnis und wählt in Lernraum die passende Teilkompetenz
   (Drei-Tipp-Wahl L25-3 oder Übungskarte L25-4). Eine Zuordnungstabelle
   „Levumi-Test und Lernraum-Übung“ steht auf der Verweisseite (F30-9).
3. Nach vier bis sechs Wochen testet sie wieder mit Levumi. Das ist die
   unabhängige Messung, die Lernraum nicht leisten kann.

Lernraum hat kein Eingabefeld für Testergebnisse und speichert keines (RL-2).

**Wirksamkeitsprobe, kleinster Plan** [Empfehlung]:

| Schritt     | Was                                                                                                                                                                      | Aufwand                  |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| Vorbereiten | 40 Kernwörter aus denselben Phänomenen, abwechselnd auf Satz A und Satz B verteilt                                                                                       | 20 Minuten               |
| Vorprobe    | Alle 40 Wörter als Diktat auf Papier                                                                                                                                     | 15 Minuten, 30 Korrektur |
| Üben        | Vier Wochen: Satz A als Lernwortliste in Lernraum, Satz B gar nicht                                                                                                      | Übungszeit im Unterricht |
| Nachprobe   | Dieselben 40 Wörter auf Papier; nach drei Wochen ohne Üben noch einmal                                                                                                   | wie Vorprobe             |
| Auswerten   | Je Kind: Zuwachs A minus Zuwachs B. Zählen, bei wie vielen Kindern A vorn liegt. Faustregel: ab 15 von 20 Kindern ist Zufall unwahrscheinlich (Vorzeichentest, p ≈ 0,04) | 30 Minuten               |
| Wiederholen | Danach Satz B üben, Satz A nicht                                                                                                                                         | –                        |

Die Probe läuft auf Papier, weil die Abschlussprüfung auf Papier stattfindet
und weil sie so vom Tippen unabhängig ist. Sie zeigt, ob Üben mit Lernraum
diese Wörter verbessert, nicht ob Lernraum besser ist als ein Arbeitsblatt
und nicht, ob sich die Strategie auf fremde Wörter überträgt. Für Mathe geht
dasselbe mit zwei Sätzen Basisfakten und einem Zwei-Minuten-Blatt. Namen
bleiben auf dem Papier der Lehrkraft.

### 4.8 Sprache

| Verwenden                                                                 | Nicht verwenden                                                          |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Übungsempfehlung, „Hier lohnt sich Üben“                                  | Diagnose, diagnosegestützt, Förderdiagnostik, Befund                     |
| Startpunkt, Startvorschlag                                                | Test, Einstufung, Lernstandserhebung, Niveau, Lesealter                  |
| Übungsstand, „Mein Stand“; neu, im Aufbau, sicher, gefestigt              | Kompetenzprofil, Kompetenzniveau, Beherrschungsgrad in Prozent           |
| wiederholungsgestützt; „wählt aus deinen Fehlern und dem, was fällig ist“ | adaptiv, intelligent, personalisiert, KI                                 |
| Rückblick                                                                 | Lernverlauf, Lernverlaufsmessung (nur für Levumi)                        |
| „lange nicht geübt“, „wieder dran“                                        | vergessen, Rückstand, Schwäche, Risiko, LRS, rechenschwach, Förderbedarf |

„Förderkreislauf“ ist als Wort für die Lehrkraft vertretbar; es beschreibt
den Ablauf, nicht eine Messung.

### 4.9 Prüfstein

| Lage                         | Trägt das Zielbild?                                                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Fremdes Gerät ohne Lernstand | Ja: Fach, Startpunkt oder Wahl der Lehrkraft, 20 Minuten in einer Teilkompetenz mit Strategie und Formatwechsel. Keine Aussage über das Kind. |
| Eigenes Gerät mit Lernstand  | Ja: drei Blöcke füllen 20 Minuten verlässlich; „genau das, was es braucht“ heißt: eigene Fehler, Fälliges, Auftrag oder Empfehlung.           |
| Live-Raum                    | Unverändert. Er liefert Signale der Art R.                                                                                                    |

Kein Baustein verlangt Konto, Registrierung oder Vorbereitung.

## 5. Konkrete Bausteine

| Nr.    | Baustein                                                                                                                                | Nutzen und Szenario                                                          | Entw. | Prüfaufwand            | Baut auf                                | Berührte Entscheidungen         |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----- | ---------------------- | --------------------------------------- | ------------------------------- |
| F30-1  | **Ein Inhaltspaket, eine Prüfansicht:** gemeinsame Kopffelder, fachlicher Rumpf; ersetzt vier Einzelformate                             | Inhalte prüfen ohne Quellcode; ein Format zu pflegen statt vier              | M     | kein                   | R20-2, R23-1, L21-5, M24-7; Audit L1    | 30, 40, 41, 54                  |
| F30-2  | **Teilkompetenz-Register:** eine Liste mit Kennung, Namen in Kinderworten, Stufe, Übungsroute, „üblich in“                              | dieselbe Kennung für Stand, Startpunkt, Drei-Tipp-Wahl, Übungskarte, Bericht | S–M   | S (Namen, Reihenfolge) | L25-3, L25-4, L25-6, R20-9, MA-4, MA-11 | 31, 59; Nachtrag 2, Nr. 8       |
| F30-3  | **Nachweisstufe im Lernereignis** (zusätzliches Feld) und Stand nur aus N5                                                              | „sicher“ zählt kein Abschreiben mehr                                         | S–M   | kein                   | Audit M1, M2; Bericht 20, 4.5           | 20, 24; Index G2 (Variante b)   |
| F30-4  | **Gemeinsamer Musterzähler:** Fehler je Gelegenheit, Schwelle, Verfall; eine Funktion für beide Fächer                                  | Übungsempfehlung auf festen Geräten                                          | S     | kein                   | R20-4, R20-8, MA-2, MA-3                | 57, 59; RL-13                   |
| F30-5  | **„Heute“ in drei Blöcken:** Auffüllen mit dem nächsten Lernschritt, Entlastungsregel, geeichte Zeitschätzung; gilt auch ohne Lernstand | 20 Minuten verlässlich gefüllt; Nachsitzen, Frühfertige                      | M     | S (Texte)              | L25-1, L25-2, L25-5; R23-4; E21-5       | 57 (Ergänzung), 46              |
| F30-6  | **Gemeinsame Startpunkt-Regel** mit Nachsteuern in der Übung                                                                            | zwei Minuten bis zur passenden Übung                                         | S     | in R20-9, MA-4         | R20-9, MA-4, L25-2                      | 59; Welle 3, D2-1               |
| F30-7  | **Regel „sicher“ nachschärfen:** Zählung in Objekten, Herleitung, Stufe „gefestigt“, „mündlich gewusst“                                 | wahrer Fortschritt auch für schwache Kinder                                  | S     | kein                   | MA-5, MA-13, M24-11, L25-7              | 59; Welle 3, D2-3               |
| F30-8  | **Lernobjekte geschlossener Mengen in den Plan:** Basisfakten wie Wörter behandeln; Antwortzeit nur lokal                               | Automatisieren statt nur Fehler reparieren                                   | S–M   | kein                   | MA-6, MA-7                              | **57** (Vorlage E30-3)          |
| F30-9  | **Verweis- und Zuordnungsseite** Levumi, PIKAS, „Mathe sicher können“, Lautleseverfahren; eine Seite statt drei                         | Messung und Material finden, ohne Nachbau                                    | S     | S (Anbieterangaben)    | W-4, L21-13, MA-15                      | RL-13                           |
| F30-10 | **Rückblick** einmal im Monat aus „sicheren“ Objekten                                                                                   | Behalten sichtbar machen, ohne Test                                          | S–M   | kein                   | F30-7; M24-11                           | 59; Abschlussbericht F.4        |
| F30-11 | **Kurzbericht-Format** für alle Fächer: Teilkompetenz, Zähler und Nenner, Datum, Übungstage; nur Festlegung, kein Bau vor S1            | ein Bericht statt vier Varianten                                             | S     | S (Wortlaut)           | R12-7, L25-13, R20-15, L21-12           | 4, 5, 6, 10, 41 (Vorlage); RL-3 |
| F30-12 | **Beobachtungsheft auf Papier:** Wirksamkeitsprobe (4.7), dazu die Bögen aus L25-15 und M24-13 in einem Heft                            | klärt Wirkung und Annahmen ohne Daten aus der App                            | –     | S (Wortsätze)          | L25-15, M24-13; Audit S14, M11          | 9, 39                           |
| F30-13 | **Wortliste der Vision** (4.8) als Test über App-Texte; Umbenennung „Kompetenzprofil“ zu „Mein Stand“, Reflexionsfrage B9 streichen     | keine Scheindiagnostik in der Oberfläche                                     | S     | kein                   | Audit S12; Kinder-Glossar               | 31, 59                          |

Reihenfolge [Empfehlung]: F30-12 und F30-13 sofort. F30-2 und F30-6 vor dem
Schnellstart (L25-1). F30-1 vor dem ersten Kernbestand (R20-3). F30-3 vor
F30-7. F30-4 nach R20-4. F30-5 nach der Verlinkung. F30-8 und F30-10 zuletzt.

## 6. Grenzen und was wir nicht bauen

| Nicht bauen                                                                | Grund                                                                                |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Eigene Lernverlaufstests, Parallelformen, Verlaufslinie mit Ziellinie      | nicht eichbar für eine Person (Abschnitt 3; Abschlussbericht F.4); Levumi leistet es |
| Fähigkeitsschätzung (Wissensverfolgung, Item-Response-Modelle), FSRS       | brauchen Eichdaten; Zählregeln sind erklärbar und testbar (Audit D, 9.2; Bericht 11) |
| Gesamtwert je Fach, Prozentwert, Ampel, Vergleich mit Klasse oder Jahrgang | Etikett ohne Messung; RL-6, RL-13                                                    |
| Fehlermuster aus Selbsteinschätzung, Auswahlaufgaben oder Live-Runden      | Signale N1, N3 und R tragen das nicht                                                |
| Verlauf der Muster eines Kindes, beim Kind oder bei der Lehrkraft          | Bericht 12, 5.1: Zeitreihen lassen auf Störungen schließen                           |
| Eingabe von Testergebnissen (Levumi, HSP) in Lernraum                      | RL-1, RL-2                                                                           |
| Sperren nach Voraussetzung („erst B, dann C“)                              | Reihenfolge ist unsicher; die Lehrkraft und das Kind dürfen wählen                   |
| Automatischer Stufenwechsel im Lesen nach Zeit                             | Zeit ohne Genauigkeit steuert falsch (Bericht 21, Abschnitt 6)                       |
| Änderung der Abstände, Box − 1 statt Box 1, Fälligkeit in Übungseinheiten  | keine Daten; erst nach der Beobachtung (Abschlussbericht M.8 Nr. 4)                  |

Was dieses Modell nicht leistet: Es sagt nichts über Ursachen, nichts über
freies Schreiben und nichts über Kinder, die selten üben. Es setzt voraus,
dass ein Gerät ein Kind ist. Auf Koffer-Geräten gibt es deshalb nur Üben, kein
Stand (Klassengerät-Modus L25-8).

## 7. Offene Entscheidungen für den Entwickler

| Nr.   | Frage                                                                                                                                                                                      | Empfehlung                                                                                                          | Ohne Entscheidung                                                               |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| E30-1 | Gilt die Regel „sicher“ (Box ≥ 3, zwei Tage) weiter, ergänzt um die Stufe „gefestigt“ (Abruf nach 14 Tagen), die Zählung in Objekten und Einheiten von etwa 30 Wörtern? (offen seit 0.9.7) | Ja. Damit ist die fachliche Abstimmung aus Entscheidung 59 für das Profil erledigt.                                 | „Sicher“ bleibt für schwache Kinder unerreichbar und stützt sich auf drei Tage. |
| E30-2 | Darf ein Vokabelstapel allein über Selbsteinschätzung „sicher“ heißen? (ändert die Ausnahme aus Welle 3, D2)                                                                               | Nein: „mündlich gewusst“ als eigene Angabe. „Zurückgenommen“ und „Nicht wieder einbauen“ ins Protokoll.             | Zwei Fächer, zwei Bedeutungen von „sicher“.                                     |
| E30-3 | Dürfen Basisfakten wie Wörter in den Wiederholungsplan, auch nach richtiger Antwort, und darf die Antwortzeit lokal gespeichert werden? (MD-2, MD-3; Abweichung von Entscheidung 57)       | Ja, nur für Einmaleins und Plus/Minus bis 20; Zeit nie als Sekunden zeigen, nie übertragen. Neuer Protokolleintrag. | Zählende Kinder gelten als sicher; Automatisieren bleibt Zufall.                |
| E30-4 | Wird „Heute“ eine Zeiteinheit aus drei Blöcken, die mit dem nächsten Lernschritt auffüllt? (Ergänzung zu Entscheidung 57)                                                                  | Ja. Portion, Kontingente und „kein Rückstand als Zahl“ bleiben.                                                     | 20 Elemente füllen 7 bis 25 Minuten; ohne Lernstand bleibt „Heute“ leer.        |
| E30-5 | Gilt die gemeinsame Startpunkt-Regel (drei je Stufe, Mitte, auf und ab, Nachsteuern; ohne Stimme kein Rechtschreib-Startpunkt)?                                                            | Ja. Zusammen mit MD-4 und R20-9 erledigt das die zweite offene Abstimmung aus 0.9.7.                                | Ein Flüchtigkeitsfehler setzt Jugendliche auf die unterste Stufe.               |
| E30-6 | Gilt die Musterschwelle für beide Fächer, und nennt ein späterer Kurzbericht Fehler je Gelegenheit statt eines Urteils? (Bericht 20, 7.6)                                                  | Ja, als Startwert zur Erprobung; Kurzbericht erst nach S1 (F5 aus Bericht 25 bleibt).                               | Jedes Fach zählt anders; die Lehrkraft kann die Angaben nicht vergleichen.      |
| E30-7 | Heißt das Kompetenzprofil künftig „Mein Stand“, und gilt die Wortliste aus 4.8 für App, Unterlagen und Vision?                                                                             | Ja. Vault-Kapitel 07 und 22 und der Bereich `diagnostik` werden bei Gelegenheit umbenannt.                          | Audit-Punkt S12 bleibt halb erledigt; das Schulpaket erbt die alten Wörter.     |
| E30-8 | Zeigt Lesen allein keine Zeiten als Fortschritt, sondern Durchgänge? (ändert Bericht 21, 4.1 und L21-11)                                                                                   | Ja. Zeiten und Wörter pro Minute nur im Tandem, wo eine zweite Person Stolperstellen zählt.                         | Schnelles Überfliegen sieht wie Fortschritt aus.                                |
| E30-9 | Führst du die Wirksamkeitsprobe (4.7) einmal durch, bevor Lernraum in den Schulamtsbezirk geht?                                                                                            | Ja, mit einer Klasse, im ersten Halbjahr der Erprobung.                                                             | Die Vision beruht weiter auf Plausibilität statt auf einem eigenen Ergebnis.    |

**Annahmen dieses Berichts.** Ein festes Gerät gehört einem Kind. Der
Rechtsrahmen ist offen (Frage 4): kein Kurzbericht vor S1. Startpunkt,
Training und Profil werden verlinkt (Nachtrag 1, Nr. 3). Die elf Antworten des
Nachtrags 2 gelten.

**Nicht geprüft.** `levumi.de` selbst (Kosten, Testübersicht, Datenschutz,
Eignung für 12- bis 15-Jährige im Jahr 2026): Der Host muss in den
Netzeinstellungen der Sitzung erlaubt werden. Alle Studien nur als Suchauszug
oder über das Audit. Verhalten im Browser. `agent-f-redteam.md` habe ich nur
über den Abschlussbericht (M.5 bis M.9) gelesen, die Vault-Kapitel 06 und 07
nur über den Entscheidungsindex (G2, G3, G8), `agent-d-paedagogik.md` nur in
Abschnitt 9 und der Befundliste. Alle Schwellen und Zeitanteile sind
fachliche Startwerte ohne eigene Daten.
