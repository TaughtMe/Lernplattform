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
  pushStudentData,
} from "../../src/integrations/cloud-sync/sync";
import {
  CloudSyncError,
  type CloudSyncTarget,
} from "../../src/integrations/cloud-sync/types";
import { createWebDavTarget } from "../../src/integrations/cloud-sync/webdav";
import { Button } from "../ui/primitives";

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
 * Handabgleich des Lernstands über einen Cloudspeicher (Schüler). Für
 * Lehrkräfte gibt es den automatischen Abgleich (`cloud-sync-setup.tsx`). WebDAV lässt sich sofort nutzen;
 * OneDrive und Google Drive erscheinen, sobald die Schulkonten eingerichtet
 * sind. Das Passwort wird nicht gespeichert.
 */
export function CloudSyncPanel({ area }: { area: "student" }) {
  const providers = useMemo(() => cloudProviders(), []);
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

  const returnTo = "/lernen/einstellungen";

  async function connectProvider(provider: OAuthProviderId) {
    setMessage("");
    try {
      if (provider === "google-drive") {
        await connectGoogle();
        setConnected((value) => ({ ...value, [provider]: true }));
        setMessage("Google Drive ist verbunden.");
      } else {
        await startConnect(provider, returnTo);
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
      if (action === "push") {
        await pushStudentData(resolved);
        setMessage("Lernstand wurde in der Cloud gesichert.");
      } else {
        const result = await pullStudentData(resolved);
        setMessage(
          result === null
            ? "In der Cloud liegt noch keine Sicherung."
            : `Zusammengeführt: ${result.added} neu, ${result.updated} aktualisiert.`,
        );
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
        Lernstand zwischen Geräten abgleichen. Beim Holen wird zusammengeführt,
        nichts geht verloren.
      </p>
      <ul
        className="ui-stack"
        style={{ listStyle: "none", padding: 0, margin: 0 }}
      >
        {providers
          .filter((provider) => provider.id !== "webdav")
          .map((provider) => (
            <li key={provider.id} className="ui-between ui-wrap">
              <span>
                <strong>{provider.label}</strong>
                <span className="ui-small ui-muted">
                  {" "}
                  · {provider.description}
                </span>
              </span>
              {provider.id !== "webdav" && provider.available ? (
                connected[provider.id] ? (
                  <span className="ui-row ui-wrap">
                    <Button
                      disabled={busy}
                      onClick={() =>
                        void run("push", provider.id as OAuthProviderId)
                      }
                    >
                      In die Cloud sichern
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        void run("pull", provider.id as OAuthProviderId)
                      }
                    >
                      Aus der Cloud holen
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        disconnectProvider(provider.id as OAuthProviderId)
                      }
                    >
                      Trennen
                    </Button>
                  </span>
                ) : (
                  <Button
                    onClick={() =>
                      void connectProvider(provider.id as OAuthProviderId)
                    }
                  >
                    Mit{" "}
                    {provider.id === "onedrive" ? "OneDrive" : "Google Drive"}{" "}
                    verbinden
                  </Button>
                )
              ) : (
                <span className="ui-small ui-muted">
                  Konto noch nicht eingerichtet
                </span>
              )}
            </li>
          ))}
      </ul>
      <form
        className="ui-stack"
        onSubmit={(event) => void run("push", "webdav", event)}
      >
        <strong>WebDAV (z. B. Nextcloud)</strong>
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
          Das Passwort wird nicht gespeichert und muss nach dem Neuladen erneut
          eingegeben werden.
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
        {message ? (
          <p className="ui-notice" role="status">
            {message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
