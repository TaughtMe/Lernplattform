export type DebouncedOperation = { schedule: () => void; cancel: () => void };

export function createLiveRoomDebounce(
  operation: () => void,
  { delayMs, maxWaitMs }: { delayMs: number; maxWaitMs: number },
): DebouncedOperation {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let firstScheduledAt = 0;
  const run = () => {
    timer = null;
    operation();
  };
  return {
    schedule() {
      const now = Date.now();
      if (timer === null) firstScheduledAt = now;
      else clearTimeout(timer);
      const remaining = firstScheduledAt + maxWaitMs - now;
      timer = setTimeout(run, Math.max(0, Math.min(delayMs, remaining)));
    },
    cancel() {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    },
  };
}
