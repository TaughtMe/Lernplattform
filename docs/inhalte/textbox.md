# Textbox (Rechtschreibtraining mit Texten)

Fachliche Grundlage: `docs/umsetzungsplan-textbox.md`. Route (ab Paket B):
`/frei/german/textbox`. Die Textbox läuft vollständig lokal; es gehen keine
Eingaben oder Ergebnisse an einen Server.

## Format eines Textes

Die Texte stehen in `src/domain/textbox-library.ts` und werden beim Laden mit
`textboxTextSchema` (`src/domain/textbox-text.ts`) geprüft.

| Feld          | Bedeutung                                                             |
| ------------- | --------------------------------------------------------------------- |
| `id`          | `TXT-001`, fortlaufend, nie wiederverwendet                           |
| `title`       | Titel, höchstens 80 Zeichen                                           |
| `difficulty`  | `leicht`, `mittel`, `schwer`                                          |
| `phenomena`   | ein oder mehrere Rechtschreibschwerpunkte                             |
| `genre`       | `geschichte`, `alltag`, `erlebnis`, `sachtext`, `schule`              |
| `text`        | der vollständige Text mit Satzzeichen                                 |
| `targetWords` | Zielwörter, so geschrieben wie im Text (Groß-/Kleinschreibung gilt)   |
| `usage`       | `frei` (Bibliothek) und/oder `wortspeicher` (Vorschläge nach Übungen) |

## Regeln für neue Texte

- **Länge:** leicht 30–60 Wörter, mittel 60–110, schwer 110–180.
- **Zielwörter:** 10–25 % der Wörter des Textes (jedes Vorkommen zählt). Jedes
  Zielwort muss ein **echtes Beispiel für den Schwerpunkt** sein (bei „gemischt“
  für einen der genannten Schwerpunkte) und steht als ganzes Wort im Text. Fehlen
  passende Wörter, wird der Text umgeschrieben; es wird nicht mit unpassenden
  Wörtern aufgefüllt. Ein gemischter Text nennt mindestens zwei Schwerpunkte.
- **Inhalt:** altersangemessen, kurze Sätze, bekannte Lebenswelt, freundlich;
  keine Namen realer Personen, keine Angstthemen, keine Bloßstellung.
- **Schwerpunkte:** Doppelkonsonanten, lange und kurze Vokale, Dehnungs-h,
  Wörter mit ie, s/ss/ß, Groß- und Kleinschreibung, Auslautverhärtung,
  Wortbausteine und Wortfamilien, zusammengesetzte Wörter, gemischt.
- Die Validierung in `src/domain/textbox-library.test.ts` prüft Ids, Länge,
  Zielwörter und Anteil automatisch. Ob ein Zielwort zum Schwerpunkt passt,
  prüft der Test nur grob mit Mustern (z. B. Doppelkonsonant, Vokal + h,
  Endung b/d/g); die fachliche Prüfung bleibt bei der Lehrkraft.

## Prüfliste für die Lehrkraft (vor der Freigabe)

- [ ] Altersangemessen und verständlich?
- [ ] Rechtschreibung, Zeichensetzung und Grammatik des Originals fehlerfrei?
- [ ] Jedes Zielwort ist ein echtes Beispiel für den genannten Schwerpunkt?
- [ ] Schwerpunkt ist im Text gut vertreten, ohne künstlich zu wirken?
- [ ] Länge passt zur Schwierigkeit und zur Merkzeit?
- [ ] Keine Namen realer Personen, keine Angstthemen?

## Stand

Welle 1 (`TXT-001` bis `TXT-015`) und Welle 2 (`TXT-016` bis `TXT-050`) sind
**Entwürfe**. Sie wurden von einem KI-Agenten verfasst und sind noch **nicht**
fachlich geprüft. Aufteilung: je Schwierigkeit mindestens 10 Texte (aktuell 16
leicht, 17 mittel, 17 schwer), jeder Schwerpunkt in mindestens 2 Texten.

