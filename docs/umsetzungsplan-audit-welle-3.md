# Umsetzungsplan Audit – Welle 3

Stand: 27.10.2026. Grundlage: Welle 2 (Version 0.9.4, Quality grün) und die
mittelfristigen Punkte D1 bis D5. Wie in Welle 2 sind die Regeln, die der
Entwickler noch nicht ausdrücklich bestätigt hat, als **Vorschlag** umgesetzt
und hier benannt.

D1 ist Voraussetzung für D2. D3, D4 und D5 sind davon unabhängig.

## D1 Gemeinsamer Wiederholungskern (A-004, M1)

`src/domain/spaced-repetition.ts` entscheidet für LernBox, Lernwörter, Mathe
und die Ereignisableitung (`deriveLeitnerProgress`), was eine Antwort mit Box
und Fälligkeit macht. Die Module übergeben Stand und Antwort; ihre
Unterschiede stehen ausdrücklich in `REPETITION_RULES`. Lernarchiv (Box 6),
Rückstufung nach Zeit und „gefestigt“ in Mathe bleiben Modulsache und setzen
auf der Entscheidung des Kerns auf. Kein gespeichertes Format ändert sich.

Reihenfolge der Prüfung (jede Entscheidung trägt einen maschinenlesbaren
Grund, `RepetitionDecision`):

| Nr. | Regel                                                                                                                                                                   | Grund                                     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| K-1 | Neuer Eintrag in einem Modul mit `newItem: "start"` (Lernwörter): Box 1, morgen fällig (W-4).                                                                           | `started`                                 |
| K-2 | Freies Üben oder noch nicht fällig, in Modulen mit `mistakeOutsideSchedule: "due-next-local-day"`: Box bleibt; ein Fehler macht spätestens morgen fällig (W-1 bis W-3). | `practiced`, `early`, `practiced-mistake` |
| K-3 | Nur der erste Versuch einer Runde zählt.                                                                                                                                | `ignored`                                 |
| K-4 | Fehler, Hilfe (außer K-5) oder Selbstkorrektur: Box 1, sofort bzw. morgen fällig.                                                                                       | `reset`                                   |
| K-5 | Richtig mit Hilfe in Modulen mit `helpedCorrect: "hold"` (zweite Chance der LernBox): Box bleibt, Abstand der Box.                                                      | `held`                                    |
| K-6 | Weitere Antwort derselben Runde (Mathe, Ereignisse), freies Üben, noch nicht fällig: kein Aufstieg.                                                                     | `ignored`, `practiced`, `early`           |
| K-7 | Erster richtiger Abruf nach einem Fehler (offener Fehler oder Abruf vor weniger als 8 Stunden bei der LernBox): Box bleibt, morgen wieder.                              | `recovered`                               |
| K-8 | Fällig und richtig: eine Box höher; Selbsteinschätzung höchstens bis Box 3; an der höchsten Box bleibt sie.                                                             | `promoted`, `repeated`                    |

Regelkonfiguration je Modul:

| Modul      | Abstände (Tage)        | Fehler fällig | außerhalb der Wiederholung | Hilfe richtig | neu              | Erholung              | eine Runde, ein Schritt |
| ---------- | ---------------------- | ------------- | -------------------------- | ------------- | ---------------- | --------------------- | ----------------------- |
| LernBox    | 1/3/7/14/30            | sofort        | Fehler → Box 1             | Box hält      | steigt auf       | 8 Stunden je Richtung | nein                    |
| Lernwort   | 1/3/7/14/30 (+ Archiv) | morgen        | Box bleibt, morgen fällig  | wie Fehler    | Box 1            | über „morgen fällig“  | nein                    |
| Mathe      | 1/3/7/14 (Stufe 1–4)   | sofort        | Fehler → Stufe 0           | wie Fehler    | erst nach Fehler | offener Fehler        | ja                      |
| Ereignisse | 1/3/7/14/30            | sofort        | Fehler → Box 1             | Box hält      | steigt auf       | offener Fehler        | ja                      |

