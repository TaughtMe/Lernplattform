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

## Im Design gezeigt, fachlich noch nicht vorhanden

- **„Meine Fehler üben“ im Panel mit Zähler** (Design 4c): Eine stapelübergreifende
  Fehlerrunde gibt es noch nicht. Grundlage wären Lernereignisse mit
  `assessment.knowledge = "incorrect"` der letzten Runden. Bis dahin führt der
  Weg über den Stapel „Fehler aus Laufdiktat“.
- **Mündlich mit Spracheingabe**: Das Design nennt den Modus „Mündlich“.
  Umgesetzt ist „Karteikarten“ (aufdecken und selbst bewerten), ohne
  Spracherkennung.
- **Sortieren und Umbenennen von Stapeln, Tags filtern** (Vault Kap. 05):
  offen.

## Offene fachliche Punkte

- Stapelübergreifende Tagesauswahl in Fachblöcken (Vault Nr. 40).
- Dublettenprüfung über Sprachpaar, Grundform und Bedeutung (Vault Nr. 40).
