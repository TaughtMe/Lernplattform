# Version 0.9.5

Stand: 27.10.2026. Grundlage ist Version 0.9.4 (`9f23917`) auf
`claude/lernraum-ui-v2`. Umgesetzt sind die Entscheidungen des Entwicklers vom
27.10.2026 zu Welle 2 (Regeln in
[Umsetzungsplan Welle 2](umsetzungsplan-audit-welle-2.md)).

## Änderungen

- Lernarchiv: Ein falsch oder mit Hilfe beantwortetes Archivwort geht wie jede
  fällige Wiederholung auf Box 1 zurück (bisher Box 4).
- Antwortalternativen: Die Lehrkraft sieht „Gilt auch: …“ im Vokabelheft und in
  der Vokabelauswahl. Die LernBox-Importvorschau zeigt Alternativen jetzt auch für
  die Vorderseite.
- Wortspeicher: Nomen mit Artikel (G-012, zweiter Teil). Bei der Übernahme aus dem
  Laufdiktat steht „der/die/das“ direkt vor einem Nomen („das Essen“), nach einem
  Komma nicht (meist Relativpronomen). „das Essen“ und „essen“ haben getrennte
  Lernstände. Eigene Wortboxen zeigen bei einem bekannten Nomen ohne Artikel einen
  Tipp. Bestehende Lernstände bleiben unverändert.
- Textbox: Jeder Versuch eines Durchgangs ist gewertet. Der letzte bestimmt Ergebnis
  und Fehlerwörter. Der Verlauf zeigt je Durchgang alle Versuche mit Prozentwert
  und Zeitpunkt („25 % → 27 % → 100 %“) und markiert Sprünge ab 50 Prozentpunkten
  als „großer Sprung“. Gespeichert werden höchstens 100 Versuche je Durchgang; nur
  der jüngste behält die Wortliste. Das ersetzt die Regel „erster Versuch zählt“
  aus 0.9.4.
- Kopfrechnen: Bei unbekannter Fehlerart erscheint kein Tipp mehr, nur „Noch nicht.“.
- Live-Raum: Der CSV-Export der Lehrkraft enthält je Kind und Mathe-Aufgabe einen
  Abschnitt mit der Spalte „Fehlerart (Vermutung)“. Dafür überträgt das Kindgerät
  bei Mathe die erste falsche Antwort je Aufgabe (höchstens 32 Zeichen). In der
  Oberfläche erscheint die Fehlerart nicht. Die Datenschutzerklärung ist ergänzt.

## Formatänderungen

- Supabase: Die Migration `20261027120000_math_first_wrong_answers` legt die Spalte
  `room_students.first_wrong_answers` an und ergänzt `upsert_progress_secure` um ein
  optionales letztes Argument. Aufrufe der Version 0.9.4 funktionieren weiter. Die
  Migration muss vor dem neuen Client eingespielt sein (siehe
  [Live-Sicherheit: Bereitstellung](live-sicherheit-bereitstellung.md)).
- Textbox: Optionales Feld `at` am Durchgang und an jedem Versuch in `retries`.
  Ältere Versionen ignorieren es (tolerantes Lesen).

## Offen

- Die Fehlerart wird nur für Aufgaben ermittelt, deren Aufbau erkennbar ist. Bei
  komplexen Termen bleibt die Zelle oft leer.
- „Essen“ und „essen“ ohne Artikel teilen sich weiterhin einen Lernstand. Nur der
  Tipp weist darauf hin.
- Beobachtungsfragen zur Schonfrist laufen in der Beta (siehe
  [Umsetzungsplan Schonfrist](umsetzungsplan-lernbox-schonfrist.md)).

Für die produktive Freigabe gelten die Voraussetzungen aus
[Version 0.9.2](version-0.9.2.md) unverändert.
