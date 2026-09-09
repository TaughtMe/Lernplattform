export function compareLiveVersions(left: string, right: string) {
  const parse = (value: string) =>
    /^(?:lernraum-)?(\d+)\.(\d+)\.(\d+)$/.exec(value)?.slice(1).map(Number);
  const a = parse(left);
  const b = parse(right);
  if (!a || !b) return null;
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i]! < b[i]! ? -1 : 1;
  }
  return 0;
}

// Use the platform's worker. Never replace it with the upstream app's worker.
export async function updateBeforeLiveRound(code: string) {
  if (!("serviceWorker" in navigator)) return false;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return false;
  await registration.update();
  if (!registration.waiting) {
    await new Promise<void>((resolve) => {
      const timer = window.setTimeout(done, 5000);
      const worker = registration.installing;
      function done() {
        window.clearTimeout(timer);
        worker?.removeEventListener("statechange", changed);
        resolve();
      }
      function changed() {
        if (worker?.state === "installed" || worker?.state === "redundant")
          done();
      }
      worker?.addEventListener("statechange", changed);
      if (!worker || registration.waiting) done();
    });
  }
  if (!registration.waiting) return false;
  sessionStorage.setItem("lernraum-live-resume", code);
  navigator.serviceWorker.addEventListener(
    "controllerchange",
    () => window.location.reload(),
    { once: true },
  );
  registration.waiting.postMessage({ type: "SKIP_WAITING" });
  return true;
}
