# Vision Lernraum – Rolle 50: Zusammenführung

Stand: 11.11.2026. Protokoll zur Entstehung des Vault-Kapitels
`obsidian-export/Lernplattform/25 - Vision/`. Das Kapitel ist ein Vorschlag;
es entscheidet nichts.

Kennzeichen wie in den Berichten: [Beleg] Repository, [Fachstand] Quelle
außerhalb, [Vermutung] plausibel, nicht belegt, [Empfehlung] mein Vorschlag.

## 1. Was entstanden ist

| Datei                                             | Inhalt                                                                                                                                   |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `25 - Vision/Anwendung.md`                        | Prüfstein, Leitbild, fünf Szenen, Bild für Kind und Lehrkraft, Alleinstellung, Grenzen, „Was immer gilt“ (wörtlich), Prüfstein je Etappe |
| `25 - Vision/Kompetenzlandkarte.md`               | vier getrennte Karten: Rechtschreibung, Lesen, Mathematik, Vokabeln in vier Schichten; dazu Deutsch als Zweitsprache                     |
| `25 - Vision/Förderkreislauf.md`                  | Kreislauf in neun Schritten, Signale, „Heute“, Startpunkt, vom Fehler zur Übung, Rückmeldung in Stufen, Grenze zur Diagnostik, Wortliste |
| `25 - Vision/Wettbewerbsvergleich.md`             | gekürzte Vergleichstabelle, was Lernraum übernimmt und was nicht                                                                         |
| `25 - Vision/Roadmap.md`                          | Anschluss an die Audit-Roadmap, Liste „Sofort reparieren“, drei Etappen, „später“, Streichliste                                          |
| `25 - Vision/Offene Entscheidungen.md`            | 16 Fragen an den Entwickler; acht Entwürfe für Protokolleinträge mit Rücknahme, acht Ergänzungen                                         |
| `obsidian-export/Lernplattform/00 - Übersicht.md` | zwei Zeilen: Tabelle „Umsetzungsstand der Bereiche“ (Stand: Vorgeschlagen) und Liste „Funktionsbereiche“                                 |
| `docs/vision/50-zusammenfuehrung.md`              | dieses Protokoll                                                                                                                         |

Am Entscheidungsprotokoll, am Entscheidungsindex, an `README.md` und am Code
habe ich nichts geändert.

## 2. Leitlinien der Zusammenführung

1. **Rangfolge.** Antworten des Entwicklers (`01-planung.md`, Abschnitt 4 mit
   den Nachträgen nach Phase 1, 2 und 4) gehen allen Berichten vor, auch dem
   Red Team. Danach begrenzt Bericht 40 Zuschnitt und Kapazität. Danach
   gelten die Fachberichte.
2. **Leitbild.** „Schmal, geprüft, im Unterricht erprobt“ statt
   „Mega-Plattform“ (Bericht 40, Kurzurteil 9). Die Zielsätze des Entwicklers
   aus `00-auftrag.md` („Mega-Plattform“, „Wissen etablierter Angebote“)
   stehen im Kapitel ausdrücklich unter „Was Lernraum nicht ist“.
3. **Prüfstein.** Er steht am Anfang und am Ende von `Anwendung.md` und als
   eigene Tabelle in `Roadmap.md`. Für fremde Geräte heißt es durchgehend „in
   drei Minuten passend eingestellt“ (Bericht 40, 6.1; Nachtrag nach Phase 1,
   Nr. 2).
4. **Sprache.** Die Wortliste aus Bericht 30 (4.8) gilt im ganzen Kapitel.
   „Adaptiv“ und „diagnosegestützt“ kommen nur in der Spalte „Nicht
   verwenden“ vor.

## 3. Widersprüche und wie ich sie aufgelöst habe

### 3.1 Entwickler gegen Red Team (Nachtrag nach Phase 4)

