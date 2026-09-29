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
