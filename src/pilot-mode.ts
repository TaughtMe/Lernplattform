export const LAUFDIKTAT_PILOT = true as const;

export const PILOT_PUBLIC_ROUTES = [
  "/",
  "/raum",
  "/lehrer/live",
  "/datenschutz",
  "/impressum",
] as const;

export function isPilotPublicRoute(pathname: string) {
  const normalized = pathname.replace(/\/$/, "") || "/";
  return PILOT_PUBLIC_ROUTES.some((route) => route === normalized);
}
