# Umsetzungsplan: Schnell erstellen und sofort live

Stand: 15.11.2026. Grundlage: Vision, Etappe 1 „Schnell erstellen“
(`obsidian-export/Lernplattform/25 - Vision/Roadmap.md`), Audit K8 und C-010
(`docs/audits/2026-10-19-lernraum-gesamtaudit.md`), Bericht 24 (M24-6) und
Bericht 25 (L25-10).

Dieser Plan ist ein Bauplan für eine Person ohne Vorwissen. Geprüft am Code
des Standes `b79f61e`. Festlegungen mit dem Vermerk **Vorschlag** soll der
Entwickler bestätigen (Abschnitt 13).

## 1. Ziel und Abgrenzung

Die Lehrkraft kommt von der Startseite des Lehrerbereichs (`/lehrer`) mit
wenigen Tipps in eine Lobby mit Code und QR. Drei Bausteine:

- **A. Liste einfügen:** Die Lehrkraft fügt einmal eine Wort- oder
  Vokabelliste ein. Sie liegt danach als **ein** Eintrag in der Ablage. Von
  dort gehen drei Wege ab: Laufdiktat, Battle, an die Kinder geben (Vokabeln
  als LernBox-Stapel, Wörter als Wortbox).
- **B. Aus einer Wortbox:** Eine mitgelieferte Wortbox oder eine eigene
  Lernwortliste wird in zwei Tipps zur Live-Runde (Wortbox wählen, Spielform
  wählen).
- **C. Kopfrechnen live:** ein Knopf, Jahrgang wählen, Code an die Tafel.

Befund am Code: Die Ablage kennt heute schon alle Inhaltsarten
(`src/domain/teacher-content-library.ts`, Entscheidung 51), und „Starten“ auf
der Startseite führt über eine Start-Absicht direkt in die Lobby
(`app/lehrer/live-intent.ts`, `use-launch-request.ts`). **Neu anlegen** geht
aber nur über die drei Kacheln „Text“, „Vokabeln“, „Kopfrechnen“, die in den
vierstufigen Assistenten führen (`/lehrer/live?neu=…`). Die Freigabe an
Schüler (`/lehrer/material`) hat einen eigenen Editor. Dieser Plan baut
deshalb **keine neue Leitung**, sondern drei kurze Einstiege, die einen
Ablage-Eintrag erzeugen und die vorhandene Start-Absicht nutzen.

Nicht Teil dieses Plans:

- Änderungen an Supabase (keine Migration, keine neue RPC), an Raumcode,
  Tokens oder Fristen.
- Namensliste einfügen (L25-11) und Klassenverwaltung.
- Neue Live-Formate (M24-7, M24-8), Klassenziel an der Tafel (M24-1).
- Neue Rechenarten für die Mittelschule (MA-11). Die Jahrgangsvorgaben nutzen
  den heutigen Generator (Abschnitt 3.4).
- Mitgelieferte Englisch-Vokabeln (R23-2, Etappe 2).
- Ein Umbau des Assistenten oder der Freigabe-Seite. Beide bleiben.

## 2. Prüfung des Entscheidungsprotokolls

Geprüft am 15.11.2026: `Anwendung.md` (Entscheidungen 1 bis 76) und
`Entscheidungsindex.md`, gesucht nach Live-Raum, Raumcode, Token, QR, Link,
Wortauftrag, Ablage, Wortbox, Kopfrechnen, Battle, Demo, Lehrerbereich.

| Entscheidung                               | Inhalt                                                                                                                         | Folge für diesen Plan                                                                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 2, 9, 34 (Local-first, Live als Ausnahme)  | Keine Lerndaten auf dem Server. Der Live-Raum ist die begrenzte, flüchtige Ausnahme.                                           | Die Schnellwege erzeugen nur, was der Raum heute schon bekommt: Aufgaben und Lösungen der Runde. Nichts Neues geht an den Server.             |
| 35, 36, 37 (Tokens, sichere Freigabe)      | Lehrkraft- und Teilnehmertoken getrennt. Der Lehrkraftzugang steht nie in QR, Adresse oder dauerhaftem Speicher.               | Die Start-Absicht trägt weiter nur Kennungen (SL-2). Kein Schnellweg legt ein Token an oder liest eines.                                      |
| 42 (24-Stunden-Übergaberaum)               | Inhalte an Schüler gehen verschlüsselt und für höchstens 24 Stunden über den Übergaberaum.                                     | „An die Kinder geben“ nutzt genau diese Freigabe, unverändert.                                                                                |
| 43, G4 (Lehrerbereich ohne Login)          | Das entsperrte Gerät ist die Schutzgrenze.                                                                                     | Kein Schnellweg verlangt ein Konto, ein Profil oder eine Klasse („spontan ohne Login“, SL-4).                                                 |
| 49, 55 (Übernahme nach der Runde)          | Vokabeln wandern nach der Runde in die LernBox, Wörter eines Text-Laufdiktats in den Wortspeicher; nur auf dem Schülergerät.   | Der schnellste Weg zum LernBox-Stapel ist die Runde selbst. Die Schnellwege lassen die Voreinstellungen dafür stehen (SL-9).                  |
| 51 (Ablage aller Inhaltsarten)             | Ein Eintrag kann mehreren Klassen gehören; Startseite mit „Vorbereitet“ und „Archiv“.                                          | Jede Liste wird ein normaler Ablage-Eintrag. Kein zweiter Speicher.                                                                           |
| 52 (Raumcode 90 Minuten, Raum 120 Minuten) | Fristen des Raums.                                                                                                             | Unverändert.                                                                                                                                  |
| 60, 63 (keine eigenen Wörter im Link)      | **Nicht wieder einbauen:** eigene Wörter der Lehrkraft im Link oder im QR-Code. Kennungen mitgelieferter Übungen sind erlaubt. | Kein Schnellweg legt Wörter in eine Adresse, einen QR-Code oder `sessionStorage` (SL-2, SL-3). Lernwortlisten gehen weiter über die Freigabe. |
| 30 (kleine Runden aus großen Wortbanken)   | Standard 10 Wörter; 5, 20 oder alle wählbar.                                                                                   | Baustein B zieht 10 Wörter, wählbar 5, 10 oder 20 (WB-2).                                                                                     |
| 38, 69 (Kopfrechnen als gemeinsamer Kern)  | Ein Generator für freies Üben und Live-Raum; Grundrechnen bis Klasse 9.                                                        | Baustein C ruft denselben Generator (`generateMentalMathSource`). Keine zweite Aufgabenquelle.                                                |
| 66 (Battle ohne Störangriffe)              | Tinte und Flimmern sind aus, bis die Lehrkraft sie einschaltet.                                                                | Schnellwege starten Battle immer mit `battleInk: false`, `battleFlicker: false` (SL-8).                                                       |
| 65 (Fehler an der Tafel erst ab sechs)     | Fehlerzahlen in der Projektion erst ab sechs Kindern.                                                                          | Unberührt; die Live-Ansicht bleibt, wie sie ist.                                                                                              |
| 47, 59 (Freigaberegister)                  | Neues kommt zuerst als Vorschau.                                                                                               | Neuer Bereich `lehrer-schnellstart`, Stufe `vorschau` (Abschnitt 7).                                                                          |
| Audit C-010                                | Demo-Werte als echte Eingaben, Technikjargon, viele Einzelschritte.                                                            | Kein Feld ist mit Beispielinhalt vorbelegt (nur `placeholder`). Meldungen ohne Technikwörter.                                                 |

