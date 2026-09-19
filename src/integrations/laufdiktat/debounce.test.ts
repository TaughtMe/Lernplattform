import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLiveRoomDebounce } from "./debounce";

describe("live room dashboard debounce", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("bundles bursts but never starves continuous classroom updates", () => {
    const operation = vi.fn();
    const debounced = createLiveRoomDebounce(operation, {
      delayMs: 200,
      maxWaitMs: 1_000,
    });
    for (let elapsed = 0; elapsed < 1_000; elapsed += 100) {
      debounced.schedule();
      vi.advanceTimersByTime(100);
    }
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("cancels a pending refresh on unmount", () => {
    const operation = vi.fn();
    const debounced = createLiveRoomDebounce(operation, {
      delayMs: 200,
      maxWaitMs: 1_000,
    });
    debounced.schedule();
    debounced.cancel();
    vi.runAllTimers();
    expect(operation).not.toHaveBeenCalled();
  });
});
