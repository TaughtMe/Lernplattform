# Wortspeicher (Lernwörter)

Oberfläche: Container `app/components/learning-word-app.tsx`, Ansichten unter
`app/views/wortspeicher/` (Design 4d–4f), Route `/frei/german/lernwoerter`.
Grundlage: `docs/umsetzungsplan-wortspeicher.md`, Entscheidung 55.

## Wortboxen

- **Feste Wortboxen** (`src/domain/german-learning-content.ts`): Doppelkonsonanten,
  ck/tz, Auslautverhärtung, ä/äu, langes i, Dehnungs-h, **s, ss und ß**, Merkwörter
  & Fremdwörter, je mit über 100 Wörtern und Rechtschreibstrategie. Nicht bearbeitbar,
  aber über ☰ als eigene Wortbox kopierbar („<Titel> (Kopie)“).
- **Eigene Wortboxen** (`src/domain/word-box.ts`): vom Kind angelegt, benannt und
  gefüllt, lokal gespeichert (Dexie `wordBoxes`). Titel 1–60 Zeichen, Wort 1–60
  Zeichen ohne Steuerzeichen und `<` `>`, höchstens 500 Wörter je Wortbox und 50
  eigene Wortboxen. Doppelte Wörter werden still zusammengelegt.
- **„Aus dem Unterricht“:** entsteht bei der ersten Übernahme aus einem
  Text-Laufdiktat. Das Kind kann Wörter oder die ganze Wortbox löschen.
- Kacheln: Titel, Beispielwörter, „x / y sicher“ (Box ≥ 3) und „Stufe n · Bestwert x %“
  der höchsten Stufe mit Runde. Antippen öffnet das Startblatt, ☰ die Wortliste.

## Sechs Merkstufen

| Stufe | Titel               | Darstellung                                | Lernhandlung                   |
| ----- | ------------------- | ------------------------------------------ | ------------------------------ |
| 1     | Abschreiben         | vollständiges Wort sichtbar                | fehlerfrei abschreiben         |
| 2     | Wenige Lücken       | wenige Buchstaben fehlen                   | Lücken ergänzen                |
| 3     | Viele Lücken        | viele Buchstaben fehlen                    | Wort weitgehend rekonstruieren |
| 4     | Ansehen & verdecken | Wort ansehen, dann Längenstriche           | Wort aus dem Gedächtnis        |
| 5     | Wörter merken       | Blockgröße 1, 2, 3 oder 5                  | ohne feste Reihenfolge         |
| 6     | Hören und schreiben | nur das gesprochene Wort, kein Schriftbild | gehörtes Wort schreiben        |

Die Stufe wird für eine Runde von Hand gewählt (Startblatt: Bestwert je Stufe,
„empfohlen“ nach dem Lernstand der Wörter, Rundengröße 5/10/20/alle). Stufe 6 ist
nur mit deutscher Stimme wählbar. Beim Start wird die Stimme vollständig
vorbereitet (Warten auf die Stimme, stummer Aufwärmton), erst dann beginnt die
Runde. „Anhören“ zählt nicht als Hilfe, „Wort zeigen“ schon. Bei gleich klingenden
Wörtern steht immer eine Bedeutungshilfe darunter (Liste unten).

## Bewertung

- **Prozentwert einer Runde:** Wörter auf Anhieb richtig ÷ Wörter der Runde. Auf
  Anhieb heißt: erste Antwort exakt richtig und keine Hilfe. Selbstkorrektur zählt
  im Prozentwert nicht, im Lernstand als „richtig mit Selbstkorrektur“.
- **Stufe 5** wird je Wort bewertet (Reihenfolge egal, zusätzliche Wörter ohne Abzug).
  Der Block wiederholt sich, bis alle Wörter stimmen.
- **Rückmeldung nach einem Fehler:** Fehlerart, Buchstabenvergleich (Farbe **und**
  Unterstreichung bzw. Textliste „3. Buchstabe: m statt n“) und in Stufe 6 der
  Hinweis „Das klingt genauso. Gemeint war ‚Rad‘ (zum Fahren).“
