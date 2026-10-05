# Cloud-Synchronisation (Grundlage)

Schüler und Lehrkräfte können ihre lokalen Daten über einen Cloudspeicher
zwischen Geräten abgleichen. Pro Rolle gibt es genau eine Datei:

| Rolle     | Datei                        | Inhalt                                     |
| --------- | ---------------------------- | ------------------------------------------ |
| Schüler   | `lernraum-schueler-v1.json`  | Persönliche Sicherung (LernBox, Lernstand) |
| Lehrkraft | `lernraum-lehrkraft-v1.json` | Klassen, Inhalte, Einstellungen            |

Beim **Holen** wird zusammengeführt (vorhandene Sicherungslogik), nichts wird
blind überschrieben. Code: `src/integrations/cloud-sync/`, Oberfläche:
`app/components/cloud-sync-panel.tsx` (Profil bzw. Lehrer-Einstellungen).

## Anbieter

- **WebDAV** (z. B. Nextcloud, ownCloud): sofort nutzbar mit Adresse,
  Benutzername und App-Passwort. Dateien liegen im Ordner `Lernraum`. Das
  Passwort wird nicht gespeichert. Der Server muss Zugriffe von der
  Lernraum-Adresse erlauben (CORS: `Authorization`, `Content-Type`; Methoden
  `GET`, `PUT`, `MKCOL`).
- **Microsoft OneDrive**: App-Ordner (`Files.ReadWrite.AppFolder`), Anmeldung
  per OAuth 2.0 mit PKCE ohne Client-Secret.
- **Google Drive**: versteckter App-Datenordner (`drive.appdata`), ebenfalls
  OAuth 2.0 mit PKCE.

## Konten einrichten

Redirect-URI beider Anbieter: `<Adresse der Seite>/sync/rueckkehr`. Sie wird
aus der aktuellen Adresse abgeleitet; bei einem Domainumzug die neue URI bei
den Anbietern **zusätzlich** eintragen.

1. **OneDrive (fertig angebunden):** App-Registrierung in Microsoft Entra ID,
   Kontotypen „Organisationen und persönliche Konten“, Plattform
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
