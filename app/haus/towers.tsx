import { floors } from "../../src/domain/houses";

export interface TowerData {
  id: string;
  name: string;
  hue: number;
  animal: string;
  perHead: number;
  active: string;
  trend?: string;
}
type Size = "s" | "m" | "l";
const Z = {
  s: {
    win: 4,
    wg: 3,
    wp: 3,
    g: 3,
    r: 3,
    w: 56,
    over: 12,
    roof: 20,
    crest: 42,
    d: 3,
    tag: 10.5,
    name: 12.5,
    gap: 6,
  },
  m: {
    win: 8,
    wg: 6,
    wp: 4,
    g: 4,
    r: 5,
    w: 116,
    over: 18,
    roof: 34,
    crest: 66,
    d: 5,
    tag: 11.5,
    name: 16,
    gap: 18,
  },
  l: {
    win: 10,
    wg: 8,
    wp: 5,
    g: 5,
    r: 6,
    w: 140,
    over: 22,
    roof: 42,
    crest: 84,
    d: 6,
    tag: 0,
    name: 19,
    gap: 26,
  },
};

/** Häuser als Türme (Design 7): ein Stockwerk = 50 Punkte pro aktivem Mitglied. */
export function Towers({
  houses,
  mine,
  dark,
  size,
  height,
}: {
  houses: TowerData[];
  mine?: string | null;
  dark: boolean;
  size: Size;
  height: number;
}) {
  const z = Z[size];
  const floorH = z.win * 1.2 + z.wp * 2 + z.g;
  const maxFit = Math.max(
    3,
    Math.floor((height - z.crest * 0.8 - z.roof - z.win * 2.4 - 40) / floorH),
  );
  return (
    <div>
      <div className="ui-towers" style={{ gap: z.gap, height }}>
        {houses.map((h) => {
          const own = h.id === mine;
          const body = dark
            ? `oklch(0.42 0.09 ${h.hue})`
            : `oklch(0.84 0.11 ${h.hue})`;
          const floor = dark
            ? `oklch(0.5 0.1 ${h.hue})`
            : `oklch(0.76 0.13 ${h.hue})`;
          const shade = dark
            ? `oklch(0.28 0.07 ${h.hue})`
            : `oklch(0.58 0.14 ${h.hue})`;
          const off = dark
            ? `oklch(0.3 0.05 ${h.hue})`
            : `oklch(0.95 0.03 ${h.hue})`;
          const count = Math.min(maxFit, floors(h.perHead, 1));
          const win = (i: number, k: number) => ({
            width: z.win,
            height: Math.round(z.win * 1.2),
            borderRadius: `${Math.ceil(z.win / 3)}px ${Math.ceil(z.win / 3)}px 1px 1px`,
            background: (i * 5 + k * 3 + h.hue) % 4 === 0 ? "var(--gold)" : off,
          });
          return (
            <div
              key={h.id}
              className="ui-tower"
              role="img"
              aria-label={`${h.name}: ${h.perHead} Punkte pro Kopf`}
            >
              {own && z.tag ? (
                <span
                  className="ui-pill ui-pill--dark"
                  style={{ marginBottom: 6, fontSize: z.tag }}
                >
                  {size === "s" ? "du" : "dein Haus"}
                </span>
              ) : null}
              {/* eslint-disable-next-line @next/next/no-img-element -- eines von vier festen Haus-Tieren */}
              <img
                src={`/animals/${h.animal}.svg`}
                alt=""
                width={z.crest}
                height={z.crest}
                className={own ? "ui-bob" : undefined}
                style={{
                  position: "relative",
                  zIndex: 1,
                  marginBottom: -Math.round(z.crest * 0.2),
                  objectFit: "contain",
                }}
              />
              <span
                style={{
                  width: `min(100%, ${z.w + z.over}px)`,
                  height: z.roof,
                  flex: "none",
                  background: shade,
                  clipPath: "polygon(50% 0,100% 100%,0 100%)",
                }}
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column-reverse",
                  gap: z.g,
                  width: `min(100% - ${z.over}px, ${z.w}px)`,
                  padding: z.g,
                  background: body,
                  boxShadow: `0 ${z.d}px 0 ${shade}`,
                  borderRadius: `0 0 ${z.r + 2}px ${z.r + 2}px`,
                }}
              >
                <span
                  style={{
                    alignSelf: "center",
                    width: z.win * 2,
                    height: Math.round(z.win * 2.4),
                    borderRadius: `${z.win}px ${z.win}px 0 0`,
                    background: shade,
                  }}
                />
                {Array.from({ length: count }, (_, i) => (
                  <span
                    key={i}
                    className="ui-tower__floor"
                    style={{
                      gap: z.wg,
                      padding: `${z.wp}px 0`,
                      borderRadius: z.r,
                      background: floor,
                    }}
                  >
                    <span style={win(i, 0)} />
                    <span style={win(i, 1)} />
                    <span style={win(i, 2)} />
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div
        className="ui-towers__ground"
        style={{ height: size === "l" ? 12 : 9 }}
      />
      <div className="ui-towers__labels" style={{ gap: z.gap }}>
        {houses.map((h) => (
          <span key={h.id}>
            <span
              className="ui-fun ui-towers__name"
              style={{ ["--name" as string]: `${z.name}px` }}
            >
              {h.name}
            </span>
            <span className="ui-tiny ui-muted">
              {h.perHead}
              {size === "s" ? "" : ` pro Kopf · ${h.active}`}
            </span>
            {h.trend ? (
              <span className="ui-pill ui-pill--good">{h.trend}</span>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}
