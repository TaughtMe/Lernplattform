---
tags:
  - lernplattform
  - vision
  - roadmap
status: vorschlag
stand: 2026-11-11
umsetzungsstand: Vorgeschlagen
---

# Roadmap

> **Dieses Kapitel ist ein Vorschlag des Expertengremiums vom 11.11.2026, überarbeitet nach der Rückmeldung des Entwicklers am selben Tag. Nichts davon ist beschlossen.** Maßgeblich bleiben das [[../19 - Entscheidungsprotokoll/Anwendung|Entscheidungsprotokoll]] und die Berichte unter `docs/vision/`.

## Was sich nach der Rückmeldung geändert hat

Die erste Fassung folgte dem Red Team (`docs/vision/40-red-team.md`). Es rechnete mit sechs Wochenstunden Handarbeit, kam auf drei bis fünf Jahre für alle 146 Bausteine und schnitt deshalb auf eine schmale Plattform zu. Der Entwickler hat zwei Dinge richtiggestellt:

1. **Die Grundlagen funktionieren schon.** Laufdiktat und LernBox sind erprobt. Lernraum ist ihre Weiterentwicklung auf einer Plattform. Zuerst muss dieser Kern im Alltag tragen: im Unterricht spielerisch und interaktiv, allein motivierend. Wortarten, Texte, Satzformate und Fehlermuster sind Extras für das LRS-Training und kommen danach.
2. **Die KI baut, die Lehrkraft testet.** Programmieren und Tests übernimmt die KI. Der Entwickler entscheidet, testet im Unterricht (das geht immer) und prüft Inhalte.

Was vom Red Team bleibt: **Der Engpass ist die Abnahme**, nicht der Code. Drei fertige Seiten waren freigegeben und nirgends verlinkt, und niemand hat es bemerkt. Deshalb gilt:

- **Kleine Schritte.** Jeder ist nach wenigen Tagen in der Klasse testbar.
- **Eine Etappe endet, wenn sie im Unterricht erprobt ist**, nicht an einem Datum.
- **Inhalte nur geprüft ausliefern.** Große Inhaltspakete erst, wenn der Kern trägt.

Die Bausteine tragen die Nummern der Berichte: R12 Recht und Betrieb, R20 Rechtschreibung, L21 Lesen, MA Mathematik, R23 Vokabeln, M24 Motivation und Live-Raum, L25 Alltag der Lehrkraft, F30 Förderkreislauf, I31 Inklusion. Bausteine mit „neu“ stammen aus der Rückmeldung des Entwicklers und stehen in keinem Bericht.

## Sofort reparieren

Unabhängig von jeder Vision. Alles ist klein. Geordnet nach Schaden für Kinder (Bericht 40, Abschnitt 10; am Code vom 11.11.2026 bestätigt).

