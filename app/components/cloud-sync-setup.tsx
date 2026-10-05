"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import type {
  RemoteInfo,
  SyncController,
  SyncSnapshot,
} from "../../src/integrations/cloud-sync/controller";
import type { WebDavConnection } from "../../src/integrations/cloud-sync/credentials";
import {
  DEFAULT_SYNC_SCOPE,
  type SyncArea,
  type SyncScope,
} from "../../src/integrations/cloud-sync/model";
import type { OAuthProviderId } from "../../src/integrations/cloud-sync/oauth";
import { cloudProviders } from "../../src/integrations/cloud-sync/providers";
import {
  connectGoogle,
  isConnected,
  startConnect,
} from "../../src/integrations/cloud-sync/session";
import {
  CloudSyncError,
  type CloudProviderId,
} from "../../src/integrations/cloud-sync/types";
import { createTeacherWorkspaceRepository } from "../../src/storage/teacher-class-settings";
import { CloudStatusPanel, useTick } from "../ui/cloud-badge";
import { Button, Notice, Toggle } from "../ui/primitives";
import { toBadgeModel } from "./cloud-badge-connected";
import { useAreaVisible } from "../release/release-context";
import { useSyncSnapshot } from "./cloud-sync-client";
import { offerToStorePassword, SyncPasswordForm } from "./cloud-sync-password";
import { OPEN_CONFLICTS_EVENT } from "./sync-conflicts-host";

const PENDING_KEY = "lernraum:cloud-setup:provider";
const RETURN_TO = "/lehrer/einstellungen#cloud-abgleich";

const AREA_TEXT: Record<
  SyncArea,
  { label: string; hint: string; personal?: boolean }
> = {
  material: {
    label: "Material",
    hint: "Texte, Vokabeln und Laufdiktat-Inhalte",
  },
  assignments: { label: "Aufgaben", hint: "Aufgaben und ihre Zuteilung" },
  classes: {
    label: "Klassen und Einstellungen",
    hint: "Klassen, freigeschaltete Module, Profil (ohne Schlüssel)",
  },
  students: {
    label: "Schülerliste",
    hint: "Namen, Tiere und Schreiberleichterung der Kinder",
    personal: true,
  },
  results: {
    label: "Ergebnisse",
    hint: "Leistungsbriefe der Kinder",
    personal: true,
  },
  keys: {
    label: "Schlüssel",
    hint: "Klassenstempel und Einschreibe-Schlüssel (nur mit Passwort)",
    personal: true,
  },
};

const ENCRYPT_OPTIONS = [
  {
    value: true,
    label: "Mit Passwort (empfohlen)",
    hint: "Ohne das Passwort lassen sich die Daten in der Cloud nicht mehr öffnen.",
  },
  {
    value: false,
    label: "Ohne Verschlüsselung",
    hint: "Die Daten sind nur durch dein Cloud-Konto geschützt.",
  },
] as const;

function message(error: unknown, fallback: string) {
  return error instanceof CloudSyncError || error instanceof Error
    ? error.message
    : fallback;
}

