"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createGoogleDriveTarget,
  createOneDriveTarget,
} from "../../src/integrations/cloud-sync/drives";
import type { OAuthProviderId } from "../../src/integrations/cloud-sync/oauth";
import { cloudProviders } from "../../src/integrations/cloud-sync/providers";
import {
  connectGoogle,
  disconnect,
  getAccessToken,
  isConnected,
  startConnect,
} from "../../src/integrations/cloud-sync/session";
import {
  pullStudentData,
  pullTeacherData,
  pushStudentData,
  pushTeacherData,
} from "../../src/integrations/cloud-sync/sync";
import {
  CloudSyncError,
  type CloudSyncTarget,
} from "../../src/integrations/cloud-sync/types";
import { createWebDavTarget } from "../../src/integrations/cloud-sync/webdav";
import { createTeacherWorkspaceRepository } from "../../src/storage/teacher-class-settings";
import { Button } from "../ui/primitives";
import { useCloudClientIds } from "./cloud-client-ids";
import { GoogleDriveLogo, MicrosoftLogo, WebDavIcon } from "./cloud-logos";
import styles from "./cloud-sync-panel.module.css";

const STORAGE_KEY = "lernraum:cloud-sync";

type StoredSettings = { url: string; username: string };

function readSettings(): StoredSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const value = raw ? (JSON.parse(raw) as Partial<StoredSettings>) : {};
    return { url: value.url ?? "", username: value.username ?? "" };
  } catch {
    return { url: "", username: "" };
  }
}

/**
 * Synchronisation über einen Cloudspeicher. WebDAV lässt sich sofort nutzen;
 * OneDrive und Google Drive erscheinen, sobald die Schulkonten eingerichtet
 * sind. Das Passwort wird nicht gespeichert.
 */
