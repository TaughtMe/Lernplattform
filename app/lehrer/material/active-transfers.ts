/**
 * Laufende Freigaben an Schüler, gemerkt auf diesem Gerät (Lehrerbereich v2,
 * 17b „Läuft gerade“). Der Server kennt keine Liste der Freigaben und löscht
 * jede nach höchstens 24 Stunden; hier steht nur, was dieses Gerät
 * freigegeben hat, damit QR und Code nach dem Neuladen wieder erscheinen.
 */
export type ActiveTransfer = {
  packageId: string;
  title: string;
  pairs: number;
  /** 24-stelliger Code ohne Trennzeichen. */
  code: string;
  publishedAt: string;
  expiresAt: string;
};

export const ACTIVE_TRANSFERS_KEY = "lernraum:lehrer:freigaben";

function isTransfer(value: unknown): value is ActiveTransfer {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry["packageId"] === "string" &&
    typeof entry["title"] === "string" &&
    typeof entry["pairs"] === "number" &&
    typeof entry["code"] === "string" &&
    typeof entry["publishedAt"] === "string" &&
    typeof entry["expiresAt"] === "string"
  );
}

/** Noch gültige Freigaben (je Paket höchstens eine, siehe `rememberTransfer`). */
export function readActiveTransfers(now: number): ActiveTransfer[] {
  try {
    const raw = window.localStorage.getItem(ACTIVE_TRANSFERS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isTransfer)
      .filter((entry) => Date.parse(entry.expiresAt) > now);
  } catch {
    return [];
  }
}

function write(entries: readonly ActiveTransfer[]) {
  try {
    window.localStorage.setItem(ACTIVE_TRANSFERS_KEY, JSON.stringify(entries));
  } catch {
    // Ohne Speicher gilt die Freigabe trotzdem; sie steht nur nicht in der Liste.
  }
}

/** Merkt eine neue Freigabe; eine ältere desselben Pakets fällt heraus. */
export function rememberTransfer(entry: ActiveTransfer, now: number) {
  const next = [
    entry,
    ...readActiveTransfers(now).filter(
      ({ packageId }) => packageId !== entry.packageId,
    ),
  ];
  write(next);
  return next;
}

/** Vergisst die Freigaben eines gelöschten Pakets. */
export function forgetTransfers(packageId: string, now: number) {
  const next = readActiveTransfers(now).filter(
    (entry) => entry.packageId !== packageId,
  );
  write(next);
  return next;
}

const HOUR = 60 * 60 * 1000;

const clock = (time: number) =>
  new Date(time).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

const sameDay = (left: number, right: number) =>
  new Date(left).toDateString() === new Date(right).toDateString();

/** Restzeit einer Freigabe, z. B. „noch 6 h“ und „bis 20:05“. */
export function transferTimeLeft(entry: ActiveTransfer, now: number) {
  const end = Date.parse(entry.expiresAt);
  const start = Date.parse(entry.publishedAt);
  const left = Math.max(0, end - now);
  const short =
    left >= HOUR
      ? `noch ${Math.round(left / HOUR)} h`
      : `noch ${Math.max(1, Math.ceil(left / 60_000))} min`;
  const until = sameDay(end, now)
    ? `bis ${clock(end)}`
    : sameDay(end, now + 24 * HOUR)
      ? `bis morgen ${clock(end)}`
      : `bis ${new Date(end).toLocaleString("de-DE", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })}`;
  const span = end - start;
  return {
    short,
    until,
    fraction: span > 0 ? left / span : 0,
  };
}
