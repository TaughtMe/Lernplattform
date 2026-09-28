export const LAUFDIKTAT_PILOT = true as const;

// Das Pilot-Gate sperrt alle Bereiche außer dem Laufdiktat. Es ist opt-in:
// nur aktiv, wenn LERNRAUM_PILOT_GATE=1 gesetzt ist.

export const PILOT_PUBLIC_ROUTES = [
  "/",
  "/raum",
  "/frei/mathematics",
  "/lehrer/live",
  "/datenschutz",
  "/impressum",
] as const;

export function isPilotGateEnabled() {
  return process.env["LERNRAUM_PILOT_GATE"] === "1";
}

export function isPilotPublicRoute(pathname: string) {
  const normalized = pathname.replace(/\/$/, "") || "/";
  return PILOT_PUBLIC_ROUTES.some((route) => route === normalized);
}
