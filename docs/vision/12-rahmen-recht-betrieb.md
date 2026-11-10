# Vision Lernraum – Rolle 12: Recht, Datenschutz, Lizenzen und Betrieb

Stand: 10.11.2026. Grundlage: Code der Version 0.9.7, `docs/version-0.9.2.md`
bis `-0.9.7.md`, Gesamtaudit vom 19./20.10.2026, Vault, Antworten des
Entwicklers vom 09.11.2026 (`01-planung.md`, Abschnitt 4).

Dieser Bericht ist **keine Rechtsberatung**. Er nennt Prüffragen, wer sie
beantworten muss, und Bauweisen, die eine Frage gar nicht erst entstehen
lassen. Kennzeichen: [Beleg] Repository, [Fachstand] Quelle außerhalb,
[Vermutung] plausibel, nicht belegt, [Empfehlung] Vorschlag dieser Rolle. Bei
rechtlichen Aussagen steht zusätzlich: _gesichert_, _herrschende Auffassung_
oder _zu prüfen (durch wen)_.

**Grenze der Webprüfung:** In dieser Sitzung war nur die Websuche verfügbar.
Der Abruf einzelner Seiten (supabase.com, developers.cloudflare.com,
km.bayern.de, gesetze-bayern.de) wurde vom Netz der Sitzung abgewiesen.
Webangaben stammen deshalb aus Suchergebnissen mit Auszügen, abgerufen am
09./10.11.2026. Wortlaute von Normen, Lizenzen und Tarifen sind damit
**nicht am Original verifiziert**.

## 1. Kurzfazit

1. Der Einsatzrahmen (Audit S1) ist offen. Seit dem Audit ist nur die
   Datenschutzerklärung berichtigt; Freigabe, Verzeichnis, DSFA-Prüfung und
   Auftragsverarbeitung fehlen, und das Impressum untersagt weiter den
   Schulbetrieb [Beleg].
2. Bis zur Klärung trägt nur, was ohne Klarnamen und ohne Angaben zu LRS,
   Förderbedarf, DaZ oder Herkunftssprache funktioniert. Das ist der größte
   Teil der Vision: lokales Üben, Live-Raum mit Tieren, Gastmodus.
3. Für den Schulamtsbezirk ist der wichtigste Baustein kein Code, sondern ein
   schlankes **Schulpaket** (Verfahrensbeschreibung, Elterninformation,
   AVV-Weg, Löschfristen), das eine Schulleitung mit ihrer bzw. ihrem
   Datenschutzbeauftragten prüfen kann.
4. Die Hauspunkte brauchen keinen neuen Server: Ein signierter
   Haus-Leistungsbrief per QR ist bereits gebaut (`src/domain/houses.ts`). Ein
   sitzungsbegrenzter Supabase-Abgleich für **Haussummen ohne Personenbezug**
   ist vertretbar; für Fehlerschwerpunkte einzelner Kinder ist er es vor S1
   nicht.
5. Fehlerprofile werden sensibel, sobald sie auf LRS, Förderbedarf oder
   Herkunftssprache schließen lassen. Der Kurzbericht per QR vom Kind zum
   Lehrergerät mit Löschfrist ist die risikoärmste Bauweise.
6. Mitliefern dürfen wir nur freie Quellen ohne NC-Klausel. ARASAAC und Teile
   der Tatoeba-Aufnahmen scheiden aus, childLex ist ungeklärt.
7. Schulbuch-Vokabeln darf eine Lehrkraft für ihre Klasse eintippen
   (herrschende Auffassung); einen offenen Tauschort für Lehrwerk-Listen soll
   Lernraum nicht anbieten.
8. Die kostenlosen Tarife reichen für den Bezirk, wenn Bilder und Ton statisch
   über Cloudflare ausgeliefert werden und die Supabase-Pausierung abgefangen
   wird. Größtes Betriebsrisiko ist der Ausfall des Entwicklers: Es gibt keine
   Lizenz für den Code und keine Übergaberegel.

## 2. Ist-Stand in Lernraum