Ergebnis: **Kein Widerspruch.** Nichts wird zurückgenommen; eine
Entscheidungsvorlage ist nicht nötig. Die Rücknahme aus Entscheidung 60 ist
ausdrücklich beachtet (Abschnitt 11).

## 3. Regeltabellen

### 3.1 Sicherheit und Datensparsamkeit (gilt für A, B und C)

Gelesen dazu: `docs/live-sicherheit-bereitstellung.md`,
`docs/security-risk-register.md`, `app/lehrer/live-intent.ts`,
`app/lehrer/live/hooks/use-launch-request.ts`,
`src/integrations/laufdiktat/teacher-session.ts`.

| Nr.   | Regel                                                                                                                                                                                                                                          | Begründung                                                                                         |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| SL-1  | **Kein neuer Weg zum Server.** Jeder Schnellweg endet in `writeLiveIntent` und `router.push("/lehrer/live")`. Den Raum öffnet allein der bestehende Ablauf (`openLobby`), Aufgaben und Lösungen gehen wie bisher über `update_session_secure`. | Die geprüfte Token-Grenze bleibt die einzige (Entscheidungen 35 bis 37).                           |
| SL-2  | **Die Start-Absicht trägt nur Kennungen:** `contentId`, `mode`, `classId`. Das Schema bleibt `.strict()`. Keine Wörter, keine Aufgaben, keine Tokens in `sessionStorage`, Adresse oder QR.                                                     | Entscheidung 60 („Nicht wieder einbauen“), Kommentar in `live-intent.ts`.                          |
| SL-3  | **Inhalte liegen nur in der lokalen Ablage** der Lehrkraft (`createTeacherContentLibraryRepository`) und, während der Runde, im Raum.                                                                                                          | Local-first.                                                                                       |
| SL-4  | **Ohne Klasse und ohne Profil nutzbar.** Ist auf der Startseite keine Klasse gewählt, startet der Raum ohne Klasse (`classId: ""`).                                                                                                            | „Spontan ohne Login“; Vertretungsstunde.                                                           |
| SL-5  | **Ein offener Raum hat Vorrang.** Läuft schon ein Raum (`useRunningRoom`), sind die Schnellknöpfe gesperrt und verweisen auf „Zum offenen Raum“.                                                                                               | `use-launch-request.ts` überschreibt nie einen offenen Raum; die Sperre erspart die Fehlermeldung. |
| SL-6  | **Ohne Raumdienst kein vorgetäuschter Start.** Fehlt die Live-Konfiguration, zeigt der Raum wie heute ehrlich, dass keine Lobby geöffnet werden kann. Die Liste ist dann trotzdem gespeichert.                                                 | Entscheidung 36.                                                                                   |
| SL-7  | **Der Zufall läuft in der Anbindung**, nicht in der Ansicht und nicht in der Domain (Zufall als Parameter).                                                                                                                                    | Ansichten in `app/views/` sind rein.                                                               |
| SL-8  | **Battle aus einem Schnellweg** startet mit `battleInk: false`, `battleFlicker: false`, `showTempoPoints: false`.                                                                                                                              | Entscheidung 66; Vault 23.                                                                         |
| SL-9  | **Übernahme auf die Schülergeräte bleibt bei den Standardwerten** des Raums: Vokabeln „Fehler“, Text „Falsch geschriebene Wörter“. Der Schnellweg setzt diese Felder nicht.                                                                    | Entscheidungen 49 und 55. Kein Schnellweg ändert, was auf Kindergeräten gespeichert wird.          |
| SL-10 | **Nichts wird still überschrieben, was die Lehrkraft selbst angelegt hat.** Feste Kennungen (`schnell-…`) gibt es nur für erzeugte Einträge aus B und C (Abschnitt 4).                                                                         | Die Ablage ist Arbeitsmaterial der Lehrkraft.                                                      |

### 3.2 Baustein A: Liste einfügen

| Nr.  | Regel                                                                                                                                                                                                                                                                                                                                 |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LE-1 | **Erkennung:** Hat mindestens die Hälfte der nicht leeren Zeilen einen Spaltentrenner (Tabulator oder Semikolon, wie `parseVocabularyImport`), ist die Liste eine **Vokabelliste**. Sonst ist sie eine **Wortliste** (ein Eintrag je Zeile). Die Lehrkraft kann die Art umschalten; die Vorschau folgt sofort.                        |
| LE-2 | **Vokabelliste:** gelesen mit `parseVocabularyImport` (`src/domain/vocabulary-import.ts`). Übersprungene Zeilen werden mit Zeilennummer genannt. Gespeichert als Ablage-Eintrag `kind: "vocabulary"` im selben Tabellenformat, das der Assistent schreibt (prüfen in `app/lehrer/live/hooks/use-vocabulary-content.ts`).              |
| LE-3 | **Wortliste:** je Zeile ein Wort oder eine Wortgruppe; Leerraum am Rand entfällt, leere Zeilen und Doppelte (Vergleich ohne Groß- und Kleinschreibung) entfallen. Steht alles in **einer** Zeile mit Kommas, wird an den Kommas geteilt. Gespeichert als `kind: "text"`, `textSplit: "zeile"`, `lineMode: "each"`, ein Wort je Zeile. |
| LE-4 | **Grenzen:** mindestens 2 Einträge, höchstens 200 (`WORD_LIST_MAX_WORDS`), je Eintrag höchstens 120 Zeichen. Darüber: Meldung „Die Liste ist zu lang. Bitte kürze sie auf 200 Einträge.“ Es wird nichts stillschweigend abgeschnitten.                                                                                                |
| LE-5 | **Titel:** Vorschlag aus `suggestTitle(source)`, frei änderbar. Ein leerer Titel wird beim Speichern zum Vorschlag.                                                                                                                                                                                                                   |
| LE-6 | **Sprachen** (nur Vokabeln): Vorgabe wie im Assistenten (`DEFAULT_VOCABULARY_LOCALES`), über die vorhandene Sprachwahl änderbar.                                                                                                                                                                                                      |
| LE-7 | **Ein Eintrag, viele Wege:** „Speichern“ legt **einen** Ablage-Eintrag an (neue zufällige Kennung, Klasse der Startseite). Danach bietet das Blatt die Wege aus 3.3 an. Jeder Weg arbeitet mit dieser Kennung.                                                                                                                        |
| LE-8 | **Bearbeiten** bleibt beim Assistenten („Bearbeiten“ auf der Startseite). Das Blatt ist nur zum Anlegen da.                                                                                                                                                                                                                           |

