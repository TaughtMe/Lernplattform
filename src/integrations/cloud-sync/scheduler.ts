/**
 * Zeitsteuerung des Abgleichs (Abschnitt 3 des Plans): Lokale Änderungen
 * werden nach 2 s Ruhe hochgeladen, bei sichtbarem Tab wird alle 10 s
 * geprüft, beim Verbergen wird sofort geschrieben und nicht mehr gefragt.
 * Umgebung (Zeit, Sichtbarkeit, Netz, Sperren) wird hineingegeben.
 */
import type { RoundResult } from "./engine";

export const POLL_MS = 10_000;
export const DEBOUNCE_MS = 2_000;

export type SchedulerEvent =
  "visibilitychange" | "online" | "offline" | "pagehide";

export type SchedulerMessage = { type: "round"; at: number } | { type: "data" };

export type SchedulerEnv = {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
  setInterval(fn: () => void, ms: number): unknown;
  clearInterval(handle: unknown): void;
  isVisible(): boolean;
  isOnline(): boolean;
  on(event: SchedulerEvent, handler: () => void): () => void;
  /**
   * Führt `fn` aus, solange kein anderer Tab eine Runde macht (Web Locks).
   * Ohne Angabe läuft `fn` direkt.
   */
  exclusive?<T>(fn: () => Promise<T>): Promise<T>;
  /** Nachrichten zwischen Tabs (BroadcastChannel). */
  channel?: {
    post(message: SchedulerMessage): void;
    subscribe(handler: (message: SchedulerMessage) => void): () => void;
  };
};

export type SchedulerOptions = {
  env: SchedulerEnv;
  /** Eine Runde; im Betrieb `syncOnce` mit frischem Ziel. */
  round: () => Promise<RoundResult>;
  /** Eingehende Änderungen: Listen neu laden (`teacher-data-changed`). */
  onData?: () => void;
  /** Nach jeder Runde und jedem Zustandswechsel. */
  onChange?: (result?: RoundResult) => void;
  /** Gerät ging offline, ohne dass eine Runde lief. */
  onOffline?: () => void;
  /** Eine Runde ist unerwartet gescheitert (die Zeitsteuerung läuft weiter). */
  onError?: (error: unknown) => void;
  pollMs?: number;
  debounceMs?: number;
};

export function createSyncScheduler(options: SchedulerOptions) {
  const { env } = options;
  const pollMs = options.pollMs ?? POLL_MS;
  const debounceMs = options.debounceMs ?? DEBOUNCE_MS;
  let active = false;
  let running: Promise<void> | null = null;
  let again = false;
  let dirty = false;
  let debounce: unknown = null;
  let poll: unknown = null;
  let lastRoundAt = 0;
  const disposers: Array<() => void> = [];

  async function execute() {
    dirty = false;
    const run = async () => options.round();
    const result = await (env.exclusive ? env.exclusive(run) : run());
    lastRoundAt = env.now();
    env.channel?.post({ type: "round", at: lastRoundAt });
    if (result.received) {
      options.onData?.();
      env.channel?.post({ type: "data" });
    }
    options.onChange?.(result);
  }

  /** Eine Runde starten; läuft schon eine, folgt genau eine weitere. */
  function trigger(): Promise<void> {
    if (!active) return Promise.resolve();
    if (!env.isOnline()) return Promise.resolve();
    if (running) {
      again = true;
      return running;
    }
    running = (async () => {
      try {
        do {
          again = false;
          try {
            await execute();
          } catch (error) {
            options.onError?.(error);
          }
        } while (again && active);
      } finally {
        running = null;
      }
    })();
    return running;
  }

  function clearDebounce() {
    if (debounce !== null) env.clearTimeout(debounce);
    debounce = null;
  }

  function startPolling() {
    if (poll !== null || !env.isVisible()) return;
    poll = env.setInterval(() => {
      if (!env.isVisible() || !env.isOnline()) return;
      // Hat ein anderer Tab gerade geprüft, nicht doppelt fragen.
      if (env.now() - lastRoundAt < pollMs - 1000) return;
      void trigger();
    }, pollMs);
  }

  function stopPolling() {
    if (poll !== null) env.clearInterval(poll);
    poll = null;
  }

  function flush() {
    clearDebounce();
    if (dirty) void trigger();
  }

  return {
    start() {
      if (active) return;
      active = true;
      disposers.push(
        env.on("visibilitychange", () => {
          if (env.isVisible()) {
            startPolling();
            void trigger();
          } else {
            stopPolling();
            flush();
          }
        }),
        env.on("online", () => void trigger()),
        env.on("offline", () => options.onOffline?.()),
        env.on("pagehide", flush),
      );
      const unsubscribe = env.channel?.subscribe((message) => {
        if (message.type === "round") lastRoundAt = message.at;
        else options.onData?.();
      });
      if (unsubscribe) disposers.push(unsubscribe);
      startPolling();
      void trigger();
    },
    stop() {
      active = false;
      clearDebounce();
      stopPolling();
      for (const dispose of disposers.splice(0)) dispose();
    },
    /** Lokale Änderung: nach kurzer Ruhe hochladen. */
    notifyChange() {
      if (!active) return;
      dirty = true;
      clearDebounce();
      debounce = env.setTimeout(() => {
        debounce = null;
        void trigger();
      }, debounceMs);
    },
    /** „Jetzt abgleichen“. */
    syncNow() {
      clearDebounce();
      dirty = true;
      return trigger();
    },
    /** Läuft gerade eine Runde (für Tests und Anzeige). */
    isRunning: () => running !== null,
  };
}

export type SyncScheduler = ReturnType<typeof createSyncScheduler>;

/** Umgebung des Browsers: Seite, Netz, Web Locks, BroadcastChannel. */
export function createBrowserEnv(
  channelName = "lernraum-teacher-sync",
): SchedulerEnv {
  const channel =
    typeof BroadcastChannel === "function"
      ? new BroadcastChannel(channelName)
      : null;
  const locks =
    typeof navigator !== "undefined" && "locks" in navigator
      ? navigator.locks
      : null;
  return {
    now: () => Date.now(),
    setTimeout: (fn, ms) => window.setTimeout(fn, ms),
    clearTimeout: (handle) => window.clearTimeout(handle as number),
    setInterval: (fn, ms) => window.setInterval(fn, ms),
    clearInterval: (handle) => window.clearInterval(handle as number),
    isVisible: () => document.visibilityState === "visible",
    isOnline: () => navigator.onLine,
    on(event, handler) {
      const target = event === "visibilitychange" ? document : window;
      target.addEventListener(event, handler);
      return () => target.removeEventListener(event, handler);
    },
    ...(locks
      ? {
          exclusive: <T>(fn: () => Promise<T>) =>
            locks.request("lernraum-teacher-sync", fn) as Promise<T>,
        }
      : {}),
    ...(channel
      ? {
          channel: {
            post: (message: SchedulerMessage) => channel.postMessage(message),
            subscribe(handler: (message: SchedulerMessage) => void) {
              const listener = (event: MessageEvent<SchedulerMessage>) =>
                handler(event.data);
              channel.addEventListener("message", listener);
              return () => channel.removeEventListener("message", listener);
            },
          },
        }
      : {}),
  };
}