/** Sicherungsdatei der lokalen Lehrerdaten vor dem ersten Abgleich. */
async function downloadBackup() {
  const backup = await createTeacherWorkspaceRepository().exportData();
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `Lernraum-Lehrerdaten-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Einrichtung und Verwaltung des geräteübergreifenden Abgleichs für
 * Lehrkräfte. Ohne Aktivierung ändert sich nichts; kein Lernraum-Server sieht
 * die Daten, sie liegen im Speicher der Lehrkraft.
 */
export function CloudSyncSetup() {
  const visible = useAreaVisible("geraete-sync");
  const { snapshot, controller } = useSyncSnapshot(visible);
  if (!visible) return null;
  return (
    <section
      id="cloud-abgleich"
      className="ui-card ui-card--pad ui-stack"
      aria-labelledby="cloud-abgleich-title"
    >
      <h2 id="cloud-abgleich-title" className="ui-h-section">
        Geräte abgleichen
      </h2>
      {!snapshot || !controller ? (
        <p className="ui-small ui-muted">Wird geladen …</p>
      ) : snapshot.enabled ? (
        <ActiveSync snapshot={snapshot} controller={controller} />
      ) : (
        <SetupWizard controller={controller} />
      )}
    </section>
  );
}

type Step = "provider" | "connect" | "scope" | "encryption" | "device";
const STEPS: readonly { id: Step; label: string }[] = [
  { id: "provider", label: "Speicher" },
  { id: "connect", label: "Verbindung" },
  { id: "scope", label: "Umfang" },
  { id: "encryption", label: "Verschlüsselung" },
  { id: "device", label: "Dieses Gerät" },
];

function SetupWizard({ controller }: { controller: SyncController }) {
  const providers = useMemo(() => cloudProviders(), []);
  const [step, setStep] = useState<Step>("provider");
  const [provider, setProvider] = useState<CloudProviderId>("webdav");
  const [webdav, setWebdav] = useState<WebDavConnection>({
    url: "",
    username: "",
    password: "",
  });
  const [remote, setRemote] = useState<RemoteInfo | null>(null);
  const [scope, setScope] = useState<SyncScope>({ ...DEFAULT_SYNC_SCOPE });
  const [encrypt, setEncrypt] = useState(true);
  const [password, setPassword] = useState("");
  const [shared, setShared] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);

  // Nach der Rückkehr von OneDrive geht es mit dem gewählten Anbieter weiter.
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const saved = window.sessionStorage.getItem(PENDING_KEY);
        if (saved === "onedrive" || saved === "google-drive") {
          setProvider(saved);
          setStep("connect");
        }
      } catch {
        // ohne Sitzungsspeicher beginnt die Einrichtung von vorn
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  const encryptedRemote = remote?.header?.encryption != null;
  const account =
    provider === "webdav"
      ? `${webdav.username || "Konto"}@${hostOf(webdav.url)}`
      : (providers.find((entry) => entry.id === provider)?.label ?? "Cloud");

  async function connectOAuth(id: OAuthProviderId) {
    setError("");
    try {
      window.sessionStorage.setItem(PENDING_KEY, id);
    } catch {
      // egal
    }
    try {
      if (id === "google-drive") {
        await connectGoogle();
        await check();
      } else {
        await startConnect(id, RETURN_TO);
      }
    } catch (failure) {
      setError(
        message(failure, "Die Anmeldung konnte nicht gestartet werden."),
      );
    }
  }

  async function check(event?: FormEvent) {
    event?.preventDefault();
    setError("");
    if (
      provider === "webdav" &&
      (!webdav.url.trim() || !webdav.username.trim() || !webdav.password)
    ) {
      setError("Bitte Adresse, Benutzername und App-Passwort angeben.");
      return;
    }
    setBusy(true);
    try {
      const info = await controller.inspectRemote(
        provider,
        provider === "webdav" ? webdav : undefined,
      );
      setRemote(info);
      setEncrypt(true);
      setStep("scope");
    } catch (failure) {
      setError(message(failure, "Die Verbindung hat nicht geklappt."));
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    setError("");
    if (!accepted) {
      setError("Bitte bestätige die Hinweise zur Verantwortung.");
      return;
    }
    if (scope.keys && !password) {
      setError("Schlüssel lassen sich nur mit Passwort abgleichen.");
      return;
    }
    setBusy(true);
    try {
      await controller.enable({
        provider,
        scope,
        deviceName: deviceName.trim() || "Dieses Gerät",
        ...(provider === "webdav" ? { webdav } : {}),
        ...(password ? { password } : {}),
        remember: !shared,
      });
      try {
        window.sessionStorage.removeItem(PENDING_KEY);
      } catch {
        // egal
      }
      if (password) {
        await offerToStorePassword(
          `Lernraum-Abgleich · ${account}`,
          password,
          "Lernraum-Abgleich",
        );
      }
    } catch (failure) {
      setError(message(failure, "Der Abgleich konnte nicht gestartet werden."));
    } finally {
      setBusy(false);
    }
  }

  const index = STEPS.findIndex((entry) => entry.id === step);
  const sensitive = scope.students || scope.results || scope.keys;
  const nav = (back: Step | null, next?: ReactNode) => (
    <div className="ui-row ui-wrap">
      {back ? (
        <Button variant="ghost" onClick={() => setStep(back)}>
          Zurück
        </Button>
      ) : null}
      {next}
    </div>
  );

  return (
    <div className="ui-stack">
      <p className="ui-small ui-muted">
        Optional. Ohne Einrichtung ändert sich nichts. Deine Daten liegen in
        deinem eigenen Cloud-Speicher; ein Lernraum-Server sieht sie nicht.
        Änderungen erscheinen nach wenigen Sekunden auf dem anderen Gerät.
      </p>
      <ol className="ui-steps" aria-label="Schritte der Einrichtung">
        {STEPS.map((entry, position) => (
          <li
            key={entry.id}
            aria-current={entry.id === step ? "step" : undefined}
            data-done={position < index}
          >
            {position + 1}. {entry.label}
          </li>
        ))}
      </ol>
      <h3
        ref={heading}
        tabIndex={-1}
        className="ui-h-section"
        id="cloud-schritt"
      >
        {STEPS[index]?.label}
      </h3>

      {step === "provider" ? (
        <div className="ui-stack">
          <fieldset className="ui-checks">
            <legend>Wo soll abgeglichen werden?</legend>
            {providers.map((entry) => (
              <label key={entry.id}>
                <input
                  type="radio"
                  name="cloud-provider"
                  checked={provider === entry.id}
                  disabled={!entry.available}
                  onChange={() => setProvider(entry.id)}
                />
                <span>
                  <strong>{entry.label}</strong>
                  {entry.id === "webdav" ? " (empfohlen für die Tafel)" : ""}
                  <span className="ui-small ui-muted">
                    {" "}
                    ·{" "}
                    {entry.available
                      ? entry.description
                      : "Konto noch nicht eingerichtet"}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
          <p className="ui-small ui-muted">
            Bei OneDrive und Google Drive läuft die Anmeldung nach wenigen
            Stunden ab; dann genügt ein Klick auf „Neu anmelden“. WebDAV
            (Nextcloud) arbeitet an der Tafel am zuverlässigsten.
          </p>
          {nav(
            null,
            <Button onClick={() => setStep("connect")}>Weiter</Button>,
          )}
        </div>
      ) : null}

      {step === "connect" ? (
        <div className="ui-stack">
          {provider === "webdav" ? (
            <form className="ui-stack" onSubmit={(event) => void check(event)}>
              <label className="ui-labeled">
                Server-Adresse
                <input
                  className="ui-input"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="https://cloud.schule.de/remote.php/dav/files/name"
                  value={webdav.url}
                  onChange={(event) =>
                    setWebdav({ ...webdav, url: event.target.value })
                  }
                />
              </label>
              <label className="ui-labeled">
                Benutzername
                <input
                  className="ui-input"
                  name="username"
                  autoComplete="username"
                  value={webdav.username}
                  onChange={(event) =>
                    setWebdav({ ...webdav, username: event.target.value })
                  }
                />
              </label>
              <label className="ui-labeled">
                App-Passwort
                <input
                  className="ui-input"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={webdav.password}
                  onChange={(event) =>
                    setWebdav({ ...webdav, password: event.target.value })
                  }
                />
              </label>
              <p className="ui-small ui-muted">
                Lege im Nextcloud-Konto ein App-Passwort nur für diesen Zweck
                an; du kannst es dort jederzeit widerrufen. Es wird auf diesem
                Gerät gespeichert, damit der Abgleich nach dem Neuladen
                weiterläuft.
              </p>
              {nav(
                "provider",
                <Button type="submit" disabled={busy}>
                  Verbindung testen
                </Button>,
              )}
            </form>
          ) : (
            <div className="ui-stack">
              {isConnected(provider as OAuthProviderId) ? (
                <p className="ui-notice ui-notice--good">
                  Mit {account} verbunden.
                </p>
              ) : (
                <p className="ui-small">
                  Melde dich bei {account} an. Der Lernraum bekommt nur Zugriff
                  auf seinen eigenen App-Ordner.
                </p>
              )}
              {nav(
                "provider",
                isConnected(provider as OAuthProviderId) ? (
                  <Button disabled={busy} onClick={() => void check()}>
                    Verbindung testen
                  </Button>
                ) : (
                  <Button
                    onClick={() =>
                      void connectOAuth(provider as OAuthProviderId)
                    }
                  >
                    Mit {account} verbinden
                  </Button>
                ),
              )}
            </div>
          )}
        </div>
      ) : null}

      {step === "scope" ? (
        <div className="ui-stack">
          {remote?.exists ? (
            <Notice tone="good">
              Es gibt schon einen Stand in der Cloud
              {remote.header
                ? ` (Stand ${remote.header.revision}, zuletzt von „${remote.header.writtenBy.name}“)`
                : ""}
              . Deine Daten auf diesem Gerät werden damit zusammengeführt;
              Doppelungen werden dir danach angeboten.
            </Notice>
          ) : null}
          <div className="ui-stack">
            {(Object.keys(AREA_TEXT) as SyncArea[]).map((area) => (
              <Toggle
                key={area}
                label={AREA_TEXT[area].label}
                hint={AREA_TEXT[area].hint}
                checked={scope[area]}
                onChange={(checked) => setScope({ ...scope, [area]: checked })}
              />
            ))}
          </div>
          <p className="ui-small ui-muted">
            Hell/Dunkel, laufende Live-Räume und Zugangsdaten bleiben auf dem
            Gerät. Ohne Schlüssel kann das andere Gerät keine Leistungsbriefe
            prüfen und keine Schreiberleichterung vergeben.
          </p>
          {nav(
            "connect",
            <Button onClick={() => setStep("encryption")}>Weiter</Button>,
          )}
        </div>
      ) : null}

      {step === "encryption" ? (
        <div className="ui-stack">
          {encryptedRemote ? (
            <>
              <p>
                Die Cloud-Datei ist verschlüsselt. Gib das Passwort ein, das du
                auf deinem anderen Gerät festgelegt hast.
              </p>
              <SyncPasswordForm
                mode="enter"
                account={account}
                submitLabel="Passwort prüfen"
                onSubmit={async (value) => {
                  try {
                    await controller.checkPassword(value, remote as RemoteInfo);
                    setPassword(value);
                    setStep("device");
                    return undefined;
                  } catch (failure) {
                    return message(failure, "Das Passwort passt nicht.");
                  }
                }}
              />
            </>
          ) : (
            <>
              <fieldset className="ui-checks">
                <legend>Soll die Cloud-Datei verschlüsselt werden?</legend>
                {ENCRYPT_OPTIONS.map((option) => (
                  <label key={String(option.value)}>
                    <input
                      type="radio"
                      name="cloud-encrypt"
                      checked={encrypt === option.value}
                      onChange={() => setEncrypt(option.value)}
                    />
                    <span>
                      {option.label}
                      <span className="ui-small ui-muted">
                        {" "}
                        · {option.hint}
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>
              {sensitive && !encrypt ? (
                <Notice tone="bad" role="alert">
                  Du gleichst Daten von Kindern ab. Wir empfehlen dringend ein
                  Passwort{scope.keys ? "; Schlüssel gehen nur damit" : ""}.
                </Notice>
              ) : null}
              {encrypt ? (
                <>
                  <p className="ui-small">
                    Speichere das Passwort in deinem Passwortmanager. Er
                    überträgt es auch auf deine anderen Geräte. Ohne das
                    Passwort lassen sich die Daten in der Cloud nicht mehr
                    öffnen.
                  </p>
                  <Toggle
                    label="Andere nutzen dieses Gerät mit demselben Konto"
                    hint="Dann wird das Passwort hier nicht gemerkt."
                    checked={shared}
                    onChange={setShared}
                  />
                  <SyncPasswordForm
                    mode="create"
                    account={account}
                    submitLabel="Passwort festlegen"
                    onSubmit={async (value) => {
                      setPassword(value);
                      setStep("device");
                      return undefined;
                    }}
                  />
                </>
              ) : null}
              {nav(
                "scope",
                !encrypt ? (
                  <Button
                    onClick={() => {
                      if (scope.keys) {
                        setError(
                          "Schlüssel lassen sich nur mit Passwort abgleichen.",
                        );
                        return;
                      }
                      setPassword("");
                      setStep("device");
                    }}
                  >
                    Ohne Passwort weiter
                  </Button>
                ) : null,
              )}
            </>
          )}
        </div>
      ) : null}

      {step === "device" ? (
        <div className="ui-stack">
          <label className="ui-labeled">
            Name dieses Geräts
            <input
              className="ui-input"
              value={deviceName}
              maxLength={80}
              placeholder="z. B. Tafel 2b oder Laptop zu Hause"
              onChange={(event) => setDeviceName(event.target.value)}
            />
          </label>
          <p className="ui-small ui-muted">
            Der Name erscheint in der Geräteliste. Bitte keine Namen von
            Personen verwenden.
          </p>
          <div className="ui-stack">
            <Button variant="ghost" onClick={() => void downloadBackup()}>
              Vorher eine Sicherungsdatei laden
            </Button>
            <label className="ui-row">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
              />
              <span className="ui-small">
                Ich weiß, dass die ausgewählten Daten
                {sensitive ? ", auch Daten von Kindern," : ""} in meinen eigenen
                Cloud-Speicher übertragen werden und ich dafür verantwortlich
                bin.
                {password
                  ? ""
                  : " Ohne Passwort sind sie nur durch mein Cloud-Konto geschützt."}
              </span>
            </label>
          </div>
          {nav(
            "encryption",
            <Button disabled={busy} onClick={() => void start()}>
              Abgleich starten
            </Button>,
          )}
        </div>
      ) : null}

      {error ? (
        <p className="ui-notice ui-notice--bad" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return "Server";
  }
}

function ActiveSync({
  snapshot,
  controller,
}: {
  snapshot: SyncSnapshot;
  controller: SyncController;
}) {
  const model = useMemo(() => toBadgeModel(snapshot), [snapshot]);
  const now = useTick(10_000, true);
  const [name, setName] = useState(snapshot.deviceName);
  const [notice, setNotice] = useState("");
  const [confirmOff, setConfirmOff] = useState(false);
  const [changing, setChanging] = useState(false);
  const account =
    model.providerLabel === "WebDAV" ? "WebDAV" : model.providerLabel;

  async function run(action: () => Promise<unknown>, done: string) {
    setNotice("");
    try {
      await action();
      setNotice(done);
    } catch (failure) {
      setNotice(message(failure, "Das hat nicht geklappt."));
    }
  }

  return (
    <div className="ui-stack">
      <CloudStatusPanel
        model={model}
        now={now}
        actions={{
          onSyncNow: () => void controller.syncNow(),
          onOpenConflicts: () =>
            window.dispatchEvent(new Event(OPEN_CONFLICTS_EVENT)),
        }}
      />

      {snapshot.status === "locked" ? (
        <div className="ui-stack">
          <p>
            Der Abgleich pausiert, bis du das Passwort eingibst
            {snapshot.error ? `: ${snapshot.error}` : "."}
          </p>
          <SyncPasswordForm
            mode="enter"
            account={account}
            submitLabel="Entsperren"
            onSubmit={async (value) => {
              try {
                await controller.unlock(value);
                await offerToStorePassword(
                  `Lernraum-Abgleich · ${account}`,
                  value,
                  "Lernraum-Abgleich",
                );
                return undefined;
              } catch (failure) {
                return message(failure, "Das Passwort passt nicht.");
              }
            }}
          />
        </div>
      ) : null}

      {snapshot.status === "reauth" && snapshot.provider !== "webdav" ? (
        <div className="ui-row ui-wrap">
          <Button
            onClick={() =>
              void run(async () => {
                const provider = snapshot.provider as OAuthProviderId;
                if (provider === "google-drive") await connectGoogle();
                else await startConnect(provider, RETURN_TO);
                await controller.syncNow();
              }, "Wieder angemeldet.")
            }
          >
            Bei {model.providerLabel} neu anmelden
          </Button>
        </div>
      ) : null}

      <form
        className="ui-stack"
        onSubmit={(event) => {
          event.preventDefault();
          void run(
            () => controller.setDeviceName(name),
            "Der Gerätename wurde gespeichert.",
          );
        }}
      >
        <label className="ui-labeled">
          Name dieses Geräts
          <input
            className="ui-input"
            value={name}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <div className="ui-row">
          <Button type="submit" variant="ghost">
            Namen speichern
          </Button>
        </div>
      </form>

      <section aria-labelledby="cloud-umfang" className="ui-stack">
        <h3 id="cloud-umfang" className="ui-h-section">
          Was abgeglichen wird
        </h3>
        <ul className="ui-small">
          {(Object.keys(AREA_TEXT) as SyncArea[])
            .filter((area) => snapshot.scope[area])
            .map((area) => (
              <li key={area}>{AREA_TEXT[area].label}</li>
            ))}
        </ul>
      </section>

      <section aria-labelledby="cloud-passwort" className="ui-stack">
        <h3 id="cloud-passwort" className="ui-h-section">
          Passwort
        </h3>
        {changing ? (
          <SyncPasswordForm
            mode="create"
            account={account}
            submitLabel={
              snapshot.encrypted ? "Passwort ändern" : "Verschlüsseln"
            }
            onSubmit={async (value) => {
              try {
                await controller.setPassword(value);
                await offerToStorePassword(
                  `Lernraum-Abgleich · ${account}`,
                  value,
                  "Lernraum-Abgleich",
                );
                setChanging(false);
                setNotice(
                  "Das Passwort wurde geändert. Andere Geräte fragen beim nächsten Abgleich danach.",
                );
                return undefined;
              } catch (failure) {
                return message(failure, "Das hat nicht geklappt.");
              }
            }}
          />
        ) : (
          <div className="ui-row ui-wrap">
            <Button variant="ghost" onClick={() => setChanging(true)}>
              {snapshot.encrypted
                ? "Passwort ändern"
                : "Verschlüsselung einschalten"}
            </Button>
            {snapshot.encrypted ? (
              <Button
                variant="ghost"
                onClick={() =>
                  void run(
                    () => controller.setPassword(null),
                    "Die Cloud-Datei ist jetzt unverschlüsselt.",
                  )
                }
              >
                Verschlüsselung ausschalten
              </Button>
            ) : null}
          </div>
        )}
        {!snapshot.encrypted ? (
          <p className="ui-small ui-muted">
            Ohne Verschlüsselung sind die Daten nur durch dein Cloud-Konto
            geschützt.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="cloud-aus" className="ui-stack">
        <h3 id="cloud-aus" className="ui-h-section">
          Abgleich ausschalten
        </h3>
        {confirmOff ? (
          <div className="ui-stack">
            <p className="ui-small">
              Deine Daten auf diesem Gerät bleiben in jedem Fall erhalten.
            </p>
            <div className="ui-row ui-wrap">
              <Button
                variant="ghost"
                onClick={() => {
                  setConfirmOff(false);
                  void run(
                    () => controller.disable(),
                    "Der Abgleich ist auf diesem Gerät aus.",
                  );
                }}
              >
                Nur auf diesem Gerät ausschalten
              </Button>
              <Button
                variant="bad"
                onClick={() => {
                  setConfirmOff(false);
                  void run(
                    () => controller.disable({ deleteRemote: true }),
                    "Der Abgleich ist aus und die Cloud-Datei gelöscht.",
                  );
                }}
              >
                Auch Cloud-Datei löschen
              </Button>
              <Button variant="link" onClick={() => setConfirmOff(false)}>
                Abbrechen
              </Button>
            </div>
          </div>
        ) : (
          <div className="ui-row">
            <Button variant="ghost" onClick={() => setConfirmOff(true)}>
              Ausschalten …
            </Button>
          </div>
        )}
      </section>

      {notice ? (
        <p className="ui-notice" role="status">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