| Bereich                    | Stand                                                                                                                                                                                                                                         | Beleg                                                                                                                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Freigabe durch Schule (S1) | **Offen.** Entwickler: „noch nicht geklärt, Beta, sehr kleine Gruppe“. In Wellen-Plänen und Versionsnotizen kein Schritt zu S1.                                                                                                               | `01-planung.md`, Frage 4; Suche nach „S1“, „DSFA“, „AVV“ in `docs/umsetzungsplan-audit-welle-*.md` ohne Treffer                                                            |
| Impressum                  | Beta-Hinweis „nicht öffentlich zugänglich … keine echten personenbezogenen Daten … nicht im regulären Schulbetrieb“. Anschrift „auf Anfrage“.                                                                                                 | `app/impressum/page.tsx`                                                                                                                                                   |
| Datenschutzerklärung       | Berichtigt: ChatGPT-Abschnitt entfernt, Übergabe über Supabase, Sprachausgabe und Mathe-Erstantwort genannt. Fehlt weiter: Rechtsgrundlagen, Serverstandort, AVV („wird ergänzt“), Drittland, Fristen der IP-Hashes. Nennt noch Google Drive. | `app/datenschutz/page.tsx`, Abschnitte 3–9; `docs/version-0.9.3.md`, „Offen“; Entscheidung 59 (Google Drive aus)                                                           |
| Verantwortlicher           | Die Lehrkraft als Privatperson, nicht die Schule.                                                                                                                                                                                             | `app/datenschutz/page.tsx`, Abschnitt 1                                                                                                                                    |
| Daten auf dem Server       | Live-Raum: Tier, Tokens als Hash, Fortschritt, Fehlerwörter, bei Mathe erste falsche Antwort (≤ 32 Zeichen); Löschung 24 h nach Raumende. Übergabe: verschlüsseltes Paket ≤ 24 h. IP als **ungesalzener** SHA-256 für das Rate-Limit.         | `docs/version-0.9.5.md`; Entscheidung 42; `supabase/migrations/20260825124001_*.sql`, Z. 70, später unverändert                                                            |
| Realtime                   | Öffentliche Kanäle entfallen, tokengebundene Abfragen (B-003 behoben). Abschalten des öffentlichen Zugangs im Dashboard ist Betreiberschritt, Vollzug ungeprüft.                                                                              | `docs/version-0.9.2.md`; `docs/live-sicherheit-bereitstellung.md`, Schritt 4                                                                                               |
| LRS im Einschreibe-QR      | Gleiche Größe mit und ohne Freigabe (B-008, Sofortteil). Klarname, Klasse, Lehrkraft und Freigabe-Bit bleiben **ohne Schlüssel lesbar**.                                                                                                      | `src/domain/class-enrollment.ts`, Z. 166–190; `docs/version-0.9.3.md`                                                                                                      |
| Geteilte Geräte            | Gastmodus frei (Löschung beim Beenden, spätestens nach 12 h), Restrisiko SR-004. Tafelmodus und PIN nur Vorschau, PIN ist Sichtschutz ohne Verschlüsselung.                                                                                   | `src/domain/guest-pass.ts`; `docs/security-risk-register.md`, SR-004; Vault 13, Nachtrag Welle 3                                                                           |
| Sprachausgabe              | Der Vorlese-Knopf nutzt nur lokale Stimmen (B-012 dort behoben). **LernBox, Live-Spiel und Station rufen `speechSynthesis` direkt ohne Stimmenwahl auf**; welche Stimme der Browser dann nimmt, ist ungeprüft, Netzwerkstimmen sind möglich.  | `src/speech/speaker.ts`, Z. 91–99, 166; `app/ui/read-aloud-button.tsx`, Z. 73; `learning-box-app.tsx`, Z. 349–355; `live-game.tsx`, Z. 620–633; `station-game.tsx`, Z. 141 |
| Mikrofon, Fotos            | Keine Mikrofon- oder Aufnahmefunktion. Kamera nur für den QR-Scanner, lokal ausgewertet.                                                                                                                                                      | Suche nach `getUserMedia`, `MediaRecorder`, `SpeechRecognition` in `app`, `src` ohne Treffer; Datenschutzerklärung, Abschnitt 7                                            |
| Häuser                     | Gebaut, Bereich `motivation` auf `aus`. Signierter Haus-Leistungsbrief (HMAC mit Einschreibe-Schlüssel), Tageslimit 150 Punkte, Wertung je aktivem Mitglied, kein Einzelranking.                                                              | `src/domain/houses.ts`, Kopfkommentar; `src/domain/release.ts`, Z. 142–146                                                                                                 |
| Lizenz des Projekts        | Keine `LICENSE`-Datei, `"private": true`; Impressum: „urheberrechtlich geschützt“. Herkunft und Lizenz der Tier- und Figurenbilder (`public/animals`, `public/figuren`) im Repository nicht dokumentiert. Schrift Fredoka unter SIL OFL.      | Wurzelverzeichnis; `package.json`, Z. 4; `app/impressum/page.tsx`; `docs/brand/README.md`, Z. 64                                                                           |
| Mitgelieferte Inhalte      | Acht Wortboxen und 50 Textbox-Texte, selbst bzw. per KI erstellt; Texte noch nicht fachlich geprüft. Keine fremden Wortlisten, keine Vokabeln, keine Aufnahmen.                                                                               | `src/domain/german-learning-content.ts`; `docs/inhalte/textbox.md`; `01-planung.md`, K11, K13                                                                              |
| Betrieb                    | Ein Supabase-Projekt (eu-west-1) für Räume und Übergaben; Tarif, Pausierung, Alarme nicht dokumentiert (B-020 offen).                                                                                                                         | Audit B-020; Vault 12; keine Health-Checks im Repository                                                                                                                   |

Falsch oder irreführend ist heute vor allem dreierlei: Das Impressum
behauptet „nicht öffentlich zugänglich“, eine Zugangsschranke ist nicht belegt
(B-011). Die Datenschutzerklärung nennt einen Verantwortlichen, der im
Schulbetrieb nicht verantwortlich wäre. Und der Satz „Server, Raum und andere
Geräte erfahren keinen LRS-Status“ (Vault 13) gilt nicht für Menschen, die
den Einschreibe-QR scannen.

## 3. Fachstand, Vorbilder und Arbeitstabellen

### 3.1 Einsatzrahmen in Bayern

