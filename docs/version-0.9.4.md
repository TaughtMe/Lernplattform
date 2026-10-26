# Version 0.9.4

Stand: 26.10.2026. Grundlage ist Version 0.9.3 (`6f1ab5c`) auf
`claude/lernraum-ui-v2`. Umgesetzt ist Welle 2 aus dem Gesamtaudit (Regeln in
[Umsetzungsplan Welle 2](umsetzungsplan-audit-welle-2.md)).

## Änderungen

- LernBox: Der Abrufzeitpunkt wird je Richtung geführt (`forwardLastReviewed`,
  `reverseLastReviewed`, optional). Die 8-Stunden-Regel liest nur die eigene
  Richtung. Die Platzierung aus dem Live-Raum setzt den Abrufzeitpunkt, sodass
  ein Wort mit Fehlern im Unterricht nicht sofort aufsteigt (G-005, G-011).
- LernBox: Die Selbsteinschätzung („Gewusst“) hebt höchstens bis Box 3. Je Karte
  und Richtung zählt in einer Runde nur der erste Versuch (D-010).
- Antwortprüfung: Typografische Apostrophe, Anführungszeichen, Bindestriche und
  zerlegte Umlaute gelten als gleich (LernBox, Laufdiktat allein und live,
  Wortspeicher-Vergleich). Alternativen mit „/“ und Klammern („(to) go“) werden
  erkannt. Ein Komma trennt nur nach Bestätigung in der Importvorschau (G-002,
  G-003).
- Übernahme ins Wortspeicher: Satzanfänge werden kleingeschrieben, außer bei
  bekannten Nomen. Ein reiner Großschreibfehler am Satzanfang wird nicht
  übernommen (G-012).
- Textbox: Ergebnis, Fehlerwörter und Lernereignis folgen dem ersten Versuch.
  Wiederholungen werden als Übung gespeichert (optionales Feld `retries`).
- Kopfrechnen: Nach dem ersten Fehler erscheint ein Strategie-Tipp, nach dem
  zweiten Fehler oder auf Wunsch ein Lösungsweg (D-008).
- Wortspeicher: Das Lernarchiv (Box 6) nimmt ein Wort nach einer richtigen
  fälligen Wiederholung in Box 5 auf Stufe 6 ohne Hilfe auf. Höchstens ein
  Archivwort je Tagesportion, jedes höchstens alle 30 Tage. Falsch → Box 4.
- Gastmodus für geteilte Geräte (Freigabe `vorschau`): signierter Gast-QR der
  Lehrkraft, 90 Minuten gültig. Bestätigung auf Geräten mit Lernstand.
  „Gastmodus beenden“ löscht alle Schülerdaten, nie die Lehrerdatenbank. Der
  Lehrerbereich ist im Gastmodus gesperrt. Bereinigung nach 12 Stunden beim
  nächsten Start (B-009, B-010). Grenze siehe
  [Sicherheitsrisikoregister](security-risk-register.md) (SR-004).
- Schonfrist: In Box 1 erfolgt keine Rückstufung, aber eine Kennzeichnung „lange
  nicht geübt“ (C7, geklärt).

## Formatänderungen

- Neue optionale Felder: Abrufzeitpunkte je Richtung bei LernBox-Karten
  (`forwardLastReviewed`, `reverseLastReviewed`) und `retries` bei Textbox-Übungen.
- Lernwörter kennen Box 6 (Lernarchiv). Der Tagesplan kennt die Art `archive`.
- Ältere App-Versionen lesen tolerant: Unbekannte Felder werden verworfen,
  Box-6-Wörter kommen in Quarantäne, und Archiv-Planeinträge führen zur
  Neuerzeugung des Tagesplans. Nichts wird gelöscht. Ein Rollback auf 0.9.3 ist
  daher möglich, aber Archivwörter sind dort nicht sichtbar.

## Offen

- Das Lehrer-Vokabelheft hat noch keine Vorschau „Gilt auch“.
- Die LernBox-Vorschau zeigt Alternativen nur für die Rückseite.
- Ein halb gemachter Textbox-Übungsversuch geht beim Neuladen verloren.
- Die Lernwort-ID mit Groß-/Kleinschreibung (G-012, zweiter Teil) ist offen.
- Die Fehlerart im Kopfrechnen ist erkannt, aber noch ohne Lehreransicht.
- Beobachtungsfragen zur Schonfrist laufen in der Beta (siehe
  [Umsetzungsplan Schonfrist](umsetzungsplan-lernbox-schonfrist.md)).

Für die produktive Freigabe gelten die Voraussetzungen aus
[Version 0.9.2](version-0.9.2.md) unverändert.
