# Wortspeicher (Lernwörter)

Oberfläche: `app/components/learning-word-app.tsx` (Design 4d–4f), Route
`/frei/german/lernwoerter`.

## Fachlich vorhanden und im Design übernommen

- **Fünf Merkstufen** (`src/domain/learning-word.ts`): 1 Abschreiben,
  2 wenige Lücken, 3 viele Lücken, 4 ansehen und verdecken (Eingabe direkt auf
  den Längenstrichen), 5 mehrere Wörter merken (Blockgrößen 1, 2, 3, 5).
- Regeln für Aufstieg, Verbleib und Rückstufung; Hilfen verhindern den
  Aufstieg; Selbstkorrekturen werden erfasst (`updateLearningWordStage`).
- **Wortbanken** mit jeweils über 100 Wörtern und Rechtschreibstrategie
  (`src/domain/german-learning-content.ts`): Doppelkonsonanten, ck/tz,
  Auslautverhärtung, ä/äu, langes i, Dehnungs-h, Merkwörter & Fremdwörter.
  Im Design sind das die Themenkacheln.
- Merkstufe, Leitner-Box und Fälligkeit je Wort werden lokal gespeichert
  (`createLearningWordProgressRepository`). Daraus zeigt der Wortspeicher
  „Trainingswörter heute“ (fällige Wörter) und „x / y sicher“ je Thema
  (sicher = mindestens Box 3).
- „Gemischt trainieren“ startet eine Runde aus allen fälligen Wörtern auf der
  leichtesten fälligen Merkstufe.

## Im Design gezeigt, fachlich noch nicht vorhanden

- **Hören und Lückensatz** (Design 4e: Lautsprecher, „Der ___ bellt laut.“,
  Tipp): Es gibt keine Beispielsätze je Wort und keinen Diktatmodus mit
  Sprachausgabe. Für die Anbindung bräuchte jede Wortbank Sätze mit Lücke
  (Datenmodell-Erweiterung) und eine Stufe „hören und schreiben“.
- **Buchstabenvergleich nach Fehler** (Design 4e, Fehler sehen): Die
  Auswertung zeigt die richtige Lösung, aber keinen Buchstabenvergleich.
  Baustein dafür wäre ein Vergleich wie in `live-copy-guide.tsx`.
- **Wortliste mit Filter, Bearbeiten, Löschen je Wort** (Design 4f, ☰): Es gibt
  die freie Textliste „Deine Lernwörter“, aber keine gespeicherte, bearbeitbare
  persönliche Wortliste.
- **Fehler aus Laufdiktat und Tests als Lernwörter übernehmen** (Vault Kap. 18,
  „Später: automatische Fehleranalyse“): offen.

## Offene fachliche Entscheidungen (Vault Kap. 18)

5.000-Punkte-Wertung, Merkbonus, Rückstufungsregeln, Umfang fester Listen.

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
