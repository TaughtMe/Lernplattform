"use client";

import {
  differences,
  type FieldDifference,
} from "../../src/integrations/cloud-sync/diff";
import type { SyncConflict } from "../../src/integrations/cloud-sync/model";
import { formatAgo } from "./cloud-badge-model";
import { Button } from "./primitives";

/** Entscheidungen, die der Dialog anbietet (siehe `ConflictAction` im Speicher). */
export type ConflictChoice =
  | { type: "keep" }
  | { type: "use-other" }
  | { type: "keep-both" }
  | { type: "delete" }
  | { type: "remove"; id: string }
  | { type: "merge" };

export type ConflictListProps = {
  conflicts: readonly SyncConflict[];
  /** Namen betroffener Kinder (Klassenstempel), nach ID. */
  memberNames?: Readonly<Record<string, string>>;
  now: number;
  /** Anzeigename der eigenen Geräte nach ID; sonst steht die ID da. */
  deviceNames?: Readonly<Record<string, string>>;
  onResolve: (conflict: SyncConflict, choice: ConflictChoice) => void;
};

const COPYABLE = new Set(["contentPackages", "assignments"]);

const INTRO: Record<SyncConflict["kind"], string> = {
  changed:
    "Auf zwei Geräten wurde dasselbe geändert. Die neuere Fassung gilt vorläufig, die andere bleibt erhalten.",
  deleted:
    "Auf einem Gerät gelöscht, auf einem anderen später geändert. Der Eintrag wurde vorläufig wiederhergestellt.",
  duplicate:
    "Dieser Eintrag gibt es zweimal, vermutlich auf beiden Geräten angelegt.",
  seal: "Für diese Klasse hat sich der Schlüssel des anderen Geräts durchgesetzt.",
};

/**
 * Liste offener Konflikte mit beiden Fassungen nebeneinander. Rein: Die
 * Entscheidung geht über `onResolve` an den Aufrufer. Nichts blockiert den
 * Unterricht; wer nichts entscheidet, behält die vorläufige Fassung.
 */
export function SyncConflictList({
  conflicts,
  memberNames = {},
  deviceNames = {},
  now,
  onResolve,
}: ConflictListProps) {
  if (conflicts.length === 0) {
    return (
      <p className="ui-notice ui-notice--good" role="status">
        Keine offenen Konflikte.
      </p>
    );
  }
  const device = (id: string) => deviceNames[id] ?? id;
  return (
    <ul className="ui-conflicts">
      {conflicts.map((conflict) => {
        const rows = differences(conflict.kept?.data, conflict.other?.data);
        const headingId = `konflikt-${conflict.id}`;
        return (
          <li key={conflict.id} aria-labelledby={headingId}>
            <h3 id={headingId} className="ui-h-section">
              {conflict.label}
            </h3>
            <p className="ui-small ui-muted">{INTRO[conflict.kind]}</p>
            {conflict.kind === "seal" ? (
              <SealNote conflict={conflict} memberNames={memberNames} />
            ) : conflict.kind === "deleted" ? (
              <p className="ui-small">
                Behalten oder doch löschen? Die Fassung vom Gerät „
                {device(conflict.kept?.device ?? "")}“{" "}
                {formatAgo(
                  conflict.kept ? hlcIso(conflict.kept.hlc) : null,
                  now,
                )}{" "}
                ist neuer als das Löschen.
              </p>
            ) : (
              <Versions
                conflict={conflict}
                rows={rows}
                now={now}
                device={device}
              />
            )}
            <div className="ui-row ui-wrap">
              <Choices conflict={conflict} onResolve={onResolve} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Zeitpunkt aus der Änderungsmarke (die ersten 15 Ziffern sind Millisekunden). */
function hlcIso(hlc: string): string | null {
  const ms = Number(hlc.slice(0, 15));
  return Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString() : null;
}

function Versions({
  conflict,
  rows,
  now,
  device,
}: {
  conflict: SyncConflict;
  rows: readonly FieldDifference[];
  now: number;
  device: (id: string) => string;
}) {
  const side = (
    title: string,
    version: SyncConflict["kept"],
    pick: (row: FieldDifference) => string,
  ) => (
    <section className="ui-conflict-side" aria-label={title}>
      <h4 className="ui-conflict-side__title">{title}</h4>
      {version ? (
        <p className="ui-small ui-muted">
          Gerät „{device(version.device)}“ ·{" "}
          {formatAgo(hlcIso(version.hlc), now)}
        </p>
      ) : null}
      <dl className="ui-conflict-fields">
        {rows.map((row) => (
          <div key={row.field}>
            <dt>{row.label}</dt>
            <dd>{pick(row)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
  return (
    <div className="ui-conflict-sides">
      {side("Gilt vorläufig", conflict.kept, (row) => row.kept)}
      {conflict.other
        ? side("Andere Fassung", conflict.other, (row) => row.other)
        : null}
    </div>
  );
}

function SealNote({
  conflict,
  memberNames,
}: {
  conflict: SyncConflict;
  memberNames: Readonly<Record<string, string>>;
}) {
  const ids = conflict.affectedMemberIds ?? [];
  return (
    <div className="ui-small">
      <p>
        Auf diesem Gerät vergebene Schreiberleichterungen für {conflict.label}{" "}
        müssen neu vergeben werden.
      </p>
      {ids.length > 0 ? (
        <ul>
          {ids.map((id) => (
            <li key={id}>{memberNames[id] ?? "Kind"}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Choices({
  conflict,
  onResolve,
}: {
  conflict: SyncConflict;
  onResolve: ConflictListProps["onResolve"];
}) {
  const decide = (choice: ConflictChoice) => () => onResolve(conflict, choice);
  switch (conflict.kind) {
    case "changed":
      return (
        <>
          <Button onClick={decide({ type: "keep" })}>Diese behalten</Button>
          <Button variant="ghost" onClick={decide({ type: "use-other" })}>
            Andere behalten
          </Button>
          {COPYABLE.has(conflict.table) ? (
            <Button variant="ghost" onClick={decide({ type: "keep-both" })}>
              Beide behalten
            </Button>
          ) : null}
        </>
      );
    case "deleted":
      return (
        <>
          <Button onClick={decide({ type: "keep" })}>Behalten</Button>
          <Button variant="ghost" onClick={decide({ type: "delete" })}>
            Doch löschen
          </Button>
        </>
      );
    case "duplicate":
      return (
        <>
          {conflict.table !== "members" ? (
            <Button onClick={decide({ type: "merge" })}>Zusammenlegen</Button>
          ) : null}
          <Button
            variant={conflict.table === "members" ? "primary" : "ghost"}
            onClick={decide({ type: "keep" })}
          >
            Beide behalten
          </Button>
          <Button
            variant="ghost"
            onClick={decide({ type: "remove", id: conflict.recordId })}
          >
            Erste entfernen
          </Button>
          {conflict.otherRecordId ? (
            <Button
              variant="ghost"
              onClick={decide({
                type: "remove",
                id: conflict.otherRecordId,
              })}
            >
              Zweite entfernen
            </Button>
          ) : null}
        </>
      );
    case "seal":
      return <Button onClick={decide({ type: "keep" })}>Verstanden</Button>;
  }
}
