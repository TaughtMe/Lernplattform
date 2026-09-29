import {
  resolveStages,
  resolveVisibility,
  type ReleaseVisibility,
} from "../../src/domain/release";

/**
 * Stufen aus LERNRAUM_FREIGABE; die Vorschau gilt, wenn das Gerät das
 * Vorschau-Cookie trägt, LERNRAUM_VORSCHAU=1 gesetzt ist oder die App im
 * Entwicklungsmodus läuft.
 */
export function releaseVisibility(
  previewCookie: string | undefined,
): ReleaseVisibility {
  const preview =
    previewCookie === "1" ||
    process.env["LERNRAUM_VORSCHAU"] === "1" ||
    process.env.NODE_ENV !== "production";
  return resolveVisibility(
    resolveStages(process.env["LERNRAUM_FREIGABE"]),
    preview,
  );
}