Geändertes Verhalten: Die Ereignisableitung (`deriveLeitnerProgress`) steigt
nicht mehr vor der Fälligkeit auf (A-004: „fünfmal richtig in 40 Minuten“ ergab
dort Box 5). Alle anderen Module behalten ihr Verhalten; ihre bisherigen Tests
bleiben unverändert grün.

Prüfung: `src/domain/testing/repetition-rule-table.ts` enthält die Grundregeln
aus Vault 06 als Fälle. Der Kern und jedes Modul schreiben dafür einen Treiber
und bestehen dieselbe Tabelle. Eigenschaftstest: Ein Aufstieg geschieht nur ab
der Fälligkeit, um genau eine Box, nie über die höchste Box.

## D2 Diagnostik (braucht D1)

| Nr.  | Regel                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D2-1 | **Startpunkt statt Test:** Ein freiwilliger Einstieg je Kernbereich (Rechtschreibung, Kopfrechnen) mit höchstens 12 Aufgaben in steigender Schwierigkeit. Zwei Fehler auf einer Stufe beenden ihn. Ergebnis ist nur ein Startvorschlag (Wortbox und Stufe, Zahlenraum), kein Etikett, keine Prozentzahl, keine Note; Text „Wir suchen deinen Startpunkt“. Jederzeit wiederholbar; das Kind kann den Vorschlag ändern. |
| D2-2 | Die Startpunkt-Antworten sind Lernereignisse wie andere auch und laufen durch den Wiederholungskern (Fehler werden fällig). Sie erscheinen nicht in Leistungsbriefen.                                                                                                                                                                                                                                                 |
| D2-3 | **Kompetenzprofil** über alle Module als reine Projektion aus Lernereignissen und Wiederholungsständen: je Teilbereich (Wortbox, Rechenart und Zahlenraum, Vokabelstapel, Textbox-Sammlung, Tastenwelt-Abschnitt) „neu“, „im Aufbau“ oder „sicher“. „Sicher“ heißt Box 3 oder höher und richtiger Abruf ohne Hilfe an mindestens zwei verschiedenen Tagen (D-004). Nur lokal, nichts zusätzlich gespeichert.          |
| D2-4 | **Tagestraining 10 oder 20 Minuten:** Das Kind wählt die Dauer. Die Auswahl folgt der Tagesportion (Fehler, fällige Wiederholungen, Neues) über die Module, mit geschätzter Dauer je Aufgabe; schwache Teilbereiche aus dem Profil zuerst. Läuft die Zeit ab, wird die laufende Aufgabe fertig gemacht, dann kommt der Abschluss.                                                                                     |
| D2-5 | **Zeitmessung:** gezählt wird nur aktive Zeit. Nach 3 Minuten ohne Eingabe pausiert die Uhr und zählt die Zeit seit der letzten Eingabe nicht. Im Hintergrund (Seite verdeckt) pausiert sie sofort. Nichts wird verworfen: Antworten sind gespeichert, das Training geht beim Zurückkommen weiter. Reine Funktion, Zeit kommt von außen.                                                                              |

## D3 Lehrerbereich auf geteilten Geräten (B-009)

