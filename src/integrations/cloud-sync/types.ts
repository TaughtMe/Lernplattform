/**
 * Synchronisation über einen Cloudspeicher der Schule oder Familie
 * (OneDrive, Google Drive, WebDAV). Gespeichert wird je Rolle genau eine
 * Sicherungsdatei; beim Holen wird sie mit den Daten des Geräts
 * zusammengeführt, nichts wird blind überschrieben.
 */
export type CloudProviderId = "onedrive" | "google-drive" | "webdav";

/** Ein verbundenes Speicherziel: eine Datei schreiben und lesen. */
export interface CloudSyncTarget {
  readonly provider: CloudProviderId;
  upload(name: string, text: string): Promise<void>;
  /** Inhalt der Datei oder `null`, wenn sie noch nicht existiert. */
  download(name: string): Promise<string | null>;
}

export type CloudSyncErrorCode =
  "not-configured" | "unauthorized" | "network" | "not-found" | "server";

export class CloudSyncError extends Error {
  constructor(
    readonly code: CloudSyncErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "CloudSyncError";
  }
}

/** Fehler einer HTTP-Antwort in eine verständliche Meldung übersetzen. */
export function errorForStatus(status: number, service: string) {
  if (status === 401 || status === 403) {
    return new CloudSyncError(
      "unauthorized",
      `${service} hat die Anmeldung abgelehnt. Bitte Zugangsdaten prüfen.`,
    );
  }
  if (status === 404) {
    return new CloudSyncError(
      "not-found",
      `${service}: Ordner oder Datei wurde nicht gefunden.`,
    );
  }
  return new CloudSyncError(
    "server",
    `${service} hat mit Fehler ${status} geantwortet.`,
  );
}

/** Netzwerkfehler (auch CORS) als verständliche Meldung. */
export function networkError(service: string, cause: unknown) {
  return new CloudSyncError(
    "network",
    `${service} ist nicht erreichbar. Bitte Adresse und Verbindung prüfen; der Server muss Zugriffe von dieser Seite erlauben (CORS).`,
    { cause },
  );
}