- Leitner-Boxen, Fälligkeiten und Regeln für Aufstieg und Rückstufung sind unverändert
  (Merkstufe jetzt bis 6). Ein Rundenabschluss erzeugt kein zusätzliches Lernereignis.
- Zeit fließt nicht ein. Abgebrochene Runden werden nicht gespeichert.

## Bestwert, Verlauf, Fortschritt, Laufzettel

- Bestwert, letzter Wert und Anzahl werden je Wortbox und Stufe aus den Runden
  abgeleitet (Dexie `wordRounds`). Es zählt immer das beste Ergebnis.
- **Verlauf** (`?wortbox=<id>&ansicht=verlauf`): Stufenumschalter, Linie/Säulen,
  alle Runden mit den Wörtern, Reflexionsfragen ab zwei Runden.
- **Fortschrittsseite:** Abschnitt „Wortspeicher“ (trainierte und sichere Wörter,
  Wiederholungen, Runden, Verteilung auf die Stufen, Diagramm, Wörter mit den
  meisten Fehlern mit Link zum Üben).
- **Laufzettel** (`/frei/german/lernwoerter/laufzettel`): druckbar, Namensfeld wird
  nicht gespeichert, Hinweis „kein Prüfungsnachweis“.

## Übernahme aus dem Laufdiktat

Beim Erstellen eines **Text**-Laufdiktats wählt die Lehrkraft (nur bei sichtbarem
Bereich `wortspeicher`) „Aus“, „Falsch geschriebene Wörter“ (Standard) oder „Alle
Wörter“. Auf dem Schülergerät vergleicht `misspelledWords` Eingabe und Zieltext
wortweise; übernommen werden falsche und nur in der Groß-/Kleinschreibung
abweichende Wörter (keine ausgelassenen, keine Zahlen). „Alle Wörter“ nimmt alle
erreichten Wörter mit mindestens 4 Buchstaben. Ziel ist die Wortbox „Aus dem
Unterricht“; falsch geschriebene Wörter werden sofort fällig (Box 1, ohne
Lernereignis). Einmal pro Runde und Gerät, nie im Stationsmodus, auch bei
vorzeitigem Ende. Es geht nichts an den Raum oder die Lehrkraft.

## Verbindung zur Textbox

- Abschluss einer Runde: bester passender Text als Karte (Titel, Schwierigkeit,
  „enthält 4 deiner 6 Wörter“), sonst „Mit einem Text weiterüben“. Nur bei
  sichtbarer Textbox.
- `?woerter=` öffnet das Blatt „Wörter aus der Textbox“ mit „Jetzt üben“ (vorübergehende
  Wortbox, Runden unter der Id `textbox`) und „In eine Wortbox speichern“. Ohne eine
  Aktion wird nichts gespeichert. Von der Fortschrittsseite kommt `&quelle=fehler`.

## Bewusst nicht umgesetzt

- **Hören und Lückensatz** (Design 4e: „Der ___ bellt laut.“): Stufe 6 spricht nur das
  einzelne Wort. Beispielsätze je Wort und Satzdiktat gehören nicht zu diesem Umbau.
- Automatische Übernahme von Textbox-Fehlern, Übernahme aus eigenem Laufdiktat und
  Tests, 5.000-Punkte-Wertung, automatische Wahl der Merkstufe.

## Prüflisten für die Lehrkraft

Beide Inhalte hat der Entwurf in `src/domain/` angelegt. Die Lehrkraft prüft sie
fachlich, bevor der Umbau übernommen wird. Änderungen sind ohne Eingriff in die
Oberfläche möglich: Wortbox in `german-learning-content.ts`, Gruppen in
`homophones.ts` (ein Test hält diese Liste und den Code zusammen).

### Wortbox „s, ss und ß“ (`s-ss-sz`)

Strategie „Ableiten“, 133 Wörter, zugeordnet dem Textbox-Schwerpunkt
`s-ss-sz`. Gliederung: zuerst Wörter mit ß (langer Vokal oder Doppellaut),
dann Wörter mit ss (kurzer Vokal), zuletzt Wörter mit einfachem s.