| Nr.  | Regel                                                                                                                                                                                                                                                                                                                                                                                        |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D3-1 | Beim ersten Öffnen des Lehrerbereichs wählt die Lehrkraft den Gerätetyp: „Mein Gerät“ oder „Tafel / geteiltes Gerät (nur Material)“. Gespeichert lokal auf dem Gerät; später in den Lehrer-Einstellungen änderbar.                                                                                                                                                                           |
| D3-2 | **Tafelmodus nur Material:** Bereiche mit Personendaten (Klassen und Schülerliste, Einschreibe- und Gast-QR, Aufgaben und Abgaben, Datenexport) sind gesperrt und in der Navigation ausgeblendet; Material und Live-Raum bleiben.                                                                                                                                                            |
| D3-3 | Im Tafelmodus übernimmt der Geräte-Abgleich nur Material, keine Klassen, Schüler, Profile, Aufgaben oder Abgaben. Beim Wechsel in den Tafelmodus bietet die App an, vorhandene Personendaten von diesem Gerät zu löschen.                                                                                                                                                                    |
| D3-4 | **Lokale Sperre** (zweiter Schritt, nur auf „Mein Gerät“ wählbar): PIN mit 6 Ziffern, gespeichert nur als PBKDF2-Ableitung. Personenbereiche verlangen die PIN nach dem Start und nach 15 Minuten ohne Nutzung. Die Sperre ist ein Sichtschutz, keine Verschlüsselung; die Oberfläche sagt das. Vergessene PIN: Sperre aufheben löscht die Personendaten auf diesem Gerät (Material bleibt). |
| D3-5 | Tests: Im Tafelmodus liegen nach einem Abgleich keine Schülernamen in IndexedDB; gesperrte Routen zeigen den Hinweis; die PIN-Sperre greift.                                                                                                                                                                                                                                                 |

## D4 Auftrags-QR ohne Personendaten (E-002), zuerst Lernwörter

| Nr.  | Regel                                                                                                                                                                                                     |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D4-1 | Im Lehrerbereich (Material) entsteht ein **Wortauftrag**: Titel (optional) und Wortliste, geprüft mit `parseWordsParam` (höchstens 50 Wörter). Daraus Link und QR auf `/frei/german?woerter=…&auftrag=…`. |
| D4-2 | Der Auftrag enthält keine Personendaten und nichts, was ein Kind identifiziert. Mehrere Aufträge (z. B. je Leistungsgruppe) lassen sich als Kärtchen auf einem Blatt drucken.                             |
| D4-3 | Auf dem Schülergerät öffnet der Link den Wortspeicher mit dem Blatt „Wörter übernehmen“, der Titel ist als Wortbox-Name vorbelegt. Gespeichert wird erst nach Bestätigung.                                |
| D4-4 | Zu lange Listen für einen gut lesbaren QR werden vor dem Erzeugen gemeldet. E2E-Test: Auftrag erzeugen, Link öffnen, Wörter übernehmen.                                                                   |

## D5 Offene Befunde aus dem Audit

Am Stand 0.9.4 nachgeprüft: alle offen, C-008 teilweise (neue Vokabeln gelten
nicht mehr als „schwierig“).

| Nr.  | Befund | Regel                                                                                                                                                                                                                                                                                                                                       |
| ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D5-1 | C-001  | Während einer Runde fragen Logo, untere Leiste, Zurück-Pfeil und Zurück-Geste nach („Runde wirklich beenden? Deine Antworten bis hier sind gespeichert.“, Standard „Weiterüben“). Wortspeicher, LernBox, Kopfrechnen und Laufdiktat allein halten einen Zwischenstand und bieten beim nächsten Öffnen „Weitermachen“ an (Stand „3 von 10“). |
| D5-2 | C-003  | Ein Kind ohne Lernstand sieht eine kurze Begrüßung mit großen Karten „Wörter üben“, „Rechnen“, „Vokabeln“ und „Loslegen“ statt „Weiterlernen“. Die Tastenwelt wird nur empfohlen, wenn auf dem Gerät schon eine Hardwaretastatur benutzt wurde.                                                                                             |
| D5-3 | C-007  | Ein Kinder-Glossar legt einfache Wörter fest („Runde“ statt „Durchgang“, „Stufe“ statt „Merkstufe“, „heute üben“ statt „fällig“, „Kartenstapel“ statt „Stapel“ nur wo nötig, kein „Leitner“). Ein Test meldet verbotene Wörter in Schüleransichten. Anleitungen haben einen Vorlese-Knopf (lokale Stimme).                                  |
| D5-4 | C-008  | Nie geübte Karten heißen „neu“, nie „erledigt“. Der Wortspeicher-Abschluss sagt, wann die Fehlerwörter wiederkommen, und bietet „Diese Wörter jetzt noch einmal üben“ (freies Üben, ändert keine Box). Ein leerer Tag heißt „Heute ist noch nichts geplant“.                                                                                |
| D5-5 | D-012  | Tempo-Punkte nur, wenn die Lehrkraft sie einschaltet (Standard aus). Die Lehrer-Liveansicht hat einen Projektionsmodus ohne Namen mit Fehlerzahlen. Sterne im Laufdiktat allein sind abschaltbar.                                                                                                                                           |
| D5-6 | A-006  | Ein Playwright-Projekt prüft die Hauptseiten gegen den Produktions-Build ohne Vorschau; ein CI-Job führt es aus.                                                                                                                                                                                                                            |

