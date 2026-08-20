/**
 * Own version counter for the room protocol (not the npm package version).
 * Sent with session-start so a student on stale cached JS gets a clear
 * "please reload" instead of a garbled session — same mechanism as in
 * TaughtMe/Laufdiktat's APP_VERSION + compareVersions() check.
 */
export const APP_VERSION = "1.0.0";

/** Compares two semver-like versions, e.g. "2.0.1" > "2.0.0" -> 1. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
