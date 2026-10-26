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
  Lücken bleiben gleich. **Der erste Versuch zählt** (wie W-6 bis W-9 im
  Wortspeicher): Prozentwert, „n von m Wörtern auf Anhieb richtig“, Fehlerwörter
  und Lernstand folgen allein dem ersten Versuch. Wiederholungen werden als
  Übungsversuche (`retries`, höchstens 5 je Durchgang) gespeichert und als
  Selbstkorrektur angezeigt, ändern aber kein Ergebnis. Der Bestwert zählt
  weiter nur Durchgang 4.
- **Darstellung:** Am Desktop startet die Eingabe als Heft mit Linien (Navigation
  bleibt); „Vollbild“ schaltet auf die ruhige Ansicht um, die Wahl gilt pro
  Gerät. Mobil gilt immer das Heft ohne Navigation, mit Aktionsleiste unten.