## Pakete

| Paket | Inhalt             | Hauptdateien                                                                             |
| ----- | ------------------ | ---------------------------------------------------------------------------------------- |
| D1a   | Kern, Regeltabelle | `src/domain/spaced-repetition.ts`, `src/domain/testing/repetition-rule-table.ts`         |
| D1b   | LernBox            | `src/domain/learning-box.ts` (`processLearningBoxResult`)                                |
| D1c   | Lernwörter         | `src/domain/learning-word-progress.ts`                                                   |
| D1d   | Mathe, Ereignisse  | `src/domain/math-practice.ts` (`mathReviews`), `src/domain/leitner-schedule.ts`          |
| D2    | Diagnostik         | neue Domänenmodule, `src/storage/daily-plan.ts`, `app/lernen`                            |
| D3    | Lehrerbereich      | `app/lehrer`, `app/ui/shell`, `src/storage/teacher-*`, Geräte-Abgleich                   |
| D4    | Auftrags-QR        | `src/domain/practice-bridge.ts`, Lehrer-Material, `app/components/learning-word-app.tsx` |
| D5-x  | je Befund          | siehe Tabelle D5                                                                         |

## Prüfungen

- Gezielte Unit-Tests je Paket, `npm run lint`, `npm run typecheck`,
  `npm run format:check`.
- Gebündelter Browserlauf nach dem Zusammenführen (`npm run build`, betroffene
  Spezifikationen mit `--project=desktop-chromium --project=mobile-chrome`).
- Die vollständige Cross-Browser-Suite in GitHub bleibt verpflichtend.

## Stand der Umsetzung

Stand: 27.10.2026. Alle Pakete D1 bis D5 sind umgesetzt. D2 und D3 sind als
Vorschau in Freigabebereichen hinterlegt. Die Vorschläge unten warten auf
Entscheidungen des Entwicklers.

**D1 umgesetzt.** Der Kern liegt in `src/domain/spaced-repetition.ts`.
LernBox, Lernwörter, Mathe und die Ereignisableitung delegieren dorthin. Alle
bestehen die Regeltabelle `src/domain/testing/repetition-rule-table.ts`.
Verhaltensänderung gibt es nur in der Ereignisableitung:

- kein Aufstieg vor der Fälligkeit;
- eine richtige Antwort in derselben Runde nach einem Fehler schließt ihn
  nicht mehr;
- Selbsteinschätzung höchstens Box 3.

**D2 umgesetzt als Vorschau** (Freigabebereich `diagnostik`): `/lernen/startpunkt`,
`/lernen/training`, `/lernen/profil`. Domänen: `src/domain/active-time.ts`,
`src/domain/competence-profile.ts`, `src/domain/daily-training.ts`,
`src/domain/start-point.ts`.

- Das Training plant nur die offenen Elemente der Tagesportion, höchstens 20.
- Die Uhr läuft nur auf der Trainingsseite.
- Kopfrechnen kann nicht vorbelegt werden (keine URL-Parameter).
- „Sicher“ je Teilbereich: mindestens 5 Einträge, 80 % davon sicher.

