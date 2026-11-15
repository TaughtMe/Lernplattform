# Vision Lernraum – Rolle 25: Lehrkraft-Alltag und Steuerung

Stand: 10.11.2026. Grundlage: Code der Version 0.9.7, Berichte 10, 11 und 12,
die Antworten des Entwicklers in `01-planung.md`, Abschnitt 4, einschließlich
„Nachtrag nach Phase 1“. Kennzeichen: [Beleg] Repository, [Fachstand] Quelle
außerhalb, [Vermutung] plausibel, nicht belegt, [Empfehlung] Vorschlag dieser
Rolle. Zeitangaben für heutige Abläufe sind geschätzt, nicht gemessen.

Es gilt der Nachtrag des Entwicklers: **Auf fremden Geräten üben die Kinder
frei. Bedingte Aufgaben (Tagesportion, Wiederholung aus eigenen Fehlern) sind
für feste Geräte.** Der Prüfstein heißt deshalb doppelt: auf dem fremden Gerät
„freies Üben, das ohne Vorbereitung sinnvoll und altersgerecht ist“, auf dem
eigenen Gerät „genau das, was das Kind braucht“.

## 1. Kurzfazit

1. Heute scheitert der Prüfstein auf fremden Geräten nicht an fehlenden
   Funktionen, sondern an vier bis fünf Entscheidungen, die das Kind allein
   trifft, und an Inhalten, die bei Grundschulniveau enden.
2. Der kleinste wirksame Baustein ist ein **Schnellstart** auf `/lernen`: Fach
   wählen, Startpunkt (etwa zwei Minuten), danach öffnet sich die passende Übung
   _schon eingestellt_, mit Uhr. Das trägt auf jedem Gerät ohne Konto und ohne
   Vorbereitung.
3. Für die Lehrkraft fehlt die **Drei-Tipp-Wahl**: Sie stellt auf dem Gerät des
   Kindes in drei Tipps Thema und Niveau ein. Das ist schneller als jeder QR.
4. Aufgaben der Lehrkraft führen heute nur auf die Fachseite; das Feld
   `materialId` wertet die Schülerseite nicht aus, „erledigt“ ist reine
   Selbstauskunft [Beleg]. Ein Auftrag muss die Übung direkt öffnen, sonst ist
   er langsamer als ein Arbeitsblatt.
5. Für Rückmeldung reicht in Stufe 1 das, was schon gebaut ist: Das Kind zeigt
   sein Kompetenzprofil. Ein QR-Kurzbericht ist Stufe 2 und erst nach Klärung
   des Einsatzrahmens (S1) sinnvoll.
6. Koffer-Geräte brauchen einen Dauerzustand „Klassengerät“: kein persönlicher
   Lernstand, jede Sitzung beginnt mit dem Schnellstart. Der heutige Gastmodus
   verlangt dafür jedes Mal einen Gast-QR mit angelegter Klasse.
7. Für Kolleginnen und andere Schulen zählt ein Ein-Knopf-Start „Kopfrechnen
   live“ und eine Seite für die Schulleitung mehr als jede neue Funktion.
8. Vor dem Weiterbauen sollte der Entwickler vier Wochen lang drei Dinge
   beobachten: Gerätelage, die ersten drei Minuten auf einem fremden Gerät und
   den Übungsrhythmus auf eigenen Geräten.

## 2. Ist-Stand in Lernraum

### 2.1 Was es für die Steuerung gibt

