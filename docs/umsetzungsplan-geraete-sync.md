# Umsetzungsplan: Geräteübergreifende Synchronisation für Lehrkräfte

Stand: 05.10.2026 · Ausgangsstand `claude/lernraum-ui-v2` @ `a484c35`

Dieser Plan ist die Arbeitsgrundlage für einen KI-Agenten. Abschnitt 2 hält die
Vorgaben der projektverantwortlichen Lehrkraft fest. Abschnitt 9 nennt die
Punkte, die vor Phase 2 noch entschieden werden müssen; dort steht jeweils eine
Empfehlung.

## 0. Arbeitsweise

- Eigener Branch je Phase, abgezweigt von `claude/lernraum-ui-v2`. Die Lehrkraft
  übernimmt per Pull Request.
- Regeln: `AGENTS.md`, `docs/engineering-quality.md`,
  `docs/umsetzungsplan-lernraum-ui-v2.md` (Ansichten bleiben rein).
- Keine neuen Laufzeit-Abhängigkeiten. Verschlüsselung über WebCrypto, Tests mit
  dem vorhandenen `fast-check`.
- Vor jedem Push: `npm run check`; ab Phase 4 zusätzlich `npm run test:design`
  und die neuen Playwright-Tests (Projekte `desktop-chromium`, `mobile-chrome`).

## 1. Befund

Eine Grundlage ist da (`src/integrations/cloud-sync/`, `docs/cloud-sync.md`,
Oberfläche `app/components/cloud-sync-panel.tsx`):

- Anbieter WebDAV (lauffähig), OneDrive und Google Drive (Dateizugriff fertig,
  Anmeldung fehlt: keine Rückleitungsseite, kein Verbinden-Knopf, keine
  Client-IDs).
- Abgleich nur **von Hand** („In die Cloud sichern“ / „Aus der Cloud holen“).
  Das WebDAV-Passwort wird nicht gespeichert, nach jedem Neuladen ist eine neue
  Eingabe nötig. Ein automatischer Abgleich ist so nicht möglich.

Für einen echten Mehrgeräte-Betrieb reicht das nicht:

1. **Holen überschreibt blind.** `importData` in
   `src/storage/teacher-class-settings.ts` macht `bulkPut` auf alle Tabellen.
   Was auf dem Gerät neuer ist, geht verloren, sobald eine ältere Cloud-Datei
   geholt wird. Die Panel-Aussage „wird zusammengeführt“ stimmt für
   Lehrerdaten nicht.
2. **Löschungen kommen nicht an.** Klassen, Kinder, Aufgaben und Material werden
   hart gelöscht (`removeClass`, `removeMember`, `remove`). Ohne Grabsteine
   (Tombstones) holt das andere Gerät sie beim nächsten Abgleich zurück.
3. **Kein Änderungsstempel für alle Datensätze.** `members` und `submissions`
   haben kein `updatedAt`. Die Zod-Schemata sind `.strict()`, zusätzliche
   Felder würden die Prüfung brechen.
   Material (`contentPackages`) hat bereits eine fachliche `revision`, die
   nur bei inhaltlichen Änderungen steigt (nicht bei Klassenzuordnung oder
   `lastUsedAt`). Sie bleibt fachlich und ersetzt den Abgleichstempel nicht.
4. **Klasseneinstellungen fehlen im Export.** `classSettings` (freigeschaltete
   Module) ist nicht in `teacherWorkspaceBackupSchema`.
5. **Kein Schutz bei gleichzeitigem Schreiben.** `upload` schreibt ohne
   Vorbedingung (kein ETag/`If-Match`). Zwei Geräte überschreiben sich
   gegenseitig.
6. **Geheimnisse im Klartext.** Der Export enthält den privaten Schlüssel des
   Klassenstempels (`classes[].seal.privateJwk`, Entscheidung 50) und die
   Einschreibe-Schlüssel der Kinder (`members[].enrollmentToken`). Wer die
   Cloud-Datei lesen kann, kann Schreiberleichterungen und Leistungsbriefe
   fälschen.
7. **Klassenstempel können auseinanderlaufen.** `ensureClassSeal` erzeugt den
   Stempel bei Bedarf. Öffnen zwei Geräte dieselbe Klasse vor dem ersten
   Abgleich, entstehen zwei verschiedene Schlüsselpaare. QR-Codes des einen
   Geräts sind dann auf dem anderen ungültig.
8. **Entscheidungslage.** Entscheidung 1 erlaubt die optionale Sicherung in eine
   selbst gewählte Cloud mit optionaler Verschlüsselung. Als Nicht-Ziel steht
   „permanente Echtzeit-Synchronisation aller Schüleraktivitäten mit einem
   Backend“. Der hier geplante Abgleich läuft nicht über ein Lernraum-Backend,
   sondern zwischen den Geräten **einer** Lehrkraft über **ihren** Speicher. Das
   gehört als neue Entscheidung 53 ins Protokoll (Phase 0).

## 2. Vorgaben der Lehrkraft

