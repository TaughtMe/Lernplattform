"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent } from "react";
import { coachLine, fingerHint, FINGER_HUE, FINGER_OF, hit, newRun, runInfo, STAGES, starsFor, weakKeys, xpGain, XP_PER_LEVEL, type TypingRun } from "@/src/domain/typing";
import { recordActivity } from "@/src/storage/personal";
import { Animal } from "../../components/animal";
import { Icon } from "../../components/icons";
import { ThemeToggle, useIsDark } from "../../components/theme-toggle";
import { usePersonal } from "../../hooks/use-personal";
import { FingerBar, Keyboard } from "../keyboard";

function extraText(keys: string[]): string {
  const k = keys.length ? keys : ["f", "j"];
  const words = ["Bär", "Zebra", "Büro", "Fuß", "Ball", "Zug", "über", "Vogel", "Öl", "Yak", "weiß", "Biene"];
  const picked = words.filter((w) => k.some((c) => w.toLowerCase().includes(c))).slice(0, 5);
  return (picked.length ? picked : k.map((c) => c.repeat(3))).join(" ");
}

/** Tastenwelt-Übung: Desktop mit echter Tastatur (6a), mobil mit Bildschirmtastatur (6b). */
function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    (listener) => { window.addEventListener("resize", listener); return () => window.removeEventListener("resize", listener); },
    () => window.matchMedia("(pointer: coarse)").matches && window.innerWidth < 900,
    () => false,
  );
}

export function UebenClient() {
  const params = useSearchParams();
  const { typing } = usePersonal();
  const extra = params?.get("extra") === "1";
  const stage = Math.min(STAGES.length - 1, Math.max(0, Number(params?.get("stufe") ?? typing.stage + 1) - 1));
  const exercise = stage === typing.stage ? typing.exercise % 5 : 0;
  const text = extra ? extraText(weakKeys(typing.heat)) : STAGES[stage].exercises[exercise];
  // Neuer Text → neue Übung (frischer Zustand über den key).
  return <Exercise key={`${stage}:${exercise}:${extra ? text : ""}`} text={text} stage={stage} exercise={exercise} extra={extra} />;
}