| Werkzeug                   | Was es kann                                                                                                     | Grenze im Alltag                                                                                                                                                                                     | Beleg                                                                                                                     |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Live-Raum                  | Code oder QR, Tier, Laufdiktat, Kopfrechnen, Stationen, Battle; Projektion ohne Namen mit häufigsten Fehlern    | Ablauf in vier Schritten (Inhalt, Einstellungen, Lobby, Live); ohne Inhalt sind Einstellungen und Lobby gesperrt                                                                                     | `app/lehrer/live/teacher-live-room.tsx`, Z. 374; `app/lehrer/live/dictation-adapter.ts`, Z. 34–39; `live-projection.ts`   |
| Freigabe an Schüler        | Vokabelpaket oder Lernwortliste (≤ 200 Wörter), verschlüsselt, Code oder QR, 24 Stunden                         | keine Texte, keine Rechenvorgaben                                                                                                                                                                    | Bericht 10, 2.1; Welle 3, D4                                                                                              |
| Aufgaben der Lehrkraft     | Titel, Anleitung, Fach, optional Material, Fälligkeit, an Klassen oder einzelne Mitgliedschaften; statischer QR | Kind braucht eine Einschreibung auf **diesem** Gerät; der Knopf führt nur zur Fachseite (`SUBJECT_ROUTES`); `materialId` wird nicht ausgewertet; „Als erledigt markieren“ erzeugt den Abgabenachweis | `src/domain/student-assignment.ts`, Z. 28–41; `app/components/student-assignments.tsx`, Z. 26–32, 104–131                 |
| Gast-QR                    | 90 Minuten gültig, Gerät löscht Schülerdaten am Ende oder nach 12 Stunden                                       | nur mit angelegter Klasse und Klassenstempel; Gast tritt keiner Klasse bei                                                                                                                           | `src/domain/guest-pass.ts`, Z. 25–80; `app/components/teacher-class-configurator.tsx`, Z. 90; `src/storage/guest-mode.ts` |
| Klassen                    | Klasse anlegen, Kinder **einzeln** hinzufügen, QR-Bogen, Archiv                                                 | kein Einfügen einer Namensliste (Audit K8: am Code bestätigt), kein „ins neue Schuljahr übernehmen“                                                                                                  | `app/views/lehrer/classes-screen.tsx`, Z. 318–384; `teacher-class-configurator.tsx`, Z. 269–278, 358–370                  |
| Startpunkt, Training       | Startpunkt ≤ 12 Aufgaben; Training 10 oder 20 Minuten aktive Zeit                                               | nicht verlinkt (Lücke, wird außerhalb des Vision-Laufs behoben); Vorschlag wird nicht eingestellt; Stufen enden bei „bis 1000“ und „s/ss/ß“                                                          | Bericht 10, 2.1 und 4; `src/domain/start-point.ts`, Kopfkommentar; `daily-training.ts`, Z. 27; Nachtrag Nr. 3             |
| Kopfrechnen frei           | Zahlenraum, Rechenarten, Lücken frei wählbar                                                                    | keine Adressparameter: Eine Lehrkraft kann keine Einstellung vorgeben                                                                                                                                | `app/frei/mathematics/page.tsx`; Suche nach `searchParams` dort ohne Treffer                                              |
| Lehrerbereich am Kindgerät | Startseite blendet „Lehrerbereich“ nur im Gastmodus aus                                                         | Gibt die Lehrkraft ihr eigenes Tablet weiter, ist `/lehrer` mit Namen offen; Tafelmodus und PIN sind nur Vorschau                                                                                    | `app/landing/start-page.tsx`, Z. 25–37; `src/domain/release.ts`, Z. 111 (`lehrer-geraet`); Entscheidung 43                |

### 2.2 Die fünf Szenarien am heutigen Stand

„Fremd“ heißt geteiltes Gerät ohne Lernstand (mit oder ohne Gastmodus), „eigen“
heißt festes Gerät mit Lernstand. Ab Startseite gezählt.

| Szenario                                | Lage  | Handgriffe heute                                                                                                   | Dauer bis zur ersten sinnvollen Aufgabe [Vermutung] | Bruchstelle                                                                                                                |
| --------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Nachsitzen (ein Kind, 20 Min.)          | fremd | Lehrkraft gibt ihr Tablet; Kind tippt Tier, „Loslegen“, wählt Bereich, Wortbox oder Zahlenraum, Stufe, Rundengröße | 2–4 Min., Wahl oft zu leicht                        | Kind wählt selbst; für Jahrgang 7–9 kaum passende Stufe; auf dem Lehrertablet ist der Lehrerbereich erreichbar             |
|                                         | eigen | „Weiterlernen“ öffnet das erste Portionselement                                                                    | unter 1 Min.                                        | Portion reicht 7–25 Min.; keine Uhr auf diesem Weg; ohne Lernwortlisten nur Wiederholung (Bericht 10, 4c)                  |
| Vertretung in fremder Klasse (45 Min.)  | fremd | Raum „ohne Klasse“ öffnen, Inhalt eintippen oder Kopfrechnen einstellen, Lobby, Start                              | 3–6 Min. für den Raum                               | kein Gast-QR ohne eigene Klasse; Vertretung kennt keinen Stand der Klasse (Audit E-008)                                    |
|                                         | eigen | wie fremd; Kinder können danach im freien Üben weitermachen                                                        | 3–6 Min.                                            | Aufgaben der Klassenlehrkraft erreichen die Vertretung nicht                                                               |
| Förderstunde mit vier Kindern (45 Min.) | fremd | Lehrkraft geht zu jedem Gerät und sagt, was es wählen soll                                                         | 5–8 Min. für vier Kinder                            | keine Vorgabe möglich außer Lernwortliste per Code; Mathe und Text nicht steuerbar                                         |
|                                         | eigen | Lernwortliste per Freigabe-Code (24 h) oder Aufgabe per QR                                                         | Vorbereitung 5–10 Min.                              | Aufgabe öffnet nur die Fachseite; Erfolg sieht die Lehrkraft nur als „erledigt“                                            |
| Hausaufgabe                             | fremd | Handy zu Hause hat keinen Stand; Kind übt frei                                                                     | –                                                   | kein Nachweis außer Selbstauskunft; Ergebnis bleibt auf dem Handy                                                          |
|                                         | eigen | Aufgabe per QR im Unterricht übernehmen, zu Hause erledigen, Abgabe-QR am nächsten Tag zeigen                      | Übernahme 1 Min. je Kind                            | Abgabe-QR zeigt nur „erledigt“, nicht was geübt wurde; Stand zu Hause und in der Schule getrennt, wenn es zwei Geräte sind |
| Frühfertige im Unterricht (5–15 Min.)   | fremd | wie Nachsitzen                                                                                                     | 2–4 Min., also ein Drittel der Restzeit             | Einstieg zu lang für kurze Fenster; Zwischenstand geht im Gastmodus verloren                                               |
|                                         | eigen | „Weiterlernen“                                                                                                     | unter 1 Min.                                        | trägt, wenn die Portion gefüllt ist                                                                                        |

