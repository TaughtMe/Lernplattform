# Umsetzungsplan: Inhalte zuerst (K8)

Stand: 25.11.2026 · Quelle: Audit C-010 (`docs/audits/2026-10-19-gesamtaudit/befundkatalog.md`),
Roadmap Etappe 1 „Schnell erstellen“ (`obsidian-export/Lernplattform/25 - Vision/Roadmap.md`),
Statustafel `docs/umsetzungsplan-vision-etappe-1.md`.

## 1. Ziel

Die Lehrkraft legt einen Inhalt einmal an (Liste einfügen) und wählt danach, wofür sie ihn nutzt:
Laufdiktat, Battle, Übung live oder als Stapel für die LernBox der Kinder. Heute beginnt jeder
Inhalt als „Neues Laufdiktat“.

## 2. Befund am Code (25.11.2026)

Vieles ist schon da. Es fehlt vor allem ein Weg, der beim Inhalt beginnt.

| Teil                                             | Stand                                                                                                                               | Beleg                                                                                  |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Ein Inhaltsmodell                                | **vorhanden.** `TeacherContentPackage` mit Art `vocabulary`, `text`, `math`, `wordlist`, Klassen, Vorbereitung (`prepared`), Archiv | `src/domain/teacher-content-library.ts`                                                |
| Eine Ablage                                      | **vorhanden.** Live-Raum und „Freigabe an Schüler“ lesen und schreiben dieselbe Tabelle `contentPackages`                           | `src/storage/teacher-class-settings.ts`, `app/components/teacher-content-transfer.tsx` |
| Battle, Übung, Stationen aus einem Inhalt        | **vorhanden.** Der Modus ist eine Option der Vorbereitung                                                                           | `teacherPreparedSettingsSchema.gameMode`                                               |
| LernBox-Stapel für Kinder                        | **vorhanden**, aber nur über die eigene Seite `/lehrer/material` mit eigenem Editor                                                 | `teacher-content-transfer.tsx`                                                         |
| Demo-Werte als echte Eingaben (C-010, Nr. 3)     | **behoben**                                                                                                                         | kein `DEFAULT_VOCABULARY` mehr                                                         |
| Assistent „Schritt 1 von 4 · Laufdiktat“ (C-010) | **behoben**                                                                                                                         | Text nicht mehr im Code                                                                |
| Namensliste einfügen (C-010, Nr. 1)              | **umgesetzt** (L25-11, Teil 1)                                                                                                      | `src/domain/class-name-list.ts`                                                        |
| Einstieg                                         | **fehlt.** Startseite heißt „Neues Laufdiktat“, die drei Kacheln führen in den Live-Raum                                            | `app/views/lehrer/start-screen.tsx`, Z. 175                                            |
| Verwendung nach dem Anlegen wählen               | **fehlt.** Eine Zeile der Ablage kann starten, vorbereiten, bearbeiten, löschen; „An die Kinder geben“ fehlt                        | `start-screen.tsx`, Zeilenaktionen                                                     |
| Lernwortlisten in der Ablage                     | **fehlen** auf der Startseite (bewusst ausgefiltert)                                                                                | `app/lehrer/use-teacher-start.ts`, Z. 114                                              |
| Zwei Editoren für Vokabeln                       | **offen.** Live-Inhaltsschritt und Freigabe-Seite bearbeiten dasselbe Paket mit verschiedenen Formularen                            | wie oben                                                                               |
| Technikjargon (C-010, Nr. 4)                     | **offen.** „… URL und Publishable Key verbinden wir anschließend.“                                                                  | `app/lehrer/live/hooks/use-live-room-session.ts`, Z. 338                               |

## 3. Schritte

Jeder Schritt ist für sich testbar und lässt sich im Unterricht ausprobieren.

