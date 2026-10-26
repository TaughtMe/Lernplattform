---
umsetzungsstand: Teilweise implementiert
audit: "[[Lernraum – Gesamtaudit – 2026-10-19]]"
---

# Lernlogik und Leitner-Boxen

> **Umsetzungsstand laut Gesamtaudit vom 19./20.10.2026: Teilweise implementiert.** Die LernBox-Regeln (kein Aufstieg vor Fälligkeit, 8-Stunden-Fenster, ein Aufstieg je Fälligkeit) sind umgesetzt. **Abweichend** von dieser Notiz: Lernwörter steigen ohne Fälligkeitsprüfung und auch beim Abschreiben auf (A-004, D-001); Karteikarten-Selbsteinschätzung hebt bis Box 5 (D-010); „Bedeutung“ und „Schreiben“ werden je Richtung nicht getrennt gespeichert; Boxstände werden nur bei Mathe aus Ereignissen abgeleitet (A-003). Weitere Befunde: G-005, G-006, G-011. Details: [[../21 - Qualitätsgrundlage und Freigabe/Lernraum – Gesamtaudit – 2026-10-19|Gesamtaudit 2026-10-19]].


## Zweck

Der Lernstand bildet nicht nur ab, ob eine Bedeutung erkannt wurde, sondern auch, ob ein Wort selbstständig geschrieben werden kann.

## Vier interne Lernstände

- Deutsch → Fremdsprache: gewusst
- Deutsch → Fremdsprache: geschrieben
- Fremdsprache → Deutsch: gewusst
- Fremdsprache → Deutsch: geschrieben

In der einfachen Schüleransicht können daraus zwei Werte werden: **Bedeutung** und **Schreiben**.

## Grundregeln

| Ergebnis | Veränderung |
|---|---|
| Neues Wort | Box 1 |
| Beim ersten Versuch richtig | eine Box weiter |
| Selbstständig korrekt geschrieben | Wissen und Schreiben steigen |
| Bedeutung richtig, Schreibfehler | Wissen bleibt, Schreiben fällt |
| Bedeutung falsch | beide fallen beziehungsweise Box 1 |
| Hinweis oder Lösung verwendet | kein Aufstieg |
| Übersprungen | kein Aufstieg beziehungsweise Box 1 |
| Nach einem Fehler doch richtig | bleibt in Box 1 |
| Mehrfach in derselben Runde richtig | höchstens ein Aufstieg |

### Vokabeln aus einer Unterrichtsrunde (Entscheidung 49)

Die Platzierung beim Übernehmen aus dem Laufdiktat gilt für die abgefragte Richtung; die Rückrichtung bleibt unberührt beziehungsweise startet in Box 1.

| Ergebnis in der Runde | Neue Vokabel | Vokabel schon vorhanden |
|---|---|---|
| Sicher gewusst (0 Fehlversuche, keine Hilfe) | Box 2, morgen fällig | unverändert |
| 1–2 Fehlversuche, keine Hilfe | Box 1, sofort fällig | Box bleibt, sofort fällig |
| Abschreibvorlage (Lösung) angezeigt oder ab 3 Fehlversuchen | Box 1, sofort fällig | Box 1, sofort fällig |
| Nicht erreicht (vorzeitiges Ende) | Box 1, sofort fällig | unverändert |

## Lernstand und Leistungswertung

Der fachliche Lernstand beantwortet, ob die endgültige Antwort richtig war. Die Leistungswertung berücksichtigt zusätzlich Selbstkorrekturen, Hilfen und Merkspanne. Eine vor dem Absenden korrigierte Eingabe gilt daher als richtig, kann aber keinen Perfektionsbonus erhalten. Geschwindigkeit wird zunächst nur informativ angezeigt.

Bei Lernwörtern sind zwei Fortschritte getrennt zu speichern:

- **Merkstufe:** Wie viel Vorlage oder Hilfe das Wort noch benötigt.
- **Leitner-Box:** Wann das Wort wiederholt werden muss.

Ein Wort kann die höchste Merkstufe erreicht haben und wegen eines neuen Fehlers trotzdem kurzfristig fällig sein.

## Nachweisstärke

Freie Texteingabe ist ein stärkerer Lernnachweis als Multiple Choice oder selbst bewertetes Aufdecken. Geschwindigkeit beeinflusst Punkte, aber nicht den Boxstand.

## Erste technische Fälligkeitsstaffel

Für den ersten überprüfbaren Durchstich verwendet Lernraum eine zentrale, später kalibrierbare Staffel: Box 1 nach einem Tag, Box 2 nach drei Tagen, Box 3 nach sieben Tagen, Box 4 nach vierzehn Tagen und Box 5 nach dreißig Tagen. Ein Fehler setzt den betroffenen Wissens- beziehungsweise Schreibstand auf Box 1 und macht ihn sofort wiederholbar. Die erste spätere richtige Lösung schließt den Fehler, führt aber noch nicht zum Aufstieg. Hinweise und Lösungen erlauben ebenfalls keinen Aufstieg; innerhalb derselben Runde ist höchstens ein Aufstieg möglich.

Boxstand und Fälligkeit werden aus unveränderlichen Lernereignissen abgeleitet. Dadurch entsteht kein zweiter widersprüchlicher Lernstand. Die Intervalle sind eine technische Ausgangsbasis und werden vor dem Schuleinsatz pädagogisch erprobt.

## Sichtbares Leitner-Prinzip

Der Boxstand wird Lernenden nicht nur als Zahl angezeigt. Die Oberfläche zeigt fünf aufeinanderfolgende Fächer und markiert sichtbar, in welchem Fach die Karte liegt. Bedeutung und Schreiben erhalten je eine eigene Fächerreihe, weil beide Lernstände unabhängig fortschreiten können. Ergänzend erklärt die Ansicht knapp: Eine richtige Lösung lässt die Karte nach den fachlichen Regeln weiterwandern, ein Fehler setzt den betroffenen Stand auf Box 1 zurück.