**Ergebnis:** Auf eigenen Geräten trägt der Prüfstein schon fast (Portion,
Weitermachen, Training). Auf fremden Geräten fehlt eine Spur, die das Kind
ohne Entscheidungen in eine passende Übung bringt.

### 2.3 Fehler und Ergänzungen zu Bericht 10

- Bericht 10 nennt die Aufgaben „strukturierte Aufträge“. Strukturiert ist nur
  das Datenformat. Inhaltlich ist es Freitext mit Fach; die Schülerseite öffnet
  die Fachübersicht, nicht das Material [Beleg, 2.1]. Das Audit hatte das als
  E-002 (3) beschrieben; es gilt weiter.
- Ergänzung: Kopfrechnen lässt sich nicht vorbelegen, weder per Adresse noch
  per Freigabe. Damit hat Mathe heute **keinen** Steuerweg außerhalb des
  Live-Raums.
- Ergänzung: K8 (Namensliste einfügen) ist nicht „ungeprüft“, sondern offen:
  Kinder werden einzeln angelegt.

## 3. Fachstand und Vorbilder

| Aussage                                                                                                                                                                                                      | Kennzeichen                                                | Quelle                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Bayern stattet ab 2024/25 an Mittel-, Real-, Wirtschaftsschulen und Gymnasien jährlich bis zu zwei Jahrgangsstufen mit mobilen Geräten aus („Digitale Schule der Zukunft“); 2025/26 kommen 480 Schulen dazu. | [Fachstand], Suchauszug, Primärseite nicht gelesen         | km.bayern.de/digitale-schule-der-zukunft/allgemein; regierung.oberpfalz.bayern.de, „Zahlen, Daten und Fakten 2025/2026“ (abgerufen 10.11.2026) |
| Für 2025 gibt es eine Förderung für schulische Leihgerätepools (rund 72 Mio. Euro).                                                                                                                          | [Fachstand], Suchauszug                                    | Regierung der Oberpfalz, ebd.                                                                                                                  |
| Folgerung: In der Mittelschule stehen 1:1-Jahrgänge (meist ab 7/8, laut Audit E-001) neben Klassen mit Leihpool oder Koffer. Beide Lagen sind Alltag, oft in derselben Schule.                               | [Vermutung], deckt sich mit Antwort zu Frage 2             | Audit `agent-e-schularten.md`, E-001                                                                                                           |
| Unterrichten mit digitalen Medien ist für rund 70 % der Lehrkräfte selbstverständlich; nur rund 30 % haben es in der Ausbildung gelernt.                                                                     | [Fachstand], Suchauszug                                    | ICILS 2023, Meldung Uni Paderborn (uni-paderborn.de/nachricht/143045, abgerufen 10.11.2026)                                                    |
| Lehrkraft-Werkzeuge verlangen fast immer ein Lehrkonto; konto-freier Kind-Einstieg ist selten.                                                                                                               | [Fachstand], aus Bericht 11                                | Bericht 11, 3.2 (a)                                                                                                                            |
| Kahoot, Blooket und Gimkit werden für schnelles Wiederholen gelobt; die Wirkungsstudie wird vom Anbieter beworben.                                                                                           | [Fachstand], umstritten                                    | Bericht 11, 3.3                                                                                                                                |
| Ein freiwilliger Wochenrückblick des Kindes (Vorbild Zearn) ist ein gangbarer Rückkanal ohne Konto.                                                                                                          | [Fachstand], Anbieterquelle                                | Bericht 11, W-3                                                                                                                                |
| Werkzeuge verschwinden, wenn sie Vorbereitung kosten, im entscheidenden Moment haken oder nichts zurückgeben.                                                                                                | [Vermutung], Erfahrungswissen; Audit E-003 nennt es ebenso | Audit `agent-e-schularten.md`, Abschnitt 7                                                                                                     |

Belastbare Zahlen zu Geräten je Kind in bayerischen Mittelschulen und
Berichte von Lehrkräften über das Scheitern von Lern-Apps habe ich nicht
gefunden: **ungeprüft**.

**Wer es gut macht:** Kahoot und Blooket beim Start in Sekunden (aber mit
Lehrkonto), Anton bei „Thema in drei Tipps“ (mit Konto), Orthografietrainer.net
bei Rechtschreibung ab Klasse 5 (Bericht 11). Lernraum kann beides ohne Konto
verbinden, wenn die Wahl auf dem Kindgerät geschieht.

## 4. Zielbild

### 4.1 Grundsatz

Zwei Spuren, ein Einstieg:

- **Fremdes Gerät → freies Üben mit Schnellstart.** Nichts wird über das Kind
  gewusst. Das Gerät findet in zwei Minuten einen Startvorschlag oder die
  Lehrkraft wählt in drei Tipps. Danach läuft eine eingestellte Übung mit Uhr.
  Ergebnis: eine Startkarte zum Abfotografieren oder Mitnehmen, kein
  gespeicherter Lernstand.