- **Optional.** Ohne Aktivierung ändert sich nichts. Kein Lernraum-Server sieht
  die Daten.
- **Anbieter nach Wahl der Lehrkraft** (WebDAV/Nextcloud, OneDrive, Google
  Drive). Die Lehrkraft verantwortet, welche Daten sie wohin überträgt; der
  Lernraum verantwortet eine sichere, transparente Anbindung mit minimalen
  Berechtigungen (wie Kapitel 14 im Vault).
- **Passwort-Verschlüsselung optional, aber empfohlen**, sobald Schülerdaten
  übertragen werden. Die Lehrkraft entscheidet.
- **Anwendungsfall:** Vorbereitung zu Hause auf Gerät A, Unterricht an der
  digitalen Tafel auf Gerät B. Änderungen erscheinen ohne Knopfdruck auf dem
  anderen Gerät.
- **Cloud-Symbol** im Kopf, solange der Abgleich aktiv ist, mit erkennbarem
  Zustand (erfolgreich, läuft, Fehler).
- **Versionszähler**, damit sichtbar ist, welcher Stand auf welchem Gerät liegt.
- **Konfliktlöser** für Doppelungen und gleichzeitige Änderungen.

## 3. Was „Echtzeit“ hier bedeutet

WebDAV, OneDrive und Google Drive bieten im Browser keinen Push-Kanal. Der
Abgleich arbeitet deshalb **nahezu in Echtzeit**:

| Auslöser                             | Wirkung                                 |
| ------------------------------------ | --------------------------------------- |
| Lokale Änderung                      | Hochladen nach 2 s Ruhe (Entprellung)   |
| Tab sichtbar, Gerät online           | Prüfen alle 10 s (nur Metadaten/ETag)   |
| Tab kommt in den Vordergrund, online | Sofort prüfen                           |
| Tab wird verborgen / Seite verlassen | Ausstehende Änderungen sofort hochladen |
| Tab verborgen                        | Kein Abfragen (Akku, Kontingent)        |
| „Jetzt abgleichen“ im Cloud-Menü     | Sofort holen und schreiben              |

Das Prüfen kostet je Runde eine kleine Anfrage (`PROPFIND`/`HEAD` bzw.
Metadatenabruf). Ändert sich der ETag nicht, wird nichts geladen. Erwartete
Verzögerung zwischen zwei Geräten: etwa 3 bis 12 Sekunden.

Ein echter Push-Kanal (z. B. ein Signal „neuer Stand da“ über den vorhandenen
Cloudflare-Worker, ohne Inhalte) ist möglich, verlässt aber den Grundsatz
„kein Lernraum-Server beteiligt“. Er ist **nicht** Teil dieses Plans
(siehe Abschnitt 9, Frage F5).

## 4. Zielbild

### 4.1 Datenumfang

Die Lehrkraft wählt beim Einrichten, was abgeglichen wird. Voreinstellung in
Klammern:

| Bereich                            | Inhalt                                            | Personenbezug        |
| ---------------------------------- | ------------------------------------------------- | -------------------- |
| Material (an)                      | `contentPackages`, Laufdiktat-Texte, Vokabeln     | nein                 |
| Aufgaben (an)                      | `assignments`                                     | nur über Zuteilungen |
| Klassen & Einstellungen (an)       | `classes` ohne Schlüssel, `classSettings`, Profil | gering               |
| Schülerliste (aus)                 | `members` (Namen, Tiere, Schreiberleichterung)    | **ja**               |
| Ergebnisse (aus)                   | `submissions` (Leistungsbriefe)                   | **ja**               |
| Schlüssel (aus, nur verschlüsselt) | Klassenstempel, Einschreibe-Schlüssel             | Geheimnis            |

Gerätebezogenes bleibt lokal: Hell/Dunkel, Vorschau-Schalter, laufende
Live-Räume (Lehrer-Token, Raumzustand), Zugangsdaten.

Sobald „Schülerliste“ oder „Ergebnisse“ an sind und keine Verschlüsselung
gewählt ist, zeigt die Einrichtung einen deutlichen Hinweis mit Empfehlung.
„Schlüssel“ lässt sich nur mit Verschlüsselung einschalten (Empfehlung, siehe
F1). Ohne Schlüssel kann Gerät B Leistungsbriefe nicht prüfen und keine
Schreiberleichterung vergeben; das sagt die Oberfläche an diesen Stellen.

### 4.2 Datenmodell für den Abgleich

Die fachlichen Schemata bleiben unverändert. Alles, was der Abgleich braucht,
liegt in **eigenen Tabellen** der Lehrer-Datenbank (Dexie-Version 6):

- `syncStamps` — Schlüssel `"<tabelle>:<id>"`. Felder: `hlc` (hybride logische
  Uhr, siehe unten), `device` (Geräte-ID), `hash` (SHA-256 des Datensatzes),
  `baseHash` (Hash beim letzten erfolgreichen Abgleich).