Die Darstellung übernimmt das bewährte Fünf-Boxen-Muster aus LernBox. Die LernBox nutzt dieselbe Staffel wie der Lernraum (`LEITNER_INTERVAL_DAYS`: 1 / 3 / 7 / 14 / 30 Tage je Box, keine eigene Tabelle). Auch in der LernBox gilt: **Kein Aufstieg vor der Fälligkeit.** Eine richtige Antwort vor dem Termin ist nur Üben; Box, Abstand und Termin bleiben. Aufsteigen kann eine Karte nur, wenn die Richtung neu (noch nie geübt) oder fällig ist, höchstens bis Box 5. Eine falsche Antwort (oder eine verfehlte zweite Chance) setzt die Richtung auf Box 1 und sofort wieder fällig, eine geschaffte zweite Chance lässt die Box und setzt den Abstand der Box. Beide Richtungen einer Karte laufen unabhängig. Wird eine Karte in Box 1 weniger als 8 Stunden nach dem letzten Abruf richtig beantwortet, etwa direkt nach einem Fehler, schließt das den Fehler ohne Aufstieg; die Karte kommt am nächsten Tag wieder. Neue Karten zählen nicht als fällig, sondern kommen über die Tagesportion oder freies Üben. Fehlerkorrektur und Aufstieg höchstens einmal je Fälligkeit entsprechen damit den strengeren Regeln des Lernraums. Bestehende Kartenstände werden nicht migriert; die neuen Abstände gelten ab der nächsten Antwort.

## Lernarchiv (Box 6) der Lernwörter

Gilt nur für Lernwörter im Wortspeicher (Regeln A-1 bis A-4); die LernBox und die Staffel `LEITNER_INTERVAL_DAYS` (Boxen 1 bis 5) bleiben unverändert. Der Bonus-Abstand ist die eigene Konstante `LEARNING_ARCHIVE_BONUS_DAYS` (30 Tage).

- **A-1 Aufnahme:** Ein Wort kommt ins Lernarchiv, wenn es in der fälligen Wiederholung in Box 5 beim ersten Versuch auf Stufe 6 (freier Abruf) richtig ohne Hilfe und ohne Selbstkorrektur beantwortet wird. Auf Stufe 4 oder 5 bleibt es in Box 5 (Abstand 30 Tage).
- **A-2 Nie regulär fällig:** Archivwörter zählen nicht zu „Trainingswörter heute“ und nicht zu den fälligen Wörtern. Ihr Termin (`dueAt`) ist der früheste Zeitpunkt, ab dem das Wort wieder als Bonus kommen darf: Aufnahme oder letzte Bonusabfrage plus 30 Tage.
- **A-3 Bonus:** In der Tagesportion kommt gelegentlich ein Archivwort dazu, höchstens eines je Portion und jedes Wort höchstens alle 30 Tage. Gewählt wird das am längsten nicht geübte. Der Bonus kommt nur zu einer Portion, die sonst nicht leer ist, und nimmt einen eigenen Platz, ohne eine fällige Aufgabe zu verdrängen. Die Oberfläche kennzeichnet ihn kurz mit „Aus dem Lernarchiv“.
- **A-4 Bonusabfrage:** Richtig beim ersten Versuch ohne Hilfe: Das Wort bleibt in Box 6, der nächste Bonus ist in 30 Tagen möglich. Falsch oder mit Hilfe: zurück in Box 4, am nächsten Tag fällig. Das ist eine bewusste Ausnahme von W-7 (sonst Box 1), weil das Wort lange sicher war. Freies Üben ändert die Box nie (W-1); ein Fehler dort lässt Box 6 stehen, der Bonus darf aber schon morgen kommen.
- **Format (A-5):** Die Box eines Lernworts ist 1 bis 6; ältere Sicherungen und Daten bleiben gültig. Eine ältere App-Version legt ein Wort in Box 6 beim tolerant lesenden Laden in die Quarantäne.

## LernBox: Schonfrist und Rückstufung nach Zeit

Gilt nur für die LernBox (Vokabeln), je Richtung getrennt; Wortspeicher, Mathe und Textbox bleiben unverändert.

- **Schonfrist:** 14 Tage nach der Fälligkeit, gleich für alle Boxen. Ferien werden nicht berücksichtigt.
- **Rückstufung:** Je volle 14 Tage Überfälligkeit eine Box zurück, höchstens bis Box 1. Beispiel Box 4: 13 Tage Überfälligkeit Box 4, 14 Tage Box 3, 28 Tage Box 2, 42 Tage Box 1.
- **Nur geübte Richtungen:** Neue Karten und die nie geübte Rückrichtung (Abstand 0) fallen nicht zurück.
- **Kennzeichnung:** Ab 14 Tagen Überfälligkeit zeigt die LernBox „lange nicht geübt“, in jeder Box, auch in Box 1, und als Zahl in der Boxübersicht. Eine Rückstufung nach Zeit belegt kein Vergessen; deshalb steht dort nie „vergessen“, und eine zeitlich zurückgestufte Karte zählt nicht als Fehler.
- **Kein neues Datenformat:** Die wirksame Box wird beim Lesen aus gespeicherter Box und Fälligkeit berechnet. Anzeigen und Zählungen nach Box (Kartenliste, Boxdiagramm, Übungsrunde einer Box) nutzen sie. Gespeichert wird sie erst mit der nächsten Antwort: Richtig führt von der wirksamen Box eine Box höher, falsch auf Box 1. Sicherung, Abgleich und Replay arbeiten weiter mit der gespeicherten Box.
