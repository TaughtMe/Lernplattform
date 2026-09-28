"use client";

import Link from "next/link";
import { dayKey, DAILY_TYPING_GOAL_SECONDS } from "@/src/storage/personal";
import { STAGES, weakKeys } from "@/src/domain/typing";
import { Animal } from "../components/animal";
import { ThemeToggle, useIsDark } from "../components/theme-toggle";
import { usePersonal } from "../hooks/use-personal";
import { Keyboard } from "./keyboard";

const PTS: [number, number][] = [[70, 92], [230, 66], [395, 100], [570, 78], [600, 262], [425, 290], [245, 252], [88, 420], [310, 462], [560, 440]];
const HUES = [25, 60, 95, 140, 185, 245, 295, 345, 25, 60];

function pathFrom(points: [number, number][], from: number, to: number): string {
  const segs = points.slice(0, -1).map((p1, i) => {
    const p0 = points[i - 1] ?? p1, p2 = points[i + 1], p3 = points[i + 2] ?? p2;
    return ` C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`;
  });
  return `M${points[from].join(" ")}${segs.slice(from, to).join("")}`;
}

/** Lernweg der Tastenwelt (Design 6c): zehn Stationen, unsichere Tasten, Tagesziel. */
export function TastenweltClient() {
  const { typing, profile, activity, streak } = usePersonal();
  const dark = useIsDark();
  const cur = Math.min(typing.stage, STAGES.length - 1);
  const seconds = activity[dayKey()]?.typingSeconds ?? 0;
  const minutes = Math.floor(seconds / 60);
  const weak = weakKeys(typing.heat, 4);

  return (
    <div className="tw">
      <main className="page">
        <div className="between" style={{ alignItems: "flex-end" }}>
          <span className="stack" style={{ ["--gap" as string]: "4px" }}>
            <h1 className="h-fun">Tastenwelt</h1>
            <span className="small muted">Zehn Stationen von der Grundstellung bis zum freien Abschreiben</span>
          </span>
          <ThemeToggle />
        </div>

        <div className="tw-map card-pop dots desktop-only">
          <svg width="670" height="540" viewBox="0 0 670 540" fill="none" style={{ position: "absolute", left: 12, top: 14 }} aria-hidden="true">
            <path d={pathFrom(PTS, cur, PTS.length - 1)} stroke="var(--line2)" strokeWidth="6" strokeLinecap="round" strokeDasharray="2 14" />
            <path d={pathFrom(PTS, 0, cur)} stroke="var(--gold)" strokeWidth="8" strokeLinecap="round" />
          </svg>
          <ol style={{ position: "absolute", left: 12, top: 14, width: 670, height: 540, margin: 0, padding: 0, listStyle: "none" }}>
            {STAGES.map((s, k) => {
              const st = k < cur ? "done" : k === cur ? "cur" : "lock";
              const sz = st === "cur" ? 84 : 62;
              const n = typing.stars[k] ?? 0;
              const hue = HUES[k];
              return (
                <li key={s.label} style={{ position: "absolute", left: PTS[k][0], top: PTS[k][1], transform: `translate(-50%,-${sz / 2}px)`, display: "flex", flexDirection: "column", alignItems: "center", gap: 7, width: 150 }}>
                  {st === "cur" ? <Animal id={profile.animal} size={70} className="bob" style={{ position: "absolute", top: -66, left: 40 }} label={false} /> : null}
                  <Link href={st === "lock" ? "#" : `/tastenwelt/ueben?stufe=${k + 1}`} aria-disabled={st === "lock"} tabIndex={st === "lock" ? -1 : undefined} aria-label={`Stufe ${k + 1}: ${s.label}`}
                    style={{
                      display: "grid", placeItems: "center", width: sz, height: sz, borderRadius: st === "cur" ? 28 : 20, font: `700 ${st === "cur" ? 34 : 24}px/1 var(--font-fun)`,
                      ...(st === "done" ? (dark ? { background: `oklch(0.5 0.1 ${hue})`, color: "#fff", boxShadow: `0 6px 0 oklch(0.34 0.08 ${hue})` } : { background: `oklch(0.86 0.1 ${hue})`, color: "#211f1b", boxShadow: `0 6px 0 oklch(0.62 0.12 ${hue})` })
                        : st === "cur" ? { background: "var(--gold)", color: "#211f1b", boxShadow: "0 7px 0 color-mix(in oklch,var(--gold) 55%,#000),0 0 0 9px color-mix(in oklch,var(--gold) 26%,transparent)", animation: "tt-press 1.6s ease-in-out infinite" }
                          : { background: "var(--surface2)", color: "var(--ink3)", border: "2px dashed var(--line2)", pointerEvents: "none" }),
                    }}>{k + 1}</Link>
                  <span style={{ font: `600 ${st === "cur" ? 15 : 13.5}px/1.2 var(--font-fun)`, textAlign: "center", color: st === "lock" ? "var(--ink3)" : "var(--ink)" }}>{s.label}</span>
                  {st === "done" ? <span style={{ fontSize: 14, letterSpacing: 2, lineHeight: 1, color: "var(--gold)" }} aria-label={`${n} Sterne`}>{"★".repeat(n)}{"☆".repeat(3 - n)}</span> : null}
                  {st === "cur" ? <Link href={`/tastenwelt/ueben?stufe=${k + 1}`} className="pill pill-dark" style={{ padding: "8px 14px", fontSize: 12.5 }}>Weiter üben</Link> : null}
                </li>
              );
            })}
          </ol>
        </div>

        <ol className="stack mobile-only" style={{ margin: 0, padding: 0, listStyle: "none", ["--gap" as string]: "8px" }}>
          {STAGES.map((s, k) => {
            const st = k < cur ? "done" : k === cur ? "cur" : "lock";
            return (
              <li key={s.label}>
                <Link href={st === "lock" ? "#" : `/tastenwelt/ueben?stufe=${k + 1}`} className="card-pop row" style={{ padding: "10px 12px", opacity: st === "lock" ? 0.55 : 1, pointerEvents: st === "lock" ? "none" : undefined, border: st === "cur" ? "2px solid var(--gold)" : undefined }}>
                  <span className="fun" style={{ display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: 13, background: st === "cur" ? "var(--gold)" : "var(--surface2)", color: st === "cur" ? "#211f1b" : "var(--ink2)", fontSize: 18 }}>{k + 1}</span>
                  <span className="grow fun" style={{ fontSize: 15 }}>{s.label}</span>
                  {st === "done" ? <span style={{ color: "var(--gold)", letterSpacing: 2 }}>{"★".repeat(typing.stars[k] ?? 0)}</span> : st === "cur" ? <Animal id={profile.animal} size={34} label={false} className="bob" /> : null}
                </Link>
              </li>
            );
          })}
        </ol>
      </main>

      <aside className="tw-side">
        <div className="card-dark stack" style={{ padding: 18, boxShadow: "0 5px 0 var(--gold)" }}>
          <div className="between"><span className="eyebrow" style={{ color: "var(--nav-ink2)" }}>Heute</span><span className="small" style={{ fontWeight: 700, color: "var(--nav-accent)" }}>Streak {streak} {streak === 1 ? "Tag" : "Tage"}</span></div>
          <span className="fun" style={{ fontSize: 26 }}>{Math.min(minutes, 10)} von 10 Minuten</span>
          <div style={{ display: "flex", gap: 4 }}>
            {[0, 1, 2, 3, 4].map((i) => <span key={i} style={{ flex: 1, height: 10, borderRadius: 4, background: seconds >= (i + 1) * (DAILY_TYPING_GOAL_SECONDS / 5) ? "var(--gold)" : "var(--nav-line)" }} />)}
          </div>
          <Link href={`/tastenwelt/ueben?stufe=${cur + 1}`} className="btn btn-gold fun">Weiter mit Stufe {cur + 1}</Link>
        </div>
        <div className="card-pop stack" style={{ padding: 18 }}>
          <span className="fun" style={{ fontSize: 18 }}>Unsichere Tasten</span>
          <div style={{ padding: 8, borderRadius: 12, background: "var(--surface2)" }}>
            <Keyboard layout={typing.layout} heat={typing.heat} dark={dark} size={{ h: 22, fs: 10, r: 5, d: 2, g: 3 }} />
          </div>
          <span className="small muted">{weak.length ? `${weak.map((k) => (k === "ß" ? k : k.toUpperCase())).join(", ")} gingen zuletzt am häufigsten daneben. Sie kommen in den nächsten Übungen öfter vor.` : "Noch keine unsicheren Tasten erkannt."}</span>
          <Link href="/tastenwelt/ueben?extra=1" className={`btn btn-bad ${weak.length ? "" : "disabled"}`} aria-disabled={!weak.length}>Tasten-Extra · 3 Minuten</Link>
        </div>
      </aside>
    </div>
  );
}
