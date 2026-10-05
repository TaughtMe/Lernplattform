import type {
  SchedulerEnv,
  SchedulerEvent,
  SchedulerMessage,
} from "../scheduler";

type Timer = { at: number; every?: number; fn: () => void; id: number };

/**
 * Umgebung für Tests mit eigener, gesteuerter Zeit. Die Datenbank läuft mit
 * echten Timern weiter; nur die Takte des Abgleichs sind virtuell.
 */
export function createFakeEnv() {
  const handlers = new Map<SchedulerEvent, Set<() => void>>();
  const channel = new Set<(message: SchedulerMessage) => void>();
  const state = { visible: true, online: true };
  let clock = Date.parse("2026-10-05T10:00:00.000Z");
  let next = 1;
  let timers: Timer[] = [];

  const env: SchedulerEnv = {
    now: () => clock,
    setTimeout(fn, ms) {
      const id = next++;
      timers.push({ at: clock + ms, fn, id });
      return id;
    },
    clearTimeout(handle) {
      timers = timers.filter((timer) => timer.id !== handle);
    },
    setInterval(fn, ms) {
      const id = next++;
      timers.push({ at: clock + ms, every: ms, fn, id });
      return id;
    },
    clearInterval(handle) {
      timers = timers.filter((timer) => timer.id !== handle);
    },
    isVisible: () => state.visible,
    isOnline: () => state.online,
    on(event, handler) {
      const set = handlers.get(event) ?? new Set();
      set.add(handler);
      handlers.set(event, set);
      return () => set.delete(handler);
    },
    channel: {
      post: () => undefined,
      subscribe(handler) {
        channel.add(handler);
        return () => channel.delete(handler);
      },
    },
  };

  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

  return {
    env,
    state,
    emit: (event: SchedulerEvent) => handlers.get(event)?.forEach((h) => h()),
    /** Zeit vorstellen und fällige Takte auslösen. */
    async advance(ms: number) {
      const end = clock + ms;
      for (;;) {
        const due = timers
          .filter((timer) => timer.at <= end)
          .sort((a, b) => a.at - b.at)[0];
        if (!due) break;
        clock = due.at;
        if (due.every) due.at += due.every;
        else timers = timers.filter((timer) => timer !== due);
        due.fn();
        // Datenbank und Netz brauchen echte Zeit, bis die Runde durch ist.
        for (let index = 0; index < 5; index += 1) await tick();
      }
      clock = end;
    },
  };
}