- **Eigenes Gerät → bedingte Aufgaben.** Tagesportion, Wiederholung aus eigenen
  Fehlern, Lernwortlisten und Aufträge der Lehrkraft. Das Kind kann seinen Stand
  zeigen.

Kein Schritt verlangt ein Konto, eine Registrierung oder eine Vorbereitung.

### 4.2 Kind

| Lage  | Was das Kind erlebt                                                                                                                                                                                                |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| fremd | Tier antippen, Karte „20 Minuten üben“. Drei Fächer (Rechtschreibung, Kopfrechnen, Vokabeln mit Englisch-Grundwortschatz, sobald vorhanden). Kurzer Startpunkt, dann sofort die Übung. Am Ende „Deine Startkarte“. |
| eigen | „Weiterlernen“ mit Uhr. Aufträge der Lehrkraft öffnen direkt die Übung. „Meinen Stand zeigen“ öffnet das Kompetenzprofil in einer ruhigen Ansicht für die Lehrkraft.                                               |

### 4.3 Lehrkraft

| Situation     | Was die Lehrkraft tut                                                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| spontan       | Tablet geben, „Lehrkraft wählt“ antippen, Fach, Thema, Niveau. Oder nichts tun: Schnellstart.                                          |
| Gruppe        | Gedruckte Übungskarten mit QR für mitgelieferte Übungen („ss/ß, Stufe 3“, „Einmaleins 6–9“). Einmal drucken, jedes Jahr wieder nutzen. |
| eigene Wörter | Lernwortliste per Freigabe-Code wie heute.                                                                                             |
| feste Geräte  | Auftrag mit Übung und Ziel („3 Runden, Wortliste Woche 12“); Abgabe-QR mit „3 von 3 Runden“.                                           |
| Rückmeldung   | Stufe 1: Kind zeigt Profil. Stufe 2 (nach S1): QR-Kurzbericht je Phänomen, Ablage mit Löschfrist, Klassenzählung ohne Namen.           |
| Gerätepflege  | Koffer-Gerät einmal als „Klassengerät“ markieren.                                                                                      |

### 4.4 Die fünf Szenarien als Ablauf

**Nachsitzen, fremdes Gerät (Lehrkraft-Tablet im Tafelmodus oder Koffer-Gerät):**

| Zeit       | Lehrkraft                           | Kind                                           | Gerät                                                                    |
| ---------- | ----------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------ |
| 0:00       | gibt Tablet, sagt „Rechtschreibung“ | tippt Tier, „20 Minuten üben“                  | Lehrerbereich ist gesperrt (PIN oder Tafelmodus)                         |
| 0:30       | –                                   | wählt Rechtschreibung                          | Startpunkt, höchstens 12 Wörter                                          |
| 2:30       | –                                   | –                                              | öffnet die vorgeschlagene Wortbox mit Stufe, Uhr läuft                   |
| 2:30–20:00 | arbeitet am Schreibtisch            | übt; Fehler kommen in derselben Sitzung wieder | zählt aktive Zeit, wechselt nach 8–10 Min. in eine zweite passende Übung |
| 20:00      | schaut kurz drauf                   | zeigt die Abschlussseite                       | „Heute geübt: ss/ß, 9 von 12 sicher“; Startkarte; Daten werden gelöscht  |

**Nachsitzen, eigenes Gerät:** 0:00 „Weiterlernen“ → 0:20 Portion mit Uhr (20
Min.); reicht sie nicht, füllt der Schnellstart den Rest mit neuem Stoff auf
Höhe des Profils. 20:00 Kind zeigt „Meinen Stand“.

**Vertretung in fremder Klasse:**

| Zeit        | Lehrkraft                                                          | Kind                                       | Gerät                                          |
| ----------- | ------------------------------------------------------------------ | ------------------------------------------ | ---------------------------------------------- |
| 0:00        | „Kopfrechnen live“ (ein Knopf, Jahrgang wählen), Code an die Tafel | gibt Code ein, Tier                        | Raum ohne Klasse, Vorgabe passend zum Jahrgang |
| 1:00–15:00  | Live-Runde, Projektion ohne Namen                                  | rechnet                                    | häufigste Fehler an der Tafel                  |
| 15:00–40:00 | sagt „Schnellstart, Fach eurer Wahl“                               | fremd: Schnellstart; eigen: „Weiterlernen“ | wie oben                                       |
| 40:00       | notiert die häufigsten Fehler für die Klassenlehrkraft             | –                                          | Raum-CSV auf Klick                             |

**Förderstunde mit vier Kindern:**

| Zeit        | Lehrkraft                                                                | Kind                     | Gerät                                                                   |
| ----------- | ------------------------------------------------------------------------ | ------------------------ | ----------------------------------------------------------------------- |
| 0:00–2:00   | legt vier Übungskarten hin oder wählt an jedem Gerät mit drei Tipps      | scannt Karte oder wartet | öffnet die Übung eingestellt; fremd ohne Speichern, eigen mit Lernstand |
| 2:00–35:00  | arbeitet mit einem Kind mündlich, die anderen üben                       | übt                      | Uhr, Fehler kommen wieder                                               |
| 35:00–40:00 | lässt sich die Abschlussseite oder das Profil zeigen, notiert auf Papier | zeigt                    | fremd: Startkarte für das nächste Mal; eigen: Profil                    |