| Punkt         | Red Team                                                                  | Entscheidung des Entwicklers                                      | Umsetzung im Kapitel                                                                                                                                                                                            |
| ------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lesen         | Tandem-Begleiter und Chorlesen in Etappe 2 (L21-1, L21-2; Entscheidung 5) | schwer umzusetzen; Lesen nach hinten, Schwerpunkt Leseverständnis | L21-1 und L21-2 aus Etappe 2 entfernt. Leseverständnis (L21-5, -6, -8, -10) unter „später“. Die Spannung zu Bericht 21 ist in der Kompetenzlandkarte benannt. Entwurf A8 nimmt Nachtrag 2, Nr. 5 zurück.        |
| Lizenz        | EUPL-1.2 empfohlen; R12-12 in Etappe 1; Inhalte erst aus dem Code lösen   | ausdrücklich ja, in Etappe 1, wirklich einbauen                   | Eigener Block in Etappe 1 mit fünf Schritten. Das Verschieben der Inhalte in eigene Dateien ziehe ich vor; das dünne Format (F30-1) bleibt in Etappe 2 [Empfehlung].                                            |
| Markenfiguren | vor jeder Lizenzdatei ersetzen                                            | sieht das Problem; werden ersetzt                                 | Sofortliste, Rang 7; erster Schritt des Lizenzblocks.                                                                                                                                                           |
| Tierbilder    | Herkunft nicht dokumentiert                                               | Coco Material, laut Anbieter frei nutzbar                         | Schritt 2 des Lizenzblocks: Bedingungen im Original ablegen und mit CC BY-SA abgleichen. [Beleg] `public/figuren/QUELLE.md` nennt Coco Material für die Figuren; die Bedingungen selbst habe ich nicht geprüft. |

### 3.2 Zwischen den Berichten

Die acht Auflösungen aus Bericht 30 (W1 bis W8) und die neun Empfehlungen aus
Bericht 40 (A bis I) habe ich übernommen. Eigene Entscheidungen:

| Widerspruch                                                                                                                              | Auflösung                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mein Auftrag verlangt eine Datei „Kompetenzlandkarte“; Bericht 40 streicht die „Kompetenzlandkarte über alle Fächer“ (Scheingenauigkeit) | Die Datei bleibt, enthält aber vier getrennte Karten und sagt das im ersten Absatz.                                                                                                                                      |
| Häuser: Nachtrag 1, Nr. 4 („später“) gegen Bericht 40 (R12-8 streichen)                                                                  | Die eigene Aussage des Entwicklers geht vor: Häuser stehen unter „später, braucht eine neue Entscheidung“. Der Abgleich über den Server ist Frage 13.                                                                    |
| Rückmeldung: Antwort auf Frage 3 lässt einen Abgleich über Supabase zu; Berichte 12 und 40 ziehen vor S1 eine rote Linie                 | Stufenmodell: „Kind zeigt seinen Stand“ in Etappe 3, Kurzbericht per QR erst nach S1, Lernstand über den Server auf der Streichliste. Die Antwort des Entwicklers ist eine Erlaubnis, kein Auftrag; so steht es im Text. |
| Zielgruppe „alle Klassen der Mittelschule“ gegen Inhalte, die bei der Grundschule enden                                                  | Offen benannt: zwölf Monate lang „Grundlagen in jugendgerechter Form“; Stufe E als erster Kandidat des zweiten Jahres (Bericht 40, 5 H).                                                                                 |
| Zweites Jahr: Großschreibung und das/dass (Bericht 40) oder Leseverständnis (Reihenfolge des Entwicklers nennt Lesen vor Mathe)          | Nicht entschieden. Frage 8, mit Empfehlung für Großschreibung und das/dass.                                                                                                                                              |
| Sofortliste Nr. 5 nennt die Protokollberichtigung „Aufgabe der Rolle 50“; mein Auftrag verbietet Änderungen am Protokoll                 | Der Auftrag geht vor. Die Einträge stehen als Entwürfe A1 bis A8 und B1 bis B8 in `Offene Entscheidungen.md`.                                                                                                            |
| Bericht 25 zeigt auf fremdem Gerät „9 von 12 sicher“                                                                                     | In der Nachsitz-Szene steht „9 von 12 beim ersten Versuch richtig“ (Bericht 30, W1).                                                                                                                                     |

## 4. Einwände des Red Teams

**Gefolgt** bin ich in allen Punkten der Abschnitte 7, 8, 10, 11 und 13, mit
den Ausnahmen aus 3.1. Im Einzelnen:

