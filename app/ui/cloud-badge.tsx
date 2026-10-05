"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  cloudBadgeAnnouncement,
  cloudBadgeIcon,
  cloudBadgeText,
  formatAgo,
  type CloudBadgeModel,
  type CloudBadgeStatus,
} from "./cloud-badge-model";
import { Icon } from "./icons";
import { Button } from "./primitives";
import { Sheet } from "./sheet";

export type CloudBadgeActions = {
  /** „Jetzt abgleichen“. */
  onSyncNow?: (() => void) | undefined;
  /** Konfliktdialog öffnen. */
  onOpenConflicts?: (() => void) | undefined;
  /** Ziel „Einstellungen“ (Einrichtung, Passwort, Ausschalten). */
  settingsHref?: string | undefined;
};

/**
 * Cloud-Symbol im Kopf des Lehrerbereichs mit Statusmenü. Rein: Zustand und
 * Aktionen kommen als Props. Der Zustand zeigt sich nie nur über Farbe, das
 * Zusatzzeichen in der Wolke unterscheidet ihn. Eine Statusregion sagt nur
 * Fehler, Konflikt, Sperre und die Erholung an, nicht jede Runde.
 */
export function CloudBadge({
  model,
  actions = {},
  now,
}: {
  model: CloudBadgeModel;
  actions?: CloudBadgeActions;
  /** Zeitpunkt für „vor 5 s“; im Betrieb die Uhr, in Referenzbildern fest. */
  now?: number;
}) {
  const [open, setOpen] = useState(false);
  const tick = useTick(10_000, now === undefined);
  const current = now ?? tick;
  const text = cloudBadgeText(model, current);

  // Ansage nur bei Wechsel in einen Zustand, der Aufmerksamkeit braucht.
  const previous = useRef<CloudBadgeStatus | null>(null);
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    const next = cloudBadgeAnnouncement(previous.current, model, current);
    previous.current = model.status;
    if (next) {
      const id = window.setTimeout(() => setAnnouncement(next), 0);
      return () => window.clearTimeout(id);
    }
    return undefined;
    // `current` absichtlich nicht als Auslöser: Nur Zustandswechsel zählen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.status]);

  return (
    <>
      <button
        type="button"
        className="ui-cloud-badge"
        data-status={model.status}
        aria-label={`Cloud-Abgleich: ${text}`}
        title={text}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <Icon name={cloudBadgeIcon(model.status)} size={20} />
        {model.conflicts > 0 ? (
          <span className="ui-cloud-badge__count" aria-hidden="true">
            {model.conflicts}
          </span>
        ) : null}
      </button>
      <span className="ui-sr-only" role="status">
        {announcement}
      </span>
      <Sheet open={open} title="Cloud-Abgleich" onClose={() => setOpen(false)}>
        <CloudStatusPanel
          model={model}
          now={current}
          actions={actions}
          onNavigate={() => setOpen(false)}
        />
      </Sheet>
    </>
  );
}

/** Inhalt des Statusmenüs: Zustand, Stand, Geräte, Aktionen. */
export function CloudStatusPanel({
  model,
  now,
  actions,
  onNavigate,
}: {
  model: CloudBadgeModel;
  now: number;
  actions: CloudBadgeActions;
  onNavigate?: () => void;
}) {
  const text = cloudBadgeText(model, now);
  const busy = model.status === "syncing";
  return (
    <div className="ui-stack">
      <p className="ui-cloud-status" data-status={model.status}>
        <Icon name={cloudBadgeIcon(model.status)} size={26} />
        <span>{text}</span>
      </p>
      <p className="ui-small ui-muted">
        Stand {model.revision}
        {model.writer
          ? ` · zuletzt geschrieben von „${model.writer.name}“ ${formatAgo(model.writer.at, now)}`
          : ""}
        {` · ${model.providerLabel}`}
        {model.encrypted ? " · verschlüsselt" : ""}
      </p>
      {model.devices.length > 0 ? (
        <section aria-labelledby="cloud-devices">
          <h3 id="cloud-devices" className="ui-h-section">
            Geräte
          </h3>
          <ul className="ui-cloud-devices">
            {model.devices.map((device) => (
              <li key={device.id}>
                <span>
                  {device.name}
                  {device.current ? " (dieses Gerät)" : ""}
                </span>
                <span className="ui-small ui-muted">
                  Stand {device.revision} · {formatAgo(device.seenAt, now)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="ui-row ui-wrap">
        <Button disabled={busy} onClick={actions.onSyncNow}>
          Jetzt abgleichen
        </Button>
        {model.conflicts > 0 && actions.onOpenConflicts ? (
          <Button
            variant="ghost"
            onClick={() => {
              onNavigate?.();
              actions.onOpenConflicts?.();
            }}
          >
            {model.conflicts === 1
              ? "Konflikt ansehen"
              : `${model.conflicts} Konflikte ansehen`}
          </Button>
        ) : null}
        {actions.settingsHref ? (
          <Link
            className="ui-btn ui-btn--ghost"
            href={actions.settingsHref}
            {...(onNavigate ? { onClick: onNavigate } : {})}
          >
            Einstellungen
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/** Zähler für „vor 5 s“; im Betrieb alle `ms`, sonst fest. */
export function useTick(ms: number, active: boolean) {
  const [value, setValue] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const id = window.setInterval(() => setValue(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms, active]);
  return value;
}
