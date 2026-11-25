# Vision Lernraum – Auftrag an das Expertengremium

Stand: 09.11.2026. Diese Datei fasst ein Gespräch zwischen dem Entwickler (eine
Lehrkraft, die Lernraum allein entwickelt) und Claude zusammen. Sie ist der
Ausgangspunkt für ein Gremium aus KI-Experten, das eine Produktvision erarbeitet.
Alles hier ist **Ausgangsmaterial, kein Ergebnis**: Die Analyse von Claude kann
falsch oder unvollständig sein und soll kritisch geprüft werden.

## Anlass

Das Modell Fable steht einige Tage zum Testen zur Verfügung. Der Entwickler
möchte es nutzen, um Lernraum einen großen Schritt voranzubringen. Ihm fehlt
nach eigener Aussage die Vision, wohin die Reise geht und wie die fertige
Plattform aussieht. Normalerweise würde ein Team aus Fachleuten das erarbeiten;
das kann er nicht stellen. Das Gremium soll diese Rolle übernehmen.
Kolleginnen und Kollegen für Rückmeldungen hat er; sie sind begeistert, vor
allem vom Kopfrechnen im Quizshow-Stil im Live-Raum.

## Ziel in den Worten des Entwicklers (sinngemäß)

- „Die Mega-Plattform für Deutsch, Mathe und Vokabeltraining.“
- Für Lehrkräfte ein umfangreiches, **sicheres Gesamtpaket**, das entlastet:
  gutes Feedback, Aufgabensteuerung, Förderung.
- Für Kinder: Spaß und Motivation.
- Das Wissen etablierter Angebote (Anton, Antolin, Orthographietrainer,
  internationale Angebote) soll in dieser App zusammenlaufen.
- Die Schwächen, die PISA zeigt, löst eine App nicht – aber Lernraum soll
  „den Weg in die richtige Richtung gehen“.
- Antrieb: Chancengerechtigkeit. Die App soll **kostenlos** bleiben und allen
  Kindern die Möglichkeit geben, sich zu verbessern.

## Auslösende Szene (Nordstern-Kandidat)

Ein Kind kam zum Nachsitzen. Der Entwickler wollte ihm das Tablet geben, aber
es gab nichts Sinnvolles, das er ohne Vorbereitung geben konnte. Daraus
abgeleiteter Prüfstein (Vorschlag Claude):

> Tablet in die Hand, ohne Vorbereitung – und das Kind arbeitet 20 Minuten
> sinnvoll an genau dem, was es braucht.

Dafür fehlen nach Claudes Einschätzung: eingebaute Inhalte entlang des
Lehrplans, eine Einstufung, ein „Heute“, das selbst auswählt (fällige
Wiederholung, nächster Lernschritt, Förderung aus eigenen Fehlern). Weitere
Szenarien derselben Art: Vertretungsstunde, Förderstunde, Hausaufgabe,
Frühfertige.

## Festlegungen des Entwicklers aus dem Gespräch

1. **Spontan nutzbar ohne Login bleibt unantastbar.** Das Kopfrechnen im
   Quizshow-Stil (Live-Raum, Beitritt per Code/QR) muss weiter super einfach
   und spontan erreichbar sein. Jede neue Funktion misst sich daran.
2. **Kostenlos, ohne Lizenzkosten.** Einzige laufende Kosten heute: das
   Claude-Konto des Entwicklers. Kostenpflichtige Werkzeuge (z. B. quop) und
   Lizenzinhalte scheiden aus. Rahmen von Claude vorgeschlagen, vom Gremium zu
   prüfen: keine laufenden Kosten über kostenlose Tarife (Cloudflare,
   Supabase) hinaus, keine KI zur Laufzeit (Inhalte entstehen zur
   Entwicklungszeit), nur frei lizenzierte oder selbst erstellte Inhalte.
3. **Lesen wird ein eigener Pfeiler.** Leseflüssigkeit und Leseverständnis
   fehlen heute fast völlig; PISA misst Lesekompetenz am stärksten.