**Hausaufgabe (nur eigenes Gerät sinnvoll):**

| Zeit                 | Lehrkraft                                       | Kind              | Gerät                                                  |
| -------------------- | ----------------------------------------------- | ----------------- | ------------------------------------------------------ |
| Unterricht, 1 Min.   | zeigt Auftrags-QR: „Lernwortliste 12, 3 Runden“ | scannt            | Auftrag liegt unter „Meine Aufgaben“                   |
| zu Hause, 15–20 Min. | –                                               | tippt den Auftrag | öffnet genau diese Übung, zählt Runden                 |
| nächster Tag, 5 Min. | scannt im Fortlaufmodus                         | zeigt Abgabe-QR   | Lehrergerät: „3 von 3 Runden“ je Kind, kein Fehlerwort |

Fremdes Gerät zu Hause (Familienhandy): freies Üben ohne Nachweis. Das ist in
Ordnung und wird so gesagt.

**Frühfertige im Unterricht:** fremd: 0:00 Schnellstart, beim zweiten Mal mit
Startkarte (QR auf Papier) → 0:30 Übung läuft; eigen: 0:00 „Weiterlernen“.
Jede Übung ist nach 5 Minuten sinnvoll abschließbar (Zwischenstand,
Entscheidung 57 bleibt unberührt).

### 4.5 Prüfstein

| Lage          | Trägt das Zielbild?                                                     | Warum                                                                                          |
| ------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| fremdes Gerät | ja, wenn L25-1 bis L25-3 gebaut sind und Inhalte bis Jahrgang 9 reichen | Keine Entscheidung beim Kind außer dem Fach; Startpunkt findet das Niveau; Uhr hält 20 Minuten |
| eigenes Gerät | ja, heute fast                                                          | Portion plus Auffüllen durch den Schnellstart; Training verlinkt (Nachtrag Nr. 3)              |
| Live-Raum     | ja                                                                      | ein Knopf statt vier Schritte                                                                  |

Die größte Abhängigkeit liegt außerhalb dieser Rolle: Ohne Startpunkt-Stufen
und Inhalte für Jahrgang 5 bis 9 ist „altersgerecht“ nicht erfüllt (Rollen 20,
22, 23).

### 4.6 Die vier Wege, das Kind ohne Konto zu kennen (Kernfrage 2)

| Weg                                           | Alltagstauglich?                                                                                                                                                                                                    | Bewertung                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| (a) Startpunkt vor Ort, zwei Minuten          | ja; trägt jeden Tag, kostet keine Vorbereitung; Grenze: zwei Minuten sind in fünf Restminuten viel                                                                                                                  | **Standard auf fremden Geräten**                          |
| (b) Lehrkraft wählt mit drei Tipps            | ja, wenn die Lehrkraft das Kind kennt; schneller als (a); braucht klare Themenliste nach Jahrgang                                                                                                                   | **Standard, wenn die Lehrkraft daneben steht**            |
| (c) Kind bringt Stand mit                     | als **Startkarte** (QR mit nur Fach, Thema, Stufe, ohne Namen, ohne Fehler) ja: Foto im Heft oder Zettel. Als Datei mit Lernstand nein: Dateien gehen auf Schul-iPads verloren, Kinder finden sie nicht [Vermutung] | Startkarte als Zusatz; Lernstand-Datei nicht              |
| (d) Lernstand reist verschlüsselt über Server | scheitert heute an S1, RL-3, Aufwand L und Betrieb; widerspricht dem Nachtrag (fremd = frei üben)                                                                                                                   | **später**, nur nach S1 und Beobachtung (Audit M.8 Nr. 1) |

### 4.7 Rückmeldung (Kernfrage 4)

Maßstab: Was mache ich morgen anders?

| Auskunft                                                               | Morgen anders                                                | Form                                                                                      | Stufe               |
| ---------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ------------------- |
| 1. Woran übt das Kind, und was ist sicher (je Phänomen oder Rechenart) | Förderstunde und Gruppen bilden                              | Kind zeigt Profil (gebaut); später QR-Kurzbericht nur mit Phänomen und Anzahl (R12-7)     | 1 sofort, 2 nach S1 |
| 2. Hat das Kind in dieser Woche geübt (Tage, nicht Minuten)            | mit dem Kind über die Routine sprechen statt über Ergebnisse | eine Zeile im Kurzbericht                                                                 | 2                   |
| 3. Wo hängt die Klasse                                                 | nächste Stunde mit dem häufigsten Fehler beginnen            | Projektion im Live-Raum (gebaut); später Zählung aus gesammelten Kurzberichten ohne Namen | 1 sofort, 2 nach S1 |

**Datenballast:** Einzelfehlerlisten über Wochen, Minuten je Aufgabe,
Klickverläufe, Prozentwerte, Zeitreihen je Kind, Ranglisten, „Braucht Hilfe“
außerhalb des Live-Raums. Daraus folgt keine Handlung, aber eine
Aufbewahrungspflicht (Bericht 12, 5.1).