### 3.3 Die drei Wege

| Weg                     | Vokabelliste (`kind: "vocabulary"`)                                                                                                                                     | Wortliste (`kind: "text"`, ein Wort je Zeile)                                                                                                                                                |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Laufdiktat**          | Start-Absicht mit `mode: "LAUFDIKTAT"`; der Raum öffnet die Lobby.                                                                                                      | wie links.                                                                                                                                                                                   |
| **Battle**              | Start-Absicht mit `mode: "BATTLE"` (SL-8).                                                                                                                              | wie links.                                                                                                                                                                                   |
| **An die Kinder geben** | `/lehrer/material?inhalt=<Kennung>`: Die Freigabe öffnet dieses Vokabelpaket. „Freigeben“ erzeugt Code und QR (24 Stunden). Ergebnis beim Kind: ein **LernBox-Stapel**. | `/lehrer/material?art=wordlist&ausText=<Kennung>`: Die Freigabe legt aus den Zeilen eine Lernwortliste an (Regel LE-9) und öffnet sie. Ergebnis beim Kind: eine **Wortbox** im Wortspeicher. |

| Nr.   | Regel                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LE-9  | **Wortliste an die Kinder:** Die Ablage trennt Raum-Inhalte von Lernwortlisten (`kind: "wordlist"` „ist kein Raum-Inhalt“, `isRoomContent`). Diese Trennung bleibt. Aus dem Text-Eintrag entsteht eine abgeleitete Lernwortliste mit der festen Kennung `wortliste-<Kennung des Text-Eintrags>`, gleichem Titel und denselben Wörtern. Ein erneuter Aufruf **aktualisiert** sie aus dem Text-Eintrag, statt eine zweite anzulegen. |
| LE-10 | **Ein Wort ohne Bedeutung ist keine LernBox-Karte.** Deshalb führt der dritte Weg einer Wortliste in den Wortspeicher, nicht in die LernBox. Das Blatt sagt das im Knopftext („Als Wortbox an die Kinder“ bzw. „Als LernBox-Stapel an die Kinder“).                                                                                                                                                                                |
| LE-11 | **Die Adressparameter `inhalt`, `art` und `ausText` tragen nur Kennungen** und werden nach dem Lesen aus der Adresse entfernt (`router.replace`), wie im Live-Raum.                                                                                                                                                                                                                                                                |
| LE-12 | **Hinweis im Blatt:** „Nach einer Live-Runde landen die Fehler der Kinder von selbst in ihrer LernBox bzw. ihrem Wortspeicher.“                                                                                                                                                                                                                                                                                                    |

### 3.4 Baustein B: Aus einer Wortbox

| Nr.  | Regel                                                                                                                                                                                                                                                                                   |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WB-1 | **Quellen:** die mitgelieferten Wortboxen (`LEARNING_WORD_COLLECTIONS` in `src/domain/german-learning-content.ts`, heute acht) und die eigenen Lernwortlisten der Ablage (`kind: "wordlist"`).                                                                                          |
| WB-2 | **Anzahl:** 10 zufällige Wörter ohne Wiederholung; umschaltbar auf 5 oder 20. Hat die Quelle weniger, kommen alle.                                                                                                                                                                      |
| WB-3 | **Tipp 1** wählt die Quelle, **Tipp 2** die Spielform: „Laufdiktat“, „Freies Üben“ oder „Battle“. Danach öffnet sich die Lobby.                                                                                                                                                         |
| WB-4 | **Ablage:** Der Schnellweg schreibt einen Text-Eintrag (`kind: "text"`, `textSplit: "zeile"`, `lineMode: "each"`) mit fester Kennung `schnell-wortbox-<Kennung der Quelle>` und dem Titel „<Name der Wortbox> · 10 Wörter“. Jeder Start ersetzt die Wörter dieses Eintrags durch neue.  |
| WB-5 | **Gespeicherte Vorbereitung** (`prepared`): nur `gameMode` und bei Battle die Werte aus SL-8. Alles andere nimmt der Raum aus seinen Standardwerten.                                                                                                                                    |
| WB-6 | **Fachlich offene Wortboxen:** Bericht 20 führt F3 weiter als offen (Entscheidungsindex, Zeile 30). Vor der Freigabe prüfen, welche Wortbox F3 betrifft; sie bleibt bis zur Korrektur aus der Schnellwahl (Liste `QUICK_COLLECTION_EXCLUDED`, anfangs nach Prüfung gefüllt). Frage F-5. |

### 3.5 Baustein C: Kopfrechnen live

| Nr.  | Regel                                                                                                                                                                                                                                  |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| KL-1 | **Ein Knopf** „Kopfrechnen live“ auf der Startseite öffnet ein Blatt mit den Vorgaben aus der Tabelle unten. Ein Tipp auf eine Vorgabe öffnet die Lobby.                                                                               |
| KL-2 | **Aufgaben:** 20 je Runde, erzeugt mit `generateMentalMathSource` und den Werten der Vorgabe. Wirft der Generator, erscheint „Das hat nicht geklappt. Bitte versuche es noch einmal.“; es wird kein Raum geöffnet.                     |
| KL-3 | **Spielform:** Vorgabe „Freies Üben“ (`UEBUNG`). Ein Umschalter im Blatt bietet „Battle“; die letzte Wahl merkt sich das Gerät (`localStorage`, Schlüssel `lernraum-schnell-mathe-modus`, tolerant gelesen). **Vorschlag**, siehe F-2. |
| KL-4 | **Ablage:** je Vorgabe ein Eintrag `kind: "math"` mit fester Kennung `schnell-mathe-<Kennung>`, Titel „Kopfrechnen · <Name>“. Jeder Start ersetzt die Aufgaben. `prepared` trägt Spielform und die Mathe-Werte der Vorgabe.            |
| KL-5 | **Die Vorgaben sind eine geprüfte Tabelle im Code**, kein Formular. Wer andere Werte will, nutzt wie bisher die Kachel „Kopfrechnen“.                                                                                                  |
| KL-6 | **Benennung:** Stoff unterhalb von Klasse 5 heißt „Grundlagen“, nicht „Klasse 2“ (Vision, „Für Jugendliche gemacht“).                                                                                                                  |

