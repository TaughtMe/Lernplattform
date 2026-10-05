/**
 * Hybride logische Uhr. Ordnet Änderungen geräteübergreifend eindeutig, auch
 * wenn die Uhr eines Geräts falsch geht: Ein empfangener Stand zieht die
 * eigene Uhr nach, jede neue Änderung liegt hinter allen bekannten.
 *
 * Text: `<ms seit 1970, 15 Stellen>-<Zähler, 5 Stellen>-<Geräte-ID>`; die
 * Zeichenketten lassen sich direkt vergleichen.
 */
export type Hlc = string;

const PATTERN = /^(\d{15})-(\d{5})-(.+)$/;

export type HlcParts = { ms: number; counter: number; device: string };

export function parseHlc(value: Hlc): HlcParts {
  const match = PATTERN.exec(value);
  if (!match) throw new Error(`Ungültige Änderungsmarke: ${value}`);
  return {
    ms: Number(match[1]),
    counter: Number(match[2]),
    device: match[3] as string,
  };
}

export function formatHlc({ ms, counter, device }: HlcParts): Hlc {
  return `${String(ms).padStart(15, "0")}-${String(counter).padStart(5, "0")}-${device}`;
}

export function isHlc(value: unknown): value is Hlc {
  return typeof value === "string" && PATTERN.test(value);
}

export function compareHlc(left: Hlc, right: Hlc): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function maxHlc(left: Hlc | undefined, right: Hlc | undefined) {
  if (left === undefined) return right;
  if (right === undefined) return left;
  return compareHlc(left, right) >= 0 ? left : right;
}

/** Die Uhr eines Geräts; `last` ist die zuletzt vergebene oder gesehene Marke. */
export function createClock(device: string, last?: Hlc) {
  let state: HlcParts = last
    ? { ...parseHlc(last), device }
    : { ms: 0, counter: 0, device };
  return {
    /** Neue Marke für eine lokale Änderung. */
    tick(wallMs: number): Hlc {
      state =
        wallMs > state.ms
          ? { ms: wallMs, counter: 0, device }
          : { ms: state.ms, counter: state.counter + 1, device };
      return formatHlc(state);
    },
    /** Fremde Marke sehen: die eigene Uhr springt, wenn sie zurückliegt. */
    observe(remote: Hlc, wallMs: number) {
      const other = parseHlc(remote);
      const ms = Math.max(state.ms, other.ms, wallMs);
      let counter = 0;
      if (ms === state.ms && ms === other.ms) {
        counter = Math.max(state.counter, other.counter) + 1;
      } else if (ms === state.ms) {
        counter = state.counter + 1;
      } else if (ms === other.ms) {
        counter = other.counter + 1;
      }
      state = { ms, counter, device };
    },
    last(): Hlc | undefined {
      return state.ms === 0 ? undefined : formatHlc(state);
    },
  };
}