- `tombstones` — gelöschte Datensätze: `"<tabelle>:<id>"`, `hlc`, `device`.
  Aufbewahrung 90 Tage, danach entfernt.
- `syncConflicts` — offene und gelöste Konflikte (Abschnitt 4.5).
- `syncState` — eine Zeile: Geräte-ID, Gerätename, gewählter Anbieter und
  Umfang, letzter Remote-ETag, letzter gesehener Stand, Status, Fehler.

Gestempelt wird zentral über Dexie-Hooks (`creating`, `updating`, `deleting`)
auf allen abgeglichenen Tabellen. Die Repositorys müssen dafür nicht geändert
werden. Beim Anwenden fremder Stände wird die Transaktion markiert, damit die
Hooks den fremden Stempel übernehmen statt einen neuen zu setzen.

**Hybride logische Uhr (HLC):** `"<ms seit 1970>-<zähler>-<geräte-id>"`. Sie
ordnet Änderungen geräteübergreifend eindeutig, auch wenn die Uhr der Tafel
falsch geht. Ein empfangener Stand zieht die eigene Uhr nach.

### 4.3 Versionszähler

Zwei Ebenen:

- **Stand** (`revision`): ganze Zahl in der Cloud-Datei. Jeder erfolgreiche
  Schreibvorgang erhöht sie um 1. Anzeige: „Stand 128“.
- **Gerätestand**: jedes Gerät merkt sich den zuletzt übernommenen Stand. Ist
  der Remote-Stand höher, liegen dort neue Änderungen; hat das Gerät eigene
  Änderungen seitdem, gilt es als „voraus“.

Im Cloud-Menü: „Stand 128 · zuletzt geschrieben von ‚Tafel 2b‘ vor 4 s“, dazu
die Geräteliste mit jeweils letztem Stand und letzter Meldung.

### 4.4 Dateiformat und Schreibprotokoll

Eine Datei je Lehrkraft: `lernraum-lehrkraft-v2.json` im App-Ordner des
Anbieters bzw. im WebDAV-Ordner `Lernraum`. Aufbau als Umschlag:

```jsonc
{
  "format": "lernraum-sync",
  "version": 2,
  "revision": 128,
  "writtenBy": { "device": "d-7f3a…", "name": "Tafel 2b", "at": "…" },
  "encryption": null | {
    "algorithm": "AES-GCM", "keyDerivation": "PBKDF2-SHA-256",
    "iterations": 600000, "salt": "…", "keyCheck": "…"
  },
  "payload": { … } | "<base64 Chiffretext>",
  "nonce": "…"
}
```

`payload` (entschlüsselt) enthält je Tabelle die Datensätze mit Stempel, die
Grabsteine und die Geräteliste. `revision`, `writtenBy` und `encryption`
bleiben lesbar, damit das Cloud-Symbol den Stand ohne Passwort zeigen kann.
Gerätenamen sind frei wählbar und sollen keinen Personenbezug haben; der
Hinweis dazu steht am Eingabefeld.

**Ablauf einer Runde** (eine Funktion `syncOnce`):

1. Metadaten holen. ETag unverändert und keine lokalen Änderungen → fertig.
2. Datei laden, ggf. entschlüsseln, Format prüfen (Zod).
3. Zusammenführen (4.5) in einer Dexie-Transaktion.
4. Gibt es lokale Änderungen, die remote fehlen: neuen Stand bauen
   (`revision + 1`), verschlüsseln, mit `If-Match: <etag>` schreiben.
5. Antwort 412 (jemand war schneller): ab Schritt 2 wiederholen, höchstens
   dreimal, dann Fehlerzustand „Konflikt beim Schreiben“ und nächste Runde.

Das Zusammenführen ist kommutativ und idempotent. Geht ein Schreibvorgang
trotz Vorbedingung verloren (Google Drive kennt kein `If-Match` für Inhalte,
dort wird vor dem Schreiben die Dateiversion verglichen), holt die nächste
Runde den Unterschied nach. Kein Gerät verliert dadurch eigene Änderungen,
weil sie lokal bleiben, bis der Remote-Stand sie enthält.

Lesen der bisherigen v1-Datei: einmalig als Ausgangsstand übernehmen
(Abschnitt 6, Phase 2), danach nur noch v2 schreiben.

### 4.5 Konfliktlöser

Grundsatz: **Der Unterricht wird nie blockiert.** Konflikte werden automatisch
vorläufig entschieden, die unterlegene Fassung bleibt erhalten, die Lehrkraft
entscheidet später in Ruhe.

Je Datensatz (über `hash` und `baseHash`):

| Lokal geändert | Remote geändert | Ergebnis                                                                      |
| -------------- | --------------- | ----------------------------------------------------------------------------- |
| nein           | nein            | nichts                                                                        |
| ja             | nein            | lokale Fassung wird hochgeladen                                               |
| nein           | ja              | Remote-Fassung wird übernommen                                                |
| ja             | ja, gleich      | nichts (gleicher Hash)                                                        |
| ja             | ja, verschieden | **Konflikt**: neuere HLC gewinnt vorläufig, andere Fassung in `syncConflicts` |