**Vorgaben (Vorschlag, vom Entwickler zu prüfen; Prüfaufwand S).** Sie nutzen
nur, was der heutige Generator kann: Plus und Minus im Zahlenraum, Mal und
Geteilt im kleinen Einmaleins (`generateOperands` in
`src/domain/mental-math.ts`; das Ergebnis muss im Zahlenraum liegen).

| Kennung | Name im Blatt      | Rechenarten | Zahlen | Reihen | Null                              | Lücken | Negative Ergebnisse |
| ------- | ------------------ | ----------- | ------ | ------ | --------------------------------- | ------ | ------------------- |
| `g20`   | Grundlagen bis 20  | + −         | 0–20   | –      | keine 0 als Zahl                  | nein   | nein                |
| `g100`  | Grundlagen bis 100 | + −         | 0–100  | –      | keine 0 als Zahl                  | nein   | nein                |
| `k5`    | Klasse 5           | + − · :     | 0–100  | 2–9    | keine 0 als Zahl, kein Ergebnis 0 | nein   | nein                |
| `k6`    | Klasse 6           | + − · :     | 0–1000 | 2–9    | keine 0 als Zahl, kein Ergebnis 0 | nein   | nein                |
| `k7`    | Klasse 7           | + − · :     | 0–1000 | 2–9    | keine 0 als Zahl, kein Ergebnis 0 | ja     | nein                |
| `k8`    | Klasse 8           | + − · :     | 0–1000 | 2–9    | keine 0 als Zahl, kein Ergebnis 0 | ja     | ja                  |
| `k9`    | Klasse 9           | + − · :     | 0–1000 | 2–9    | keine 0 als Zahl, kein Ergebnis 0 | ja     | ja                  |

Ehrliche Grenze: Klasse 8 und 9 unterscheiden sich mit dem heutigen Generator
nicht, und Stoff der Mittelschule (Zehnereinmaleins, Kommazahlen, Größen)
fehlt bis MA-11 (Etappe 2). Die Tabelle ist so gebaut, dass MA-11 nur Zeilen
ändert. Mit dem Plan `docs/umsetzungsplan-kopfrechnen-huerde.md` bekommen alle
Vorgaben von selbst mehr Aufgaben mit Zehnerübergang; dieser Plan hängt nicht
davon ab.

## 4. Datenformat und tolerantes Lesen

**Kein neues Format, keine neue Dexie-Version, keine Supabase-Änderung.**

- Alle Einträge sind gewöhnliche `TeacherContentPackage`
  (`teacherContentPackageSchema`, `.strict()`). Es kommt **kein neues Feld**
  dazu. Sicherung, Gesamt-Export und Geräte-Abgleich lesen sie wie jeden
  Eintrag; ältere Software ebenfalls.
- Feste Kennungen (erlaubt: Zeichenkette mit 1 bis 200 Zeichen):

  | Kennung                            | Entsteht in | Inhalt                                   |
  | ---------------------------------- | ----------- | ---------------------------------------- |
  | `schnell-wortbox-<Quelle>`         | B           | Text-Eintrag mit den gezogenen Wörtern   |
  | `schnell-mathe-<Vorgabe>`          | C           | Mathe-Eintrag mit den erzeugten Aufgaben |
  | `wortliste-<Kennung des Eintrags>` | A (LE-9)    | abgeleitete Lernwortliste                |

- Schreiben eines festen Eintrags: vorhandenen Eintrag lesen; `createdAt`,
  `classIds` und `lastUsedAt` bleiben, `revision` steigt um 1, `updatedAt`
  und `preparedAt` sind jetzt. Dafür `liveContentToPackage` aus
  `app/lehrer/content-adapter.ts` nutzen (mit `existing`), nicht von Hand
  bauen.
- Einträge mit dem Präfix `schnell-` sind sonst normale Einträge: Sie
  erscheinen unter „Vorbereitet“ und nach der Runde im „Archiv“ und lassen
  sich löschen. Ein gelöschter Eintrag entsteht beim nächsten Schnellstart neu.
- Start-Absicht (`liveIntentSchema`): **unverändert**.
- Gemerkte Spielform (KL-3): `localStorage`, tolerant gelesen (unbekannter
  Wert ergibt „Freies Üben“), `try`/`catch` wie in
  `app/lehrer/live/hooks/use-projection-mode.ts`.
- Unbekannte oder kaputte Adressparameter (`inhalt`, `art`, `ausText`) werden
  ignoriert: Die Seite öffnet sich normal, mit der Meldung „Dieser Inhalt ist
  nicht mehr in der Ablage.“, wenn eine Kennung nicht passt.

## 5. Abläufe

### 5.1 Startseite

Datei der Ansicht: `app/views/lehrer/start-screen.tsx`; Anbindung:
`app/lehrer/use-teacher-start.ts`.

1. Ist der Bereich `lehrer-schnellstart` sichtbar, steht über den drei
   Kacheln „Neues Laufdiktat“ eine Zeile **„Schnell starten“** mit drei
   Knöpfen: „Liste einfügen“, „Aus einer Wortbox“, „Kopfrechnen live“.
2. Läuft ein Raum (`props.room`), sind die drei Knöpfe gesperrt
   (`aria-disabled="true"`, Klick wirkungslos) und darunter steht: „Es ist
   schon ein Raum offen.“ mit dem vorhandenen Verweis zum Raum (SL-5).
3. Jeder Knopf öffnet ein Blatt (vorhandener Dialog
   `app/views/lehrer/modal-dialog.tsx`).
4. Ohne Freigabe sieht die Startseite aus wie heute.

### 5.2 Blatt „Liste einfügen“ (A)

1. Überschrift „Liste einfügen“. Ein mehrzeiliges Feld mit der Beschriftung
   „Wörter oder Vokabeln“ und dem Hilfetext: „Ein Eintrag je Zeile. Vokabeln:
   beide Seiten mit Tabulator oder Semikolon trennen. Aus einer Tabelle
   kannst du zwei Spalten direkt einfügen.“ Das Feld ist leer (kein
   Demo-Inhalt).
2. Sobald Text da ist: Umschalter „Wörter | Vokabeln“ mit der erkannten Art
   (LE-1), darunter die Vorschau: Anzahl („12 Wörter“ bzw. „12 Vokabeln“),
   die ersten 8 Einträge als Tabelle, übersprungene Zeilen mit Nummer und
   Grund in einer Statuszeile (`role="status"`).
3. Feld „Titel“ mit dem Vorschlag (LE-5). Bei Vokabeln die Sprachwahl (LE-6).
4. Knopf „Speichern“ (gesperrt, solange LE-4 verletzt ist; die Meldung nennt
   den Grund). Er schreibt den Ablage-Eintrag und löst `TEACHER_DATA_EVENT`
   aus.
