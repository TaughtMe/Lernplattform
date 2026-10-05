import type { OAuthClientIds } from "./oauth";
import type { CloudProviderId } from "./types";

export type CloudProviderInfo = {
  id: CloudProviderId;
  label: string;
  description: string;
  /** Kann jetzt verbunden werden (Konto bzw. Client-ID vorhanden). */
  available: boolean;
};

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
      available: clientIds["google-drive"] !== null,
    },
    {
      id: "webdav",
      label: "WebDAV (z. B. Nextcloud)",
      description: "Eigener Server mit Adresse, Benutzername und App-Passwort.",
      available: true,
    },
  ];
}
