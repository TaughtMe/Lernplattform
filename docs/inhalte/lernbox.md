# LernBox

Oberfläche: `app/components/learning-box-app.tsx` (Design 4a–4c).

## Fachlich vorhanden und im Design übernommen

- Stapel mit Vorder-/Rückseitensprache, Quelle (eigener Stapel, Lehrkraft,
  Laufdiktat) und Boxverteilung 1–5 (`src/domain/learning-box.ts`).
- Getrennte Leitner-Stände je Richtung (Vorderseite → Rückseite und umgekehrt)
  mit eigener Fälligkeit; Aufdecken (Karteikarten) und Schreiben mit
  unterschiedlicher Nachweisstärke.
- Jede Bewertung erzeugt ein unveränderliches Lernereignis
  (`src/storage/personal-learning-events.ts`, `putCardAndEvent`).
- Dublettenfreie Übernahme aus dem Laufdiktat (`ingestBundle`), Fehler werden
  sofort fällig; „Meine Fehler jetzt üben“ öffnet den Stapel direkt
  (`/lernbox?stapel=<id>`).
- Sicherung speichern und laden (JSON).
- **Lernformen „Zuordnen“ und „Test“** für einen Stapel (ab 4 Karten), nur im
  Start-Fenster eines Stapels, nicht für „Heute dran“, „Meine Fehler“ oder
  „Box üben“. Bereich `lernbox-lernformen` im Freigaberegister, Stufe
  `frei` seit 15.11.2026 (`src/domain/release.ts`). Kern in
  `src/domain/learning-box-forms.ts`, Anbindung in
  `app/components/learning-box-forms.ts`, Ansichten `parts/match.tsx` und
  `parts/test.tsx`. Wirkung auf Box und Fälligkeit (Regeln LF-1 bis LF-8):
  - Zuordnen ändert nichts: keine Box, keine Fälligkeit, kein Lernereignis, keine
    Uhr, keine Punkte.
  - Test: Auswahlfragen ändern nichts. Eine Schreibfrage zu einer in der
    gefragten Richtung fälligen Karte wirkt wie der Schreibmodus (richtig: eine
    Box höher, falsch: Box 1, Lernereignis mit `mode: "writing"`); zu einer nicht
    fälligen Karte ändert sie nichts. Jede Karte kommt einmal vor, nur der erste
    Versuch zählt.
  - „Diese Karten jetzt üben“ nach dem Test: Übungsrunde im Schreibmodus, nichts
    wird verschoben oder gespeichert.
  - Kein neues Ereignisformat, kein „Weitermachen“ für beide Lernformen.
    Plan und offene Vorschläge V-1 bis V-9:
    `docs/umsetzungsplan-lernbox-lernformen.md`.

- **„Meine Fehler üben“ mit Zähler** (Design 4c): stapelübergreifend über alle
  Karten, die nach einem Abruf in Box 1 liegen (`isMistake` in
  `app/components/learning-box-app.tsx`, Bereich `errors`). Freies Üben, zählt
  nicht zur Tagesportion. (Stand vom 24.11.2026 nachgetragen; die Vision
  bemerkte den veralteten Eintrag, Bericht 23, Abschnitt 2.)

## Im Design gezeigt, fachlich noch nicht vorhanden

- **Mündlich mit Spracheingabe**: Das Design nennt den Modus „Mündlich“.
  Umgesetzt ist „Karteikarten“ (aufdecken und selbst bewerten), ohne
  Spracherkennung.
- **Sortieren und Umbenennen von Stapeln, Tags filtern** (Vault Kap. 05):
  offen.

## Offene fachliche Punkte

- Stapelübergreifende Tagesauswahl in Fachblöcken (Vault Nr. 40).
- Dublettenprüfung über Sprachpaar, Grundform und Bedeutung (Vault Nr. 40).
