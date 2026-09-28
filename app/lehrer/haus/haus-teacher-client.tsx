"use client";

import { useState } from "react";
import { acceptLetter, decodeLetter, houseById, houseStandings, HOUSES, isoWeek, type HouseId } from "@/src/domain/houses";
import { encodeEnrollment } from "@/src/domain/enrollment";
import { TEACHER_KEYS, type Inbox, type ScanLogEntry } from "@/src/storage/teacher";
import { Icon } from "../../components/icons";
import { QrCode } from "../../components/qr-code";
import { QrScanner } from "../../components/qr-scanner";
import { useIsDark } from "../../components/theme-toggle";
import { useStored } from "../../hooks/use-stored";
import { Towers } from "../../haus/towers";
import { TeacherShell, useTeacherClasses } from "../teacher-shell";

const EMPTY_INBOX: Inbox = {};
const EMPTY_LOG: ScanLogEntry[] = [];
const STATUS_TEXT: Record<ScanLogEntry["status"], string> = { neu: "übernommen", aktualisiert: "aktualisiert", doppelt: "schon da", veraltet: "älterer Stand", klassenfremd: "andere Klasse", ungueltig: "ungültig" };

export function HausTeacherClient() {
  return <TeacherShell title="Häuser"><HausTeacher /></TeacherShell>;
}

function beep(ok: boolean) {
  try { navigator.vibrate?.(ok ? 60 : [40, 40, 40]); } catch { /* ignorieren */ }
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    o.frequency.value = ok ? 880 : 220;
    o.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.12);
  } catch { /* ignorieren */ }
}