| Aussage                                                                                                                                                                                                                                                                                                                      | Einordnung                                                         | Quelle                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| DSGVO und BayDSG gelten. Rechtsgrundlage im Unterricht ist in der Regel Art. 6 Abs. 1 lit. e DSGVO mit Art. 85 BayEUG. Verantwortlich ist die Schule (Schulleitung), nicht die Lehrkraft.                                                                                                                                    | herrschende Auffassung                                             | Audit B, Abschnitt 5.2; KM-Seite „Datenschutz an Schulen“ (Suchauszug)                                     |
| Schulen verarbeiten Daten nur in Verfahren nach Zweck, Umfang und Art der Anlage 2 zu § 46 BaySchO. § 46 ist keine eigene Rechtsgrundlage; DSGVO und BayDSG bleiben zu prüfen. Abschnitt 4 betrifft passwortgeschützte Lernplattformen.                                                                                      | gesichert in der Sache, Wortlaut ungeprüft                         | km.bayern.de/recht/datenschutz-an-schulen; gesetze-bayern.de, BaySchO § 46 (Suchauszüge, 09.11.2026)       |
| Für Lernplattformen ist die Einwilligung der Regelfall. Sie entfällt, wenn die Plattform auf Grund von Regelungen des Staatsministeriums verpflichtender Unterrichtsbestandteil ist. Schulfremde Zwecke sind ausgeschlossen. Löschung grundsätzlich spätestens zum Schuljahresende. Formulare staffeln: unter 14 die Eltern. | zu prüfen (Schul-DSB), ob Abschnitt 4 auf Lernraum passt           | Suchauszüge aus km.bayern.de und Schulformularen, 09.11.2026                                               |
| Private Geräte der Lehrkraft für personenbezogene Daten: Entscheidung der Schulleitung (§ 27 Abs. 7 LDO), Anzeige vor erster Nutzung, Musterformular des KM.                                                                                                                                                                 | gesichert in der Sache, Wortlaut ungeprüft                         | km.bayern.de, „Private Endgeräte im Dienstgebrauch“, Musterformular (Suchauszug, 10.11.2026)               |
| Für Grund- und Mittelschulen ist die bzw. der behördliche Datenschutzbeauftragte oft am Staatlichen Schulamt bestellt.                                                                                                                                                                                                       | [Vermutung], zu prüfen (Schulamt)                                  | –                                                                                                          |
| Websites und Apps von Schulen kann ein Land von der Barrierefreiheitspflicht ausnehmen; die BayBITV empfiehlt Schulen die Anforderungen. Das BFSG richtet sich an Unternehmen, die Produkte oder Dienste anbieten.                                                                                                           | zu prüfen (Juristin), ob ein kostenloses Privatangebot erfasst ist | Berliner Landesstelle Barrierefreiheit; verkuendung-bayern.de, GVBl. 2018 S. 733 (Suchauszüge, 10.11.2026) |

Vorbild ist die Praxis der staatlichen Angebote (mebis, ByCS): Muster-
Einwilligung, Elterninformation, Nutzungsordnung, alles von der Schule
ausgegeben (Musterformular bycs.de, Suchauszug). Lernraum braucht dasselbe in
klein, weil es keine Behörde im Rücken hat.

### 3.2 Anbieter und Tarife (Stand der Suche 09./10.11.2026)

| Dienst                  | Was die Suche ergibt                                                                                                                                                                                                                                                                                           | Einordnung                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Supabase Free           | 500 MB Datenbank, 2 aktive Projekte, **Pausierung nach 7 Tagen Inaktivität**; Datei-Speicher 500 MB oder 1 GB und Ausgang 5 oder 10 GB (Quellen widersprechen sich). Realtime: 200 gleichzeitige Verbindungen, 100 Nachrichten je Sekunde (offizielle Limits-Seite). Monatliches Nachrichtenkontingent unklar. | ungeprüft am Original; überwiegend Drittquellen   |
| Supabase Region, AVV    | Region Frankfurt (`eu-central-1`) wählbar. Supabase bietet ein DPA; dass es auch im Free-Tarif im Dashboard abschließbar ist, sagt nur ein Forenbeitrag. Lernraum liegt heute in `eu-west-1` (Irland).                                                                                                         | zu prüfen (Betreiber im Dashboard)                |
| Cloudflare Workers Free | 100 000 Anfragen je Tag (Ende UTC-Mitternacht, danach Fehler 1027), 10 ms CPU je Anfrage; **statische Dateien kostenlos und unbegrenzt**, bis 20 000 Dateien je Version, je Datei bis 25 MiB.                                                                                                                  | offizielle Doku laut Suchauszug                   |
| Cloudflare AVV          | DPA gilt laut Cloudflare auch für Self-Serve-Verträge (Free) und ist per Verweis einbezogen; Übermittlung über Standardvertragsklauseln und EU-US-Datenschutzrahmen (DPF).                                                                                                                                     | herrschende Auffassung; Version des DPA zu prüfen |

Quellen: supabase.com/docs/guides/realtime/limits; supabase.com/docs/guides/platform/regions;
supabase.com/docs/guides/security/gdpr-compliance; jetadmin.io und
costbench.com (Supabase-Tarif); developers.cloudflare.com/workers/platform/pricing
und /limits; cloudflare.com/dpa; cloudflare.com/gdpr/introduction. Alle
abgerufen über die Websuche am 09./10.11.2026.

### 3.3 Urheberrecht an Schulbüchern und Wortlisten

| Aussage                                                                                                                                                                                                                                             | Einordnung                                               | Quelle                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Einzelne Wörter und ihre Übersetzung sind nicht geschützt.                                                                                                                                                                                          | herrschende Auffassung                                   | –                                                                            |
| Eine Vokabelliste kann als Datenbank (§ 87a, § 87b UrhG) geschützt sein. Verboten ist die Entnahme eines wesentlichen Teils, auch die wiederholte, systematische Entnahme unwesentlicher Teile.                                                     | gesichert (Normtext)                                     | lexetius.com, § 87b UrhG (Suchauszug, 10.11.2026)                            |
| Schulbücher sind von der Unterrichtsschranke des § 60a ausgenommen (Abs. 3 Nr. 2). Der Gesamtvertrag der Länder erlaubt Kopien und Scans bis 15 %, höchstens 20 Seiten je Werk, Klasse und Schuljahr; ein Ersatz des Schulbuchs ist ausgeschlossen. | gesichert für 2019–2022; aktuelle Fassung zu prüfen (KM) | Gesamtvertrag 2018 (bildung-rp.de); Gesamtvertrag 2022 (mk.niedersachsen.de) |
| Die Grundwortschatz-Listen des LehrplanPLUS sind als amtliches Werk (§ 5 UrhG) gemeinfrei.                                                                                                                                                          | **zu prüfen** (KM oder Juristin)                         | § 5 UrhG; Suche ohne Aussage des KM zur Lizenz                               |