export function CloudSyncPanel({ area }: { area: "student" | "teacher" }) {
  const clientIds = useCloudClientIds();
  const providers = useMemo(() => cloudProviders(clientIds), [clientIds]);
  const [settings, setSettings] = useState<StoredSettings>({
    url: "",
    username: "",
  });
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [connected, setConnected] = useState<Record<OAuthProviderId, boolean>>({
    onedrive: false,
    "google-drive": false,
  });

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSettings(readSettings());
      setConnected({
        onedrive: isConnected("onedrive"),
        "google-drive": isConnected("google-drive"),
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const returnTo =
    area === "teacher" ? "/lehrer/einstellungen" : "/lernen/einstellungen";

  async function connectProvider(provider: OAuthProviderId) {
    setMessage("");
    try {
      if (provider === "google-drive") {
        await connectGoogle(clientIds["google-drive"]);
        setConnected((value) => ({ ...value, [provider]: true }));
        setMessage("Google Drive ist verbunden.");
      } else {
        await startConnect(provider, clientIds[provider], returnTo);
      }
    } catch (error) {
      setMessage(
        error instanceof CloudSyncError
          ? error.message
          : "Die Anmeldung konnte nicht gestartet werden.",
      );
    }
  }

  function disconnectProvider(provider: OAuthProviderId) {
    disconnect(provider);
    setConnected((value) => ({ ...value, [provider]: false }));
    setMessage("Die Verbindung wurde getrennt.");
  }

  async function run(
    action: "push" | "pull",
    via: "webdav" | OAuthProviderId,
    event?: FormEvent,
  ) {
    event?.preventDefault();
    if (
      via === "webdav" &&
      (!settings.url.trim() || !settings.username.trim() || !password)
    ) {
      setMessage("Bitte Adresse, Benutzername und Passwort angeben.");
      return;
    }
    if (via === "webdav") {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch {
        // Ohne Speicher gelten die Angaben nur für diesen Besuch.
      }
    }
    setBusy(true);
    setMessage("");
    try {
      const resolved: CloudSyncTarget =
        via === "onedrive"
          ? createOneDriveTarget(await getAccessToken("onedrive"))
          : via === "google-drive"
            ? createGoogleDriveTarget(await getAccessToken("google-drive"))
            : createWebDavTarget({ ...settings, password });
      const target = () => resolved;
      if (area === "student") {
        if (action === "push") {
          await pushStudentData(target());
          setMessage("Lernstand wurde in der Cloud gesichert.");
        } else {
          const result = await pullStudentData(target());
          setMessage(
            result === null
              ? "In der Cloud liegt noch keine Sicherung."
              : `Zusammengeführt: ${result.added} neu, ${result.updated} aktualisiert.`,
          );
        }
      } else {
        const workspace = createTeacherWorkspaceRepository();
        if (action === "push") {
          await pushTeacherData(target(), workspace);
          setMessage("Lehrerdaten wurden in der Cloud gesichert.");
        } else {
          const found = await pullTeacherData(target(), workspace);
          if (found) window.dispatchEvent(new Event("teacher-data-changed"));
          setMessage(
            found
              ? "Lehrerdaten wurden geholt und zusammengeführt."
              : "In der Cloud liegt noch keine Sicherung.",
          );
        }
      }
    } catch (error) {
      if (via !== "webdav") {
        const provider = via;
        setConnected((value) => ({
          ...value,
          [provider]: isConnected(provider),
        }));
      }
      setMessage(
        error instanceof CloudSyncError
          ? error.message
          : "Die Synchronisation ist fehlgeschlagen.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="ui-card ui-card--pad ui-stack"
      aria-labelledby={`cloud-sync-${area}`}
    >
      <h2 id={`cloud-sync-${area}`} className="ui-h-section">
        Cloud-Synchronisation
      </h2>
      <p className="ui-small ui-muted">
        {area === "student"
          ? "Lernstand zwischen Geräten abgleichen. Beim Holen wird zusammengeführt, nichts geht verloren."
          : "Klassen, Inhalte und Einstellungen zwischen Lehrergeräten abgleichen. Beim Holen wird zusammengeführt."}
      </p>
      <ul className={styles.list}>
        {providers
          .filter((provider) => provider.id !== "webdav")
          .map((provider) => {
            const id = provider.id as OAuthProviderId;
            const name = id === "onedrive" ? "OneDrive" : "Google Drive";
            return (
              <li key={id} className={`${styles.provider} ${styles.head}`}>
                <span className={styles.logo}>
                  {id === "onedrive" ? <MicrosoftLogo /> : <GoogleDriveLogo />}
                </span>
                <span className={styles.text}>
                  <strong>{provider.label}</strong>
                  <span className="ui-small ui-muted">
                    {provider.description}
                  </span>
                </span>
                {!provider.available ? (
                  <span className="ui-small ui-muted">
                    Konto noch nicht eingerichtet
                  </span>
                ) : connected[id] ? (
                  <span className={styles.actions}>
                    <span className={styles.connected}>Verbunden</span>
                    <Button
                      disabled={busy}
                      onClick={() => void run("push", id)}
                    >
                      Sichern
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void run("pull", id)}
                    >
                      Holen
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => disconnectProvider(id)}
                    >
                      Trennen
                    </Button>
                  </span>
                ) : (
                  <Button onClick={() => void connectProvider(id)}>
                    Mit {name} verbinden
                  </Button>
                )}
              </li>
            );
          })}
        <li className={styles.provider}>
          <details className={styles.webdav}>
            <summary className={styles.head}>
              <span className={styles.logo}>
                <WebDavIcon />
              </span>
              <span className={styles.text}>
                <strong>WebDAV (z. B. Nextcloud)</strong>
                <span className="ui-small ui-muted">
                  Eigener Server mit Adresse, Benutzername und App-Passwort.
                </span>
              </span>
              <svg
                className={styles.chevron}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
            <form
              className={styles.form}
              onSubmit={(event) => void run("push", "webdav", event)}
            >
              <label className="ui-labeled">
                Server-Adresse
                <input
                  className="ui-input"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="https://cloud.schule.de/remote.php/dav/files/name"
                  value={settings.url}
                  onChange={(event) =>
                    setSettings({ ...settings, url: event.target.value })
                  }
                />
              </label>
              <label className="ui-labeled">
                Benutzername
                <input
                  className="ui-input"
                  autoComplete="username"
                  value={settings.username}
                  onChange={(event) =>
                    setSettings({ ...settings, username: event.target.value })
                  }
                />
              </label>
              <label className="ui-labeled">
                App-Passwort
                <input
                  className="ui-input"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              <p className="ui-small ui-muted">
                Das Passwort wird nicht gespeichert und muss nach dem Neuladen
                erneut eingegeben werden.
              </p>
              <div className="ui-row ui-wrap">
                <Button type="submit" disabled={busy}>
                  In die Cloud sichern
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void run("pull", "webdav")}
                >
                  Aus der Cloud holen
                </Button>
              </div>
            </form>
          </details>
        </li>
      </ul>
      {message ? (
        <p className="ui-notice" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
