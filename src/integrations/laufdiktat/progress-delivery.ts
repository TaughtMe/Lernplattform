import type { LiveProgress } from "./room-api";

export type ProgressDeliveryStatus = "idle" | "saving" | "saved" | "error";

/** Ordered writes prevent a slow earlier request overwriting a completed round. */
export function createProgressDelivery(
  save: (progress: LiveProgress) => Promise<void>,
  changed: (status: ProgressDeliveryStatus) => void,
) {
  const pending: LiveProgress[] = [];
  let running = false;
  let disposed = false;
  async function flush() {
    if (running || disposed || pending.length === 0) return;
    running = true;
    changed("saving");
    try {
      while (pending.length && !disposed) {
        await save(pending[0]!);
        pending.shift();
      }
      if (!disposed) changed("saved");
    } catch {
      if (!disposed) changed("error");
    } finally {
      running = false;
    }
  }
  return {
    send(progress: LiveProgress) {
      pending.push({
        ...progress,
        ...(progress.wordErrors
          ? { wordErrors: { ...progress.wordErrors } }
          : {}),
      });
      void flush();
    },
    retry: () => void flush(),
    dispose() {
      disposed = true;
    },
  };
}