5. Danach wechselt das Blatt in den Zustand **„Gespeichert“**: Überschrift
   „<Titel> ist gespeichert“ (bekommt den Fokus), darunter „Was willst du
   damit machen?“ und drei Knöpfe nach Tabelle 3.3 sowie „Fertig“. Der
   Hinweis LE-12 steht unter den Knöpfen.
6. „Laufdiktat“ und „Battle“: `writeLiveIntent({ contentId, mode, classId })`,
   dann `router.push("/lehrer/live")`. Battle schreibt vorher
   `savePreparedSettings` mit den Werten aus SL-8.
7. „An die Kinder“: `router.push` nach Tabelle 3.3.
8. Schließen ohne Speichern verwirft den Entwurf nach Rückfrage, wenn Text im
   Feld steht („Die Liste ist noch nicht gespeichert. Verwerfen?“).

### 5.3 Freigabe-Seite nimmt Kennungen an (A, dritter Weg)

Dateien: `app/components/teacher-content-transfer.tsx`,
`app/components/teacher-word-list-transfer.tsx`.

1. `?inhalt=<Kennung>`: Art „Vokabelpakete“ wählen und das Paket öffnen, als
   hätte die Lehrkraft es in der Liste angetippt (`pick`).
2. `?art=wordlist&ausText=<Kennung>`: Art „Lernwortlisten“ wählen; den
   Text-Eintrag lesen, seine Zeilen als Wörter nehmen, die abgeleitete Liste
   nach LE-9 schreiben und öffnen.
3. In beiden Fällen die Parameter sofort aus der Adresse entfernen (LE-11)
   und nichts freigeben: „Freigeben“ drückt die Lehrkraft selbst.
4. Passt die Kennung nicht oder die Art nicht (z. B. `inhalt` zeigt auf einen
   Text): Meldung aus Abschnitt 4, Seite sonst normal.

### 5.4 Blatt „Aus einer Wortbox“ (B)

1. Überschrift „Aus einer Wortbox“. Zwei Gruppen von Knöpfen: „Mitgelieferte
   Wortboxen“ (Titel und Zahl der Wörter) und, falls vorhanden, „Meine
   Lernwortlisten“.
2. Umschalter „5 | 10 | 20 Wörter“, Vorgabe 10 (WB-2).
3. Tipp auf eine Quelle zeigt im selben Blatt drei Knöpfe: „Laufdiktat“,
   „Freies Üben“, „Battle“ und darüber „<Name> · 10 Wörter“. „Zurück“ führt
   zur Quellenwahl.
4. Tipp auf eine Spielform: Wörter ziehen, Eintrag nach WB-4 und WB-5
   schreiben, Start-Absicht schreiben, zum Raum wechseln.

### 5.5 Blatt „Kopfrechnen live“ (C)

1. Überschrift „Kopfrechnen live“. Darunter die Vorgaben als Knöpfe in der
   Reihenfolge der Tabelle, jeder mit einer Zeile Erklärung (z. B. „Plus,
   Minus, Mal, Geteilt · Zahlen bis 1000“).
2. Darunter der Umschalter „Freies Üben | Battle“ (KL-3).
3. Tipp auf eine Vorgabe: Aufgaben erzeugen, Eintrag nach KL-4 schreiben,
   Start-Absicht schreiben, zum Raum wechseln. Der Raum zeigt die Lobby mit
   Code und QR.

### 5.6 Was im Raum geschieht (unverändert, zur Kontrolle)

`use-launch-request.ts` liest die Absicht einmal, lädt den Eintrag aus der
Ablage, übernimmt `prepared`, setzt die Klasse und ruft `openLobby`. Beim
Start der Sitzung legt der Raum den Inhalt mit `markUsed` wieder ab; der
Eintrag wandert ins Archiv.

## 6. Barrierefreiheit und Design

Vorlage und Regeln: `docs/design/README.md`, Canvas „Lehrerbereich v2“
(Start 15a/15c/15d). Farben nur über die Farbrollen; hell und dunkel prüfen.

| Zweck                | Bestehende Komponente oder Klasse                                                             |
| -------------------- | --------------------------------------------------------------------------------------------- |
| Rahmen der Seite     | `app/views/lehrer/teacher-frame.tsx`                                                          |
| Startseite, Kacheln  | `app/views/lehrer/start-screen.tsx`, `start-screen.module.css` (`tile…`-Klassen)              |
| Blatt (Dialog)       | `app/views/lehrer/modal-dialog.tsx` (Fokusfalle, Escape, Fokus zurück zum Auslöser)           |
| Umschalter           | `KindSwitch` der Freigabe-Seite (`app/components/teacher-transfer-shared.tsx`, vorher prüfen) |
| Tabelle der Vorschau | Zeilen wie in `app/views/lehrer/transfer-screen.tsx` bzw. `vocabulary-rows.ts`                |
| Sprachwahl           | die vorhandene Auswahl des Assistenten (`VOCABULARY_LANGUAGES`)                               |

Neue Ansichten (rein, ohne Speicher und ohne Zufall):
`app/views/lehrer/quick-start.tsx` mit `QuickStartRow`, `QuickListSheet`,
`QuickWordBoxSheet`, `QuickMathSheet` und `quick-start.module.css`.

Anforderungen:

- **Echte Elemente:** `button`, `textarea` mit sichtbarem `label`, `fieldset`
  mit `legend` für Umschalter, Tabelle mit `th scope="col"`.
- **Fokus:** Beim Öffnen eines Blatts steht der Fokus im ersten Feld bzw. auf
  der Überschrift. Nach „Speichern“ auf der Überschrift des Zustands
  „Gespeichert“. Beim Schließen zurück auf den auslösenden Knopf.
- **Statusmeldungen** (Vorschau-Zahl, übersprungene Zeilen, Fehler) in einem
  Bereich mit `role="status"`, der von Anfang an im DOM steht. Fehler beim
  Speichern mit `role="alert"`.
- **Touch-Ziele** mindestens 44 × 44 px; die Vorgaben-Knöpfe 56 px hoch. Am
  Handy stehen die drei Schnellknöpfe untereinander (Vorlage 15d).
- **320 px Breite:** kein waagerechter Überlauf; die Vorschau-Tabelle bricht
  lange Wörter um.
- **Nicht nur Farbe:** Der gewählte Umschalter trägt `aria-pressed` bzw. ein
  ausgewähltes Radio und einen dickeren Rahmen.
- **Wortwahl:** „Liste“, „Wortbox“, „Lobby“, „Code“. Keine Wörter wie
  „Token“, „Intent“, „Payload“, „IndexedDB“ (Audit C-010).