### 4.8 Lebenszyklus, Geräte, Verbreitung (Kernfragen 5 bis 7)

| Thema                      | Heute [Beleg]                                                      | Was fehlt [Empfehlung]                                                                      |
| -------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Erste Kollegin, 5 Minuten  | Live-Raum in vier Schritten; Inhalt nötig                          | Ein-Knopf-Start (L25-10), eine Seite Kurzanleitung (L25-14)                                 |
| Klassen-, Schuljahrwechsel | Kinder einzeln anlegen, neue QR-Codes, neues Scannen (Audit E-008) | Namensliste einfügen, Klasse übernehmen (L25-11)                                            |
| Vertretung                 | Raum ohne Klasse; kein Gast-QR ohne eigene Klasse                  | Vertretungskarte ohne Personendaten (L25-12); bis dahin Live-Raum plus Schnellstart         |
| Elterninformation          | keine                                                              | aus dem Schulpaket (R12-2): eine Seite, einfache Sprache                                    |
| Klassensatz, Koffer        | Gerät = Kind; Gastmodus je Stunde mit Gast-QR                      | Klassengerät-Modus (L25-8)                                                                  |
| Eigene Geräte              | Lernstand nur dort; Sicherung per Datei, Abgleich ruht             | nichts Neues; Speicherschutz ist gebaut                                                     |
| Tafel                      | Tafelmodus nur Vorschau                                            | Freigabe (L25-9)                                                                            |
| Handy zu Hause             | eigener, getrennter Lernstand                                      | ehrlich sagen: zu Hause freies Üben; Aufträge nur auf dem Gerät, das sie übernommen hat     |
| Schulleitung               | Impressum untersagt Schulbetrieb (Bericht 12)                      | eine Seite: Was ist es, welche Daten wohin, was entscheidet die Schule, „Nur lokal“ möglich |
| Kollegium, Bezirk          | Begeisterung für Kopfrechnen live (Antwort Frage 5)                | Kopfrechnen live als Türöffner, Kurzanleitung in der App, keine Hilfezusage (Frage 8)       |

Ungeprüfte Annahmen (Audit M.9): Kamera auf Schul-iPads für QR frei, deutsche
Systemstimme vorhanden, App installiert, Speicher wird nicht geleert,
Hardwaretastatur vorhanden. Jede QR-Lösung dieses Berichts hängt an der
Kamera; die Drei-Tipp-Wahl (L25-3) nicht.

## 5. Konkrete Bausteine