- Zuschnitt auf rund 65 Bausteine in drei Etappen mit den Terminen Februar,
  Pfingsten und November 2027; jede Etappe endet mit einer Woche ohne neuen
  Code.
- Abschnitt 10 „Sofort reparieren“ steht als eigene, priorisierte Liste vor
  den Etappen. Die acht Punkte habe ich am Code vom 11.11.2026 stichprobenhaft
  bestätigt (keine Verlinkung der drei Seiten, `ReadAloudButton` nur in der
  eigenen Datei und im Test, Standard `{ ink: true, flicker: true }`, keine
  Lizenzdatei, Markenfiguren unter `public/figuren/`) [Beleg].
- Fehlermuster (R20-8, F30-4), Klassengerät-Modus (L25-8) und „Gegen die Uhr“
  (M24-2) stehen nur bedingt in Etappe 3.
- Eine Inhaltslinie zur Zeit; eine zweite Prüferin als Frage 4.
- Keine Wirkungsversprechen. Jede Wirkungsaussage im Kapitel ist als
  [Fachstand] belegt oder als Erwartung bezeichnet.
- Empfehlungen zu E30-1 bis E30-9 und O1 bis O7 wie in Abschnitt 11.

**Nicht oder nur zum Teil gefolgt:**

| Einwand                                                             | Abweichung                                      | Grund                                                                        |
| ------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------- |
| Lesen im ersten Jahr als Tandem-Begleiter und Chorlesen (13, Nr. 5) | entfällt                                        | Entscheidung des Entwicklers vom 11.11.2026                                  |
| Inhalte erst in Etappe 2 aus dem Code lösen (12, Nr. 1 mit F30-1)   | Verschieben in eigene Dateien schon in Etappe 1 | die Lizenz gehört nach dem Entwickler in Etappe 1 und braucht diese Trennung |
| Haus-Sitzung streichen (7, R12-8)                                   | unter „später“ mit neuer Entscheidung           | Nachtrag 1, Nr. 4                                                            |
| Streichliste: „Kompetenzlandkarte“                                  | Dateiname bleibt                                | Vorgabe des Auftrags; Inhalt folgt dem Einwand                               |

**Eigene Ergänzungen, als Empfehlung gekennzeichnet:** Abnahmestunden je
Etappe (Überschlag nach der Formel aus Bericht 40, 4.2: rund 45 bis 50, 55
und 35 bis 40 Stunden); der Hinweis, dass Etappe 2 die engste ist; je Etappe
drei Bausteine, die bei Zeitnot zuerst weichen. Kleine Bausteine, die Bericht
40 als „tragen“ oder „kürzen“ wertet, aber keiner Etappe zuordnet, habe ich
eingeordnet: I31-1, M24-12 und R12-10 in die Sofortliste, I31-8, F30-5 und
R20-7 als Teile größerer Bausteine in Etappe 2, I31-10 (gekürzt) in Etappe 2,
R23-13 in Etappe 3.

## 5. Bausteine, die nicht in die Etappen eingegangen sind

Von 146 Bausteinen stehen rund 66 in den Etappen (30, 20 und 16, davon drei
bedingt). Der Rest:

| Verbleib                          | Bausteine                                                                                                                                                                                                                                                              |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Später                            | R20-11, R20-12, R20-15; L21-5, L21-6, L21-8, L21-10; R23-3, R23-5, R23-6, R23-8 bis R23-12, R23-17, R23-20; MA-6 bis MA-10, MA-12; M24-3, M24-7, M24-8, M24-11; L25-6, L25-12, L25-13; F30-8, F30-10, F30-11; R12-6, R12-7, R12-8; I31-5, I31-11, I31-13               |
| Als Zusatz beschrieben            | L21-1, L21-2, L21-4, L21-7 (Lautlese-Formate); L21-3, L21-11, L21-12 hängen daran                                                                                                                                                                                      |
| Gestrichen                        | W-6, W-8; R12-13; L21-9, L21-14, L21-15; R23-15, R23-16, R23-18; M24-9; I31-2 (bis auf Vorlesen und „Aufgabe bleibt sichtbar“), I31-3; R12-9 (entfällt, wenn die Schreiberleichterung ausläuft)                                                                        |
| In anderen Bausteinen aufgegangen | W-1 (R20-4, R20-5), W-2 (I31-7 als Leitlinie), W-3 (R12-7), W-4, L21-13, MA-15 und I31-15 (F30-9), W-5 (L21-1), W-9 (R12-12, R12-14), L25-15, M24-13 und I31-14 (F30-12), R12-15 (ein Absatz in R12-2), R23-14 (Frage im Gespräch R12-1), W-7 (ungelesen, erst prüfen) |

