/**
 * Lernraum-Logo in der Oberfläche. Die Variante richtet sich nach der Höhe:
 * Unter 32 px sind die Punkte der Sprechblase nicht mehr erkennbar, dann
 * kommt die Kleinvariante ohne Punkte (docs/brand/README.md, Abschnitt 3).
 * `onDark` wählt die Ausführung für dunklen Grund (helle Blase und Schrift).
 */

/** Ab dieser Höhe (px) bekommt die Sprechblase ihre drei Punkte. */
export const BRAND_DOTS_MIN_HEIGHT = 32;

/** Seitenverhältnisse (Breite / Höhe) der zugeschnittenen SVG-Dateien. */
const RATIO = {
  mark: 116.98 / 196.76,
  small: 124.98 / 204.76,
  lockup: 833.15 / 196.76,
} as const;

export type BrandAsset = { src: string; ratio: number };

export function brandAsset(
  kind: "symbol" | "lockup",
  height: number,
  onDark = false,
): BrandAsset {
  const tone = onDark ? "-reversed" : "";
  const withDots = height >= BRAND_DOTS_MIN_HEIGHT;
  if (kind === "lockup") {
    return {
      src: `/brand/logo-horizontal${withDots ? "" : "-small"}${tone}.svg`,
      ratio: RATIO.lockup,
    };
  }
  return withDots
    ? { src: `/brand/mark${tone}.svg`, ratio: RATIO.mark }
    : { src: `/brand/symbol-small${tone}.svg`, ratio: RATIO.small };
}

type BrandProps = {
  /** Sichtbare Höhe des Logos in px. */
  height: number;
  /** Auf dunklem Grund die helle Ausführung verwenden. */
  onDark?: boolean;
  /** Alternativtext; leer lassen, wenn das Logo nur schmückt. */
  label?: string;
  className?: string;
};

function BrandImage({
  kind,
  height,
  onDark,
  label,
  className,
}: BrandProps & { kind: "symbol" | "lockup" }) {
  const { src, ratio } = brandAsset(kind, height, onDark);
  const width = Math.round(height * ratio * 100) / 100;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- statische SVG-Dateien, die Variante hängt von der Höhe ab
    <img
      src={src}
      width={width}
      height={height}
      style={{ width, height }}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      className={className}
    />
  );
}

/** Nur das Symbol (Sprechblase und Bausteine). */
export function BrandSymbol(props: BrandProps) {
  return <BrandImage kind="symbol" {...props} />;
}

/** Symbol mit Wortmarke „Lernraum“, quer. */
export function BrandLogo(props: BrandProps) {
  return <BrandImage kind="lockup" {...props} />;
}
