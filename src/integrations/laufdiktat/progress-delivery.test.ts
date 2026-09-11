import { describe, expect, it, vi } from "vitest";
import { createProgressDelivery } from "./progress-delivery";
import type { LiveProgress } from "./room-api";

const progress: LiveProgress = {
  currentIndex: 0,
  peeks: 0,
  attempts: 1,
  errors: 0,
  finished: false,
};
describe("ordered progress delivery", () => {
  it("waits for earlier writes before saving completion", async () => {
    let finish!: () => void;
    const save = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValue(undefined);
    const changed = vi.fn();
    const delivery = createProgressDelivery(save, changed);
    delivery.send(progress);
    delivery.send({ ...progress, finished: true });
    expect(save).toHaveBeenCalledTimes(1);
    expect(changed).toHaveBeenLastCalledWith("saving");
    finish();
    await vi.waitFor(() => expect(changed).toHaveBeenLastCalledWith("saved"));
    expect(save).toHaveBeenLastCalledWith({ ...progress, finished: true });
  });
  it("retains a failed write for retry without claiming success", async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(undefined);
    const changed = vi.fn();
    const delivery = createProgressDelivery(save, changed);
    delivery.send({ ...progress, finished: true });
    await vi.waitFor(() => expect(changed).toHaveBeenLastCalledWith("error"));
    expect(changed).not.toHaveBeenCalledWith("saved");
    delivery.retry();
    await vi.waitFor(() => expect(changed).toHaveBeenLastCalledWith("saved"));
    expect(save.mock.calls[0]).toEqual(save.mock.calls[1]);
  });
  it("stops queued writes and callbacks when leaving a session", async () => {
    let finish!: () => void;
    const save = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const changed = vi.fn();
    const delivery = createProgressDelivery(save, changed);
    delivery.retry();
    delivery.send(progress);
    delivery.send({ ...progress, finished: true });
    delivery.dispose();
    finish();
    await Promise.resolve();
    expect(save).toHaveBeenCalledTimes(1);
    expect(changed).toHaveBeenLastCalledWith("saving");
  });
});
