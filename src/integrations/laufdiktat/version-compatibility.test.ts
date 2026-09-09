import { afterEach, expect, it, vi } from "vitest";
import { updateBeforeLiveRound } from "./version-compatibility";

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});
it("keeps the room code and activates only an available platform update", async () => {
  const postMessage = vi.fn();
  const addEventListener = vi.fn();
  const update = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", {
    serviceWorker: {
      getRegistration: async () => ({ update, waiting: { postMessage } }),
      addEventListener,
    },
  });
  expect(await updateBeforeLiveRound("4829")).toBe(true);
  expect(update).toHaveBeenCalledOnce();
  expect(sessionStorage.getItem("lernraum-live-resume")).toBe("4829");
  expect(postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
  expect(addEventListener).toHaveBeenCalledWith(
    "controllerchange",
    expect.any(Function),
    { once: true },
  );
});
it("reports unavailable updates without reloading or changing the join intent", async () => {
  vi.stubGlobal("navigator", {
    serviceWorker: {
      getRegistration: async () => ({
        update: async () => {},
        waiting: null,
        installing: null,
      }),
    },
  });
  expect(await updateBeforeLiveRound("4829")).toBe(false);
  expect(sessionStorage.getItem("lernraum-live-resume")).toBeNull();
});
it("works without service worker support", async () => {
  vi.stubGlobal("navigator", {});
  expect(await updateBeforeLiveRound("4829")).toBe(false);
});
