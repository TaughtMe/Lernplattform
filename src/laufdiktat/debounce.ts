// Trailing debounce WITH an upper bound (maxWait). A plain trailing debounce
// can starve: while events keep arriving faster than delayMs, the timer keeps
// resetting and the function never fires — e.g. 19 students typing at once,
// whose progress broadcasts would otherwise stall the teacher dashboard's
// database sync indefinitely. maxWait guarantees the function fires at most
// maxWaitMs after the first queued call, no matter how dense the events are.

export interface Debounced {
  /** Schedules a call; multiple calls within delayMs are coalesced. */
  schedule: () => void;
  /** Discards a still-pending call (e.g. on unmount). */
  cancel: () => void;
}

export function createDebounced(
  fn: () => void,
  { delayMs, maxWaitMs }: { delayMs: number; maxWaitMs: number },
): Debounced {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let firstScheduledAt = 0;

  const run = () => {
    timer = null;
    fn();
  };

  return {
    schedule: () => {
      const now = Date.now();
      if (timer === null) {
        firstScheduledAt = now;
      } else {
        clearTimeout(timer);
      }
      const untilMaxWait = firstScheduledAt + maxWaitMs - now;
      timer = setTimeout(run, Math.max(0, Math.min(delayMs, untilMaxWait)));
    },
    cancel: () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
