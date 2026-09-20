export const LAUFDIKTAT_PILOT = true as const;

export const PILOT_PUBLIC_ROUTES = [
  "/",
  "/raum",
  "/frei/mathematics",
  "/lehrer/live",
  "/datenschutz",
  "/impressum",
] as const;

export function isPilotGateEnabled() {
  return (
    process.env["LERNRAUM_PILOT_GATE"] === "1" ||
    (process.env["NODE_ENV"] === "production" &&
      process.env["LERNRAUM_PILOT_GATE"] !== "0")
  );
}

export function isPilotPublicRoute(pathname: string) {
  const normalized = pathname.replace(/\/$/, "") || "/";
  return PILOT_PUBLIC_ROUTES.some((route) => route === normalized);
}