4. **Vokabeln in getrennten Schichten:**
   - Grundwortschatz je Sprache, mitgeliefert;
   - Lehrwerk-Wortschatz: nicht mitlieferbar (Verlagsrecht), Import durch die
     Lehrkraft oder Teilen unter Lehrkräften; jedes Buch hat einen anderen
     Wortschatz;
   - weitere Sprachen außer Englisch;
   - **DaZ** als eigener Bereich mit eigener Didaktik (Alltagswortschatz,
     Bilder, Artikel, Audio, Herkunftssprache als Brücke).
5. **Fehlerbasierte Förderung** soll ausgearbeitet werden: Aufgaben anhand
   der Fehler erstellen, Förderung der Schüler, Rückmeldung an die Lehrkraft.
6. **Deutsch-Übungspakete** sind „ein guter Anfang, aber weder technisch noch
   pädagogisch auf professionellem Niveau“ im Vergleich zu etablierten
   Anbietern.
7. **Handschrift** soll geprüft werden.

## Analyse von Claude (zu prüfen, nicht zu übernehmen)

### Deutsch und Förderung

- Die Deutschinhalte sind 8 feste Wortboxen mit je rund 100 Wörtern, flach nach
  Phänomen sortiert (`src/domain/german-learning-content.ts`, rund 200 Zeilen;
  Beschreibung `docs/inhalte/wortspeicher.md`). Dazu Textbox, Laufdiktat,
  Spiegelschrift, Homophone.
- These: Förderung und bessere Deutschpakete sind **ein Projekt**. Es braucht
  ein **Inhaltsmodell**, in dem jedes Wort Merkmale trägt (Silben, Morpheme,
  Wortfamilie, Rechtschreibphänomene, Strategie, Häufigkeit, Jahrgangsstufe,
  Kontrastwörter). Erst daraus lassen sich Fehler einem Phänomen zuordnen und
  passende Übungen erzeugen (Fehler → Muster mit sichtbarer Unsicherheit für
  die Lehrkraft → Übung aus dem Modell → Auftrag per QR → Beherrschung
  sichtbar).
- Grenze: Das Audit empfiehlt, keine eigene Diagnostik mit Testanspruch zu
  bauen, sondern „Übungsempfehlung aus Fehlermustern“. Für echte
  Lernverlaufsdiagnostik ist Levumi für Lehrkräfte kostenlos nutzbar und kann
  ergänzt statt ersetzt werden. Daten und Testaufgaben von Levumi/quop sind
  nicht nutzbar (Kinderdaten, Urheberrecht); das veröffentlichte Prinzip der
  Lernverlaufsdiagnostik (CBM) schon.
- Datenschutz: Fehlerprofile je Kind sind sensibel, besonders mit LRS; S1 aus
  dem Audit (Einsatzrahmen mit Schulleitung/Datenschutz klären) ist offen.

### Handschrift

- Pädagogisch berechtigt (Audit: „Monokultur des Tippens“, Hürde für Jgst. 1/2).
- Risiko: Handschrifterkennung (auch die des Betriebssystems) arbeitet mit
  Wörterbuch und neigt dazu, Falschschreibungen zu korrigieren – für
  Rechtschreibübung fatal; Kinderschrift wird schlecht erkannt.
- Vorschlag in Stufen: (1) Schreibfläche mit Selbstkontrolle (schreiben,
  aufdecken, vergleichen), ohne Erkennung, offline; (2) Nachspuren für
  Erstschreiber; (3) Erkennung höchstens später nach Machbarkeitstest.

### Vokabeln (LernBox)

- Der Entwickler hält das Vokabeltraining für schon sehr gut. Claude: Die
  **Technik** ist stark (Leitner mit Fälligkeitsschutz, Richtungen getrennt;
  Audit: näher an der Forschung als viele Karteikarten-Apps). Als **Angebot**
  ist sie eine leere Kiste: keine mitgelieferten Inhalte, keine Beispiel- und
  Lückensätze, „Mündlich“ und stapelübergreifende Fehlerrunde fehlen
  (`docs/inhalte/lernbox.md`).

### Vision (Skizze)

