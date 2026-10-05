import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RoundResult } from "./engine";
import {
  createBrowserEnv,
  createSyncScheduler,
  type SchedulerEnv,
  type SchedulerEvent,
  type SchedulerMessage,
} from "./scheduler";

const result = (over: Partial<RoundResult> = {}): RoundResult => ({
  status: "idle",
  uploaded: false,
  received: false,
  revision: 1,
  newConflicts: 0,
  ...over,
});

function fakeEnv() {
  const handlers = new Map<SchedulerEvent, Set<() => void>>();
  const channelHandlers = new Set<(message: SchedulerMessage) => void>();
  const posted: SchedulerMessage[] = [];
  const state = { visible: true, online: true };
  const env: SchedulerEnv = {
    now: () => Date.now(),
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (handle) => clearTimeout(handle as NodeJS.Timeout),
    setInterval: (fn, ms) => setInterval(fn, ms),
    clearInterval: (handle) => clearInterval(handle as NodeJS.Timeout),
    isVisible: () => state.visible,
    isOnline: () => state.online,
    on(event, handler) {
      const set = handlers.get(event) ?? new Set();
      set.add(handler);
      handlers.set(event, set);
      return () => set.delete(handler);
    },
    channel: {
      post: (message) => posted.push(message),
      subscribe(handler) {
        channelHandlers.add(handler);
        return () => channelHandlers.delete(handler);
      },
    },
  };
  return {
    env,
    state,
    posted,
    emit: (event: SchedulerEvent) => handlers.get(event)?.forEach((h) => h()),
    receive: (message: SchedulerMessage) =>
      channelHandlers.forEach((h) => h(message)),
    listeners: () =>
      [...handlers.values()].reduce((sum, set) => sum + set.size, 0) +
      channelHandlers.size,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("sync scheduler", () => {
  it("runs once on start and then every 10 seconds while visible", async () => {
    const fake = fakeEnv();
    const round = vi.fn(async () => result());
    const scheduler = createSyncScheduler({ env: fake.env, round });
    scheduler.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(round).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(round).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(round).toHaveBeenCalledTimes(5);
    scheduler.stop();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(round).toHaveBeenCalledTimes(5);
  });

  it("uploads a local change only after two seconds of quiet", async () => {
    const fake = fakeEnv();
    const round = vi.fn(async () => result({ uploaded: true }));
    const scheduler = createSyncScheduler({ env: fake.env, round });
    scheduler.start();
    await vi.advanceTimersByTimeAsync(0);
    round.mockClear();
    scheduler.notifyChange();
    await vi.advanceTimersByTimeAsync(1500);
    scheduler.notifyChange();
    await vi.advanceTimersByTimeAsync(1500);
    expect(round).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(600);
    expect(round).toHaveBeenCalledTimes(1);
    scheduler.stop();
  });

  it("stops asking while hidden, flushes pending changes and resumes when visible", async () => {
    const fake = fakeEnv();
    const round = vi.fn(async () => result());
    const scheduler = createSyncScheduler({ env: fake.env, round });
    scheduler.start();
    await vi.advanceTimersByTimeAsync(0);
    round.mockClear();
    scheduler.notifyChange();
    fake.state.visible = false;
    fake.emit("visibilitychange");
    await vi.advanceTimersByTimeAsync(0);
    expect(round).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(round).toHaveBeenCalledTimes(1);
    fake.state.visible = true;
    fake.emit("visibilitychange");
    await vi.advanceTimersByTimeAsync(0);
    expect(round).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(round).toHaveBeenCalledTimes(3);
    scheduler.stop();
  });

  it("flushes when the page is left and skips the flush when nothing changed", async () => {
    const fake = fakeEnv();
    const round = vi.fn(async () => result());
    const scheduler = createSyncScheduler({ env: fake.env, round });
    scheduler.start();
    await vi.advanceTimersByTimeAsync(0);
    round.mockClear();
    fake.emit("pagehide");
    await vi.advanceTimersByTimeAsync(0);
    expect(round).not.toHaveBeenCalled();
    scheduler.notifyChange();
    fake.emit("pagehide");
    await vi.advanceTimersByTimeAsync(0);
    expect(round).toHaveBeenCalledTimes(1);
    scheduler.stop();
  });

  it("waits while offline and syncs when the connection returns", async () => {
    const fake = fakeEnv();
    const round = vi.fn(async () => result());
    const onOffline = vi.fn();
    const scheduler = createSyncScheduler({ env: fake.env, round, onOffline });
    fake.state.online = false;
    scheduler.start();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(round).not.toHaveBeenCalled();
    fake.emit("offline");
    expect(onOffline).toHaveBeenCalled();
    fake.state.online = true;
    fake.emit("online");
    await vi.advanceTimersByTimeAsync(0);
    expect(round).toHaveBeenCalledTimes(1);
    scheduler.stop();
  });

  it("runs one follow-up round when a change arrives during a round", async () => {
    const fake = fakeEnv();
    let release: () => void = () => undefined;
    const round = vi.fn(
      () =>
        new Promise<RoundResult>((resolve) => {
          release = () => resolve(result());
        }),
    );
    const scheduler = createSyncScheduler({ env: fake.env, round });
    scheduler.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(scheduler.isRunning()).toBe(true);
    void scheduler.syncNow();
    void scheduler.syncNow();
    release();
    await vi.advanceTimersByTimeAsync(0);
    expect(round).toHaveBeenCalledTimes(2);
    release();
    await vi.advanceTimersByTimeAsync(0);
    expect(scheduler.isRunning()).toBe(false);
    expect(round).toHaveBeenCalledTimes(2);
    scheduler.stop();
  });

  it("reports received changes to the lists and to other tabs", async () => {
    const fake = fakeEnv();
    const onData = vi.fn();
    const onChange = vi.fn();
    const scheduler = createSyncScheduler({
      env: fake.env,
      round: async () => result({ received: true }),
      onData,
      onChange,
    });
    scheduler.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(onData).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalled();
    expect(fake.posted.map((m) => m.type)).toEqual(["round", "data"]);
    fake.receive({ type: "data" });
    expect(onData).toHaveBeenCalledTimes(2);
    scheduler.stop();
    expect(fake.listeners()).toBe(0);
  });

  it("skips a poll when another tab just checked", async () => {
    const fake = fakeEnv();
    const round = vi.fn(async () => result());
    const scheduler = createSyncScheduler({ env: fake.env, round });
    scheduler.start();
    await vi.advanceTimersByTimeAsync(0);
    round.mockClear();
    await vi.advanceTimersByTimeAsync(9_500);
    fake.receive({ type: "round", at: Date.now() });
    await vi.advanceTimersByTimeAsync(500);
    expect(round).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(round).toHaveBeenCalledTimes(1);
    scheduler.stop();
  });

  it("survives a failing round and keeps polling", async () => {
    const fake = fakeEnv();
    const onError = vi.fn();
    let calls = 0;
    const round = vi.fn(async () => {
      calls += 1;
      if (calls === 1) throw new Error("kaputt");
      return result();
    });
    const scheduler = createSyncScheduler({ env: fake.env, round, onError });
    scheduler.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(scheduler.isRunning()).toBe(false);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(round).toHaveBeenCalledTimes(2);
    scheduler.stop();
  });

  it("does nothing before start and after stop, and starts only once", async () => {
    const fake = fakeEnv();
    const round = vi.fn(async () => result());
    const scheduler = createSyncScheduler({ env: fake.env, round });
    scheduler.notifyChange();
    await scheduler.syncNow();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(round).not.toHaveBeenCalled();
    scheduler.start();
    scheduler.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(round).toHaveBeenCalledTimes(1);
    scheduler.stop();
  });

  it("serialises rounds through the lock of the environment", async () => {
    const fake = fakeEnv();
    const order: string[] = [];
    const env: SchedulerEnv = {
      ...fake.env,
      exclusive: async (fn) => {
        order.push("lock");
        const value = await fn();
        order.push("unlock");
        return value;
      },
    };
    const scheduler = createSyncScheduler({
      env,
      round: async () => {
        order.push("round");
        return result();
      },
    });
    scheduler.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(order).toEqual(["lock", "round", "unlock"]);
    scheduler.stop();
  });
});

describe("createBrowserEnv", () => {
  it("wires page events, timers and the tab channel", async () => {
    const env = createBrowserEnv(`test-${crypto.randomUUID()}`);
    expect(env.isOnline()).toBe(true);
    expect(env.isVisible()).toBe(typeof document !== "undefined");
    const seen: string[] = [];
    const off = env.on("online", () => seen.push("online"));
    window.dispatchEvent(new Event("online"));
    off();
    window.dispatchEvent(new Event("online"));
    const offVisibility = env.on("visibilitychange", () => seen.push("v"));
    document.dispatchEvent(new Event("visibilitychange"));
    offVisibility();
    expect(seen).toEqual(["online", "v"]);
    const fired: string[] = [];
    const timer = env.setTimeout(() => fired.push("t"), 10);
    env.clearTimeout(timer);
    const interval = env.setInterval(() => fired.push("i"), 10);
    env.clearInterval(interval);
    await vi.advanceTimersByTimeAsync(50);
    expect(fired).toEqual([]);
    expect(env.now()).toBeGreaterThan(0);
    expect(typeof env.channel?.post).toBe("function");
  });
});
