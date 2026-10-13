# Cloud-Synchronisation

Zwei Wege, Daten über einen Cloudspeicher zwischen Geräten zu bringen:

| Rolle     | Weg                                                                               | Datei                        | Code                                                 |
| --------- | --------------------------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------- |
| Schüler   | Handabgleich („sichern“ / „holen“)                                                | `lernraum-schueler-v1.json`  | `sync.ts`, `app/components/cloud-sync-panel.tsx`     |
| Lehrkraft | **Automatischer Geräte-Abgleich** v2 (zurückgehalten: bisheriger Handabgleich v1) | `lernraum-lehrkraft-v2.json` | `engine.ts`, `controller.ts`, `cloud-sync-setup.tsx` |

Beim Holen wird immer zusammengeführt, nichts wird blind überschrieben. Code
liegt in `src/integrations/cloud-sync/`.

## Geräte-Abgleich der Lehrkraft (Entscheidung 53)

Anwendungsfall: Vorbereitung zu Hause auf Gerät A, Unterricht an der digitalen
Tafel auf Gerät B; Änderungen erscheinen ohne Knopfdruck auf dem anderen Gerät.

**Grundsätze**

- **Optional.** Ohne Einrichtung ändert sich nichts. Der Bereich
  `geraete-sync` steht im Freigaberegister seit dem 7. Oktober 2026 auf `frei`.
- **Kein Lernraum-Server.** Der Abgleich läuft zwischen den Geräten **einer**
  Lehrkraft über **ihren** Speicher. Das ist keine „permanente
  Echtzeit-Synchronisation aller Schüleraktivitäten mit einem Backend“
  (Nicht-Ziel zu Entscheidung 1).
- **Die Lehrkraft entscheidet** über Anbieter, Umfang und Verschlüsselung und
  bestätigt vor dem Start, dass sie für die Übertragung verantwortlich ist.
- **Verschlüsselung** per Passwort ist optional, bei Daten von Kindern aber
  dringend empfohlen. Schlüssel (Klassenstempel, Einschreibe-Schlüssel) gehen
  nur mit Passwort.

### Was „Echtzeit“ hier heißt

WebDAV, OneDrive und Google Drive haben im Browser keinen Push-Kanal. Der
Abgleich ist deshalb **nahezu** in Echtzeit:

| Auslöser                             | Wirkung                                 |
| ------------------------------------ | --------------------------------------- |
| Lokale Änderung                      | Hochladen nach 2 s Ruhe (Entprellung)   |
| Tab sichtbar, Gerät online           | Prüfen alle 10 s (nur Version/ETag)     |
| Tab kommt in den Vordergrund, online | Sofort prüfen                           |
| Tab wird verborgen / Seite verlassen | Ausstehende Änderungen sofort hochladen |
| Tab verborgen                        | Kein Abfragen (Akku, Kontingent)        |
| „Jetzt abgleichen“ im Cloud-Menü     | Sofort                                  |

Erwartete Verzögerung zwischen zwei Geräten: etwa 3 bis 12 Sekunden. Mehrere
Tabs eines Geräts teilen sich die Runden (Web Locks, `BroadcastChannel`).

### Umfang

| Bereich                   | Inhalt                                 | Voreinstellung            |
| ------------------------- | -------------------------------------- | ------------------------- |
| Material                  | Inhalte, Laufdiktat-Texte, Vokabeln    | an                        |
| Aufgaben                  | Aufgaben und Zuteilung                 | an                        |
| Klassen und Einstellungen | Klassen ohne Schlüssel, Module, Profil | an                        |
| Schülerliste              | Namen, Tiere, Schreiberleichterung     | **aus**                   |
| Ergebnisse                | Leistungsbriefe                        | **aus**                   |
| Schlüssel                 | Klassenstempel, Einschreibe-Schlüssel  | **aus**, nur mit Passwort |

Auf dem Gerät bleiben Hell/Dunkel, Vorschau-Schalter, laufende Live-Räume
(Lehrer-Token, Raumzustand) und Zugangsdaten. Ein Gerät, das einen Bereich
nicht abgleicht, lässt dessen Daten in der Cloud-Datei unberührt.

### Wie es funktioniert

- **Änderungen erkennen.** Jede Runde vergleicht die Datensätze mit den
  Stempeln des letzten Abgleichs (SHA-256 des Inhalts). Anderer Hash heißt
  geändert, fehlender Datensatz mit Stempel heißt gelöscht (Grabstein, 90 Tage).
  Die Repositorys und die strikten Zod-Schemata bleiben unverändert; alles
  Abgleich-Eigene liegt in eigenen Tabellen (Dexie-Version 6: `syncStamps`,
  `tombstones`, `syncConflicts`, `syncState`).