function Exercise({ text, stage, exercise, extra }: { text: string; stage: number; exercise: number; extra: boolean }) {
  const { typing, setTyping, profile } = usePersonal();
  const dark = useIsDark();
  const coarse = useCoarsePointer();
  const [run, setRun] = useState<TypingRun>(() => newRun(text));
  const [focus, setFocus] = useState(false);
  const [settings, setSettings] = useState(false);
  const saved = useRef(false);
  const areaRef = useRef<HTMLDivElement>(null);

  const info = runInfo(run);
  const gain = xpGain(run, info);
  // Nach dem Speichern steckt der Gewinn bereits in typing.xp.
  const xpNow = info.done ? typing.xp : typing.xp + gain;
  const level = Math.floor(xpNow / XP_PER_LEVEL) + 1;

  const press = useCallback((ch: string) => setRun((r) => hit(r, ch, Date.now(), typing.strict)), [typing.strict]);

  // Ergebnis einmalig speichern.
  useEffect(() => {
    if (!info.done || saved.current) return;
    saved.current = true;
    const seconds = Math.round((run.lastAt - run.startedAt) / 1000);
    setTyping((t) => {
      const heat = { ...t.heat };
      Object.entries(run.miss).forEach(([k, n]) => { const key = k === " " ? "sp" : k.toLowerCase(); heat[key] = Math.min(3, (heat[key] ?? 0) + n); });
      // Sichere Tasten kühlen ab.
      [...new Set(run.text.toLowerCase())].forEach((c) => { if (!run.miss[c] && heat[c]) heat[c] = Math.max(0, heat[c] - 1); });
      const stars = t.stars.slice();
      if (!extra) stars[stage] = Math.max(stars[stage] ?? 0, starsFor(info.accuracy));
      const advance = !extra && stage === t.stage;
      const nextEx = advance ? t.exercise + 1 : t.exercise;
      return { ...t, xp: t.xp + gain, heat, stars, exercise: nextEx >= 5 ? 0 : nextEx, stage: advance && nextEx >= 5 ? Math.min(STAGES.length - 1, t.stage + 1) : t.stage };
    });
    recordActivity({ typingSeconds: Math.max(5, seconds), points: Math.round(gain / 4) });
  }, [info.done]); // eslint-disable-line react-hooks/exhaustive-deps

  const onKey = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
    e.preventDefault();
    press(e.key);
  };

  const tiles = (small: boolean) => {
    const words: number[][] = [];
    let cur: number[] = [];
    [...run.text].forEach((c, i) => { cur.push(i); if (c === " ") { words.push(cur); cur = []; } });
    if (cur.length) words.push(cur);
    const vars = small ? { "--tw": "25px", "--th": "38px", "--tsp": "12px", "--tr": "9px", "--tfs": "20px" } : { "--tw": "40px", "--th": "58px", "--tsp": "20px", "--tr": "13px", "--tfs": "30px" };
    return (
      <div style={{ display: "flex", flexWrap: "wrap", alignContent: "center", gap: small ? "12px 9px" : "16px 14px", flex: 1, minHeight: 0, ...vars } as CSSProperties} aria-label={`Text: ${run.text}`}>
        {words.map((ix, wi) => (
          <span key={wi} style={{ display: "flex", gap: small ? 3 : 5 }}>
            {ix.map((i) => {
              const sp = run.text[i] === " ";
              const cls = i < run.pos ? (run.bad[i] ? "missed" : run.errAt[i] ? "fixed" : "ok") : i === run.pos ? `cur${run.wrong != null ? " shake" : ""}` : "";
              return <span key={`${i}-${run.shake}`} className={`tile-char ${sp ? "space" : ""} ${cls}`}>{sp ? "·" : run.text[i]}</span>;
            })}
          </span>
        ))}
      </div>
    );
  };

  const want = info.want;
  const wf = want ? FINGER_OF[want === " " ? " " : want.toLowerCase()] : null;
  const title = extra ? "Tasten-Extra" : `Stufe ${stage + 1} · ${STAGES[stage].label}`;
  const sub = extra ? "unsichere Tasten gezielt üben" : `Übung ${exercise + 1} von 5 · erst genau, dann schnell`;
  const animalAnim = run.wrong != null ? "tt-wob .5s ease" : info.done ? "tt-bob .7s ease-in-out infinite" : run.combo >= 5 ? "tt-bob 1s ease-in-out infinite" : "tt-bob 2.6s ease-in-out infinite";
  const chip = { display: "inline-flex", alignItems: "center", gap: 6, height: 38, padding: "0 13px", borderRadius: 999, font: "600 15px/1 var(--font-fun)", ...(run.combo >= 10 ? { background: "var(--gold)", color: "#211f1b" } : run.combo >= 5 ? { background: "var(--accent-bg)", color: "var(--accent)", boxShadow: "inset 0 0 0 1.5px var(--accent)" } : { background: "var(--surface2)", color: "var(--ink2)" }) };
  const n = starsFor(info.accuracy);

  const doneCard = (
    <div className="card-pop stack center" style={{ alignItems: "center", justifyContent: "center", flex: 1, padding: 20 }}>
      <div className="row" style={{ alignItems: "flex-end", ["--gap" as string]: "6px" }}>
        {[0, 1, 2].map((k) => <Icon key={k} name="star" size={k === 1 ? 62 : 48} style={{ color: k < n ? "var(--gold)" : "var(--line2)", animation: `tt-pop .5s ${k * 0.15}s both` }} />)}
      </div>
      <span className="fun" style={{ fontSize: 32 }}>Geschafft!</span>
      <span className="muted">{info.accuracy} % genau · {info.perMinute ?? "–"} Anschläge pro Minute · beste Serie {run.best}</span>
      <div className="row wrap" style={{ justifyContent: "center" }}>
        <span className="small" style={{ fontWeight: 700, color: "var(--ink2)" }}>Üben wir extra:</span>
        {weakKeys(run.miss).length ? weakKeys(run.miss).map((k) => <span key={k} className="fun" style={{ display: "grid", placeItems: "center", minWidth: 34, height: 34, padding: "0 8px", borderRadius: 10, background: "var(--bad-bg)", color: "var(--bad)", boxShadow: "0 3px 0 var(--bad)", fontSize: 17 }}>{k === " " ? "␣" : k}</span>) : <span className="small" style={{ fontWeight: 700, color: "var(--good)" }}>nichts, alles sicher</span>}
      </div>
      <div className="row wrap" style={{ justifyContent: "center" }}>
        <span className="pill fun" style={{ background: "var(--gold)", color: "#211f1b", fontSize: 15, padding: "8px 12px" }}>+{gain} XP</span>
        <button type="button" className="btn btn-soft" onClick={() => { saved.current = false; setRun(newRun(text)); }}>Nochmal</button>
        <Link className="btn btn-primary" href={extra ? "/tastenwelt" : `/tastenwelt/ueben?stufe=${typing.stage + 1}`} onClick={() => { saved.current = false; }}>{extra ? "Zum Lernweg" : "Nächste Übung"}</Link>
      </div>
    </div>
  );

  const xpBar = <div className="bar" style={{ height: 11, padding: 2 }}><span style={{ width: `${((xpNow % XP_PER_LEVEL) / XP_PER_LEVEL) * 100}%` }} /></div>;
  const levelBadge = (s: number) => <span className="fun" style={{ display: "grid", placeItems: "center", width: s, height: s, flex: "none", borderRadius: s / 3, background: "var(--nav)", color: "var(--nav-accent)", boxShadow: "0 3px 0 var(--gold)", fontSize: s * 0.45 }}>{level}</span>;

  if (coarse) {
    return (
      <main className="page dots" style={{ ["--gap" as string]: "10px", gap: 10 }}>
        <div className="topbar">
          <Link href="/tastenwelt" className="icon-btn square chunky" aria-label="Zum Lernweg"><Icon name="back" size={18} strokeWidth={2.4} /></Link>
          <span className="stack grow" style={{ ["--gap" as string]: "0" }}><span className="fun" style={{ fontSize: 16 }}>{title}</span><span className="tiny muted">{sub}</span></span>
          <span style={{ ...chip, height: 32, fontSize: 14 }}><Icon name="flame" size={14} />{run.combo}</span>
          <ThemeToggle />
        </div>
        <div className="row">{levelBadge(28)}<div className="grow">{xpBar}</div><span className="tiny muted" style={{ fontWeight: 700 }}>{xpNow} XP</span></div>
        {info.done ? doneCard : (
          <>
            <div className="row">
              <Animal id={profile.animal} size={60} label={false} style={{ animation: animalAnim }} />
              <p className="grow" style={{ padding: "9px 12px", borderRadius: 14, background: "var(--nav)", color: "var(--nav-ink)", fontSize: 12.5, fontWeight: 600 }} aria-live="polite">{coachLine(run, info)}</p>
            </div>
            <div className="card-pop stack" style={{ padding: 14, flex: 1 }}>
              {tiles(true)}
              <div className="bar green"><span style={{ width: `${(run.pos / info.len) * 100}%` }} /></div>
              <div className="between tiny muted" style={{ fontWeight: 700 }}><span>{info.accuracy} % genau</span><span>{info.perMinute ?? "–"} pro Min</span><span>beste Serie {run.best}</span></div>
            </div>
            <input className="field center fun" style={{ borderColor: "var(--accent)", boxShadow: "0 3px 0 var(--accent)", fontSize: 18 }} placeholder="Hier tippen" autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} aria-label="Tippfeld" value=""
              onChange={(e) => { const ch = e.target.value.slice(-1); if (ch) press(ch); }} />
          </>
        )}
      </main>
    );
  }

  return (
    // Die ganze Übungsfläche nimmt Tastenanschläge an (echte Tastatur, Design 6a).
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex
    <div ref={areaRef} role="application" tabIndex={0} onKeyDown={onKey} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} className="tw-play dots" aria-label="Übungsfläche – anklicken und lostippen">
      <div className="topbar" style={{ ["--gap" as string]: "14px" }}>
        <Link href="/tastenwelt" className="icon-btn square chunky" aria-label="Zum Lernweg"><Icon name="back" size={18} strokeWidth={2.4} /></Link>
        <span className="stack grow" style={{ ["--gap" as string]: "2px" }}><span className="fun" style={{ fontSize: 21 }}>Tastenwelt · {title}</span><span className="small muted">{sub}</span></span>
        <div className="row" style={{ width: 270 }}>
          {levelBadge(40)}
          <div className="stack grow" style={{ ["--gap" as string]: "5px" }}><div className="between tiny" style={{ fontWeight: 700 }}><span>Level {level}</span><span className="muted">{xpNow % XP_PER_LEVEL} / {XP_PER_LEVEL} XP</span></div>{xpBar}</div>
        </div>
        <span style={chip}><Icon name="flame" size={16} />Serie {run.combo}</span>
        <ThemeToggle />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 250px", gap: 20, flex: 1, minHeight: 0 }}>
        {info.done ? doneCard : (
          <div className="card-pop stack" style={{ padding: "20px 24px", boxShadow: "0 5px 0 var(--line2), 0 18px 40px var(--shadow)" }}>
            <div className="between"><span className="eyebrow">Tippe ab</span><span className="fun muted" style={{ fontSize: 14 }}>{run.pos} / {info.len}</span></div>
            {tiles(false)}
            <div className="bar green" style={{ height: 10 }}><span style={{ width: `${(run.pos / info.len) * 100}%` }} /></div>
            <div className="row" style={{ fontSize: 14, fontWeight: 600, color: "var(--ink2)" }}><span className="dot" style={{ width: 12, height: 12, background: `oklch(0.72 0.14 ${wf ? FINGER_HUE[wf] : 70})` }} />{fingerHint(want)}</div>
          </div>
        )}
        <div className="stack" style={{ alignItems: "center", ["--gap" as string]: "8px" }}>
          <p style={{ position: "relative", alignSelf: "stretch", minHeight: 64, padding: "12px 15px", borderRadius: 18, background: "var(--nav)", color: "var(--nav-ink)", fontSize: 14, fontWeight: 600 }} aria-live="polite">{coachLine(run, info)}</p>
          <div style={{ position: "relative", display: "grid", placeItems: "end center", width: 180, height: 132 }}>
            <span style={{ position: "absolute", bottom: 2, left: 25, width: 130, height: 24, borderRadius: "50%", background: "var(--surface2)", boxShadow: "inset 0 -4px 0 var(--line2)" }} />
            <Animal id={profile.animal} size={118} label={false} style={{ position: "relative", animation: animalAnim }} />
          </div>
          <div className="grid3" style={{ gap: 6, alignSelf: "stretch" }}>
            {[[info.perMinute ?? "–", "pro Min"], [`${info.accuracy} %`, "genau"], [run.best, "beste Serie"]].map(([v, l]) => (
              <div key={String(l)} className="card-pop stack center" style={{ padding: "9px 2px", alignItems: "center", ["--gap" as string]: "3px", borderRadius: 14 }}><span className="fun" style={{ fontSize: 21 }}>{v}</span><span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink2)" }}>{l}</span></div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, flex: "none" }}>
        <div style={{ width: 820, maxWidth: "100%", padding: "14px 14px 16px", borderRadius: 24, background: "var(--surface2)", boxShadow: "inset 0 2px 0 var(--line2), 0 6px 0 var(--line2)" }}>
          <Keyboard layout={typing.layout} want={want} wrong={run.wrong} fingerColors={typing.fingerColors} nextKey={typing.nextKey} dark={dark} size={{ h: 44, fs: 17, r: 10, d: 4, g: 6 }} />
        </div>
        <FingerBar want={want} nextKey={typing.nextKey} dark={dark} />
        {!focus && !run.pos ? (
          <button type="button" onClick={() => areaRef.current?.focus()} style={{ position: "absolute", zIndex: 2, inset: "-6px -10px", display: "grid", placeItems: "center", border: 0, borderRadius: 26, background: "color-mix(in oklch,var(--bg) 55%,transparent)", backdropFilter: "blur(2px)" }}>
            <span className="fun row" style={{ padding: "14px 22px", borderRadius: 999, background: "var(--nav)", color: "var(--nav-ink)", boxShadow: "0 5px 0 var(--gold)", fontSize: 17 }}><Icon name="pointer" size={20} />Hier klicken und lostippen</span>
          </button>
        ) : null}
        <div style={{ position: "absolute", right: 0, top: 0, zIndex: 3, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <button type="button" className="icon-btn square chunky" aria-expanded={settings} aria-label="Tastatur-Einstellungen" onMouseDown={(e) => { e.preventDefault(); setSettings((s) => !s); }} style={settings ? { background: "var(--nav)", color: "var(--nav-accent)", boxShadow: "0 3px 0 var(--gold)" } : undefined}><Icon name="gear" size={20} /></button>
          {settings ? (
            <div className="card-pop stack" style={{ width: 240, padding: 14, boxShadow: "0 4px 0 var(--line2),0 16px 34px var(--shadow)" }}>
              <span className="eyebrow" style={{ fontSize: 10.5 }}>Enter-Taste</span>
              <div className="grid2" style={{ gap: 6 }}>
                {(["iso", "small"] as const).map((l) => (
                  <button key={l} type="button" className="btn btn-sm" onMouseDown={(e) => { e.preventDefault(); setTyping((t) => ({ ...t, layout: l })); }} style={typing.layout === l ? { background: "var(--nav)", color: "var(--nav-accent)" } : { background: "var(--surface2)", color: "var(--ink2)" }}>
                    <Icon name={l === "iso" ? "enterBig" : "enterSmall"} size={18} />{l === "iso" ? "Groß" : "Klein"}
                  </button>
                ))}
              </div>
              {([["fingerColors", "Fingerfarben"], ["nextKey", "Nächste Taste zeigen"], ["strict", "Fehler stoppen"]] as const).map(([k, l]) => (
                <button key={k} type="button" aria-pressed={typing[k]} onMouseDown={(e) => { e.preventDefault(); setTyping((t) => ({ ...t, [k]: !t[k] })); }} className="between" style={{ minHeight: 40, padding: 0, border: 0, background: "transparent", fontSize: 13.5, fontWeight: 700, textAlign: "left" }}>
                  {l}<span className="switch" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