- **Designvergleich:** Die Startseite 15a/15c/15d wird in `design-quality`
  mit ihrem Referenzbild verglichen. Solange der Bereich `vorschau` ist und
  die Demo-Daten (`app/views/lehrer/start-demo.ts`) die neue Zeile nicht
  einschalten, bleibt das Bild gleich. Beim Wechsel auf `frei` ändert sich
  die Startseite; dann die Referenzen über das Label
  `design-referenzen-erneuern` neu erzeugen und im Pull Request sichten.

## 7. Freigabestufe

Neuer Bereich in `src/domain/release.ts`:

```ts
"lehrer-schnellstart": {
  label: "Lehrerbereich: Schnell starten",
  // Kein eigener Pfad: schaltet die Zeile „Schnell starten“ auf /lehrer
  // und die Adressparameter der Freigabe
  // (docs/umsetzungsplan-schnell-erstellen-live.md).
  routes: [],
  stage: "vorschau",
},
```

Begründung für `vorschau`: Der Lehrerbereich ist im Schulbetrieb. Die
Vorgaben für Kopfrechnen und die Auswahl der Wortboxen prüft der Entwickler
erst. Danach `frei`, weil die Schnellwege gerade für Kolleginnen ohne
Einweisung gedacht sind. Tabelle im `README.md` neu erzeugen
(`releaseStagesMarkdown()`), sonst schlägt `src/domain/release-docs.test.ts`
fehl.

## 8. Betroffene Dateien