Beim Prüfen besonders ansehen: Zielwörter, die nur nach dem Muster als
Schwerpunktwort erkannt werden (z. B. „Fahrrad“, „sah“, „Mutter“,
„zusammen“), und Sätze, die nur wegen der Zielwörter da sein könnten.

## Ablauf und Oberfläche (Stand Oktober 2026)

Layout nach Design 9b–9f, Plan: `docs/umsetzungsplan-textbox-layout.md`.

- **Auswahl:** Kartenraster mit Suche (Titel oder Schwerpunkt), Filtern für
  Stufe (genau eine), Stand (Neu, Begonnen, Gemeistert) und Schwerpunkt
  (Mehrfachauswahl). Am Desktop steht „Weitermachen“ für angefangene Einheiten
  oben. **Gemeistert** heißt Bestwert ab **90 %** (`TEXTBOX_MASTERED_PERCENT`),
  **Begonnen** mindestens eine abgeschlossene Übung oder eine angefangene Einheit.
- **Durchgang:** Merken, Schreiben, Kontrolle. In der Kontrolle gibt es
  **„Durchgang wiederholen“**: zurück zur Merkphase desselben Durchgangs, die
  Lücken bleiben gleich. Ein Durchgang lässt sich **beliebig oft** wiederholen.
  **Jeder Versuch ist vollwertig** und hat seinen eigenen Prozentwert; nichts
  heißt „Übung“ oder „zählt nicht“. **Das Ergebnis des Durchgangs ist der
  jeweils letzte Versuch** (wie bis 0.9.3): Prozentwert, Fehlerwörter und
  Lernereignis folgen ihm; in Kontrolle und Abschluss steht „Versuch n“ mit der
  Reihe der Prozentwerte dieses Durchgangs. Der Bestwert zählt weiter nur
  Durchgang 4. Die Regel gilt seit der Entscheidung vom 27.10.2026 und ersetzt
  „Erster Versuch zählt“ aus 0.9.4.
- **Speicherung der Versuche:** Das optionale Feld `retries` am Durchgang
  enthält die Versuche ab dem zweiten (Prozentwert, Zähler, Zeiten, Zeitpunkt
  `at`); der erste Versuch steht wie bisher in den Feldern des Durchgangs.
  Zusammen sind es höchstens **100 Versuche je Durchgang**: großzügig, damit
  auch sehr häufiges Wiederholen vollständig im Verlauf steht, und zugleich
  eine Grenze für Speicher und Sicherung. Darüber fallen die ältesten späteren
  Versuche weg, der erste bleibt als Ausgangswert. Nur der jüngste Versuch
  behält seine Wortliste. Daten aus 0.9.4 (erster Versuch plus höchstens 5
  `retries`, ohne Zeitpunkt) werden als Versuchsreihe gelesen; das Sicherungsschema
  zieht über `textboxSessionSchema` mit.
- **Verlauf:** Die Ansicht eines Textes zeigt je Durchgang alle Versuche in
  Reihenfolge, z. B. „Durchgang 2: 25 % → 27 % → 100 %“, darunter je Versuch
  Prozentwert, Datum und Uhrzeit. Ein Sprung von mindestens 50 Prozentpunkten
  zwischen zwei Versuchen ist dezent mit „großer Sprung“ markiert (auch nach
  unten). Das ist nur ein Hinweis zum Hinsehen, keine Bewertung: Die Lehrkraft
  erkennt Steigerung, Verschlechterung und auffällige Sprünge und sieht, ob ein
  Kind den Text gelernt hat. Bei 0.9.4-Einheiten mit Wiederholungen gilt der
  letzte Versuch als Endwert.
- **Darstellung:** Am Desktop startet die Eingabe als Heft mit Linien (Navigation
  bleibt); „Vollbild“ schaltet auf die ruhige Ansicht um, die Wahl gilt pro
  Gerät. Mobil gilt immer das Heft ohne Navigation, mit Aktionsleiste unten.
