import type { OAuthClientIds } from "./oauth";
import type { CloudProviderId } from "./types";

export type CloudProviderInfo = {
  id: CloudProviderId;
  label: string;
  description: string;
  /** Kann jetzt verbunden werden (Konto bzw. Client-ID vorhanden). */
  available: boolean;
};

/**
 * Google Drive ist abgeschaltet (Entscheidung 59, 05.11.2026): Der Abgleich
 * funktioniert dort noch nicht. Auch mit gesetzter Client-ID erscheint es als
 * „Noch nicht eingerichtet“ und lässt sich nicht wählen.
 */
export const GOOGLE_DRIVE_ENABLED = false;

/** Anbieter mit Status für die Einstellungen. */
export function cloudProviders(clientIds: OAuthClientIds): CloudProviderInfo[] {
  return [
    {
      id: "onedrive",
      label: "Microsoft OneDrive",
      description: "Speichert im App-Ordner des Schul- oder Familienkontos.",
      available: clientIds.onedrive !== null,
    },
    {
      id: "google-drive",
      label: "Google Drive",
      description: "Speichert im versteckten App-Ordner des Google-Kontos.",
      available: GOOGLE_DRIVE_ENABLED && clientIds["google-drive"] !== null,
    },
    {
      id: "webdav",
      label: "WebDAV (z. B. Nextcloud)",
      description: "Eigener Server mit Adresse, Benutzername und App-Passwort.",
      available: true,
    },
  ];
}