R20-4 (Fehlerdeutung) steht nicht als eigener Baustein in einer Etappe: Die
Strategie am Fehler (R20-5) nutzt die Auszeichnung des Kernworts; die
allgemeine Deutung wird erst an 100 echten Falschschreibungen erprobt.

## 6. Annahmen

| Annahme                                                        | Herkunft                       | Wo sie weitergeführt wird           |
| -------------------------------------------------------------- | ------------------------------ | ----------------------------------- |
| sechs Stunden je Woche, davon zwei für Inhalte                 | Planung, Frage 6; keine Zahl   | Offene Entscheidungen, Nr. 2        |
| Stifte und Tastaturen nicht überall                            | Frage 2, ohne Antwort          | Beobachtungsheft, Etappe 1          |
| feste Geräte eher in höheren Jahrgängen                        | Berichte 25 und 31 [Vermutung] | Offene Entscheidungen, Nr. 10       |
| Schulgeräte haben nicht sicher eine lokale deutsche Stimme     | Bericht 40, 6.1                | Sofortliste, Rang 3                 |
| keine Klarnamen, keine Angaben zu LRS oder Förderbedarf vor S1 | Frage 4                        | Offene Entscheidungen, Nr. 1 und 15 |

## 7. Was offen blieb und was ich nicht prüfen konnte

- **Lesetiefe.** Bericht 40 habe ich vollständig gelesen, ebenso die Abschnitte 1 und 4 der Planung und meinen Auftrag. Von den Berichten 10 bis 31 habe ich
  Kurzfazit, Zielbild, Bausteine und Grenzen gelesen, die Abschnitte zu
  Ist-Stand, Fachstand und offenen Entscheidungen nur in Auszügen (über die
  Zusammenfassungen in den Berichten 30 und 40). Die Versionsnotizen vor 0.9.7 und den Entwicklungsplan im Vault (Kapitel 17)
  habe ich nicht gelesen. Einzelne Fachaussagen des Kapitels stützen sich
  deshalb auf die Faktenprüfung des Red Teams, nicht auf eigene Prüfung.
- **Entscheidungsprotokoll.** Gelesen habe ich die Entscheidungen 45, 55, 57
  und 58 im Wortlaut und die Überschriften ab 19. Die Zuordnung der Entwürfe
  zu den Nummern 30, 37, 38 und 41 übernehme ich aus den Berichten; den
  Entscheidungsindex habe ich nicht geöffnet. Vor dem Eintragen bitte je
  Entwurf den Wortlaut gegenlesen.
- **Recht.** Nutzungsbedingungen von Coco Material, Lizenz der
  Vorgänger-Repositories, Lizenztext der NGSL-Kernliste 1.2, Kosten von
  Levumi 2026: ungeprüft. Die Lizenzempfehlung ist keine Rechtsberatung.
- **Browser.** Kein Befund ist im Browser geprüft; alle stammen aus Code und
  Dokumenten.
- **Websuche.** Keine. Ich habe keine neuen Quellen geprüft.
- **Welle 3.** Zwei offene Entscheidungen („Beenden“ mit 24 Stunden
  „Weitermachen“; Cloud-Abgleich aus den Kindereinstellungen) hat kein
  Bericht behandelt. Sie stehen als Frage 16.
- **Umfang.** `Roadmap.md` liegt mit rund 2 500 Wörtern über dem Richtwert von
  2 000, `Offene Entscheidungen.md` knapp darüber. Ich habe die Sofortliste
  und die Protokollentwürfe nicht weiter gekürzt, weil der Entwickler damit
  arbeiten soll.
- **Prettier.** `npx -y prettier@3.9.9 --check docs/vision/50-zusammenfuehrung.md`
  besteht. Der Vault ist von Prettier ausgenommen.
