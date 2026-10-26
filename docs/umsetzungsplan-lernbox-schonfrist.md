# Umsetzungsplan LernBox: Schonfrist und Rückstufung nach Zeit

Stand: 22.10.2026. Welle 2 aus `docs/umsetzungsplan-audit-welle-1.md`. Festlegungen
des Entwicklers vom 21./22.10.2026.

## Festlegungen

| Nr. | Regel                                                                                                                                                                                                                                               |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L-1 | Gilt **nur für die LernBox** (Vokabeln), je Richtung (`forward`, `reverse`) getrennt. Wortspeicher, Mathe und Textbox bleiben unverändert.                                                                                                          |
| L-2 | Betroffen sind nur Richtungen, die schon geübt wurden (Abstand > 0). Neue Karten und die nie geübte Rückrichtung fallen nicht zurück.                                                                                                               |
| L-3 | **Schonfrist:** 14 Tage nach der Fälligkeit (`nextReview` bzw. `reverseNextReview`), gleich für alle Boxen.                                                                                                                                         |
| L-4 | **Rückstufung:** Je volle 14 Tage Überfälligkeit eine Box zurück, höchstens bis Box 1. `rückstufungen = floor(überfällig_in_Tagen / 14)`, wirksame Box = `max(1, Box − rückstufungen)`. Beispiel Box 4: 13 Tage → 4, 14 Tage → 3, 28 → 2, 42 → 1.   |
| L-5 | **Box 1** fällt nicht weiter, bekommt aber wie jede Box ab 14 Tagen Überfälligkeit die Kennzeichnung „lange nicht geübt“.                                                                                                                           |
| L-6 | **Ferien** werden nicht berücksichtigt.                                                                                                                                                                                                             |
| L-7 | **Wortwahl:** „lange nicht geübt“, nie „vergessen“ – eine Rückstufung nach Zeit belegt kein Vergessen.                                                                                                                                              |
| L-8 | **Kein neues Datenformat:** Die wirksame Box wird beim Lesen aus Box und Fälligkeit berechnet (reine Funktion, Zeit injizierbar). Gespeichert wird sie erst mit der nächsten Abfrage: `processLearningBoxResult` rechnet von der wirksamen Box aus. |
| L-9 | Alle Anzeigen und Zählungen nach Box (Kartenliste, Leitner-Übersicht, Tagesportion, Empfehlungen, Startseite) nutzen die wirksame Box.                                                                                                              |

## Prüfungen

Tabellentest für L-2 bis L-5 mit injizierter Zeit; Test, dass eine richtige
Antwort nach Rückstufung von der wirksamen Box aufsteigt und eine falsche auf
Box 1 setzt; Sicherung und Abgleich bleiben unverändert (keine neuen Felder).

## Klärung Box 1 (C7)

Die Frage aus Welle 1 ist mit L-5 entschieden: In Box 1 gibt es keine Rückstufung,
weil es keine tiefere Box gibt. Die Schonfrist von 14 Tagen gilt aber auch in Box 1
für die Kennzeichnung „lange nicht geübt“, wie in jeder Box. Umgesetzt in
`isLearningBoxLongUnpracticed` (`src/domain/learning-box.ts`) und getestet in
`src/domain/learning-box.test.ts`. Ferien werden weiterhin nicht berücksichtigt (L-6).

## Beobachtung in der Beta

- **Wiederaufnahme nach den Ferien:** Anteil der Kinder, die in der ersten Schulwoche
  nach den Ferien die LernBox wieder öffnen; Anteil der Karten „lange nicht geübt“
  und wie schnell er sinkt.
- **Motivation:** Rückmeldungen der Lehrkräfte und Kinder zu Rückstufungen; Abbrüche
  der ersten Portion nach den Ferien.
- **Entscheidungsfrage danach:** Ferien aussetzen oder die Rückstufung auf eine Box
  begrenzen.

Hinweis: Die Erhebung erfolgt nur über Gespräche und Lehrkraftbeobachtung, ohne
zusätzliche Datenerhebung (Datenschutz, Entscheidung 43).