Fachregeln vor der allgemeinen Regel:

- **Leistungsbriefe** (`submissions`): höhere `sequence` gewinnt, wie bei der
  QR-Übernahme. Kein Konflikt.
- **Klassenstempel:** Ein vorhandener Stempel wird nie ersetzt. Haben zwei
  Geräte verschiedene Stempel für dieselbe Klasse erzeugt, gewinnt der zuerst
  in der Cloud stehende. Das andere Gerät meldet: „Auf diesem Gerät vergebene
  Schreiberleichterungen für Klasse 5b müssen neu vergeben werden“ und zeigt
  die betroffenen Kinder. Vorbeugend erzeugt ein Gerät mit aktivem Abgleich
  einen Stempel erst nach einer erfolgreichen Runde.
- **Schreiberleichterung:** neueres `writingReliefIssuedAt` gewinnt.
- **Löschen gegen Ändern:** Löschen gewinnt, außer die Änderung ist neuer als
  das Löschen. Dann wird der Datensatz wiederhergestellt und als Konflikt
  gemeldet („Klasse 5b wurde auf ‚Laptop‘ gelöscht und auf ‚Tafel‘ später
  geändert“).
- **Material, Aufgaben:** allgemeine Regel. Im Konfliktdialog zusätzlich
  „Beide behalten“ (die unterlegene Fassung wird als Kopie mit Zusatz
  „(Fassung Tafel 2b)“ angelegt).

**Doppelungen** (gleicher Inhalt, verschiedene IDs, z. B. dieselbe Klasse auf
beiden Geräten angelegt, bevor der Abgleich lief):

- Erkennung nach dem Zusammenführen über fachliche Schlüssel: Klasse über
  normalisierten Namen; Material über Titel und Inhalts-Hash; Kind über Klasse
  und Anzeigenamen.
- Identischer Inhalt (gleicher Hash ohne ID und Zeitstempel): automatisch
  zusammenlegen, ältere ID bleibt, Verweise (`classIds`, `memberIds`,
  `classId`) werden umgeschrieben.
- Abweichender Inhalt: Vorschlag im Konfliktdialog mit „Zusammenlegen“,
  „Beide behalten“. Bei Kindern mit verschiedenen Einschreibe-Schlüsseln nur
  „Beide behalten“ oder „Eins entfernen“, weil Einschreibungen sonst ungültig
  werden.

**Konfliktdialog** (Sheet aus dem Cloud-Menü): Liste je Konflikt mit beiden
Fassungen nebeneinander, Gerät und Zeit, Knöpfe „Diese behalten“, „Andere
behalten“, ggf. „Beide behalten“/„Zusammenlegen“. Entscheidungen werden selbst
abgeglichen, damit das andere Gerät den Konflikt nicht erneut zeigt.

### 4.6 Verschlüsselung

- Ein Passwort je Lehrkraft für den Abgleich, unabhängig vom Cloud-Konto.
- PBKDF2-SHA-256 mit 600 000 Durchläufen und Zufalls-Salz → AES-GCM-256,
  frische Nonce je Schreibvorgang. Die Hilfsfunktionen aus
  `src/integrations/content-transfer/crypto.ts` (Base64, Ableitung) werden in
  ein gemeinsames Modul `src/integrations/crypto/` gezogen.
- `keyCheck`: kleiner verschlüsselter Prüfwert, damit ein falsches Passwort
  sofort und verständlich erkannt wird.
- **Auf diesem Gerät merken** (Voreinstellung an): Der abgeleitete Schlüssel
  wird als **nicht exportierbarer** `CryptoKey` in IndexedDB gespeichert. Die
  Tafel kann so nach Neustart weiter abgleichen, ohne dass das Passwort im
  Klartext liegt. „Gerät abmelden“ löscht ihn.
- Passwort ändern: neues Salz, neu verschlüsseln, schreiben. Die anderen Geräte
  sehen beim nächsten Abruf, dass der `keyCheck` nicht mehr passt, und fragen
  nach dem neuen Passwort (Zustand „gesperrt“).
- Passwort vergessen: Die Cloud-Datei ist nicht wiederherstellbar. Ein Gerät
  mit vollständigem Stand kann unter neuem Passwort neu schreiben. Das steht
  vor dem Aktivieren klar da.
- Ohne Verschlüsselung bleiben die Daten nur durch das Cloud-Konto geschützt.
  Die Einrichtung sagt das in einem Satz.

#### Zusammenspiel mit Passwortmanagern

Ziel: Ist ein Passwortmanager vorhanden (im Browser oder als Erweiterung wie
1Password, Bitwarden, iCloud-Schlüsselbund), schlägt er beim Anlegen ein
starkes Passwort vor, bietet danach das Speichern an und füllt es auf dem
zweiten Gerät selbst aus. Ein Passwort, das im Manager liegt, ist auch auf
der Tafel verfügbar und wird seltener vergessen.