| Rang | Was | Was zu tun ist | Deine Zeit |
| --- | --- | --- | --- |
| 1 | **Fachfehler in Wortboxen und Texten.** „Ferien“ steht bei „Langes i“; ie hat die Strategie „Merken“; „Club“, „Job“, „Zugweg“, „Zieltür“, „Fehlwort“ sind keine tauglichen Beispiele; „Mädchen“, „Käfer“, „Säge“ lassen sich nicht ableiten und stehen auch im Startpunkt; „Weg“ und „weg“ gelten als gleich klingend; ein Text führt „nah“ als Dehnungs-h. | R20-1 umsetzen. Ungeprüfte Texte ausblenden, 15 prüfen (R20-13). Vorher die Frage zur s-Regel beantworten ([[Offene Entscheidungen]], Nr. 6). | etwa 1 Stunde, dazu 2 Stunden für die Texte |
| 2 | **Startpunkt, Training und Stand sind nicht verlinkt.** Seit dem 05.11. freigegeben, nur über die eingetippte Adresse erreichbar. | Verlinken. Dabei „Kompetenzprofil“ in „Mein Stand“ umbenennen (F30-13). | ansehen |
| 3 | **Sprachausgabe ohne Filter.** An mehreren Stellen kann der Browser eine Netzstimme wählen; dann geht das Wort an einen fremden Dienst. Entscheidung 58 sagt „nur lokale Stimmen“. | Alle Stellen über eine Funktion führen. Erst die Stimmen auf den Schulgeräten prüfen (R23-7), dann auf „nur lokal“ umstellen, mit Hinweis statt stillem Wegfall. | 30 Minuten an drei Geräten |
| 4 | **Vorlese-Knopf nirgends eingebaut.** Er ist seit Entscheidung 58 in Aufgaben erlaubt und fertig. | In Aufgabenstellungen einsetzen (I31-1). | ansehen |
| 5 | **Fehler im Entscheidungsprotokoll.** Entscheidung 54 nennt die Texte „geprüft“; Entscheidung 53 fehlt; mehrere Festlegungen vom 27.10. stehen nur in Plänen. | Einträge nachtragen. Entwürfe stehen in [[Offene Entscheidungen]]. | lesen und freigeben |
| 6 | **Battle: Störangriffe und Flimmern sind Standard.** | Standard aus, Angriffe laden über Genauigkeit (M24-4; zugesagt). | im Unterricht testen |
| 7 | **Markenfiguren im Einsatz** (Star Wars, Marvel, Harry Potter, Mario und andere). | Durch eigene Fantasiefiguren ersetzen (M24-12, gekürzt). | Figuren auswählen |
| 8 | **Das Impressum untersagt den Schulbetrieb**, der stattfindet. | Ehrlich fassen (R12-3). | lesen |

## Etappe 1: Der Kern – Laufdiktat und LernBox als eine Plattform

**Ziel.** Lernraum trägt im Alltag:

- **Im Unterricht:** Die Lehrkraft erstellt in einer Minute einen Inhalt und spielt ihn live: Laufdiktat, Battle oder Kopfrechnen.
- **Allein:** Das Kind übt dieselben Inhalte in der LernBox weiter, in mehreren Lernformen, und wird für sein Üben belohnt.

| Gruppe | Bausteine |
| --- | --- |
| Sofortliste | alle acht Punkte oben |
| **Schnell erstellen** | Inhalte unabhängig vom Laufdiktat anlegen: Liste einfügen, daraus Laufdiktat, Battle und LernBox-Stapel (Audit K8, neu im Zuschnitt); Wortboxen als Quelle im Live-Raum mit Voreinstellungen in zwei Tipps (M24-6); „Kopfrechnen live“ mit einem Knopf (L25-10); Namensliste einfügen (L25-11, Teil 1) |
| **Live und Battle** | Battle mit Genauigkeit statt Störangriffen als spaßiger Wettkampf im Kahoot-Stil (M24-4); Klassenziel an der Tafel (M24-1); Fehler an der Tafel erst ab sechs Kindern (I31-9) |
| **LernBox wie Quizlet** | ein Stapel, mehrere Lernformen: zu Karteikarten und Schreiben kommen **Zuordnen** und **Test** (neu); stapelübergreifendes „Meine Fehler“ sichtbar machen |
| **Belohnung beim eigenen Üben** | Wochenziel „von 5 Schultagen“ (M24-10); Anzeigen zählen nach oben statt „3 / 105“ (I31-4); Sterne und Fortschritt je Runde einheitlich in allen Bereichen (neu; im Rahmen von [[../23 - Ramagotchi und nachhaltige Gamification/Anwendung|Kapitel 23]], ohne Rangliste einzelner Kinder) |
| Mathe | Aufgaben mit Hürde (MA-1), Fehlerarten richtig benennen (MA-2), Nachübung trifft den Fehler (MA-3) |
| Lehrergerät | Tablet sperrbar, `lehrer-geraet` frei (L25-9) |
| Recht und Lizenz | Gespräch mit Schulleitung und Datenschutz (R12-1); Lizenz: Code unter EUPL-1.2, Inhalte unter CC BY-SA 4.0 in eigenen Dateien (R12-12), vorher Markenfiguren ersetzen und Bildrechte festhalten (Coco Material); zweite Person mit Zugang (R12-14) |