- **ß:** Straße, Fuß, Gruß, Spaß, Maß, Maße, groß, heiß, weiß, draußen, außen,
  außer, außerdem, beißen, reißen, schmeißen, schließen, genießen, gießen,
  fließen, schießen, sprießen, Soße, Größe, Füße, Grüße, Fleiß, Strauß, Kloß,
  Floß, Gefäß, Fußball, Fußboden, Fußgänger, Straßenbahn, Süßigkeit, süß, bloß,
  Spieß, heißen, Spaßvogel, Großmutter, Großvater, Weißbrot, Fußweg, Grußkarte,
  Schließfach, Fußabdruck, Straßenschild
- **ss:** Wasser, Fluss, Nuss, Kuss, Schloss, Schluss, muss, Biss, Riss, Pass,
  Fass, Kasse, Klasse, Tasse, Messer, essen, lassen, passen, nass, blass, fassen,
  Schüssel, Schlüssel, küssen, müssen, wissen, Genuss, Gewissen, Abschluss,
  Entschluss, Kissen, fressen, Rasse, Masse, Gasse, hässlich, Gewässer, Fässer,
  Nüsse, Küsse, Flüsse, Schlösser, Pässe, Klassenzimmer, Passwort, Flussufer
- **s:** Hase, Nase, Rose, Hose, Vase, Käse, Gänse, Mäuse, Häuser, Haus, Maus,
  Laus, Eis, Eisen, Reis, Reise, reisen, lesen, Besen, Fliese, Brause, Pause,
  Ferse, Gans, Gras, Glas, Preis, Kreis, Hals, Sonne, Sand, Salz, Suppe, Sofa,
  Insel, Esel, das, dass

Zu klären: Ob „das“ und „dass“ in dieselbe Wortbox gehören (sie sind zugleich
gleich klingende Wörter, siehe unten) und ob Wörter wie „Masse“ und „Maße“, die
sich im Vokal unterscheiden, bewusst nebeneinander stehen sollen.

### Gleich klingende Wörter (Stufe 6)

In Stufe 6 steht bei diesen Wörtern immer eine Bedeutungshilfe unter dem
Lautsprecher („Bedeutung: zum Fahren“). Schreibt das Kind das andere Wort der
Gruppe, zählt das als Fehler, die Rückmeldung lautet aber: „Das klingt genauso.
Gemeint war ‚Rad‘ (zum Fahren).“ Die Hilfe zählt nicht als Hilfe im Sinn der
Bewertung.

| Wort   | Hilfe                     | Wort   | Hilfe                      |
| ------ | ------------------------- | ------ | -------------------------- |
| Rad    | zum Fahren                | Rat    | ein guter Tipp             |
| Meer   | das große Wasser          | mehr   | eine größere Menge         |
| Weg    | eine Straße oder ein Pfad | weg    | nicht mehr da              |
| Feld   | ein Acker                 | fällt  | von fallen                 |
| Lied   | zum Singen                | Lid    | am Auge                    |
| Stadt  | ein großer Ort            | statt  | anstelle von               |
| Wahl   | man wählt jemanden        | Wal    | ein Tier im Meer           |
| Mahl   | ein Essen                 | Mal    | das erste Mal              |
| wieder | noch einmal               | wider  | gegen                      |
| lehren | unterrichten              | leeren | leer machen                |
| Sohle  | unter dem Schuh           | Sole   | Salzwasser                 |
| Leib   | der Körper                | Laib   | ein Laib Brot              |
| malen  | mit Farbe                 | mahlen | Korn zu Mehl machen        |
| Seite  | im Buch                   | Saite  | an der Gitarre             |
| Stiel  | an der Blume              | Stil   | Art und Weise              |
| Waise  | ein Kind ohne Eltern      | Weise  | klug oder Art und Weise    |
| Bären  | große Tiere im Wald       | Beeren | Früchte am Strauch         |
| viel   | eine große Menge          | fiel   | von fallen                 |
| wahr   | richtig, nicht gelogen    | war    | von sein                   |
| das    | das Haus                  | dass   | leitet einen Nebensatz ein |

Zu klären: „Weg“ und „weg“ unterscheiden sich nur in der Großschreibung. Ein
Kind, das „weg“ statt „Weg“ schreibt, bekommt die Rückmeldung zur Groß- und
Kleinschreibung, nicht den Hinweis auf gleich klingende Wörter.