Der Lernraum kann das nur ermöglichen, nicht erzwingen: Ob und wann sich der
Manager meldet, entscheidet der Browser bzw. die Erweiterung. Dafür gilt:

- **Echtes Formular.** Jede Passworteingabe steht in einem `<form>` mit
  Absende-Knopf und wird über `submit` abgeschickt. Felder werden nicht per
  Skript umbenannt oder nachträglich vertauscht.
- **Benutzername als Anker.** Manager speichern Paare aus Name und Passwort.
  Das Formular enthält deshalb ein schreibgeschütztes, sichtbares Feld
  `autocomplete="username"` mit einem festen Namen, z. B.
  „Lernraum-Abgleich · <Cloud-Konto>“. So liegt das Abgleich-Passwort im
  Manager getrennt vom WebDAV-App-Passwort (das mit dem WebDAV-Benutzernamen
  gespeichert wird) und lässt sich eindeutig wiederfinden.
- **Anlegen:** beide Felder `type="password"`, `autocomplete="new-password"`,
  `minlength="12"`, keine Pflicht-Zeichenklassen, damit erzeugte Passwörter
  nie abgelehnt werden. Zusätzlich `passwordrules="minlength: 12;"`, damit
  der iCloud-Schlüsselbund passende Vorschläge macht. Die Wiederholung wird
  vom Manager mit ausgefüllt.
- **Entsperren auf einem weiteren Gerät:** ein Feld `type="password"`,
  `autocomplete="current-password"`, gleicher Benutzername wie oben.
- **Passwort ändern:** altes Passwort `current-password`, neues
  `new-password`, gleicher Benutzername. Manager bieten dann „Passwort
  aktualisieren“ statt eines zweiten Eintrags an.
- **Speichern auslösen:** Viele Manager fragen erst, wenn das Formular nach dem
  Absenden verschwindet. Nach erfolgreicher Prüfung (`keyCheck`) wechselt die
  Einrichtung deshalb zum nächsten Schritt und entfernt das Formular aus dem
  DOM. Bei falschem Passwort bleibt es stehen, damit kein falsches Passwort
  gespeichert wird.
- **Credential Management API, wo vorhanden** (Chromium-Browser): Nach
  erfolgreicher Prüfung zusätzlich
  `navigator.credentials.store(new PasswordCredential({ id, password, name }))`;
  beim Entsperren `navigator.credentials.get({ password: true,
mediation: "optional" })` als Vorschlag. Nur mit Feature-Prüfung
  (`"PasswordCredential" in window`), sonst gelten die Formularregeln allein.
- **Nichts verhindern:** Einfügen ist erlaubt, kein `autocomplete="off"`, ein
  Knopf „Passwort anzeigen“ hilft beim Abtippen von einem anderen Gerät.
- **Hinweistext** im Schritt Verschlüsselung: „Speichere das Passwort in
  deinem Passwortmanager. Er überträgt es auch auf deine anderen Geräte. Ohne
  das Passwort lassen sich die Daten in der Cloud nicht mehr öffnen.“
- **Geteilte Tafel:** Ist die Tafel ein Gerät mit gemeinsamem Konto für
  mehrere Lehrkräfte, soll das Passwort dort **nicht** im Browser gespeichert
  werden. Die Einrichtung fragt deshalb „Nutzen auch andere dieses Gerät mit
  demselben Konto?“. Bei Ja erscheint dieser Hinweis, und „Auf diesem Gerät
  merken“ ist aus.

Dieselben Regeln gelten für das WebDAV-App-Passwort (Benutzername =
WebDAV-Benutzer, `current-password`).

### 4.7 Zugangsdaten und Anmeldung

Für automatischen Abgleich müssen Zugangsdaten das Neuladen überleben:

- **WebDAV:** App-Passwort in IndexedDB. Ist die Verschlüsselung an, wird es
  mit dem gemerkten Schlüssel verschlüsselt abgelegt; sonst Hinweis „App-
  Passwort mit nur diesem Zweck anlegen, jederzeit im Nextcloud-Konto
  widerrufbar“.
- **OneDrive:** OAuth mit PKCE als Single-Page-App. Refresh-Tokens für SPAs
  gelten bei Microsoft höchstens 24 Stunden. Danach ist eine erneute Anmeldung
  nötig (Zustand „Anmeldung nötig“, ein Klick).
- **Google Drive:** Für reine Browser-Apps gibt Google keine Refresh-Tokens
  ohne Client-Secret aus. Zugriffstokens laufen nach 1 Stunde ab; erneuert
  wird über Google Identity Services, in manchen Browsern nur nach Klick.
  Folge für die Tafel: gelegentlich „Anmeldung nötig“.
- Fehlende Rückleitungsseite (`/cloud/verbunden`) und Verbinden-Knopf werden
  in Phase 5 gebaut. Client-IDs richtet die Lehrkraft bzw. der Betreiber ein
  (`docs/cloud-sync.md`).

Für den Tafel-Betrieb ist **WebDAV/Nextcloud** daher am robustesten. Die
Einrichtung empfiehlt das, ohne die anderen auszuschließen.