Daraus für die Kernfrage 4:

- Eine Lehrkraft tippt die Vokabeln ihres Lehrwerks für ihre Klasse ein und
  gibt sie per Übergabecode weiter: Die einzelnen Wörter sind frei, die Weitergabe
  an die eigene Klasse ist eng begrenzt (24 h, verschlüsselt). Das ist nach
  herrschender Auffassung vertretbar; ob eine vollständige Lektionsliste ein
  „wesentlicher Teil“ ist, ist **zu prüfen (Juristin für Urheberrecht)**.
- Teilen zwischen Lehrkräften derselben Schule über Datei oder Code: gleiche
  Lage, Risiko steigt mit Zahl der Empfänger. **Zu prüfen.**
- Ein offener Tauschort mit Listen „Lehrwerk X, Unit 3“ ist eine systematische
  öffentliche Wiedergabe. Das Risiko einer Abmahnung durch Verlage trägt der
  Betreiber, also der Entwickler. Rote Linie.

### 3.4 Sprachausgabe, KI-Stimmen und Aufnahmen

- KI-erzeugte Audiodateien haben mangels menschlicher Schöpfung in der Regel
  keinen eigenen Urheberrechtsschutz; maßgeblich sind die Nutzungsbedingungen
  des Werkzeugs und die Lizenz der Stimme [herrschende Auffassung]. Ein
  lokales Werkzeug mit freier Stimme vermeidet die Frage: Die deutschen
  Piper-Stimmen „thorsten“ und der Thorsten-Voice-Datensatz stehen laut
  Modellkarte unter CC0; die Abstammung vom englischen Grundmodell ist nicht
  abschließend geklärt (huggingface.co/rhasspy/piper-voices, Modellkarte;
  github.com/thorstenMueller/Thorsten-Voice; Suchauszug 10.11.2026).
- Stimmen realer Personen (Kollegin, Kind) brauchen deren Einwilligung; bei
  Kindern die der Eltern [herrschende Auffassung].
- Mikrofonaufnahmen eines Kindes sind personenbezogen, auch wenn sie das Gerät
  nicht verlassen. Bleiben sie lokal, ohne Upload und mit Löschung, entsteht
  keine Übermittlung; Informationspflicht und Zweckbindung bleiben [herrschende
  Auffassung]. Browser-Spracherkennung läuft in manchen Browsern über
  Herstellerserver [Vermutung, ungeprüft].

### 3.5 Tabelle „Nutzbare Inhaltsquellen“

Prüfaufwand der Lehrkraft: S = Stichprobe, M = jede Zeile sichten, L =
fachlich neu bewerten.

| Quelle                                               | Inhalt                                     | Lizenz                                                         | Pflichten                                                                        | Eignung                                               | Risiko                                                                                                         |
| ---------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Grundwortschatz Bayern (LehrplanPLUS GS)             | rund 500–620 Wörter Jgst. 1–4              | Lizenz ungeprüft (§ 5 UrhG möglich)                            | Quelle nennen                                                                    | hoch für „Grundlagen aus der Grundschule“             | mittel: bis zur Klärung nur Wortauswahl **selbst** nach Phänomen bilden, Liste nicht 1:1 übernehmen; Prüfung S |
| LehrplanPLUS Mittelschule, KMK-Standards             | Kompetenzbeschreibungen                    | Lizenz ungeprüft; als Bezug unproblematisch                    | zitieren, nicht kopieren                                                         | Orientierung für Stufen, keine Inhalte                | gering                                                                                                         |
| childLex                                             | Häufigkeiten aus Kinderbüchern, 6–12 Jahre | **Lizenz ungeprüft** (Downloadseite ohne Lizenzangabe)         | Anfrage bei den Autoren                                                          | hoch für Wortauswahl, für Mittelschule nur Unterkante | hoch, solange ungeklärt: nur intern zur Auswahl, keine Werte mitliefern                                        |
| Wiktionary                                           | Bedeutungen, Silben, Beispiele             | CC BY-SA 4.0 und GFDL                                          | Namensnennung, Weitergabe unter gleichen Bedingungen (gilt für das Inhaltspaket) | mittel, Qualität schwankt                             | mittel: Share-alike bindet das Paket; Prüfung M                                                                |
| Wikidata (Lexeme)                                    | Wortarten, Formen                          | CC0                                                            | keine                                                                            | mittel, Deckung lückenhaft                            | gering; Prüfung M                                                                                              |
| Tatoeba (Sätze)                                      | Beispielsätze EN–DE                        | CC BY 2.0 FR (Standard), teils CC0                             | Namensnennung je Satz                                                            | mittel für Vokabeln Englisch                          | mittel: Sätze ungeprüft, teils ungeeignet; Prüfung M                                                           |
| Tatoeba (Audio)                                      | Aufnahmen                                  | **je Sprecher**: CC BY, CC BY-SA, CC BY-NC oder keine          | je Datei prüfen                                                                  | gering                                                | hoch: nur Dateien mit CC BY/BY-SA einzeln übernehmen, sonst nicht                                              |
| Freie Wörterbücher (z. B. FreeDict, Ding)            | Übersetzungen                              | Lizenz ungeprüft (vermutlich GPL)                              | ungeprüft                                                                        | gering bis mittel                                     | mittel: GPL für Daten ist unhandlich                                                                           |
| ARASAAC                                              | Piktogramme                                | CC BY-NC-SA 4.0                                                | Namensnennung, nicht kommerziell, gleiche Bedingungen                            | hoch für Inklusion                                    | **ausgeschlossen zum Mitliefern**: NC passt nicht zu einer freien Projektlizenz und zu Weitergabe durch Dritte |
| OpenMoji                                             | Symbole, Emojis                            | CC BY-SA 4.0                                                   | Namensnennung („All emojis designed by OpenMoji …“), Änderungen kennzeichnen     | hoch für Bildhilfen                                   | gering; Prüfung S (Eindeutigkeit des Bildes)                                                                   |
| Mozilla Common Voice                                 | Sätze und Aufnahmen                        | CC0                                                            | keine; Sprecher nicht identifizieren                                             | gering: Laienaufnahmen, Qualität schwankt             | mittel; Prüfung L je Aufnahme                                                                                  |
| Lingua Libre                                         | Wortaufnahmen                              | CC BY-SA 4.0 (laut Projektangabe; je Datei auf Commons prüfen) | Namensnennung je Datei                                                           | mittel für Aussprache einzelner Wörter                | gering bis mittel; Prüfung M                                                                                   |
| Piper-Stimme „thorsten“ (Entwicklungszeit)           | erzeugte Wortaufnahmen                     | CC0 (Modellkarte)                                              | keine; Herkunft dokumentieren                                                    | hoch für einheitliche Aufnahmen ohne Laufzeit-KI      | gering; Prüfung M (Betonung, Fehler)                                                                           |
| Wikisource, gemeinfreie Texte                        | Märchen, Sachtexte vor 1955                | gemeinfrei bzw. CC BY-SA                                       | Quelle nennen                                                                    | gering für Mittelschule (Sprache veraltet)            | gering; Prüfung L (Bearbeitung nötig)                                                                          |
| Mundo, OER der Länder                                | Arbeitsmaterial                            | je Material verschieden; nach CC-Lizenz filterbar              | je Material                                                                      | mittel als Ideenquelle                                | mittel: nur CC0, CC BY, CC BY-SA übernehmen                                                                    |
| Selbst erstellt (Lehrkraft, KI zur Entwicklungszeit) | Wörter, Sätze, Texte                       | eigene Wahl (Empfehlung CC BY-SA 4.0)                          | keine                                                                            | höchste Passung                                       | gering rechtlich, **Prüfaufwand L** (K11)                                                                      |

