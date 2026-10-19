# Lernlogik und Leitner-Boxen

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