| Nr.    | Baustein                                                                                                                                                                                  | Nutzen und Szenario                                                                            | Entw. | Prüfaufwand  | Abhängigkeiten                                           | Berührte Entscheidungen                  |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----- | ------------ | -------------------------------------------------------- | ---------------------------------------- |
| L25-1  | **Schnellstart „20 Minuten üben“** auf `/lernen`: Fach → Startpunkt → Übung eingestellt (Wortbox und Stufe, Rechenart und Zahlenraum) → Uhr; Wechsel in zweite Übung nach 8–10 Min.       | Prüfstein fremd; Nachsitzen, Frühfertige, Vertretung                                           | M     | S (Texte)    | Verlinkung (Nachtrag Nr. 3); Startpunkt-Stufen Jgst. 5–9 | 46, 57, 59                               |
| L25-2  | **Startvorschlag übernehmen**: Der Startpunkt stellt die Übung selbst ein, auch bei Mathe                                                                                                 | Ein Fehler weniger beim Kind; Grundlage für L25-1                                              | S     | kein         | –                                                        | 59 (Welle 3, D2)                         |
| L25-3  | **Drei-Tipp-Wahl „Lehrkraft wählt“** auf dem Kindgerät: Fach, Thema, Niveau; Themenliste nach Jahrgang                                                                                    | Förderstunde, Nachsitzen; schneller als QR                                                     | S–M   | S (Liste)    | Themenliste der Fachrollen                               | 41                                       |
| L25-4  | **Übungskarten-QR für mitgelieferte Übungen**: QR trägt nur Kennungen (Wortbox, Stufe, Rechenvorgabe, Text-ID), keine Wörter; druckbarer Bogen                                            | Gruppenarbeit ohne Lehrergerät; jedes Jahr wiederverwendbar                                    | S–M   | S            | Adressparameter für Kopfrechnen                          | **Vorlage zu Welle 3, D4** (siehe 7, F2) |
| L25-5  | **Auftrag öffnet die Übung**: `materialId` und Vorgaben auswerten; Ziel „n Runden“; Abgabe zählt erledigte Runden statt Selbstauskunft                                                    | Hausaufgabe, Förderstunde auf festen Geräten                                                   | M     | kein         | L25-4 (gleiche Kennungen)                                | 19, 44, 45                               |
| L25-6  | **Startkarte** am Ende des Schnellstarts: QR und Klartext „Rechtschreibung ss/ß, Stufe 3“, ohne Namen und ohne Fehler                                                                     | Frühfertige und Förderstunde auf Koffer-Geräten beim zweiten Mal                               | S     | kein         | L25-4 (liest dieselben Kennungen)                        | 2, 9                                     |
| L25-7  | **„Meinen Stand zeigen“**: ruhige Profilansicht für die Lehrkraft, ohne Fehlerwörter                                                                                                      | Rückmeldung Stufe 1 ohne Datenfluss                                                            | S     | kein         | Verlinkung des Profils                                   | 2, 4 (keine Übermittlung)                |
| L25-8  | **Klassengerät-Modus**: Lehrkraft markiert ein Koffer-Gerät einmal; danach kein persönlicher Lernstand, Daten löschen nach jeder Sitzung, kein Lehrerbereich; Start immer im Schnellstart | Koffer und Klassensatz ohne Gast-QR je Stunde; verhindert fremde Fehler in der Portion (E-001) | M     | kein         | L25-1; Gastmodus                                         | 10 (kein Klassen-QR für Profile), 59     |
| L25-9  | **Gerätetyp und PIN freigeben** (`lehrer-geraet` auf `frei`)                                                                                                                              | Nachsitzen auf dem Lehrertablet ohne offene Namensliste                                        | S     | kein         | –                                                        | 43; Welle 3, offene Entscheidung         |
| L25-10 | **„Kopfrechnen live“ mit einem Knopf**: Raum mit Jahrgangsvorgabe ohne Inhaltsschritt                                                                                                     | Vertretung, Einstieg für Kolleginnen in unter 5 Min.                                           | S     | S (Vorgaben) | –                                                        | 38, 52                                   |
| L25-11 | **Namensliste einfügen** und **Klasse ins neue Schuljahr übernehmen** (Mitgliedschaften und Stempel bleiben)                                                                              | Schuljahreswechsel ohne neues Scannen                                                          | S + M | kein         | –                                                        | 3, 44                                    |
| L25-12 | **Vertretungskarte**: QR mit Klassenstempel-Abdruck und Tiernamen, ohne Klarnamen und LRS-Merkmal, damit die Vertretung einen Gast-QR und Klassenraum öffnen kann                         | Vertretung, Förderlehrkraft, Teamteaching                                                      | M     | kein         | R12-9 (Freigabe nicht lesbar im QR)                      | 3, 50; RL-1                              |
| L25-13 | **QR-Kurzbericht** (= R12-7) mit Auskunft 1 und 2, Ablage mit Löschfrist, Klassenzählung ohne Namen                                                                                       | Rückmeldung Stufe 2                                                                            | M     | S            | S1 (R12-1), Phänomen-Zuordnung (Rolle 20)                | **Vorlage zu 4, 5, 6, 10, 41**           |
| L25-14 | **Lehrkraft-Kurzanleitung** in der App (eine Seite: Live-Raum, Schnellstart, Klassengerät) und **Schulleitungsseite** (eine Seite, aus dem Schulpaket R12-2)                              | Verbreitung im Kollegium und Schulamtsbezirk ohne Hilfe des Entwicklers                        | S     | S            | R12-2, R12-3                                             | 9                                        |
| L25-15 | **Beobachtungsbogen** für vier Wochen (Papier, keine Daten aus der App)                                                                                                                   | Grundlage für alle Prioritäten (S14)                                                           | S     | kein         | –                                                        | –                                        |

Reihenfolge [Empfehlung]: L25-15 sofort; dann L25-2, L25-9, L25-10, L25-7
(alles S); dann L25-1 und L25-3; dann L25-8 und L25-11; L25-4, L25-5, L25-6
nach Entscheidung F2; L25-12 und L25-13 nach S1.

## 6. Grenzen und was wir nicht bauen

| Nicht bauen                                                                                | Grund                                                                                                                                             |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Allgemeiner Aufgabenplaner (Wochenpläne, Erinnerungen, Noten, Freitextaufgaben ohne Übung) | Entscheidung 19, eingeschränkt durch 44; jeder Auftrag muss in eine fachliche Übung führen. Grenze: Auftrag = Übung + Ziel + Frist, sonst nichts. |
| Wortauftrag mit Wörtern im Link                                                            | Welle 3, D4 (Rücknahme); eigene Wörter gehen über die Freigabe (24 h)                                                                             |
| Bedingte Steuerung auf fremden Geräten (Portion, Fehlerwiederholung über Tage)             | Nachtrag Nr. 2; das Gerät kennt das Kind nicht                                                                                                    |
| Lernstand-Datei, die das Kind mitbringt                                                    | Im Alltag nicht handhabbar; Startkarte genügt                                                                                                     |
| Lernstand über Server (M.8) und Sitzungsabgleich für Fehlerdaten                           | RL-3; S1 offen; Aufwand L                                                                                                                         |
| Dauerhafte Klassenübersicht mit Namen, „Braucht Hilfe“ außerhalb des Live-Raums            | Entscheidungen 2, 10; Datenballast (4.7)                                                                                                          |
| Haus-Leistungsbrief, Hauspunkte-Abgleich                                                   | Nachtrag Nr. 4: später                                                                                                                            |
| Profile je Kind auf einem Gerät (Tier + Bild-PIN)                                          | Aufwand L, Verwechslungsgefahr; erst nach Beobachtung der Gerätelage                                                                              |
| Hilfezusage für fremde Schulen                                                             | Antwort Frage 8; Kurzanleitung und Schulleitungsseite ersetzen Support                                                                            |

