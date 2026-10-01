"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { cloudProviders } from "../../src/integrations/cloud-sync/providers";
import {
  pullStudentData,
  pullTeacherData,
  pushStudentData,
  pushTeacherData,
} from "../../src/integrations/cloud-sync/sync";
import { CloudSyncError } from "../../src/integrations/cloud-sync/types";
import { createWebDavTarget } from "../../src/integrations/cloud-sync/webdav";
import { createTeacherWorkspaceRepository } from "../../src/storage/teacher-class-settings";
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
 * Synchronisation über einen Cloudspeicher. WebDAV lässt sich sofort nutzen;
 * OneDrive und Google Drive erscheinen, sobald die Schulkonten eingerichtet
 * sind. Das Passwort wird nicht gespeichert.
 */
export function CloudSyncPanel({ area }: { area: "student" | "teacher" }) {
  const providers = useMemo(() => cloudProviders(), []);
  const [settings, setSettings] = useState<StoredSettings>({
    url: "",
    username: "",
  });
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const id = window.setTimeout(() => setSettings(readSettings()), 0);
    return () => window.clearTimeout(id);
  }, []);

  function target() {
    return createWebDavTarget({ ...settings, password });
  }

  async function run(action: "push" | "pull", event?: FormEvent) {
    event?.preventDefault();
    if (!settings.url.trim() || !settings.username.trim() || !password) {
      setMessage("Bitte Adresse, Benutzername und Passwort angeben.");
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ohne Speicher gelten die Angaben nur für diesen Besuch.
    }
    setBusy(true);
    setMessage("");
    try {
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
              <span className="ui-small ui-muted">
                {provider.available
                  ? "Bereit zum Verbinden"
                  : "Konto noch nicht eingerichtet"}
              </span>
            </li>
          ))}
      </ul>
      <form className="ui-stack" onSubmit={(event) => void run("push", event)}>
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
            onClick={() => void run("pull")}
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