- Nicht „Anton nachbauen“ – in der Breite schlägt eine Einzelperson die großen
  Anbieter nicht. Alleinstellung: der **Lernkreislauf** (Unterricht →
  persönliche Übung → langfristige Wiederholung → Rückmeldung an die
  Lehrkraft → gezielter Auftrag), der Live-Raum und Datensparsamkeit ohne
  Konten.
- Vier Säulen: Inhalte (Kompetenzlandkarte Deutsch/Mathe, Vokabeln quer),
  Steuerung („Heute“ wählt; Aufträge in zwei Klicks), Rückmeldung (ehrlicher
  Fortschritt für das Kind, Klassenblick für die Lehrkraft), Vertrauen
  (offline, ohne Konto, schultauglich).
- PISA: realistisch angehen lassen sich Basiskompetenzen (Anteil unter den
  Mindeststandards) und Herkunftsabhängigkeit (kostenlos, offline, ohne
  Elternhilfe).

### Vorgeschlagenes Gremium (Entwurf)

| Nr. | Expertise                                  | Kernfrage                                                               |
| --- | ------------------------------------------ | ----------------------------------------------------------------------- |
| 1   | Schriftspracherwerb und Rechtschreibung    | Professionelles Rechtschreibcurriculum, inklusive Handschrift           |
| 2   | Lesedidaktik                               | Leseflüssigkeit und -verständnis: was ist digital wirksam?              |
| 3   | Mathedidaktik                              | Basiskompetenzen, Fehlermuster, über Kopfrechnen hinaus                 |
| 4   | Fremdsprachen und DaZ                      | Grundwortschatz-Schichten, mehrere Sprachen, Brückensprachen            |
| 5   | Lernpsychologie und Lernverlaufsdiagnostik | Förderkreislauf, ehrliche Fortschrittsanzeigen, CBM-Prinzipien          |
| 6   | Motivation und Game Design                 | Warum zündet das Quizshow-Format, wie bleibt Motivation nachhaltig?     |
| 7   | Lehrkraft-Alltag                           | Entlastung, Steuerung, Nachsitzen, Vertretung, Förderstunde             |
| 8   | Datenschutz, Lizenzen und Betrieb          | kostenlos, schultauglich, freie Inhaltsquellen                          |
| 9   | Wettbewerbsanalyse                         | Anton, Antolin, Orthographietrainer, international: was übernehmen wir? |
| 10  | Red Team                                   | Wunschdenken, Machbarkeit für eine Person, Kosten                       |

Offen vom Entwickler angedeutet: eventuell Förderschwerpunkt Lernen /
Inklusion als eigene Stimme.

Geplantes Endergebnis: Berichte der Experten unter `docs/vision/`, danach ein
neues Vault-Kapitel `obsidian-export/Lernplattform/25 - Vision/` mit Leitbild,
Nordstern-Szenarien, Kompetenzlandkarte, Wettbewerbsvergleich, Bild der
fertigen Plattform (Kind und Lehrkraft), bewussten Grenzen, Roadmap in Etappen
(anschließend an die laufende Audit-Roadmap) und offenen Entscheidungen des
Entwicklers.

## Wichtige Quellen im Repository

- `AGENTS.md` – Projektregeln (u. a.: vor neuen Funktionen im
  Entscheidungsprotokoll nach Rücknahmen suchen).
- `obsidian-export/Lernplattform/00 - Übersicht.md` und die Kapitel 01–24,
  besonders 19 (Entscheidungsprotokoll, Entscheidungsindex), 22 (Adaptiver
  Lernkreislauf), 23 (Ramagotchi und nachhaltige Gamification).
- `docs/audits/2026-10-19-lernraum-gesamtaudit.md` und die Einzelberichte in
  `docs/audits/2026-10-19-gesamtaudit/` (u. a. Pädagogik, Schularten, Red Team).
- `docs/umsetzungsplan-audit-welle-1.md` bis `-3.md`, `docs/version-0.9.7.md`
  (aktueller Stand, offene Entscheidungen).
- `docs/architecture.md`, `docs/README.md`, `docs/inhalte/`.
- Code: `src/domain/` (Fachlogik), `app/` (Oberfläche).