/** Lehrer (Design 7c): Häuser für den Beamer, Leistungsbriefe im fortlaufenden Scanmodus. */
function HausTeacher() {
  const { active } = useTeacherClasses();
  const dark = useIsDark();
  const [inboxes, setInboxes] = useStored<Record<string, Inbox>>("teacher", TEACHER_KEYS.inbox, {});
  const [logs, setLogs] = useStored<Record<string, ScanLogEntry[]>>("teacher", TEACHER_KEYS.scans, {});
  const [beamer, setBeamer] = useState(false);
  const [scan, setScan] = useState(false);
  const [manual, setManual] = useState("");
  const [frame, setFrame] = useState<"ok" | "bad" | null>(null);
  const [enrollHouse, setEnrollHouse] = useState<HouseId>("phoenix");
  const week = isoWeek(new Date());
  const inbox = inboxes[active.id] ?? EMPTY_INBOX;
  const log = logs[active.id] ?? EMPTY_LOG;
  const standings = houseStandings(inbox, week);
  const delivered = Object.values(inbox).filter((l) => l.w === week).length;
  const best = [...standings].sort((a, b) => b.perHead - a.perHead)[0];

  const handle = (raw: string) => {
    const decoded = decodeLetter(raw);
    let entry: ScanLogEntry;
    if (!decoded.ok) {
      entry = { alias: "Unbekannter Code", house: "–", status: "ungueltig", at: new Date().toISOString() };
    } else {
      const res = acceptLetter(inbox, decoded.letter, active.id);
      if (res.inbox !== inbox) setInboxes((prev) => ({ ...prev, [active.id]: res.inbox }));
      entry = { alias: `Mitglied ${decoded.letter.m.slice(0, 4).toUpperCase()}`, house: houseById(decoded.letter.h).name, status: res.status, at: new Date().toISOString() };
    }
    const ok = entry.status === "neu" || entry.status === "aktualisiert";
    beep(ok);
    setFrame(ok ? "ok" : "bad");
    setTimeout(() => setFrame(null), 900);
    setLogs((prev) => ({ ...prev, [active.id]: [entry, ...(prev[active.id] ?? [])].slice(0, 50) }));
  };

  const towers = standings.map((h) => ({ id: h.id, name: h.name, hue: h.hue, animal: h.animal, perHead: h.perHead, active: `${h.active} aktiv` }));

  if (beamer) {
    return (
      <main className="page dots" style={{ minHeight: "100dvh" }}>
        <div className="between"><h1 className="h-fun">Häuser · {active.label} · Woche {week.slice(-2)}</h1><button type="button" className="btn btn-ghost btn-sm" onClick={() => setBeamer(false)}>Beamer-Ansicht schließen</button></div>
        <div className="card-pop" style={{ padding: 24, flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}><Towers houses={towers} dark={dark} size="l" height={Math.max(420, typeof window !== "undefined" ? window.innerHeight - 260 : 500)} /></div>
      </main>
    );
  }

  return (
    <main className="page page-wide" style={{ gap: 18 }}>
      <div className="row wrap">
        <span className="stack grow" style={{ ["--gap" as string]: "2px" }}><h1 className="h-fun" style={{ fontSize: 24 }}>Häuser · {active.label}</h1><span className="small muted">Woche {week.slice(-2)} · Ranking liegt nur auf diesem Gerät</span></span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBeamer(true)}><Icon name="beamer" size={18} />Beamer-Ansicht</button>
      </div>
      <div className="haus-grid" style={{ gridTemplateColumns: "minmax(0,1fr) 350px" }}>
        <div className="card-pop dots stack" style={{ padding: "20px 24px 18px", borderRadius: 26 }}>
          <div className="between"><span className="fun" style={{ fontSize: 19 }}>Stand der Häuser</span>{best && best.perHead > 0 ? <span className="pill pill-good" style={{ fontSize: 12.5, padding: "6px 11px" }}>Vorne: {best.name}</span> : null}</div>
          <Towers houses={towers} dark={dark} size="m" height={380} />
          {!delivered ? <p className="small muted">Noch keine Leistungsbriefe diese Woche. Schüler öffnen „Mein Haus“ → „Leistungsbrief an Lehrkraft“.</p> : null}
        </div>
        <div className="stack" style={{ ["--gap" as string]: "14px" }}>
          <div className="card-dark stack" style={{ padding: 16, boxShadow: "0 5px 0 var(--gold)" }}>
            <div className="between"><span className="fun" style={{ fontSize: 17 }}>Leistungsbriefe</span><span className="fun" style={{ color: "var(--nav-accent)" }}>{delivered} / {active.count || "?"}</span></div>
            {scan ? <QrScanner continuous onCode={handle} frameColor={frame === "ok" ? "#4fbf86" : frame === "bad" ? "#f09a80" : undefined} /> : (
              <div style={{ display: "grid", placeItems: "center", height: 150, borderRadius: 16, background: "repeating-linear-gradient(135deg,#2a2723 0 10px,#211f1b 10px 20px)", border: `3px solid ${frame === "ok" ? "#4fbf86" : frame === "bad" ? "#f09a80" : "transparent"}` }}>
                <span className="tiny" style={{ padding: "5px 9px", borderRadius: 7, background: "rgba(0,0,0,.55)", color: "#a89e8c", fontFamily: "ui-monospace,monospace" }}>Kamera · Klassenmodus</span>
              </div>
            )}
            <button type="button" className="btn btn-gold fun" onClick={() => setScan((s) => !s)}>{scan ? "Scan beenden" : "Scanmodus starten"}</button>
            <form className="row" onSubmit={(e) => { e.preventDefault(); if (manual.trim()) { handle(manual.trim()); setManual(""); } }}>
              <input className="input grow" style={{ background: "var(--nav-line)", borderColor: "#4a4438", color: "var(--nav-ink)", height: 40, fontSize: 13 }} value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Code einfügen (LR1…)" aria-label="Leistungsbrief-Code" />
              <button type="submit" className="btn btn-soft btn-xs">Prüfen</button>
            </form>
          </div>
          <div className="card-pop stack" style={{ padding: 14, ["--gap" as string]: "8px" }}>
            <span className="eyebrow">Zuletzt</span>
            {log.length ? log.slice(0, 6).map((c, i) => (
              <div key={i} className="row" style={{ minHeight: 38 }}>
                <span className="dot" style={{ width: 12, height: 12, background: `oklch(0.7 0.14 ${HOUSES.find((h) => h.name === c.house)?.hue ?? 70})` }} />
                <span className="stack grow" style={{ ["--gap" as string]: "0" }}><span style={{ fontSize: 13.5, fontWeight: 700 }}>{c.alias}</span><span className="tiny muted">{c.house} · {new Date(c.at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</span></span>
                <span className={`pill ${c.status === "neu" || c.status === "aktualisiert" ? "pill-good" : "pill-accent"}`}>{STATUS_TEXT[c.status]}</span>
              </div>
            )) : <p className="small muted">Noch nichts gescannt.</p>}
            {log.length || delivered ? <button type="button" className="btn-link" style={{ alignSelf: "flex-start", color: "var(--bad)" }} onClick={() => { if (confirm("Abgabeprotokoll und Wochenstand dieser Klasse löschen?")) { setInboxes((p) => ({ ...p, [active.id]: {} })); setLogs((p) => ({ ...p, [active.id]: [] })); } }}>Protokoll löschen</button> : null}
          </div>
        </div>
      </div>

      <section className="card card-pad stack">
        <span className="h-section">Einschreiben</span>
        <p className="small muted">Schüler scannen diesen Code unter Profil → „Klasse beitreten“. So zählen ihre Leistungsbriefe für {active.label} und das gewählte Haus. Der Code enthält keine Namen.</p>
        <div className="row wrap">
          {HOUSES.map((h) => <button key={h.id} type="button" className="chip" aria-pressed={enrollHouse === h.id} onClick={() => setEnrollHouse(h.id)}>{h.name}</button>)}
        </div>
        <div className="row wrap" style={{ alignItems: "flex-start" }}>
          <QrCode value={encodeEnrollment({ c: active.id, n: active.label, h: enrollHouse })} size={170} label={`Einschreibe-Code für ${active.label}, Haus ${houseById(enrollHouse).name}`} />
          <code className="small" style={{ wordBreak: "break-all", maxWidth: 360, color: "var(--ink2)" }}>{encodeEnrollment({ c: active.id, n: active.label, h: enrollHouse })}</code>
        </div>
      </section>
    </main>
  );
}