Quellen: openmoji.org/faq; Tatoeba-Wiki (en.wiki.tatoeba.org) und
Wikipedia „Tatoeba“; Mozilla-Forum und Hugging-Face-Datenkarte zu Common
Voice; Wikipedia „Lingua Libre“; globalsymbols.com zu ARASAAC;
en.wiktionary.org (Hauptseite); aclanthology.org 2025.ontolex-1.5 zu
Wikidata; Downloadseite zu childLex (sites.google.com/view/saschaschroeder/downloads);
Thorsten-Voice-Datensätze (datacollective.mozillafoundation.org). Alle über die
Websuche am 09./10.11.2026; Lizenztexte nicht am Original gelesen.

Gemeinfrei-Hinweis: Projekt Gutenberg-DE ist kein freies Angebot im
Lizenzsinn [Vermutung, ungeprüft]; gemeinfreie Texte von dort nicht als
Sammlung übernehmen.

### 3.6 Tabelle „Rote Linien“

| Nr.   | Die Fachrollen schlagen nicht vor …                                                                                                                 | Grund                                                                                               |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| RL-1  | ein Merkmal LRS, Förderbedarf, Nachteilsausgleich, DaZ oder Herkunftssprache, das das Gerät verlässt (Server, Raum, QR an andere als die Lehrkraft) | Entscheidung 50; mögliche Gesundheitsdaten nach Art. 9 DSGVO (zu prüfen, Schul-DSB); Frage 4        |
| RL-2  | ein Feld „Herkunftssprache“ oder „Förderschwerpunkt“ im Kindprofil, auch lokal                                                                      | Datensparsamkeit; die Übung braucht das Merkmal nicht, nur eine neutrale Übungsanpassung (Audit M4) |
| RL-3  | Fehlerschwerpunkte, Fehlerwörter oder Lernhistorie eines Kindes über Supabase, auch sitzungsbegrenzt, solange S1 offen ist                          | Entscheidungen 2, 4, 10; Frage 4; kein Verantwortlicher, keine AVV                                  |
| RL-4  | Klarnamen, E-Mail oder Geräte-Kennungen auf einem Server; Schülerkonten; Login als Pflicht                                                          | Entscheidungen 2, 9, 43; harte Rahmenbedingung 3 und 5                                              |
| RL-5  | Telemetrie, Analysewerkzeuge, Fehlerberichte an Dritte, fremde Skripte oder Schriften von CDNs                                                      | Entscheidung 9; Datenschutzerklärung, Abschnitt 8; B-015                                            |
| RL-6  | Ranglisten einzelner Kinder, auf dem Server oder öffentlich                                                                                         | Entscheidungen 7, 10; Vault 23                                                                      |
| RL-7  | Inhalte mit NC- oder ND-Klausel (ARASAAC, Tatoeba-Audio mit NC) oder mit „Lizenz ungeprüft“ (childLex-Werte) im ausgelieferten Paket                | Lizenzverträglichkeit, Weitergabe durch Schulen, Rahmenbedingung 6                                  |
| RL-8  | mitgelieferte Schulbuch-Wortlisten oder einen öffentlichen Tauschort für Lehrwerk-Listen                                                            | § 87b UrhG, § 60a Abs. 3; Haftung des Betreibers                                                    |
| RL-9  | Sprachausgabe oder Spracherkennung über Cloud-Dienste zur Laufzeit; KI zur Laufzeit                                                                 | B-012; Entscheidung 58; Rahmenbedingung 2                                                           |
| RL-10 | Mikrofonaufnahmen oder Fotos von Kindern, die das Gerät verlassen oder ohne Löschfrist liegen                                                       | Art. 5, 25 DSGVO; Stimme und Bild sind personenbezogen                                              |
| RL-11 | Bilder, Ton oder Videos in Supabase Storage oder eigene Uploads von Lehrkräften auf einen Lernraum-Server                                           | Kontingent, Haftung für fremde Inhalte, SR-001 (keine Uploads)                                      |
| RL-12 | kostenpflichtige Dienste oder einen Tarif, der ohne Zahlung ausfällt, als Voraussetzung einer Kernfunktion                                          | Rahmenbedingung 1                                                                                   |
| RL-13 | Aussagen wie „DSGVO-konform“, „schulfreigegeben“, „diagnostisch“ in App oder Unterlagen                                                             | nicht belegt; Audit S12; Haftung für Werbeaussagen                                                  |

