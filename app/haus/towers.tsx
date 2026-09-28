import { floors } from "@/src/domain/houses";
import { Animal } from "../components/animal";

export interface TowerData { id: string; name: string; hue: number; animal: string; perHead: number; active: string; trend?: string }
type Size = "s" | "m" | "l";
const Z = {
  s: { win: 4, wg: 3, wp: 3, g: 3, r: 3, w: 56, over: 12, roof: 20, crest: 42, d: 3, tag: 10.5, name: 12.5 },
  m: { win: 8, wg: 6, wp: 4, g: 4, r: 5, w: 116, over: 18, roof: 34, crest: 66, d: 5, tag: 11.5, name: 16 },
  l: { win: 10, wg: 8, wp: 5, g: 5, r: 6, w: 140, over: 22, roof: 42, crest: 84, d: 6, tag: 0, name: 19 },
};

/** Häuser als Türme (Design 7): ein Stockwerk = 50 Punkte pro aktivem Mitglied. */
export function Towers({ houses, mine, dark, size, height }: { houses: TowerData[]; mine?: string; dark: boolean; size: Size; height: number }) {
  const z = Z[size];
  const floorH = z.win * 1.2 + z.wp * 2 + z.g;
  const maxFit = Math.max(3, Math.floor((height - z.crest * 0.8 - z.roof - z.win * 2.4 - 40) / floorH));
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: size === "s" ? 6 : size === "m" ? 18 : 26, height, padding: "0 4px" }}>
        {houses.map((h) => {
          const own = h.id === mine;
          const body = dark ? `oklch(0.42 0.09 ${h.hue})` : `oklch(0.84 0.11 ${h.hue})`;
          const floor = dark ? `oklch(0.5 0.1 ${h.hue})` : `oklch(0.76 0.13 ${h.hue})`;
          const sh = dark ? `oklch(0.28 0.07 ${h.hue})` : `oklch(0.58 0.14 ${h.hue})`;
          const off = dark ? `oklch(0.3 0.05 ${h.hue})` : `oklch(0.95 0.03 ${h.hue})`;
          const fn = Math.min(maxFit, floors(h.perHead, 3));
          const win = z.win;
          const w = Math.min(z.w, 1000);
          const windowStyle = (i: number, k: number) => ({ width: win, height: Math.round(win * 1.2), borderRadius: `${Math.ceil(win / 3)}px ${Math.ceil(win / 3)}px 1px 1px`, background: (i * 5 + k * 3 + h.hue) % 4 === 0 ? "var(--gold)" : off });
          return (
            <div key={h.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", flex: 1, minWidth: 0 }} aria-label={`${h.name}: ${h.perHead} Punkte pro Kopf`} role="img">
              {own && z.tag ? <span className="pill pill-dark" style={{ marginBottom: 6, fontSize: z.tag }}>{size === "s" ? "du" : "dein Haus"}</span> : null}
              <Animal id={h.animal} size={z.crest} label={false} className={own ? "bob" : ""} style={{ position: "relative", zIndex: 1, marginBottom: -Math.round(z.crest * 0.2) }} />
              <span style={{ width: `min(100%, ${w + z.over}px)`, height: z.roof, flex: "none", background: sh, clipPath: "polygon(50% 0,100% 100%,0 100%)" }} />
              <div style={{ display: "flex", flexDirection: "column-reverse", gap: z.g, width: `min(100% - ${z.over}px, ${w}px)`, padding: z.g, background: body, boxShadow: `0 ${z.d}px 0 ${sh}`, borderRadius: `0 0 ${z.r + 2}px ${z.r + 2}px` }}>
                <span style={{ alignSelf: "center", width: win * 2, height: Math.round(win * 2.4), borderRadius: `${win}px ${win}px 0 0`, background: sh }} />
                {Array.from({ length: fn }, (_, i) => (
                  <span key={i} style={{ display: "flex", justifyContent: "center", gap: z.wg, padding: `${z.wp}px 0`, borderRadius: z.r, background: floor, animation: "tt-pop .35s ease both" }}>
                    <span style={windowStyle(i, 0)} /><span style={windowStyle(i, 1)} /><span style={windowStyle(i, 2)} />
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ height: size === "l" ? 12 : 9, margin: "0 -2px", borderRadius: 999, background: "var(--surface2)", boxShadow: "inset 0 2px 0 var(--line2)" }} />
      <div style={{ display: "flex", gap: size === "s" ? 6 : size === "m" ? 18 : 26, padding: "4px 4px 0" }}>
        {houses.map((h) => (
          <span key={h.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flex: 1, minWidth: 0, textAlign: "center" }}>
            <span className="fun" style={{ fontSize: z.name }}>{h.name}</span>
            <span className="tiny muted" style={{ fontWeight: 700 }}>{h.perHead}{size === "s" ? "" : ` pro Kopf · ${h.active}`}</span>
            {h.trend ? <span className="pill pill-good" style={{ fontSize: size === "s" ? 10.5 : 12 }}>{h.trend}</span> : null}
          </span>
        ))}
      </div>
    </div>
  );
}