**Woran du es im Unterricht merkst.** Vorviertelstunde: QR an die Tafel, Kopfrechnen-Battle, alle sind wach. In der Übungsphase fügst du zwölf Lernwörter ein und spielst daraus ein Laufdiktat. Am Nachmittag üben die Kinder dieselben Wörter in der LernBox, mal als Karteikarten, mal als Zuordnen, und sammeln Sterne.

**Dein Aufwand:** vor allem im Unterricht ausprobieren und Rückmeldung geben. Inhaltsprüfung etwa 3 Stunden (Fachfehler, 15 Texte).

## Etappe 2: Schnellstart und mitgelieferte Grundlagen

**Ziel.** Tablet in die Hand, ohne Vorbereitung: Nach drei Minuten läuft eine passende Übung. Für Mathe und Englisch gibt es mitgelieferte Inhalte für die Mittelschule, live und allein.

| Gruppe | Bausteine |
| --- | --- |
| Schnellstart | „20 Minuten üben“ mit Uhr (L25-1); Drei-Tipp-Wahl der Lehrkraft am Gerät des Kindes (L25-3); Startvorschlag wird direkt eingestellt (L25-2); ein Startpunkt mit Aufwärmaufgabe (F30-6 mit MA-4, I31-8) |
| Mathe für die Mittelschule | Zehnereinmaleins, große Zahlen, Kommazahlen, Geld, Größen (MA-11); Mathe in „Mein Stand“ (MA-13) |
| Englisch | 250 Wortpaare „Grundlagen“ (R23-2) im gemeinsamen Inhaltsformat (R23-1, F30-1); Themen frei üben und „In meine LernBox“ (R23-4); Vokabelrunde live aus dem Grundwortschatz (R23-19) |
| Auftrag | Übungskarten mit QR für mitgelieferte Übungen (L25-4); Auftrag öffnet die Übung, „erledigt“ aus gezählten Runden (L25-5); „Meinen Stand zeigen“ (L25-7) |
| Für die Schule | Verweisseite zu Levumi, Kurzanleitung, eine Seite für die Schulleitung (F30-9 mit L25-14) |

**Woran du es im Unterricht merkst.** Nachsitzen: Du gibst Jonas das Koffer-Tablet, sagst „Mathe“ und setzt dich. Ein Kind aus der 8. Klasse beginnt nicht bei 3 + 4. Fünf Minuten vor dem Gong: Englisch live, Thema „Essen“, ohne eine Vokabel getippt zu haben.

**Dein Aufwand:** etwa 8 bis 10 Stunden Inhaltsprüfung (250 Wortpaare, Startpunkt-Aufgaben, Regeltabellen Mathe). Bei den ersten 30 Einträgen die Zeit stoppen.

## Etappe 3: Das LRS-Training – die Extras

**Ziel.** Rechtschreibung wird ein echtes Förder- und LRS-Training: Kernwörter mit Strategie, Arbeit mit Wortarten, Sätzen und Texten, Übung aus den eigenen Fehlern.

| Gruppe | Bausteine |
| --- | --- |
| Kernwörter | Kernwort mit schwieriger Stelle, Strategie, Beweis- und Kontrastwort (R20-2); zuerst 120, später 300 Kernwörter (R20-3); Wortbox „lautgetreu und Silbe“ als unterste Stufe (I31-6) |
| Rückmeldung am Fehler | Strategie an der Stelle des Fehlers (R20-5); Kontrastrunde (R20-6, R20-7) |
| Wortarten, Sätze, Texte | Satz- und Lückensatzformate (Antwort vom 10.11.); Großschreibung und das/dass im Satz (R20-11, R20-12); geprüfte Textbox-Texte (R20-13) |
| Stand | Abschreiben zählt nicht mehr für „sicher“ (F30-3); Zählung in Wörtern (F30-7) |
| **Nur nach Probe** | Übung aus dem eigenen Fehlermuster (R20-8 mit F30-4); vorher an 100 echten Falschschreibungen von Hand geprüft |