## 4. Zielbild

### 4.1 Kind

- Öffnet Lernraum ohne Konto. Auf einem fremden Gerät (Gastmodus) übt es mit
  einem Startpunkt; nichts bleibt nach dem Beenden. Auf dem eigenen Gerät liegt
  der Lernstand nur dort.
- Kann **selbst** einen Kurzbericht als QR zeigen („ie-Wörter: 12 von 20
  sicher“). Es sieht vorher in einfacher Sprache, was darin steht. Kein Name,
  kein Fehlerwort, kein Merkmal.
- Gibt Hauspunkte als Haus-Leistungsbrief per QR ab oder, wenn die Lehrkraft
  eine Haus-Sitzung öffnet, als Summe ohne Namen an den Raum.
- Hört Aufnahmen, die mit dem Paket kommen, oder eine lokale Gerätestimme.
  Kein Mikrofon, kein Upload.
- Hat einen Knopf „Meine Daten auf diesem Gerät löschen“.

### 4.2 Lehrkraft

- Findet im Lehrerbereich ein **Schulpaket**: Kurzbeschreibung der
  Verarbeitungen, Vorlage für das Verzeichnis, DSFA-Schwellwertprüfung,
  Elterninformation in einfacher Sprache, Hinweis zum AVV-Weg, Löschfristen,
  Übergaberegel bei Lehrerwechsel.
- Wählt ein **Datenprofil**: „Nur lokal“ (kein Server: Live-Raum und Übergabe
  aus), „Standard“ (Live-Raum und Übergabe mit 24-h-Löschung) und später, nach
  Freigabe, „Mit Klassenliste“.
- Sammelt Kurzberichte und Hausbriefe auf ihrem Gerät. Sie verfallen nach
  einer Frist (Vorschlag: Ende des Schulhalbjahres) von selbst.
- Gibt eigene Vokabeln an ihre Klasse, nicht an die Öffentlichkeit.

### 4.3 Prüfstein „Tablet in die Hand, ohne Vorbereitung, 20 Minuten“

| Lage                            | Trägt es?                                                                                                                                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Geteiltes Gerät, ohne Lernstand | Ja. Gastmodus oder freies Üben mit Startpunkt und Tagestraining. Keine personenbezogene Übermittlung außer Verbindungsdaten an Cloudflare. Ohne Freigabe zulässig, soweit nur Verbindungsdaten anfallen (zu prüfen, Schul-DSB). |
| Eigenes Gerät, mit Lernstand    | Ja. Daten bleiben lokal. Die Rückmeldung an die Lehrkraft ist ein Zusatz und braucht keine Vorbereitung.                                                                                                                        |
| Live-Raum                       | Ja, wie heute: Code oder QR, Tier. Verarbeitung pseudonymer Daten bei Supabase, deshalb gehört der Raum in die Verfahrensbeschreibung der Schule.                                                                               |

Keine Rechtsmaßnahme dieses Berichts verlangt Konto, Registrierung oder
Vorbereitung durch das Kind.

## 5. Konkrete Bausteine

Aufwand für eine Person mit KI-Unterstützung. „Org.“ heißt: vor allem Zeit für
Gespräche, nicht für Code.