**D3 umgesetzt** (Freigabebereich `lehrer-geraet`, Vorschau):

- Gerätetyp „Mein Gerät“ oder „Tafel“. Der Tafelmodus zeigt nur Material.
- Auf der Tafel übernimmt der Geräte-Abgleich nur `contentPackages`.
- Beim Wechsel zur Tafel bietet die App an, Personendaten auf dem Gerät zu
  löschen.
- PIN-Sperre: 6 Ziffern, PBKDF2, Sperre nach 15 Minuten ohne Nutzung.
- Wartezeit (Entscheidung des Entwicklers): Nach 5 falschen Eingaben ist die
  Eingabe 1 Minute gesperrt, danach gibt es wieder 5 Versuche. Zähler und Ende
  der Wartezeit liegen lokal (`lernraum.lehrer-sperre-versuche`), Neuladen
  hebt sie nicht auf; die richtige PIN setzt den Zähler zurück. „PIN
  vergessen“ bleibt möglich.

**D4 umgesetzt.** `/lehrer/material/wortauftrag` erzeugt einen Link
`/frei/german?woerter=…&auftrag=…`, höchstens 500 Zeichen. Der Druck erfolgt
als Kärtchen. Aufträge werden nicht gespeichert.

**D5 umgesetzt.**

- D5-1 (C-001): Rundenschutz bei Logo, Leiste, Zurück-Pfeil und Geste.
  „Weitermachen“ für Wortspeicher, LernBox, Kopfrechnen und Laufdiktat allein.
  Die Tastenwelt hat nur die Rückfrage.
- D5-2 (C-003): Erstkontakt mit „Loslegen“ und Tastatur-Merkmal.
- D5-3 (C-007): Kinder-Glossar `src/domain/child-glossary.ts` mit Test.
  Anleitungen haben einen Vorlese-Knopf, nur mit lokalen Stimmen.
- D5-4 (C-008): „neu“ statt „erledigt“. Der Wortspeicher-Abschluss nennt, wann
  die Fehlerwörter wiederkommen, und bietet „Diese Wörter jetzt noch einmal
  üben“ an (freies Üben, ändert keine Box). Leerer Tag: „Heute ist noch nichts
  geplant“.
- D5-5 (D-012): Tempo-Punkte nur mit `showTempoPoints`, Standard aus.
  Projektionsmodus „Für die Tafel“. Sterne im Laufdiktat allein abschaltbar.
- D5-6 (A-006): `playwright.production.config.ts` prüft gegen den Build in
  `wrangler dev`. CI-Job `production`.

### Offene Entscheidungen des Entwicklers

- Freigabe `lehrer-geraet` auf `frei` setzen.
- Längengrenze des Wortauftrags (500 Zeichen) und Speichern der Aufträge.
- Stufenfolgen des Startpunkts und Regel „sicher“.
- Mündliches Aufdecken als Abruf werten.
- Uhr über Module hinweg.
- „Häufigste Fehler“ in der Projektion.
- Battle-Text „Wer zuerst fertig ist, gewinnt“.
- „Beenden“ bietet 24 Stunden lang „Weitermachen“ an.
- Cloud-Abgleich und WebDAV aus den Kindereinstellungen verschieben.
- Produktions-Browserlauf auch mobil ausführen.

### Prüfstand

- Unit-Tests, Lint, Format, Typprüfung, Build und Server-Rendering grün.
- Browser: vollständige Suite in Desktop-Chromium und die neuen bzw.
  geänderten Specs in Mobil-Chromium grün; Firefox, WebKit und der neue Job
  `production` laufen erst in GitHub.
- Designvergleich lokal gegen den Stand vor Welle 3: Nur `9d-gaps` ist
  zusätzlich rot. Grund ist die bewusste Glossar-Änderung im Titel („Runde 2 ·
  Schreiben“ statt „Durchgang 2 · Schreiben“). Die Referenz wird im Pull
  Request über das Label `design-referenzen-erneuern` erneuert.
