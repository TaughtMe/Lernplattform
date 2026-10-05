/**
 * Synchronisation über einen Cloudspeicher der Schule oder Familie
 * (OneDrive, Google Drive, WebDAV). Gespeichert wird je Rolle genau eine
 * Sicherungsdatei; beim Holen wird sie mit den Daten des Geräts
 * zusammengeführt, nichts wird blind überschrieben.
 */
export type CloudProviderId = "onedrive" | "google-drive" | "webdav";

/** Vorbedingung beim Schreiben: Version der Datei, die der Schreiber kennt. */
export type UploadOptions = {
  /**
   * `string`: nur schreiben, wenn die Datei noch diese Version hat.
   * `null`: nur schreiben, wenn die Datei noch nicht existiert.
   * Fehlt die Angabe, wird ohne Vorbedingung geschrieben.
   */
  ifMatch?: string | null;
};

/** Datei mit ihrer Version (ETag bzw. Dateiversion des Anbieters). */
export type RemoteFile = { text: string; etag: string | null };

/** Ein verbundenes Speicherziel: eine Datei schreiben und lesen. */
export interface CloudSyncTarget {
  readonly provider: CloudProviderId;
  /** Gibt die neue Version zurück; `null`, wenn der Anbieter sie nicht nennt. */
  upload(
    name: string,
    text: string,
    options?: UploadOptions,
  ): Promise<{ etag: string | null }>;
  /** Inhalt der Datei oder `null`, wenn sie noch nicht existiert. */
  download(name: string): Promise<string | null>;
  /** Nur die Version, ohne Inhalt; `null`, wenn die Datei fehlt. */
  stat(name: string): Promise<{ etag: string | null } | null>;
  /** Inhalt samt Version; `null`, wenn die Datei fehlt. */
  read(name: string): Promise<RemoteFile | null>;
}

export type CloudSyncErrorCode =
  | "not-configured"
  | "unauthorized"
  | "network"
  | "not-found"
  | "server"
  /** Die Datei wurde zwischenzeitlich von einem anderen Gerät geändert. */
  | "precondition"
  /** Die Datei ist verschlüsselt und das Passwort fehlt oder passt nicht. */
  | "locked"
  /** Neue Anmeldung beim Anbieter nötig. */
  | "reauth";

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
  if (status === 412 || status === 409) {
    return new CloudSyncError(
      "precondition",
      `${service}: Die Datei wurde zwischenzeitlich auf einem anderen Gerät geändert.`,
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