## 7. Offene Entscheidungen für den Entwickler

| Nr. | Frage                                                                                                                           | Empfehlung                                                                                                                                                                                                                                                                                          | Ohne Entscheidung                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| F1  | Soll `/lernen` auf einem Gerät ohne Lernstand den Schnellstart (L25-1) als ersten Weg zeigen statt „Loslegen“ in sechs Kacheln? | Ja. Er setzt den Nachtrag um: fremd = freies Üben, aber ohne Wahlkette. Berührt Entscheidung 46 (Einstieg wächst mit Funktionen) nicht im Widerspruch.                                                                                                                                              | Das Kind wählt weiter vier bis fünf Mal selbst; der Prüfstein trägt fremd nicht.         |
| F2  | Darf ein QR für **mitgelieferte** Übungen kommen (L25-4), der nur Kennungen trägt? Vorlage zu Welle 3, D4.                      | Ja. D4 nahm den Wortauftrag zurück, weil er **eigene Wörter** doppelt neben der Supabase-Freigabe übertrug. Für Kopfrechnen, Wortbox-Stufen und Textbox-Texte gibt es keinen zweiten Weg; die Freigabe kann sie nicht tragen. Bei Annahme: Eintrag ins Entscheidungsprotokoll mit Abgrenzung zu D4. | Mathe und Texte bleiben außerhalb des Live-Raums unsteuerbar; L25-5 hat keine Kennungen. |
| F3  | Soll der Auftrag „erledigt“ aus der Übung ableiten (Runden gezählt) statt aus einem Knopf?                                      | Ja, nur Anzahl Runden, keine Fehler. Vorlage zu Entscheidung 45 („nach dem bewussten Markieren“): Das Kind löst den Abgabe-QR weiter selbst aus.                                                                                                                                                    | Abgabe bleibt Selbstauskunft; Lehrkräfte verlieren nach drei Wochen das Vertrauen.       |
| F4  | Klassengerät-Modus (L25-8) als Dauerform des Gastmodus, ohne Gast-QR je Stunde?                                                 | Ja, einmal pro Gerät von der Lehrkraft gesetzt; zurück nur über den Lehrerbereich. Kein Profil, kein Klassen-QR (Entscheidung 10 gewahrt).                                                                                                                                                          | Koffer-Geräte sammeln Fehler verschiedener Kinder; Portion wird falsch (E-001).          |
| F5  | Rückmeldung zuerst nur als „Kind zeigt Profil“ (L25-7), Kurzbericht (L25-13) erst nach S1?                                      | Ja. Stufe 1 braucht keine Übermittlung und keine Freigabe; sie zeigt in vier Wochen, ob die Lehrkraft mit dem Wissen handelt.                                                                                                                                                                       | Entweder kein Rückkanal oder ein Kurzbericht vor geklärtem Rahmen.                       |
| F6  | `lehrer-geraet` (Gerätetyp, PIN) jetzt freigeben?                                                                               | Ja, vor allem für das Nachsitzen am Lehrertablet.                                                                                                                                                                                                                                                   | Ein Kind am Lehrertablet erreicht die Namensliste.                                       |

### Annahmen dieses Berichts

- Stifte und Tastaturen nicht überall (Frage 2, keine Antwort).
- Ohne Namen und ohne Förderangaben, bis S1 geklärt ist (Frage 4).
- Wenige Stunden Entwicklung, knappe Prüfzeit; Erprobung im Unterricht
  reichlich (Frage 6). Deshalb sind fast alle Bausteine S oder M und im
  Unterricht testbar.

### Beobachtung vor dem Weiterbauen (Kernfrage 8, L25-15)

| Nr. | Was beobachten                                                                                                                                                                   | Wozu                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| B1  | **Gerätelage:** Wie viele Kinder haben ein festes Gerät, wie oft wechseln Koffer-Geräte, ist die Kamera frei, gibt es eine deutsche Stimme, ist die App installiert (Audit M.9)? | entscheidet über das Gewicht von L25-8 gegenüber L25-5   |
| B2  | **Die ersten drei Minuten auf einem fremden Gerät:** Stoppuhr bis zur ersten sinnvollen Aufgabe; wählt das Kind zu leicht, zu schwer, wirkt es kindisch?                         | misst den Prüfstein und den Bedarf an L25-1 und L25-3    |
| B3  | **Übungsrhythmus auf eigenen Geräten:** Üben Kinder ohne Anlass? Was tust du, wenn ein Kind dir sein Profil zeigt?                                                               | prüft die Annahme „fast täglich“ und den Wert von L25-13 |

### Nicht geprüft

- Abläufe im Browser; alle Zeiten sind Schätzungen aus dem Code.
- Ob der Gastmodus auf einem Lehrergerät Lehrerdaten berührt.
- Landesweite Zahlen zu Geräten je Kind in Mittelschulen; Primärseiten des KM
  nicht gelesen (nur Suchauszüge, 10.11.2026).
- Der vollständige ICILS-Bericht zu Hindernissen wie Vorbereitungszeit.
