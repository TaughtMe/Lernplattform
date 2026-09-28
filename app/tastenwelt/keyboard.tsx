import type { CSSProperties } from "react";
import { ALT_LEGEND, FINGER_HUE, FINGER_OF, LAYOUTS, SHIFT_LEGEND, type Finger } from "@/src/domain/typing";

interface KeyboardProps {
  layout: "iso" | "small";
  want?: string | null;
  wrong?: string | null;
  fingerColors?: boolean;
  nextKey?: boolean;
  heat?: Record<string, number>;
  dark: boolean;
  size: { h: number; fs: number; r: number; d: number; g: number };
}

/** Deutsche Tastatur mit Fingerfarben, Tastenhinweis und Heatmap (Design 6a/6c). */
export function Keyboard({ layout, want = null, wrong = null, fingerColors = true, nextKey = true, heat, dark, size: o }: KeyboardProps) {
  const base = want === " " ? "sp" : want ? want.toLowerCase() : null;
  const upper = !!want && want !== " " && want !== want.toLowerCase();
  const shiftKey = upper && base ? ((FINGER_OF[base] ?? "l")[0] === "l" ? "shr" : "shl") : null;
  const wrongKey = wrong != null ? (wrong === " " ? "sp" : wrong.toLowerCase()) : null;
  const iso = layout === "iso";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: o.g }} aria-hidden="true">
      {LAYOUTS[layout].map((row, ri) => (
        <div key={ri} style={{ display: "flex", gap: o.g }}>
          {row.map(([lab, w = 1, id], ki) => {
            const kid = id ?? lab;
            const f = (FINGER_OF[kid] ?? null) as Finger | null;
            const hue = f ? FINGER_HUE[f] : 70;
            const target = nextKey && !heat && (kid === base || kid === shiftKey);
            let bg: string, sh: string, ink: string, extra = "";
            if (heat) {
              const n = heat[kid] ?? 0;
              bg = n ? `color-mix(in oklch,var(--bad) ${16 + n * 22}%,var(--kbd-key))` : "var(--kbd-key)";
              sh = "var(--kbd)"; ink = n >= 2 ? (dark ? "#211f1b" : "#fffdf7") : "var(--ink2)";
            } else if (target) {
              bg = `oklch(0.76 0.18 ${hue})`; sh = `oklch(0.45 0.14 ${hue})`; ink = "#211f1b";
              extra = `,0 0 0 3px var(--ink),0 0 0 7px oklch(0.76 0.18 ${hue} / .4)`;
            } else if (kid === wrongKey) {
              bg = "var(--bad-bg)"; sh = "var(--bad)"; ink = "var(--bad)";
            } else if (fingerColors && f && f !== "th") {
              bg = dark ? `oklch(0.45 0.1 ${hue})` : `oklch(0.87 0.1 ${hue})`;
              sh = dark ? `oklch(0.3 0.08 ${hue})` : `oklch(0.64 0.14 ${hue})`;
              ink = dark ? `oklch(0.96 0.04 ${hue})` : `oklch(0.3 0.1 ${hue})`;
            } else { bg = "var(--kbd-key)"; sh = "var(--kbd)"; ink = "var(--ink2)"; }

            const small = !!id;
            const legend = !heat && !id;
            const sC = legend ? SHIFT_LEGEND[kid] ?? "" : "";
            const aC = legend ? ALT_LEGEND[kid] ?? "" : "";
            const fs = small ? Math.round(o.fs * (lab.length > 4 ? 0.56 : 0.7)) : sC ? Math.round(o.fs * 0.86) : o.fs;
            const leg = Math.max(9, Math.round(o.fs * 0.6));
            const style: CSSProperties = {
              flex: `${w} 1 0`, height: o.h, borderRadius: o.r, background: bg, boxShadow: `0 ${o.d}px 0 ${sh}${extra}`, color: ink, fontSize: fs,
              animation: target ? "tt-press 1s ease-in-out infinite" : undefined, zIndex: target ? 1 : undefined,
            };
            if (sC) Object.assign(style, { placeItems: "end center", paddingBottom: Math.round(o.h * 0.14) });
            let label = id ? lab : lab === "ß" ? lab : lab.toUpperCase();
            let enterTop: CSSProperties | null = null;
            let enterBottom: CSSProperties | null = null;
            if (iso && kid === "ent1") {
              Object.assign(style, { height: o.h * 2 + o.g, marginBottom: -(o.h + o.g), background: "transparent", boxShadow: "none", filter: `drop-shadow(0 ${o.d}px 0 ${sh})`, isolation: "isolate", zIndex: 1, placeItems: "end center", paddingBottom: Math.round(o.h / 2 - fs / 2), textIndent: Math.round(o.h * 0.3) });
              enterTop = { position: "absolute", left: 0, right: 0, top: 0, height: o.h, borderRadius: `${o.r}px ${o.r}px 0 ${o.r}px`, background: bg, zIndex: -1 };
              enterBottom = { position: "absolute", left: "16.7%", right: 0, top: o.h - o.r, bottom: 0, borderRadius: `0 0 ${o.r}px ${o.r}px`, background: bg, zIndex: -1 };
              label = "↵";
            }
            if (iso && kid === "ent") { style.visibility = "hidden"; label = ""; }
            const bump = kid === "f" || kid === "j";
            return (
              <span key={ki} className="tt-key" style={style}>
                {label}
                {enterTop ? <span style={enterTop} /> : null}
                {enterBottom ? <span style={enterBottom} /> : null}
                {bump ? <span style={{ position: "absolute", bottom: Math.round(o.h * 0.15), left: "50%", width: Math.round(o.h * 0.28), height: 3, marginLeft: -Math.round(o.h * 0.14), borderRadius: 2, background: "currentColor", opacity: 0.6 }} /> : null}
                {sC ? <span style={{ position: "absolute", left: Math.round(o.h * 0.16), top: Math.round(o.h * 0.1), fontSize: leg, opacity: 0.8 }}>{sC}</span> : null}
                {aC ? <span style={{ position: "absolute", right: Math.round(o.h * 0.14), bottom: Math.round(o.h * 0.1), fontSize: leg, opacity: 0.7 }}>{aC}</span> : null}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function FingerBar({ want, nextKey, dark }: { want: string | null; nextKey: boolean; dark: boolean }) {
  const b = want ? (want === " " ? " " : want.toLowerCase()) : null;
  const f = b ? FINGER_OF[b] : null;
  const shiftFinger = want && want !== " " && b && want !== b && f ? (f[0] === "l" ? "rp" : "lp") : null;
  const L: [Finger, string][] = [["lp", "Klein"], ["lr", "Ring"], ["lm", "Mittel"], ["li", "Zeige"], ["th", "Daumen"]];
  const R: [Finger, string][] = [["th", "Daumen"], ["ri", "Zeige"], ["rm", "Mittel"], ["rr", "Ring"], ["rp", "Klein"]];
  const pill = ([k, l]: [Finger, string], i: number) => {
    const on = nextKey && (k === f || k === shiftFinger);
    const hue = FINGER_HUE[k];
    const style: CSSProperties = on
      ? { background: `oklch(0.8 0.15 ${hue})`, color: "#211f1b", transform: "translateY(-3px)", boxShadow: `0 3px 0 oklch(0.5 0.13 ${hue})` }
      : { background: dark ? `oklch(0.36 0.08 ${hue})` : `oklch(0.9 0.08 ${hue})`, color: dark ? `oklch(0.94 0.05 ${hue})` : `oklch(0.32 0.1 ${hue})`, boxShadow: `0 2px 0 oklch(0.64 0.14 ${hue})` };
    return (
      <span key={`${k}${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 11px", borderRadius: 999, fontSize: 12, fontWeight: 700, transition: "transform .15s", ...style }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: `oklch(0.62 0.18 ${hue})`, opacity: k === "th" ? 0.5 : 1 }} />{l}
      </span>
    );
  };
  return (
    <div style={{ display: "flex", gap: 40, flexWrap: "wrap", justifyContent: "center" }} aria-hidden="true">
      <div style={{ display: "flex", gap: 6 }}>{L.map(pill)}</div>
      <div style={{ display: "flex", gap: 6 }}>{R.map(pill)}</div>
    </div>
  );
}