- **Reihenfolge.** Eine hybride logische Uhr (`hlc.ts`) ordnet Änderungen
  eindeutig, auch wenn die Uhr der Tafel falsch geht.
- **Zusammenführen** (`merge.ts`, reine Funktion, kommutativ, idempotent): Die
  jüngere Änderung gewinnt vorläufig. Ändern beide Geräte denselben Datensatz
  verschieden, bleibt die unterlegene Fassung als Konflikt erhalten. Nichts
  blockiert den Unterricht.
  - Leistungsbriefe: höhere `sequence` gewinnt.
  - Schreiberleichterung: später ausgestellte Freigabe gewinnt.
  - Klassenstempel: Ein vorhandener Stempel wird nie ersetzt; haben zwei
    Geräte verschiedene erzeugt, gilt der zuerst in der Cloud stehende, und das
    andere Gerät nennt die Kinder, deren Freigabe neu zu vergeben ist.
  - Löschen gegen Ändern: Löschen gewinnt, außer die Änderung ist neuer; dann
    wird wiederhergestellt und gemeldet.
- **Doppelungen** (`dedupe.ts`): Identische Klassen und Materialien werden
  automatisch zusammengelegt (ältere ID bleibt, Verweise werden umgeschrieben),
  abweichende und Kinder werden im Konfliktdialog angeboten.
- **Schreiben mit Vorbedingung.** `If-Match` bei WebDAV und OneDrive,
  Versionsvergleich vor dem Schreiben bei Google Drive (dort bleibt ein enges
  Fenster; lokale Änderungen bleiben erhalten, die nächste Runde holt nach).
  Bei verlorenem Wettlauf wird neu gelesen und zusammengeführt, höchstens
  dreimal.
- **Fail-safe.** Jeder Fehler hält den Abgleich an, lokale Daten bleiben
  unverändert; fremde Stände werden nur in einer Transaktion angewendet.
  Ungültige Datensätze der Cloud-Datei werden übersprungen, nicht übernommen.

### Dateiformat v2

Umschlag mit lesbarem Kopf (`format`, `version`, `revision`, `writtenBy`,
`encryption`) und Nutzlast (Datensätze mit Stempel, Grabsteine, entschiedene
Konflikte, Geräteliste), ganz oder verschlüsselt. Die bisherige v1-Datei
(`lernraum-lehrkraft-v1.json`) wird einmalig als Ausgangsstand gelesen und nie
verändert.

### Verschlüsselung

PBKDF2-SHA-256 mit 600 000 Durchläufen und Zufalls-Salz → AES-GCM-256, frische
Nonce je Schreibvorgang, Prüfwert (`keyCheck`) erkennt ein falsches Passwort
sofort. Der abgeleitete Schlüssel liegt als **nicht exportierbarer** `CryptoKey`
in einer eigenen IndexedDB (`lernraum:sync-credentials:v1`), wenn „Auf diesem
Gerät merken“ an ist; an geteilten Geräten bleibt er aus. **Ohne Passwort ist
die Cloud-Datei nicht wiederherstellbar.**

Die Passwortformulare sind für Passwortmanager gebaut (echtes `<form>`,
sichtbarer fester Benutzername, `new-password`/`current-password`,
`minlength`, `passwordrules`, Einfügen erlaubt, Formular verschwindet nach
Erfolg, Credential Management API wo vorhanden).

### Zustände des Cloud-Symbols

Das Symbol steht neben dem Hell/Dunkel-Schalter (auch in der Vollfläche des
Live-Raums), nur bei aktivem Abgleich. Jeder Zustand hat ein eigenes Zeichen in
der Wolke: abgeglichen (Haken), läuft (Pfeile), Änderungen warten (Punkt),
offline (durchgestrichen), Konflikt (Ausrufezeichen), gesperrt (Schloss),
Anmeldung nötig (Schlüssel), Fehler (Kreuz). Das Menü zeigt Stand, zuletzt
schreibendes Gerät und die Geräteliste. Eine Statusregion sagt nur Fehler,
Konflikt, Sperre und die Erholung an.

### Grenzen

- Für den Tafel-Betrieb ist **WebDAV/Nextcloud** am robustesten. Zugriffstoken
  von OneDrive (Refresh-Token höchstens 24 h in Browser-Apps) und Google Drive
  (1 h, Erneuerung per Popup nach Klick) laufen ab; dann zeigt das Symbol
  „Anmeldung nötig“.
- Passwort ändern: Geräte, die das neue Passwort nicht kennen, sind gesperrt
  und fragen danach. Ohne gemerkten Schlüssel muss auf einem solchen Gerät
  zusätzlich das WebDAV-App-Passwort eingegeben werden.
- Ein Gerät, das länger als 90 Tage aus war, kann Gelöschtes zurückbringen
  (Grabsteine sind dann entfernt).