| Nr.    | Baustein                                                                                                                                                                                    | Nutzen und Szenario                                                                                     | Entwicklungsaufwand | Prüfaufwand Inhalte | Abhängigkeiten                | Berührte Entscheidungen   |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------- | ------------------- | ----------------------------- | ------------------------- |
| R12-1  | **Weg zur Freigabe:** Gespräch mit Schulleitung und Schul-DSB (vermutlich am Schulamt), Pilot an die Schule binden, bis dahin Datensparmodus                                                | Ohne Freigabe kein Bezirk. Ein DSB für mehrere Schulen könnte eine Prüfung für alle tragen [Vermutung]. | S (org. M)          | kein                | –                             | 9, 11                     |
| R12-2  | **Schulpaket** als Seite und PDF: Verarbeitungsübersicht (Tabelle aus Audit B, 5.1, aktualisiert), Verzeichnis-Vorlage, DSFA-Schwellwert, Elterninformation, Löschfristen, Lehrerwechsel    | Schulleitung entscheidet sachgerecht (Audit I.5 Nr. 2)                                                  | M                   | S                   | R12-1                         | 9                         |
| R12-3  | **Impressum und Datenschutzerklärung** neu: Verantwortliche je Rolle (Schule bzw. Betreiber), Rechtsgrundlagen, Region, AVV, Fristen, IP-Hash; Google Drive streichen; Beta-Hinweis ehrlich | Behebt Widersprüche (B-011)                                                                             | S                   | kein                | R12-1 für die Rollen          | 59                        |
| R12-4  | **Supabase-Härtung:** Region prüfen (Frankfurt erwägen), DPA abschließen, IP-Hash salzen und täglich wechseln, öffentlichen Realtime-Zugang nachweislich aus                                | Bessere Antworten im Schulpaket                                                                         | S                   | kein                | –                             | 42                        |
| R12-5  | **Ferientest und Wachhalten:** geplanter Aufruf gegen Pausierung, einfache Statusseite, Runbook „Projekt reaktivieren“                                                                      | Erste Stunde nach den Ferien scheitert nicht (B-020)                                                    | S                   | kein                | –                             | –                         |
| R12-6  | **Datenprofil „Nur lokal“** im Lehrerbereich und als Schulvorgabe per Link                                                                                                                  | Eine Schule ohne AVV nutzt Lernraum trotzdem                                                            | S–M                 | kein                | R12-2                         | 2, 42                     |
| R12-7  | **Kurzbericht per QR** vom Kind, Vorschau in einfacher Sprache, nur Phänomen und Anzahl sicher, Ablage auf dem Lehrergerät mit Löschfrist                                                   | Rückmeldung an die Lehrkraft (Frage 3) ohne Server                                                      | M                   | S (Texte)           | Phänomen-Zuordnung (Rolle 20) | 4, 5, 6, 10, 41 (Vorlage) |
| R12-8  | **Haus-Sitzung über Supabase:** Raum nimmt je Gerät nur `Haus-ID + Punktzahl (gedeckelt)` an, keine Tier- oder Mitgliedschaftskennung in der Summe, Löschung 24 h nach Ende                 | Hauspunkte live sammeln (Frage 3); QR-Hausbrief bleibt Rückfall                                         | M                   | kein                | R12-3, Freigabe `motivation`  | 2, 9, 10, 39 (Vorlage)    |
| R12-9  | **Einschreibe-QR ohne lesbares Merkmal:** Freigabe nur verschlüsselt (mit `enrollmentToken`) oder separater kurzlebiger Freigabe-QR                                                         | Schließt B-008 vollständig                                                                              | M                   | kein                | –                             | 50                        |
| R12-10 | **Alle Sprachausgaben über `speak(..., { localOnly: true })`** (LernBox, Live-Spiel, Station)                                                                                               | Kein Text an Google oder Microsoft (B-012 Rest)                                                         | S                   | kein                | –                             | 58                        |
| R12-11 | **„Meine Daten löschen“** für Kinder; Löschfristen für Briefe und Protokolle im Lehrerbereich                                                                                               | Löschrecht praktisch umsetzbar (B-010)                                                                  | S                   | kein                | –                             | 9, 11                     |
| R12-12 | **Lizenzordnung:** `LICENSE` für Code, eigene Lizenz für Inhaltspakete, `docs/inhalte/quellen.md` mit Quelle, Lizenz, Namensnennung je Datei; Herkunft der Tierbilder klären                | Weitergabe an Schulen, Weiterleben bei Ausfall                                                          | S                   | S                   | Entscheidung E-3              | 41                        |
| R12-13 | **Aufnahmen zur Entwicklungszeit** mit lokaler CC0-Stimme, als statische Dateien über Cloudflare                                                                                            | Einheitliche Aussprache auch ohne Gerätestimme, ohne Laufzeit-KI                                        | M                   | M je 100 Wörter     | R12-12                        | 58                        |
| R12-14 | **Übergaberegel bei Ausfall:** zweite Person mit Zugang zu Cloudflare, Supabase und Repository; Notfallblatt; App läuft lokal weiter, wenn Supabase fehlt                                   | Bus-Faktor 1 (Audit M.8 Nr. 2)                                                                          | S (org.)            | kein                | R12-12                        | –                         |
| R12-15 | **Barrierefreiheitserklärung** auf freiwilliger Grundlage                                                                                                                                   | Erwartung von Schulträgern; Prüfergebnisse liegen vor                                                   | S                   | kein                | –                             | –                         |

Reihenfolge [Empfehlung]: R12-1, R12-3, R12-4, R12-5, R12-10 sofort (alles S);
dann R12-2 und R12-6 vor der ersten fremden Schule; R12-7 und R12-8 erst nach
Freigabe und Entscheidung.

### 5.1 Bewertung der drei Rückmeldewege (Kernfrage 2)

| Weg                                                | Risiko      | Bewertung                                                                                                                                                                                                                                                                     |
| -------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kurzbericht per QR vom Kind an das Lehrergerät     | gering      | Kein Server, vom Kind ausgelöst, Inhalt sichtbar. Personenbezogen beim Lehrergerät, weil die Mitgliedschaft zugeordnet ist (Entscheidung 9). Zulässig nur im Verfahren der Schule (zu prüfen, Schul-DSB).                                                                     |
| Ablage auf dem Lehrergerät                         | mittel      | Liegt bei der Lehrkraft, oft auf privatem Gerät: Genehmigung der Schulleitung nötig (LDO § 27 Abs. 7, gesichert in der Sache). Löschfrist, kein Abgleich in fremde Cloud ohne Passwort (SR-003).                                                                              |
| „Lernstand reist verschlüsselt mit dem Kind“ (M.8) | hoch        | Chiffrat auf dem Server, Schlüssel beim Kind. Auch verschlüsselte Daten bleiben für den Betreiber personenbezogen, solange ein Schlüssel existiert (herrschende Auffassung). Verlangt AVV, Löschkonzept, Wiederherstellung; L im Aufwand. Erst nach S1 und Gerätebeobachtung. |
| Sitzungsbegrenzter Supabase-Abgleich (Frage 3)     | mittel–hoch | Für Haussummen ohne Personenbezug vertretbar (R12-8). Für Fehlerschwerpunkte je Kind entsteht ein Lernprofil auf dem Server; vor S1 rote Linie (RL-3).                                                                                                                        |