### 4.8 Cloud-Symbol und Statusmenü

Sichtbar in der Kopfleiste des Lehrerrahmens neben dem Hell/Dunkel-Schalter
(`app/views/lehrer/teacher-frame.tsx`, Daten über `TeacherShell` in
`app/ui/shell/teacher-shell.tsx`), auch im Vollflächen-Modus des Live-Raums. Ohne aktiven Abgleich gibt es kein Symbol.

| Zustand         | Symbol                   | Text (für Screenreader und Tooltip)           |
| --------------- | ------------------------ | --------------------------------------------- |
| synchron        | Wolke mit Haken          | „Abgeglichen · Stand 128 · vor 5 s“           |
| läuft           | Wolke mit Pfeilen        | „Wird abgeglichen …“                          |
| ausstehend      | Wolke mit Punkt          | „3 Änderungen warten“ (z. B. offline)         |
| offline         | durchgestrichene Wolke   | „Offline · Änderungen werden später gesendet“ |
| Konflikt        | Wolke mit Ausrufezeichen | „2 Konflikte zu prüfen“                       |
| gesperrt        | Wolke mit Schloss        | „Passwort nötig“                              |
| Anmeldung nötig | Wolke mit Schlüssel      | „Bei OneDrive neu anmelden“                   |
| Fehler          | Wolke mit Kreuz          | Klartext des Fehlers                          |

- Zustand nie nur über Farbe; Form des Zusatzzeichens unterscheidet ihn.
- Knopf öffnet ein Sheet: Zustand, Stand, Geräteliste, „Jetzt abgleichen“,
  Konflikte, Link zu den Einstellungen.
- Zustandswechsel werden über eine `role="status"`-Region angesagt, aber nur
  bei Fehler, Konflikt und Erholung, nicht bei jeder Runde.
- Neue Symbole in `app/ui/icons.tsx`; Gestaltung als `ui-cloud-badge` in
  `app/ui/lernraum-ui.css`. Bauteil zuerst rein in `/entwicklung/ui`.

### 4.9 Verhalten im Unterricht

- Ein laufender Live-Raum wird durch eingehende Änderungen nie verändert. Neue
  Materialien erscheinen in der Auswahl, die laufende Runde bleibt.
- Eingehende Änderungen lösen `teacher-data-changed` aus, damit Listen neu
  laden. Eine offene Bearbeitung (Material im Editor) wird nicht überschrieben:
  Das Formular zeigt „Auf einem anderen Gerät geändert · Neu laden“.
- Mehrere Tabs auf einem Gerät: Nur ein Tab gleicht ab (Web Locks API,
  `navigator.locks`), die anderen hören über `BroadcastChannel` mit.

## 5. Architektur

```
app/ui/cloud-badge.tsx              Symbol + Statusmenü (rein, Props)
app/components/cloud-sync-setup.tsx Einrichtung (ersetzt Lehrer-Teil des Panels)
app/components/sync-conflicts.tsx   Konfliktdialog
app/components/use-cloud-sync.tsx   Hook: Status abonnieren, Aktionen
src/integrations/cloud-sync/
  types.ts          + stat(), download() mit ETag, upload() mit ifMatch,
                      Fehlercodes "precondition", "locked", "reauth"
  webdav.ts         PROPFIND/HEAD, If-Match
  drives.ts         eTag/If-Match (OneDrive), Versionsvergleich (Google)
  envelope.ts       Dateiformat v2, Zod, v1-Import
  crypto.ts         Verschlüsselung des Umschlags
  merge.ts          reine Funktion: (lokal, remote, basis) → Ergebnis, Konflikte
  dedupe.ts         Doppelungen erkennen und zusammenlegen
  hlc.ts            hybride logische Uhr
  engine.ts         syncOnce(), Zeitsteuerung, Locks, Status-Ereignisse
  credentials.ts    Zugangsdaten und gemerkter Schlüssel in IndexedDB
src/storage/
  teacher-class-settings.ts  Dexie v6, Hooks, Export inkl. classSettings
  sync-stamps.ts             Stempel, Grabsteine, Konflikte
```

`merge.ts` und `dedupe.ts` sind reine Funktionen ohne Dexie und Netz. Die
Engine bekommt Ziel, Uhr und Datenbank injiziert, damit Tests mit
Kunstzeit und Speicherziel im Arbeitsspeicher laufen.

## 6. Phasen

Jede Phase ist für sich auslieferbar und lässt den Abgleich ausgeschaltet, bis
Phase 4 die Oberfläche freigibt.

**Phase 0 — Entscheidung und Sicherheit (Dokumentation)**

- Entscheidung 53 im Vault: geräteübergreifender Abgleich der Lehrerdaten über
  die Cloud der Lehrkraft, ohne Lernraum-Server, optional, Verschlüsselung
  empfohlen. Abgrenzung zum Nicht-Ziel „Echtzeit-Synchronisation mit Backend“.