- Nicht Teil dieses Abgleichs: Schülergeräte, mehrere Lehrkräfte,
  Fernsteuerung eines Live-Raums, Versionsverlauf, Push-Signal über einen
  Lernraum-Worker.

## Anbieter

- **WebDAV** (z. B. Nextcloud, ownCloud): Adresse, Benutzername und
  App-Passwort. Dateien liegen im Ordner `Lernraum`. Der Server muss Zugriffe
  von der Lernraum-Adresse erlauben (CORS): Header `Authorization`,
  `Content-Type`, `Depth`, `If-Match`, `If-None-Match`; Methoden `GET`, `PUT`,
  `PROPFIND`, `MKCOL`, `DELETE`. Das ETag wird per `PROPFIND` gelesen, damit
  keine zusätzliche `Access-Control-Expose-Headers`-Freigabe nötig ist.
  Nextcloud: App-Passwort nur für diesen Zweck anlegen, jederzeit widerrufbar.
- **Microsoft OneDrive**: App-Ordner (`Files.ReadWrite.AppFolder`), Anmeldung
  per OAuth 2.0 mit PKCE ohne Client-Secret.
- **Google Drive**: versteckter App-Datenordner (`drive.appdata`), ebenfalls
  OAuth 2.0.

## Konten einrichten

Redirect-URI beider Anbieter: `<Adresse der Seite>/sync/rueckkehr`. Sie wird
aus der aktuellen Adresse abgeleitet; bei einem Domainumzug die neue URI bei
den Anbietern **zusätzlich** eintragen.

1. **OneDrive:** App-Registrierung in Microsoft Entra ID, Kontotypen
   „Organisationen und persönliche Konten“, Plattform
   „Single-Page-Anwendung“ mit der Redirect-URI, Berechtigung
   `Files.ReadWrite.AppFolder`. Client-ID als Laufzeit-Variable
   `NEXT_PUBLIC_ONEDRIVE_CLIENT_ID` des Workers setzen.
   Ablauf: Verbinden → Microsoft-Login → `/sync/rueckkehr` (Code gegen Token
   tauschen, `session.ts`) → zurück zu den Einstellungen. Das Zugriffstoken
   wird still erneuert. Microsoft begrenzt Refresh-Tokens von Single-Page-
   Apps auf 24 Stunden; danach ist ein erneutes Verbinden nötig.
2. **Google Drive (angebunden, Google Identity Services):** Google Cloud
   Console, Drive API aktivieren, OAuth-Zustimmungsbildschirm (Branding,
   Testnutzer), OAuth-Client „Webanwendung“ mit der Adresse der Seite unter
   „Autorisierte JavaScript-Quellen“ (Scope `drive.appdata`). Client-ID als
   Laufzeit-Variable `NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID`. Es wird kein
   Client-Secret verwendet. Zugriffstoken gelten eine Stunde und ohne
   Refresh-Token; ein neues kommt über ein Popup, das ein Klick auslösen muss
   (`google-identity.ts`). Im Status „Test“ dürfen nur eingetragene
   Testnutzer einloggen; für den Regelbetrieb ist Veröffentlichung samt
   Markenprüfung (eigene, bestätigbare Domain) nötig.

Die Client-IDs liest der Server-Layout zur Laufzeit (`readOAuthClientIds`)
und reicht sie per Context an die Oberfläche; sie werden nicht beim Build
eingebettet. Beim Verbinden wird die ID mit dem Token gespeichert, damit
Rückleitungsseite und Erneuern ohne Umgebung auskommen. Lokal werden sie über
`vite.config.ts` an den Worker weitergegeben.

Solange keine Client-ID gesetzt ist, zeigen die Einstellungen „Konto noch
nicht eingerichtet“.

## Pilot und Freigabe

Der Bereich `geraete-sync` steht seit dem 7. Oktober 2026 auf `frei`
(`src/domain/release.ts`). Die projektverantwortliche Lehrkraft wollte den
automatischen Abgleich für den Pilot (Laptop zu Hause, Tafel in der Schule) im
normalen Betrieb, weil ohne Vorschau nur der Handabgleich erschien. Wer ihn
zurückhalten will, setzt `LERNRAUM_FREIGABE=geraete-sync=vorschau`; dann
erscheint ohne Vorschau wieder der Handabgleich. Die Einrichtung übernimmt
WebDAV-Adresse und Benutzername aus dem Handabgleich.

Weiter offen ist die manuelle Prüfung der Passwortmanager in
Chrome, Edge, Firefox, Safari (iCloud-Schlüsselbund) und mit Bitwarden oder
1Password: Vorschlag beim Anlegen, Speichern-Angebot, Ausfüllen auf dem zweiten
Gerät, Aktualisieren nach Passwortwechsel. Das tatsächliche Speichern entscheidet
der Manager und lässt sich nicht automatisiert testen.