| Nr.  | Schritt                                                                                                                                                                  | Design nötig                      | Entscheidung nötig |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- | ------------------ |
| K8-1 | Technikjargon ersetzen: Meldung ohne „URL und Publishable Key“                                                                                                           | nein                              | nein               |
| K8-2 | Zeilenaktion „An die Kinder geben“ für Vokabeln: öffnet `/lehrer/material` mit diesem Paket                                                                              | klein (eine Aktion mehr je Zeile) | nein               |
| K8-3 | Lernwortlisten in der Ablage zeigen, mit „An die Kinder geben“ statt „Starten“                                                                                           | klein                             | nein               |
| K8-4 | Startseite „Neuer Inhalt“ statt „Neues Laufdiktat“; Kacheln Text, Vokabeln, Mathe, Lernwörter; der Inhaltsschritt endet mit „Speichern“, die Verwendung wählt man danach | **ja** (Vorlage 15a, 15c, 15d)    | **ja**, E-K8-1     |
| K8-5 | Ein Editor für Vokabeln: Die Freigabe-Seite nutzt den Inhaltsschritt des Live-Raums oder umgekehrt                                                                       | mittel                            | **ja**, E-K8-2     |

Reihenfolge: K8-1 bis K8-3 sofort, K8-4 nach Entscheidung und Designvorlage, K8-5 danach.

## 4. Entscheidungen für den Entwickler

| Nr.    | Frage                                                                                                                                     | Vorschlag                                                                                                                                     |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| E-K8-1 | Heißt die Startseite „Neuer Inhalt“ und endet das Anlegen mit „Speichern“ statt mit „Raum öffnen“?                                        | Ja. „Starten“ bleibt in der Zeile der Ablage und im Schnellstart, so bleibt ein Laufdiktat zwei Tipps entfernt.                               |
| E-K8-2 | Welcher Editor bleibt für Vokabeln?                                                                                                       | Der Inhaltsschritt des Live-Raums (Sprachen, Richtung, Übernahme in die LernBox). Die Freigabe-Seite zeigt dann nur Auswahl, QR und Laufzeit. |
| E-K8-4 | Wo stehen Lernwortlisten in der Ablage: eigener Reiter „Für die Kinder“, oder in „Vorbereitet“ mit „An die Kinder geben“ statt „Starten“? | Eigener Reiter „Für die Kinder“ für alles, was als QR an die Geräte geht (Vokabelpakete und Lernwortlisten). Das ist auch der Ort für K8-4.   |
| E-K8-3 | Gehören „Aufgaben“ (`/lehrer/aufgaben`) als dritte Verwendung dazu („Als Aufgabe stellen“)?                                               | Erst mit L25-5 (Etappe 2).                                                                                                                    |

Entschieden am 25.11.2026 (Entscheidung 87): E-K8-1 nein, E-K8-2 ja, E-K8-3 ja (mit L25-5), E-K8-4 ja.

## 5. Nicht Teil dieses Plans

- Geführte Ersteinrichtung „Klasse in 5 Minuten“ (C-010, Nr. 5).
- Schuljahresübernahme (L25-11, Teil 2).
- Ein Inhalt für mehrere Fächer gleichzeitig.

## 6. Tests

- Unit: Zeilenaktionen je Art, Verweis auf `/lehrer/material` mit Paketkennung, Freigabe-Seite wählt das Paket vor.
- Browser: Vokabelpaket anlegen, in der Ablage „An die Kinder geben“, QR erscheint; Lernwortliste erscheint in der Ablage.
- Design: K8-2 und K8-3 ändern Zeilen der Ablage; `design-quality` vergleicht mit der Vorlage. K8-4 braucht eine neue Vorlage.

## 7. Stand

| Schritt | Stand     | Wie / Commit                                                                                                                                                                                                                                   |
| ------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| K8-1    | umgesetzt | Meldung ohne URL und Publishable Key, auch beim Beitritt der Kinder (`6b4304e`)                                                                                                                                                                |
| K8-2    | umgesetzt | Zeilenaktion „An die Kinder geben“ für Vokabelpakete (Desktop und Tablet), Freigabe wählt `?paket=` vor; Demo-Daten der Designvorlage unverändert                                                                                              |
| K8-3    | umgesetzt | Reiter „Für die Kinder“: Vokabelpakete und Lernwortlisten der Klasse, neueste zuerst, mit „An die Kinder geben“; Lernwortlisten öffnen beim Bearbeiten die Freigabe; ohne Daten fehlt der Reiter nicht, nur in der Designvorlage (kein `kids`) |
| K8-4    | entfällt  | E 87: Startseite bleibt „Neues Laufdiktat“                                                                                                                                                                                                     |
| K8-5    | in Arbeit | E 87: Editor des Live-Raums bleibt, Freigabe zeigt Auswahl, QR und Laufzeit                                                                                                                                                                    |
