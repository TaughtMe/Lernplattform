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
import { useTick } from "../ui/cloud-badge";
import { cloudBadgeText, formatAgo } from "../ui/cloud-badge-model";
import { Button, Notice, Toggle } from "../ui/primitives";
import { cx } from "../views/parts/parts";
import { manageStyles as m } from "../views/lehrer/manage-parts";
import {
  EncryptionSwitch,
  ProviderPicker,
  SettingsGroup,
  SyncAlert,
  SyncDevices,
  SyncOff,
  SyncScopeChips,
  SyncSection,
  SyncStatusRow,
  type SyncDeviceItem,
  type SyncProviderOption,
} from "../views/lehrer/settings-screen";
import { toBadgeModel } from "./cloud-badge-connected";
import { CloudSyncPanel, readSettings } from "./cloud-sync-panel";
import { useCloudClientIds } from "./cloud-client-ids";
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

/** Kurze Namen der Speicherorte wie in der Vorlage (17a). */
const PROVIDER_NAMES: Record<CloudProviderId, string> = {
  onedrive: "OneDrive",
  "google-drive": "Google Drive",
  webdav: "WebDAV",
};

/** Was die Einrichtung je Speicherort braucht (Zeile unter der Auswahl). */
const PROVIDER_HINTS: Record<CloudProviderId, string> = {
  onedrive: "Anmeldung im Browser, dauert wenige Sekunden",
  "google-drive": "Anmeldung im Browser, dauert wenige Sekunden",
  webdav: "Server-Adresse, Benutzername und App-Passwort nötig",
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
 * Gruppe „Geräte abgleichen“ der Einstellungen (Lehrerbereich v2, 17a):
 * Einrichtung und Verwaltung des geräteübergreifenden Abgleichs. Ohne
 * Aktivierung ändert sich nichts; kein Lernraum-Server sieht die Daten, sie
 * liegen im Speicher der Lehrkraft.
 */
export function CloudSyncSetup() {
  const visible = useAreaVisible("geraete-sync");
  const { snapshot, controller } = useSyncSnapshot(visible);
  // Ohne Freigabe bleibt der bisherige Handabgleich (Sichern/Holen) erreichbar.
  if (!visible) {
    return (
      <SettingsGroup
        title="Cloud-Sicherung"
        hint="Von Hand sichern und auf einem anderen Gerät holen."
      >
        <div className={cx(m.card, "ui")}>
          <CloudSyncPanel area="teacher" />
        </div>
      </SettingsGroup>
    );
  }
  return (
    <SettingsGroup
      id="cloud-abgleich"
      title="Geräte abgleichen"
      hint="Klassen, Material und Ergebnisse zwischen deinen Lehrergeräten."
    >
      <div className={m.card}>
        {!snapshot || !controller ? (
          <SyncSection>
            <p className={m.hint}>Wird geladen …</p>
          </SyncSection>
        ) : snapshot.enabled ? (
          <ActiveSync snapshot={snapshot} controller={controller} />
        ) : (
          <SetupWizard controller={controller} />
        )}
      </div>
    </SettingsGroup>
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
  const clientIds = useCloudClientIds();
  const providers = useMemo(() => cloudProviders(clientIds), [clientIds]);
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
  const started = useRef(false);

  // Nach der Rückkehr von OneDrive geht es mit dem gewählten Anbieter weiter.
  // WebDAV-Adresse und Benutzername aus dem Handabgleich werden übernommen.
  useEffect(() => {
    const id = window.setTimeout(() => {
      const previous = readSettings();
      setWebdav((value) => ({
        ...value,
        url: value.url || previous.url,
        username: value.username || previous.username,
      }));
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

  // Den Fokus erst nach dem ersten Schritt setzen, nicht beim Laden der Seite.
  useEffect(() => {
    if (step === "provider" && !started.current) return;
    started.current = true;
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
        await connectGoogle(clientIds["google-drive"]);
        await check();
      } else {
        await startConnect(id, clientIds[id], RETURN_TO);
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

  const options: SyncProviderOption[] = providers.map((entry) => ({
    id: entry.id,
    name: PROVIDER_NAMES[entry.id],
    sub: !entry.available
      ? "Noch nicht eingerichtet"
      : entry.id === "webdav"
        ? "Eigener Server"
        : isConnected(entry.id)
          ? "Angemeldet"
          : "Nicht verbunden",
    disabled: !entry.available,
  }));
  const oauth = provider !== "webdav";
  const connected = oauth && isConnected(provider as OAuthProviderId);
  const cta =
    step !== "provider" ? null : !oauth ? (
      <button
        type="button"
        className={m.green}
        onClick={() => setStep("connect")}
      >
        WebDAV einrichten
      </button>
    ) : connected ? (
      <button
        type="button"
        className={m.green}
        disabled={busy}
        onClick={() => void check()}
      >
        Verbindung testen
      </button>
    ) : (
      <button
        type="button"
        className={m.green}
        onClick={() => void connectOAuth(provider as OAuthProviderId)}
      >
        Mit {PROVIDER_NAMES[provider]} verbinden
      </button>
    );

  return (
    <>
      <ProviderPicker
        options={options}
        value={provider}
        onChange={(id) => {
          setProvider(id as CloudProviderId);
          setRemote(null);
          setError("");
          setStep("provider");
        }}
      />
      <SyncStatusRow
        name={PROVIDER_NAMES[provider]}
        sub={PROVIDER_HINTS[provider]}
      >
        {cta}
      </SyncStatusRow>

      {step === "provider" ? (
        <SyncSection>
          <p className={m.hint}>
            Optional. Ohne Einrichtung ändert sich nichts. Deine Daten liegen in
            deinem eigenen Cloud-Speicher; ein Lernraum-Server sieht sie nicht.
            Änderungen erscheinen nach wenigen Sekunden auf dem anderen Gerät.
            Bei OneDrive und Google Drive läuft die Anmeldung nach wenigen
            Stunden ab; dann genügt ein Klick auf „Neu anmelden“. WebDAV
            (Nextcloud) arbeitet an der Tafel am zuverlässigsten.
          </p>
        </SyncSection>
      ) : (
        <SyncSection className="ui">
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

          {step === "connect" ? (
            <div className="ui-stack">
              {provider === "webdav" ? (
                <form
                  className="ui-stack"
                  onSubmit={(event) => void check(event)}
                >
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
                    Lege im Nextcloud-Konto ein App-Passwort nur für diesen
                    Zweck an; du kannst es dort jederzeit widerrufen. Es wird
                    auf diesem Gerät gespeichert, damit der Abgleich nach dem
                    Neuladen weiterläuft.
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
                  {connected ? (
                    <p className="ui-notice ui-notice--good">
                      Mit {account} verbunden.
                    </p>
                  ) : (
                    <p className="ui-small">
                      Melde dich bei {account} an. Der Lernraum bekommt nur
                      Zugriff auf seinen eigenen App-Ordner.
                    </p>
                  )}
                  {nav(
                    "provider",
                    connected ? (
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
                    onChange={(checked) =>
                      setScope({ ...scope, [area]: checked })
                    }
                  />
                ))}
              </div>
              <p className="ui-small ui-muted">
                Hell/Dunkel, laufende Live-Räume und Zugangsdaten bleiben auf
                dem Gerät. Ohne Schlüssel kann das andere Gerät keine
                Leistungsbriefe prüfen und keine Schreiberleichterung vergeben.
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
                    Die Cloud-Datei ist verschlüsselt. Gib das Passwort ein, das
                    du auf deinem anderen Gerät festgelegt hast.
                  </p>
                  <SyncPasswordForm
                    mode="enter"
                    account={account}
                    submitLabel="Passwort prüfen"
                    onSubmit={async (value) => {
                      try {
                        await controller.checkPassword(
                          value,
                          remote as RemoteInfo,
                        );
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
                      Du gleichst Daten von Kindern ab. Wir empfehlen dringend
                      ein Passwort
                      {scope.keys ? "; Schlüssel gehen nur damit" : ""}.
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
                    {sensitive ? ", auch Daten von Kindern," : ""} in meinen
                    eigenen Cloud-Speicher übertragen werden und ich dafür
                    verantwortlich bin.
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
        </SyncSection>
      )}

      {error ? (
        <SyncSection>
          <p className={cx(m.notice, m.noticeBad)} role="alert">
            {error}
          </p>
        </SyncSection>
      ) : null}
    </>
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
  const clientIds = useCloudClientIds();
  const providers = useMemo(() => cloudProviders(clientIds), [clientIds]);
  const model = useMemo(() => toBadgeModel(snapshot), [snapshot]);
  const now = useTick(10_000, true);
  const [notice, setNotice] = useState("");
  const [changing, setChanging] = useState(false);
  const account =
    model.providerLabel === "WebDAV" ? "WebDAV" : model.providerLabel;
  const current = snapshot.provider ?? "webdav";

  async function run(action: () => Promise<unknown>, done: string) {
    setNotice("");
    try {
      await action();
      setNotice(done);
    } catch (failure) {
      setNotice(message(failure, "Das hat nicht geklappt."));
    }
  }

  // Den Speicherort wechselt man über „Abgleich ausschalten“ und neu einrichten.
  const options: SyncProviderOption[] = providers.map((entry) => ({
    id: entry.id,
    name: PROVIDER_NAMES[entry.id],
    sub:
      entry.id === current
        ? "Aktiv"
        : !entry.available
          ? "Noch nicht eingerichtet"
          : entry.id === "webdav"
            ? "Eigener Server"
            : "Nicht verbunden",
    emphasized: entry.id === current,
    disabled: entry.id !== current,
  }));

  const stand = `Stand ${model.revision}${
    model.writer
      ? ` · zuletzt von „${model.writer.name}“ ${formatAgo(model.writer.at, now)}`
      : ""
  }`;
  const devices: SyncDeviceItem[] = model.devices.some((d) => d.current)
    ? model.devices.map((device) => ({
        id: device.id,
        name: device.name,
        current: device.current,
        meta: `Stand ${device.revision} · ${formatAgo(device.seenAt, now)}`,
      }))
    : [
        {
          id: snapshot.deviceId,
          name: snapshot.deviceName,
          current: true,
          meta: "noch nicht abgeglichen",
        },
        ...model.devices.map((device) => ({
          id: device.id,
          name: device.name,
          current: false,
          meta: `Stand ${device.revision} · ${formatAgo(device.seenAt, now)}`,
        })),
      ];

  const reauth = snapshot.status === "reauth" && snapshot.provider !== "webdav";
  const locked = snapshot.status === "locked";

  return (
    <>
      {reauth ? (
        <SyncAlert
          text={`Die Anmeldung bei ${model.providerLabel} ist abgelaufen.`}
          actionLabel="Neu anmelden"
          onAction={() =>
            void run(async () => {
              const provider = snapshot.provider as OAuthProviderId;
              if (provider === "google-drive") {
                await connectGoogle(clientIds["google-drive"]);
              } else {
                await startConnect(provider, clientIds[provider], RETURN_TO);
              }
              await controller.syncNow();
            }, "Wieder angemeldet.")
          }
        />
      ) : null}
      {locked ? (
        <SyncAlert
          text={`Der Abgleich pausiert, bis du das Passwort eingibst${
            snapshot.error ? `: ${snapshot.error}` : "."
          }`}
        />
      ) : null}

      <ProviderPicker options={options} value={current} />
      <SyncStatusRow
        name={PROVIDER_NAMES[current]}
        sub={
          model.status === "idle" ? (
            stand
          ) : (
            <>
              {cloudBadgeText(model, now)}
              <br />
              {stand}
            </>
          )
        }
      >
        {model.conflicts > 0 ? (
          <button
            type="button"
            className={m.soft}
            onClick={() =>
              window.dispatchEvent(new Event(OPEN_CONFLICTS_EVENT))
            }
          >
            {model.conflicts === 1
              ? "Konflikt ansehen"
              : `${model.conflicts} Konflikte ansehen`}
          </button>
        ) : null}
        <button
          type="button"
          className={m.green}
          disabled={model.status === "syncing"}
          onClick={() => void controller.syncNow()}
        >
          Jetzt abgleichen
        </button>
      </SyncStatusRow>

      {locked ? (
        <SyncSection className="ui">
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
        </SyncSection>
      ) : null}

      <SyncDevices
        devices={devices}
        onRename={(name) =>
          void run(
            () => controller.setDeviceName(name),
            "Der Gerätename wurde gespeichert.",
          )
        }
      />

      <SyncScopeChips
        labels={(Object.keys(AREA_TEXT) as SyncArea[])
          .filter((area) => snapshot.scope[area])
          .map((area) => AREA_TEXT[area].label)}
      />

      <EncryptionSwitch
        on={snapshot.encrypted}
        hint={
          snapshot.encrypted
            ? "An. Ohne Passwort lassen sich die Daten in der Cloud nicht mehr lesen."
            : "Aus. Die Daten sind nur durch dein Cloud-Konto geschützt."
        }
        onToggle={() => {
          if (snapshot.encrypted) {
            setChanging(false);
            void run(
              () => controller.setPassword(null),
              "Die Cloud-Datei ist jetzt unverschlüsselt.",
            );
          } else {
            setChanging((open) => !open);
          }
        }}
      >
        {changing ? (
          <div className="ui">
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
          </div>
        ) : snapshot.encrypted ? (
          <span>
            <button
              type="button"
              className={m.link}
              onClick={() => setChanging(true)}
            >
              Passwort ändern
            </button>
          </span>
        ) : null}
      </EncryptionSwitch>

      <SyncOff
        onOff={({ deleteRemote }) =>
          void run(
            () =>
              deleteRemote
                ? controller.disable({ deleteRemote: true })
                : controller.disable(),
            deleteRemote
              ? "Der Abgleich ist aus und die Cloud-Datei gelöscht."
              : "Der Abgleich ist auf diesem Gerät aus.",
          )
        }
      />

      {notice ? (
        <SyncSection>
          <p className={m.notice} role="status">
            {notice}
          </p>
        </SyncSection>
      ) : null}
    </>
  );
}