- `docs/security-risk-register.md`: SR-003 „Schlüssel und Schülerdaten in
  fremder Cloud“ mit Maßnahmen aus 4.1 und 4.6.
- Datenschutzhinweise ergänzen (welche Daten, wohin, wer verantwortet was).
- Antworten auf Abschnitt 9 einarbeiten.

**Phase 1 — Datenmodell und Zusammenführen (ohne Netz)**

- Dexie v6 mit `syncStamps`, `tombstones`, `syncConflicts`, `syncState`.
  Erstbefüllung der Stempel beim Upgrade (Hash, HLC aus `updatedAt` bzw.
  `createdAt`).
- Hooks für Stempel und Grabsteine; Markierung für fremde Stände.
- `classSettings` in Export und Backup-Schema (abwärtskompatibel optional).
- `hlc.ts`, `merge.ts` mit allen Regeln aus 4.5, `dedupe.ts`.
- `importData` der Datei-Sicherung nutzt künftig `merge.ts` statt `bulkPut`
  (behebt Befund 1 auch für den Handabgleich).
- Tests: Einheitstests je Regel; Eigenschaftstests mit `fast-check`: zufällige
  Änderungsfolgen auf drei simulierten Geräten, Abgleich in zufälliger
  Reihenfolge → alle Geräte haben am Ende denselben Stand, keine Änderung geht
  verloren, Zusammenführen ist idempotent.

**Phase 2 — Dateiformat, Verschlüsselung, Anbieter**

- `envelope.ts` (v2, Zod), Import einer vorhandenen v1-Datei als Ausgangsstand.
- Gemeinsames Kryptomodul, Umschlag-Verschlüsselung, `keyCheck`.
- `CloudSyncTarget` um `stat` und `ifMatch` erweitern; WebDAV und OneDrive mit
  echter Vorbedingung, Google Drive mit Versionsvergleich.
- Tests mit nachgebautem `fetch` (wie `cloud-sync.test.ts`): 412-Wiederholung,
  falsches Passwort, beschädigte Datei, v1-Übernahme.

**Phase 3 — Engine**

- `syncOnce`, Zeitsteuerung nach Abschnitt 3, Entprellung, Sichtbarkeit,
  Online/Offline, Web Locks, `BroadcastChannel`.
- Zustandsautomat für 4.8, Ereignisse für die Oberfläche.
- Zugangsdaten und gemerkter Schlüssel (`credentials.ts`).
- Fail-safe: Jeder Fehler hält den Abgleich an, lokale Daten bleiben
  unverändert; Zusammenführen nur in einer Transaktion.
- Tests mit Kunstzeit: Entprellung, Abfragetakt, Pause im Hintergrund,
  Wiederaufnahme nach Offline.

**Phase 4 — Oberfläche**

- Cloud-Symbol und Statusmenü (4.8), erst rein in `/entwicklung/ui`, dann als
  Prop von `TeacherFrame`, befüllt in `TeacherShell`.
- Einrichtung als Schrittfolge in `/lehrer/einstellungen`: Anbieter →
  Verbindung testen → Umfang (4.1) → Verschlüsselung (Empfehlung,
  Passwort zweimal mit Passwortmanager-Unterstützung nach 4.6, „auf diesem
  Gerät merken“, „Geteiltes Gerät“) → Gerätename → Hinweis zur
  Verantwortung mit Bestätigung → erster Abgleich.
- Zweites Gerät: gleicher Ablauf; findet die Einrichtung eine vorhandene
  Datei, fragt sie nur noch nach Passwort und Gerätename. Liegen auf dem
  zweiten Gerät schon Daten, erklärt ein Schritt, dass zusammengeführt wird und
  Doppelungen anschließend angeboten werden.
- Konfliktdialog (4.5), Hinweis „Auf einem anderen Gerät geändert“ in
  Bearbeitungsformularen.
- Abgleich ausschalten: „Nur auf diesem Gerät ausschalten“ oder „Auch
  Cloud-Datei löschen“.
- Der Handabgleich im bisherigen Panel bleibt für Schüler; für Lehrkräfte wird
  er durch die Einrichtung ersetzt.
- Tests: Komponenten (Testing Library), Playwright mit zwei Browser-Kontexten
  gegen einen WebDAV-Nachbau im Testserver (Gerät A ändert Material, Gerät B
  zeigt es nach dem nächsten Takt; Konflikt erzeugen und lösen; falsches
  Passwort), axe-Prüfung von Symbol, Sheet und Dialog, Design-Referenz für
  Symbolzustände.
- Tests Passwortmanager: Komponententests prüfen `autocomplete`,
  Benutzername-Feld, `minlength`, `passwordrules` und dass das Formular nach
  Erfolg verschwindet bzw. bei Fehler stehen bleibt. Das tatsächliche
  Speichern lässt sich nicht automatisiert testen; im Pilot einmal von Hand in
  Chrome, Edge, Firefox, Safari (iCloud-Schlüsselbund) und mit einer
  Erweiterung (Bitwarden oder 1Password) prüfen: Vorschlag beim Anlegen,
  Speichern-Angebot, Ausfüllen auf dem zweiten Gerät, Aktualisieren nach
  Passwortwechsel.