| Datei                                                                    | Änderung                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/domain/quick-content.ts`                                            | **Neu, rein.** `detectListKind(text)`, `parseQuickList(text, kind)` (liefert Einträge, übersprungene Zeilen, Fehler nach LE-4), `wordListSource(words)`, `pickWords(words, count, random)`, `quickLibraryId("wortbox" \| "mathe" \| "wortliste", id)`, `QUICK_WORD_COUNTS = [5, 10, 20]`.        |
| `src/domain/quick-content.test.ts`                                       | **Neu.** Fälle 1 bis 12.                                                                                                                                                                                                                                                                         |
| `src/domain/quick-math-presets.ts`                                       | **Neu, rein.** `QUICK_MATH_PRESETS` (Tabelle 3.5 als Daten), `quickMathSettings(preset)` liefert die Mathe-Felder von `TeacherPreparedSettings`, `QUICK_MATH_COUNT = 20`.                                                                                                                        |
| `src/domain/quick-math-presets.test.ts`                                  | **Neu.** Fälle 13 bis 16.                                                                                                                                                                                                                                                                        |
| `src/domain/release.ts`, `README.md`                                     | Bereich `lehrer-schnellstart` (Abschnitt 7).                                                                                                                                                                                                                                                     |
| `app/views/lehrer/quick-start.tsx`, `quick-start.module.css` (+ `.d.ts`) | **Neu.** Reine Ansichten aus Abschnitt 6.                                                                                                                                                                                                                                                        |
| `app/views/lehrer/start-screen.tsx`                                      | Neue optionale Prop `quick?: QuickStartProps`; ohne sie rendert die Seite wie heute.                                                                                                                                                                                                             |
| `app/lehrer/use-quick-start.ts`                                          | **Neu.** Hook mit Zustand der drei Blätter und den Aktionen: `saveList`, `startList(mode)`, `shareList()`, `startWordBox(sourceId, count, mode)`, `startMath(presetId, mode)`. Nutzt `createTeacherContentLibraryRepository`, `liveContentToPackage`, `savePreparedSettings`, `writeLiveIntent`. |
| `app/lehrer/use-teacher-start.ts`                                        | `useAreaVisible("lehrer-schnellstart")`; bei Sichtbarkeit `quick` aus `useQuickStart` an die Ansicht geben. Die Datei hat 370 Zeilen; die Logik bleibt im neuen Hook.                                                                                                                            |
| `app/components/teacher-content-transfer.tsx`                            | Parameter `inhalt` und `art` lesen (Ablauf 5.3), nur wenn der Bereich sichtbar ist.                                                                                                                                                                                                              |
| `app/components/teacher-word-list-transfer.tsx`                          | Parameter `ausText`: abgeleitete Liste nach LE-9 anlegen oder aktualisieren und öffnen.                                                                                                                                                                                                          |
| Tests der Ansichten und Anbindung                                        | **Neu:** `app/views/lehrer/quick-start.test.tsx`, `app/lehrer/use-quick-start.test.tsx`; ergänzen: `app/views/lehrer/start-screen.test.tsx`, `app/components/teacher-content-transfer.test.tsx`.                                                                                                 |
| `e2e/lehrer-schnellstart.spec.ts`                                        | **Neu.** Fälle 30 bis 38.                                                                                                                                                                                                                                                                        |
| `e2e/live/…`                                                             | Ein Fall mit echtem Raumdienst (Fall 39), nach dem Muster der vorhandenen Live-Tests (`playwright.live.config.ts`).                                                                                                                                                                              |
| `docs/live-sicherheit-bereitstellung.md`                                 | Kurzer Absatz „Schnellstart“: keine neue Schnittstelle, Start-Absicht nur mit Kennungen.                                                                                                                                                                                                         |
| Dieser Plan                                                              | Am Ende „Umgesetzt“ mit Datum und Abweichungen.                                                                                                                                                                                                                                                  |

**Nicht anfassen:** `supabase/`, `src/integrations/laufdiktat/room-api.ts`,
`live-room-client.ts`, `app/lehrer/live-intent.ts` (Schema bleibt),
`teacherContentPackageSchema`.

## 9. Testfälle

### Unit (Vitest), Domain

`quick-content.test.ts`:

1. Zwölf Zeilen mit je einem Wort: Art „Wörter“, 12 Einträge.
2. Zwölf Zeilen „Wort<Tab>word“: Art „Vokabeln“, 12 Paare.
3. Gemischt, 7 von 12 mit Semikolon: Art „Vokabeln“; die 5 anderen stehen
   unter „übersprungen“ mit Zeilennummer.
4. Gemischt, 5 von 12 mit Semikolon: Art „Wörter“.
5. Eine Zeile „Hund, Katze, Maus“: drei Wörter.
6. Doppelte („Hund“, „hund“, „ Hund “): ein Eintrag; leere Zeilen entfallen.
7. Ein Eintrag: Fehler „mindestens 2“. 201 Einträge: Fehler „zu lang“; es
   wird nichts abgeschnitten.
8. Ein Eintrag mit 121 Zeichen: Fehler.
9. `wordListSource` schreibt ein Wort je Zeile; `parseQuickList` darauf
   liefert dieselben Wörter (Hin und zurück).
10. `pickWords` mit festem Zufall: 10 verschiedene Wörter aus 100; aus 7
    Wörtern alle 7; nie ein Wort doppelt (auch als Eigenschaftstest mit
    `fast-check`).
11. `quickLibraryId` liefert die Kennungen aus Abschnitt 4; jede besteht
    `teacherContentPackageSchema.shape.id`.
12. Windows-Zeilenenden (`\r\n`) und geschützte Leerzeichen werden wie
    normale gelesen.

`quick-math-presets.test.ts`:

13. Jede Vorgabe besteht `teacherPreparedSettingsSchema` (zusammen mit einem
    `gameMode`).
14. Für jede Vorgabe erzeugt `generateMentalMathSource` 20 Aufgaben, ohne zu
    werfen (100 Läufe mit verschiedenem Zufall).
15. Stichprobe je Vorgabe (500 Aufgaben): keine Zahl und kein Ergebnis
    außerhalb des Zahlenraums; bei „keine 0“ kommt keine 0 vor; negative
    Ergebnisse nur bei `k8` und `k9`.
16. Die Kennungen sind eindeutig; die Namen enthalten nicht „Klasse 1“ bis
    „Klasse 4“ (KL-6).

### Unit (Vitest), Ansichten und Anbindung

`quick-start.test.tsx` und `start-screen.test.tsx`:

17. Ohne `quick` rendert die Startseite genau wie bisher (Regression,
    vorhandene Tests unverändert grün).
18. Mit `quick`: drei Knöpfe in der Zeile „Schnell starten“.
19. Mit `quick` und offenem Raum: Die Knöpfe tragen `aria-disabled`, ein
    Klick ruft nichts.
20. Listen-Blatt: Das Feld ist leer; „Speichern“ ist gesperrt; nach dem
    Einfügen zeigt die Vorschau die Zahl und der Umschalter die erkannte Art.
21. Listen-Blatt: Umschalten der Art ändert die Vorschau.
22. Listen-Blatt nach dem Speichern: Überschrift hat den Fokus; die Knöpfe
    heißen bei Vokabeln „Als LernBox-Stapel an die Kinder“, bei Wörtern „Als
    Wortbox an die Kinder“.
23. Mathe-Blatt: sieben Vorgaben in der Reihenfolge der Tabelle.

`use-quick-start.test.tsx` (mit `fake-indexeddb`, wie in den vorhandenen
Lehrer-Tests):

24. `saveList` legt genau einen Ablage-Eintrag an (Art, Titel, Klasse der
    Startseite).
25. `startList("BATTLE")`: Die Start-Absicht enthält nur `contentId`, `mode`,
    `classId`; `sessionStorage` enthält keines der Wörter der Liste (SL-2).
    `prepared` hat `battleInk: false` und `battleFlicker: false`.
26. `startWordBox` zweimal mit derselben Quelle: ein Eintrag
    `schnell-wortbox-…`, `revision` gestiegen, `createdAt` gleich.
27. `startMath("k6", "UEBUNG")`: Eintrag `schnell-mathe-k6` mit 20 Zeilen und
    `prepared.mathMax === 1000`.
28. Wirft der Generator (Stub), wird keine Start-Absicht geschrieben und die
    Meldung erscheint.

`teacher-content-transfer.test.tsx`:

29. `?inhalt=<Kennung>` öffnet das Paket und gibt nichts frei
    (`publishTransferPayload` nicht gerufen). `?art=wordlist&ausText=<Kennung>`
    legt `wortliste-<Kennung>` an; ein zweiter Aufruf legt keine zweite an.
    Eine unbekannte Kennung zeigt die Meldung. Ohne Freigabe des Bereichs
    werden die Parameter ignoriert.

### Playwright (`e2e/lehrer-schnellstart.spec.ts`)

Vorbereitung: Cookie `lernraum-vorschau=1` (Muster `enablePreview`), Seite
`/lehrer`. Import aus `./fixtures`, axe über `analyzeAccessibility`. Ohne
Raumdienst zeigt der Raum die ehrliche Meldung; die Fälle 30 bis 38 prüfen
deshalb bis zum Wechsel nach `/lehrer/live` und die Ablage.

30. **Zeile sichtbar:** drei Schnellknöpfe; axe ohne Befund auf der
    Startseite.
31. **Liste einfügen, Wörter:** zwölf Wörter einfügen, Vorschau „12 Wörter“,
    speichern, „Fertig“: Der Titel steht unter „Vorbereitet“ mit der Art
    „Text“. axe ohne Befund im Blatt (leer, mit Vorschau, gespeichert).
32. **Liste einfügen, Vokabeln:** zwölf Paare mit Tabulator: Art „Vokabeln“,
    Vorschau zeigt beide Spalten.
33. **Fehlerfälle:** eine Zeile: „Speichern“ gesperrt mit Grund; 201 Zeilen:
    Meldung „zu lang“.
34. **Weg Laufdiktat:** nach dem Speichern „Laufdiktat“: Die Adresse ist
    `/lehrer/live`, der Titel der Liste steht im Raum; die Adresse enthält
    kein Wort der Liste.
35. **Weg an die Kinder:** „Als LernBox-Stapel an die Kinder“: Seite
    „Freigabe an Schüler“, das Paket ist geöffnet, die Adresse hat keine
    Parameter mehr, es gibt noch keinen Code.
36. **Wortbox:** „Aus einer Wortbox“, „Doppelkonsonanten“, „Laufdiktat“:
    `/lehrer/live` mit dem Titel „Doppelkonsonanten · 10 Wörter“. Zurück auf
    `/lehrer`: genau ein solcher Eintrag, auch nach einem zweiten Start.
37. **Kopfrechnen live:** „Kopfrechnen live“, „Klasse 6“: `/lehrer/live`;
    der Raum ist im Modus „Freies Üben“ mit 20 Aufgaben.
38. **Tastatur und Größe:** alle drei Blätter nur mit Tastatur bedienbar
    (Tab, Enter, Escape schließt, Fokus kehrt zurück). Nur `mobile-chrome` und
    `minimum-width`: Knöpfe mindestens 44 px, kein waagerechter Überlauf.

Live-Suite (`npm run test:e2e:live`, nur mit konfiguriertem Raumdienst):

39. **Sofort live:** „Kopfrechnen live“, „Grundlagen bis 20“: Lobby mit
    vierstelligem Code; ein Schülergerät tritt mit dem Code bei und sieht nach
    dem Start eine Aufgabe.

## 10. Prüfbefehle

Wenn `node_modules` fehlt, zuerst `npm ci`.

```sh
npm run css-types
npm run format:check
npm run lint
npm run typecheck
npm run test:unit
npm run build
npm run test:render
npx playwright test e2e/lehrer-schnellstart.spec.ts e2e/teacher-content.spec.ts e2e/platform-quality.spec.ts --project=desktop-chromium --project=mobile-chrome --project=minimum-width --trace off
```

Während der Arbeit gezielt:
`npx vitest run src/domain/quick app/views/lehrer app/lehrer`.
`npm run test:e2e:live` nur, wenn der Raumdienst lokal konfiguriert ist.
`npm run test:design` ist lokal nur im Vergleich mit dem Ausgangsstand
aussagekräftig (`AGENTS.md`). Nach dem Push GitHub Actions nicht abfragen.

## 11. Fallstricke und was nicht passieren darf

- **Keine Wörter in Adresse, QR oder `sessionStorage`** (Entscheidung 60,
  „Nicht wieder einbauen“). Nur Kennungen. Test 25 und Fall 34 halten das
  fest.
- **Kein Token anfassen.** Kein Schnellweg ruft `room-api` direkt, liest oder
  speichert einen Lehrkraft- oder Teilnehmerzugang.
- **Keine Supabase-Änderung**, keine neue Tabelle, keine neue RPC.
- **Schema der Ablage nicht erweitern.** `teacherContentPackageSchema` ist
  `.strict()`: Ein neues Feld ließe ältere Software und den Geräte-Abgleich
  den Eintrag ablehnen.
- **`liveIntentSchema` nicht erweitern.** Es ist bewusst eng.
- **Nichts automatisch freigeben.** Die Adressparameter öffnen nur; den Code
  erzeugt die Lehrkraft mit „Freigeben“.
- **Keine Demo-Inhalte als Wert** in Feldern (Audit C-010), nur `placeholder`.
- **Feste Kennungen nur für erzeugte Einträge.** Eine eingefügte Liste
  bekommt immer eine neue zufällige Kennung; sonst überschriebe die zweite
  Liste die erste.
- **Abgeleitete Lernwortliste (LE-9):** Sie wird bei jedem Aufruf aus dem
  Text-Eintrag neu geschrieben. Hat die Lehrkraft sie in der Freigabe von
  Hand geändert, gehen diese Änderungen verloren. Deshalb vor dem
  Überschreiben prüfen, ob sich die Wörter unterscheiden, und dann fragen:
  „Die Wortliste wurde geändert. Mit der Liste aus dem Laufdiktat
  ersetzen?“
- **Offener Raum:** nie einen zweiten Raum öffnen und nie den Inhalt eines
  offenen Raums ersetzen (SL-5).
- **Zufall nicht in der Ansicht** und nicht fest in der Domain (`random` als
  Parameter), sonst sind die Tests nicht stabil.
- **Designvergleich:** die Startseite ohne Freigabe nicht verändern (kein
  neuer Abstand, kein neues Element im DOM).
- **`max-lines` 1000** in `app/**`; Ansichten bleiben rein.
- **Bestehende Tests nicht still anpassen** (`AGENTS.md`).
- **Nicht committen:** `public/sw.js`, `public/version.json`.

## 12. Reihenfolge der Umsetzung

Jeder Schritt ist für sich grün und wird einzeln committet und gepusht. Die
Bausteine sind unabhängig; C ist der kleinste und der Türöffner für
Kolleginnen (Bericht 25) und kommt deshalb zuerst.

1. **Freigabe:** Bereich `lehrer-schnellstart`, README.
2. **C, Domain:** `quick-math-presets.ts` mit Tests 13 bis 16.
3. **C, Oberfläche:** Zeile „Schnell starten“ mit dem einen Knopf,
   `QuickMathSheet`, `use-quick-start.ts` (`startMath`), Tests 17 bis 19, 23,
   27, 28; Playwright 30, 37.
4. **B:** `pickWords`, `QuickWordBoxSheet`, `startWordBox`, Tests 10, 26;
   Playwright 36.
5. **A, Domain:** `detectListKind`, `parseQuickList`, Tests 1 bis 9, 11, 12.
6. **A, Blatt und zwei Live-Wege:** `QuickListSheet`, `saveList`,
   `startList`, Tests 20 bis 22, 24, 25; Playwright 31 bis 34.
7. **A, dritter Weg:** Adressparameter der Freigabe, Test 29; Playwright 35.
8. **Tastatur, Größe, axe:** Playwright 38; Live-Fall 39.
9. **Doku:** Absatz in `docs/live-sicherheit-bereitstellung.md`, Abschnitt
   „Umgesetzt“ hier.

## 13. Fragen an den Entwickler

| Nr. | Frage                                                                                                                            | Empfehlung                                                                                                                        | Alternative und ihre Folge                                                                                                          |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| F-1 | Stimmen die Jahrgangsvorgaben für „Kopfrechnen live“ (Tabelle 3.5), auch Lücken ab Klasse 7 und negative Ergebnisse ab Klasse 8? | So übernehmen und im Unterricht nachstellen. Die Tabelle ist eine Datei; jede Zeile ist in einer Minute geändert.                 | Nur drei Vorgaben („Grundlagen“, „Klasse 5/6“, „Klasse 7–9“), bis MA-11 mehr Stoff bringt. Ehrlicher, aber nicht „Jahrgang wählen“. |
| F-2 | Welche Spielform ist bei „Kopfrechnen live“ voreingestellt?                                                                      | „Freies Üben“; „Battle“ ist ein Tipp daneben und wird gemerkt. In einer fremden Klasse (Vertretung) ist die ruhige Form sicherer. | „Battle“ als Vorgabe, wie in der Vision für die Vorviertelstunde beschrieben.                                                       |
| F-3 | Wortliste an die Kinder: als Wortbox im Wortspeicher (nicht als LernBox-Stapel)?                                                 | Ja. Eine LernBox-Karte braucht zwei Seiten; ein Wort allein gehört in den Wortspeicher.                                           | Zusätzlich Karten „Wort hören → schreiben“ in der LernBox. Das wäre eine neue Kartenart und ein eigener Plan.                       |
| F-4 | Dürfen erzeugte Einträge (`schnell-…`) die Ablage füllen (je Wortbox und je Vorgabe einer)?                                      | Ja. Höchstens 15 feste Einträge; sie lassen sich löschen und entstehen neu.                                                       | Erzeugte Runden gar nicht ablegen. Dann müsste die Start-Absicht Inhalte tragen; das widerspricht SL-2 und Entscheidung 60.         |
| F-5 | Welche mitgelieferten Wortboxen dürfen in die Schnellwahl, solange Befund F3 aus Bericht 20 offen ist?                           | Alle, die du durchgesehen hast. Bis dahin die betroffene Wortbox ausnehmen.                                                       | Alle acht sofort.                                                                                                                   |
| F-6 | Anzahl: 10 Wörter je Wortbox-Runde und 20 Rechenaufgaben?                                                                        | Ja (Entscheidung 30 nennt 10 Wörter als Standard).                                                                                | Andere Zahlen sind Konstanten.                                                                                                      |
| F-7 | Freigabe                                                                                                                         | `vorschau`, nach einer Woche eigener Erprobung auf `frei`; dabei die Design-Referenzen der Startseite erneuern.                   | Sofort `frei`.                                                                                                                      |