Wo das Profil sensibel wird: Eine Zahl „ie-Wörter 12 von 20“ ist eine
Lernstandsangabe. Sensibel wird sie, wenn sie (a) mit einem Merkmal LRS oder
Förderbedarf verbunden ist, (b) über viele Wochen eine Fehlerhistorie bildet,
die auf eine Störung schließen lässt, oder (c) Herkunftssprache oder
Interferenzfehler benennt („typisch für Türkisch“). Deshalb: Kategorien nur
nach Rechtschreibphänomen, nie nach Ursache; Berichte als Momentaufnahme,
keine Zeitreihe beim Lehrergerät [Empfehlung].

## 6. Grenzen und was wir nicht bauen

| Nicht bauen                                                       | Grund                                                                                       |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Eigenen Login-Dienst, Lehrerkonten                                | Entscheidung 43; Betriebsaufwand, Haftung, Wiederherstellung                                |
| Dauerhafte Klassenübersicht auf einem Server                      | Entscheidungen 2, 10; macht den Entwickler zum Auftragsverarbeiter mit voller Pflichtenlast |
| Tauschbörse für Material zwischen Lehrkräften                     | Urheberrecht (3.3), Moderation, Haftung für fremde Inhalte                                  |
| Medienablage in Supabase                                          | Kontingent; statische Dateien über Cloudflare sind kostenlos und unbegrenzt                 |
| Bundesweite Öffnung mit Hilfezusage in den nächsten zwölf Monaten | Frage 8; das Schulpaket ist auf Bayern zugeschnitten, andere Länder regeln anders           |
| Aufnahme- oder Sprecherkennungsfunktion für Kinder                | RL-10; erst nach eigener Prüfung durch Schul-DSB                                            |

Grenzen dieses Berichts: keine Einsicht in das Supabase- und Cloudflare-Konto;
Normen und Lizenzen nur über Suchauszüge; die Bestellung der
Datenschutzbeauftragten im Bezirk und der aktuelle Gesamtvertrag nach § 60a
sind ungeprüft.

## 7. Offene Entscheidungen für den Entwickler

| Nr. | Frage                                                                                                                                                                                            | Empfehlung                                                                                                                                                                                          | Ohne Entscheidung                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| E-1 | Wer ist Vertragspartner und Verantwortlicher, wenn Schulen im Bezirk Lernraum nutzen: die Schule mit dir als Auftragsverarbeiter, oder ein Träger (Schulamt, Sachaufwandsträger, Medienzentrum)? | Mit Schul-DSB und Schulamt klären, ob ein Träger den Betrieb von Live-Raum und Übergabe übernimmt; bis dahin Profil „Nur lokal“ für fremde Schulen anbieten. Zu prüfen: Schul-DSB, ggf. BayLfD.     | Fremde Schulen nutzen Lernraum ohne Rahmen; Haftungsrisiko liegt bei dir.         |
| E-2 | Darf ein sitzungsbegrenzter Supabase-Abgleich für Haussummen kommen (Vorlage zu Entscheidungen 2, 9, 10)?                                                                                        | Ja, nur Haus-ID und gedeckelte Punktzahl, Löschung nach 24 h, nach Freigabe; Fehlerdaten bleiben ausgeschlossen. Als neuer Eintrag im Entscheidungsprotokoll.                                       | Hauspunkte nur per QR-Hausbrief, wie gebaut.                                      |
| E-3 | Unter welcher Lizenz stehen Code und Inhalte?                                                                                                                                                    | Code unter einer freien Lizenz (Vorschlag AGPL-3.0 oder EUPL-1.2, damit ein Betreiber Änderungen offenlegen muss), Inhalte unter CC BY-SA 4.0 (verträglich mit Wiktionary, OpenMoji, Lingua Libre). | „Alle Rechte vorbehalten“: Bei deinem Ausfall darf niemand Lernraum weiterführen. |
| E-4 | Soll das Impressum den Beta-Hinweis behalten, solange die Freigabe fehlt?                                                                                                                        | Ja, aber ehrlich: „Erprobung an einzelnen Schulen, nur ohne Klarnamen und ohne LRS-Angaben“. Ladungsfähige Anschrift: zu prüfen (Juristin, § 5 DDG).                                                | Impressum widerspricht dem Betrieb weiter.                                        |
| E-5 | Wird die Wortauswahl am bayerischen Grundwortschatz ausgerichtet, bevor dessen Lizenz geklärt ist?                                                                                               | Ja als Bezug, nicht als 1:1-Kopie; Anfrage beim KM bzw. ISB zur Nutzung stellen.                                                                                                                    | Rolle 20 plant ohne Grundwortschatz-Bezug.                                        |
| E-6 | Bleibt die Supabase-Region Irland oder wechselt sie nach Frankfurt?                                                                                                                              | Bei der nächsten ohnehin nötigen Migration prüfen; für die Elterninformation ist „Deutschland“ leichter zu erklären [Vermutung].                                                                    | Region bleibt; kein rechtlicher Mangel bekannt.                                   |