**Phase 5 — OAuth-Anbieter**

- Rückleitungsseite, Verbinden-Knopf, Token-Erneuerung bzw. Zustand
  „Anmeldung nötig“ für OneDrive und Google Drive.
- Abhängig davon, dass Client-IDs eingerichtet sind (`docs/cloud-sync.md`).

**Phase 6 — Dokumentation und Freigabe**

- `docs/cloud-sync.md` neu fassen, Vault-Kapitel 12/14 und
  `21 - Qualitätsgrundlage und Freigabe` ergänzen, Version erhöhen.
- Pilot mit einer Lehrkraft (Laptop zu Hause, Tafel in der Schule) vor
  allgemeiner Freigabe; bis dahin Freigabestufe `vorschau` über das
  Freigaberegister (`src/domain/release.ts`, neuer Bereich `geraete-sync`).

## 7. Risiken

| Risiko                                         | Gegenmaßnahme                                                                                                                            |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Datenverlust durch fehlerhaftes Zusammenführen | Reine `merge.ts`, Eigenschaftstests; vor dem ersten Abgleich eine lokale Sicherungsdatei anbieten; Konfliktfassungen 30 Tage aufbewahren |
| CORS beim WebDAV-Server der Schule             | Verbindungstest in der Einrichtung mit klarer Meldung (vorhanden: `networkError`); Anleitung für Nextcloud in `docs/cloud-sync.md`       |
| Abgelaufene OAuth-Tokens an der Tafel          | Zustand „Anmeldung nötig“ statt stillem Fehler; WebDAV empfehlen                                                                         |
| Große Datei durch viel Material                | Zunächst eine Datei; ab etwa 2 MB Aufteilung in Kopf und Teildateien je Tabelle prüfen (Folgeplan)                                       |
| Anfrage-Kontingente der Anbieter               | Abfragen nur bei sichtbarem Tab, 10-s-Takt, nur Metadaten                                                                                |
| Falsche Geräteuhr                              | HLC statt Wanduhr für die Reihenfolge                                                                                                    |
| Zwei Stempel je Klasse                         | Regel in 4.5, Stempel erst nach erstem Abgleich erzeugen                                                                                 |
| Fremder Zugriff auf Cloud-Konto                | Verschlüsselung empfehlen, Schlüssel nur verschlüsselt (F1)                                                                              |

## 8. Nicht Teil dieses Plans

- Abgleich für Schülergeräte. Die Engine ist so gebaut, dass die persönliche
  Sicherung später darauf umziehen kann; der Schülerweg bleibt vorerst beim
  Handabgleich (Entscheidung 1: Lehrkraft hat keinen Zugriff).
- Gemeinsame Nutzung durch mehrere Lehrkräfte (Teamteaching). Das bräuchte
  Rechte und Schlüsselverteilung und ist ein eigener Plan.
- Fernsteuerung eines laufenden Live-Raums von einem zweiten Gerät (z. B.
  Tablet steuert, Tafel zeigt). Das läuft sinnvoll über den vorhandenen
  Live-Raum und nicht über die Cloud-Datei; eigener Folgeplan
  „Tafelansicht“ (F6).
- Versionsverlauf mit Zurückspringen auf alte Stände.

## 9. Offene Fragen an die Lehrkraft

- **F1 Schlüssel nur verschlüsselt?** Klassenstempel und Einschreibe-Schlüssel
  erlauben das Fälschen von Leistungsbriefen und Schreiberleichterungen.
  _Empfehlung:_ Diese Schlüssel werden nur bei aktiver Verschlüsselung
  abgeglichen; alles andere entscheidet die Lehrkraft frei.
- **F2 Voreinstellung Schülerdaten.** _Empfehlung:_ „Schülerliste“ und
  „Ergebnisse“ sind aus und werden bewusst eingeschaltet, dabei wird die
  Verschlüsselung vorgeschlagen.
- **F3 Abfragetakt.** 10 s bei sichtbarem Tab. Schneller (5 s) verbraucht mehr
  Kontingent; langsamer fühlt sich an der Tafel träge an. _Empfehlung:_ 10 s.
- **F4 Automatische Konfliktentscheidung.** _Empfehlung:_ neuere Änderung
  gewinnt vorläufig, nichts blockiert, Konflikt-Symbol bis zur Prüfung.
  Alternative: Abgleich pausiert bis zur Entscheidung (sicherer, stört aber im
  Unterricht).
- **F5 Push-Signal über Lernraum-Worker?** Würde die Verzögerung auf unter
  1 s senken, ohne Inhalte zu übertragen, beteiligt aber einen
  Lernraum-Dienst. _Empfehlung:_ vorerst nicht; nach dem Pilot neu bewerten.
- **F6 Tafelansicht.** Soll ein Folgeplan „Gerät A steuert, Tafel zeigt“ für
  Live-Räume erstellt werden?