**Dein Aufwand:** Hier liegt die meiste Inhaltsprüfung (Kernwörter etwa 5 Stunden je 300 Wörter; Satz- und Textformate zusätzlich). Deshalb steht diese Etappe hinter dem Kern. Die Anteile, die keinen Inhalt brauchen (R20-5, F30-3, F30-7), können früher kommen.

## Später

| Thema | Bausteine | Warum später |
| --- | --- | --- |
| **Leseverständnis** | L21-5, L21-6, L21-8, L21-10 | neuer Bereich mit viel Prüfzeit. Lautlese-Formate höchstens als Zusatz |
| Englisch-Ausbau, Hörmodus, Formenreihen | R23-3, R23-5, R23-6, R23-8 bis R23-12 | erst den Grundwortschatz erproben |
| Brüche und Prozent; Bilder als Hilfe | MA-12, MA-6 bis MA-9 | erst bei belegtem Bedarf |
| Klasse gegen die Uhr, Teams, weitere Live-Formate | M24-2, M24-3, M24-7, M24-8, R23-20, MA-10 | nach Erprobung von Battle und Klassenziel |
| Klassengerät-Modus | L25-8 | nach Erprobung des Schnellstarts |
| Kurzbericht per QR an die Lehrkraft | R12-7, L25-13, F30-11, R20-15, L25-12 | erst nach Klärung mit Schulleitung und Datenschutz (S1) |
| Häuser und Hauspunkte | R12-8 | ruhen (Antwort des Entwicklers) |
| Deutsch als Zweitsprache | R23-17, I31-13, I31-11 | Warteliste |

## Anschluss an die laufende Audit-Roadmap

| Offener Punkt | Wo er hier steht |
| --- | --- |
| S1 Einsatzrahmen mit Schulleitung und Datenschutz | Etappe 1 (R12-1) |
| K8 Inhalte unabhängig vom Laufdiktat anlegen, Namensliste | Etappe 1 („Schnell erstellen“) |
| M8 Kurzbericht an die Lehrkraft | später, nach S1; vorher „Kind zeigt seinen Stand“ (Etappe 2) |
| Welle 3: `lehrer-geraet` freigeben | Etappe 1 (L25-9) |
| Welle 3: Stufenfolgen des Startpunkts, Regel „sicher“ | Etappe 2 (F30-6) und Etappe 3 (F30-3, F30-7) |
| Version 0.9.7: `/lehrer/aufgaben` in alter Oberfläche | beim Umbau des Auftrags (L25-5, Etappe 2) |

## Bewusst nicht

| Nicht | Grund |
| --- | --- |
| Lernstand über den Server, Schülerkonten | widerspricht dem Kern (Datenschutz, ohne Login) |
| Ranglisten einzelner Kinder im eigenen Üben | Kapitel 23; Wettkampf gibt es im Battle |
| Eigene Diagnostik, Handschrift- und Spracherkennung | von den Fachberichten selbst ausgeschlossen |
| Weitere Fremdsprachen, Brückensprachen | nicht die Zielgruppe; braucht fremde Prüferinnen |
| Lehrplanzuordnung in der Oberfläche | Pflege bei jeder Lehrplanänderung |

## Siehe auch

- [[Anwendung|Vision]] · [[Kompetenzlandkarte]] · [[Förderkreislauf]] · [[Wettbewerbsvergleich]] · [[Offene Entscheidungen]]
- [[../17 - Entwicklungsplan/Anwendung|Entwicklungsplan]], [[../18 - Aufgabenübersicht/Anwendung|Aufgabenübersicht]], [[../21 - Qualitätsgrundlage und Freigabe/Anwendung|Qualitätsgrundlage und Freigabe]]
- Repository: `docs/vision/40-red-team.md`, `docs/umsetzungsplan-audit-welle-3.md`, `docs/version-0.9.7.md`
