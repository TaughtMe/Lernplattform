"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { SEED_CLASSES, TEACHER_KEYS, type SchoolClass } from "@/src/storage/teacher";
import { Icon, type IconName } from "../components/icons";
import { ThemeToggle } from "../components/theme-toggle";
import { useHydrated, useStored } from "../hooks/use-stored";

const AREAS: { href: string; label: string; icon: IconName }[] = [
  { href: "/lehrer", label: "Inhalte", icon: "content" },
  { href: "/lehrer/laufdiktat", label: "Räume", icon: "play" },
  { href: "/lehrer/auswertung", label: "Auswertung", icon: "chart" },
  { href: "/lehrer/haus", label: "Häuser", icon: "house" },
];

export function useTeacherClasses() {
  const [classes, setClasses] = useStored<SchoolClass[]>("teacher", TEACHER_KEYS.classes, SEED_CLASSES);
  const [active, setActive] = useStored<string>("teacher", TEACHER_KEYS.activeClass, SEED_CLASSES[0].id);
  const current = classes.find((c) => c.id === active) ?? classes[0];
  return { classes, setClasses, active: current, setActive };
}

/* ---------- Lehrer-PIN (lokal, Entscheidungsprotokoll Nr. 1) ---------- */

async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function PinGate({ children }: { children: ReactNode }) {
  const [stored, setStored] = useStored<{ salt: string; hash: string } | null>("teacher", TEACHER_KEYS.pin, null);
  const hydrated = useHydrated();
  const [unlockedNow, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [repeat, setRepeat] = useState("");
  const [err, setErr] = useState("");
  const unlock = () => { try { sessionStorage.setItem("lernraum:teacher:unlocked", "1"); } catch { /* ignorieren */ } setUnlocked(true); };

  if (!hydrated) return null;
  let unlocked = unlockedNow;
  try { unlocked ||= sessionStorage.getItem("lernraum:teacher:unlocked") === "1"; } catch { /* gesperrt lassen */ }
  if (unlocked) return <>{children}</>;

  const submit = async () => {
    setErr("");
    if (!/^\d{4,8}$/.test(pin)) return setErr("Die PIN hat 4 bis 8 Ziffern.");
    if (!stored) {
      if (pin !== repeat) return setErr("Die beiden PINs stimmen nicht überein.");
      const salt = crypto.getRandomValues(new Uint32Array(2)).join("-");
      setStored({ salt, hash: await hashPin(pin, salt) });
      return unlock();
    }
    if ((await hashPin(pin, stored.salt)) === stored.hash) unlock();
    else { setErr("PIN falsch."); setPin(""); }
  };

  return (
    <main className="landing" style={{ display: "grid", placeItems: "center", padding: 22 }}>
      <form className="stack" style={{ width: "100%", maxWidth: 380 }} onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Link href="/" className="landing-pill" style={{ alignSelf: "flex-start" }}>← Schülerbereich</Link>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginTop: 20 }}>Lernraum · Lehrer</h1>
        <p style={{ color: "#a89e8c", fontSize: 14 }}>{stored ? "Lehrer-PIN eingeben. Der Lehrerbereich ist auf diesem Gerät geschützt." : "Lege eine Lehrer-PIN fest. Sie schützt Klassen, Inhalte und Auswertungen auf diesem Gerät."}</p>
        <input className="code-input" style={{ background: "#2a2723", borderColor: "#4a4438", color: "#fff8e8", letterSpacing: 8 }} type="password" inputMode="numeric" autoComplete={stored ? "current-password" : "new-password"} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} aria-label="PIN" placeholder="PIN" />
        {!stored ? <input className="code-input" style={{ background: "#2a2723", borderColor: "#4a4438", color: "#fff8e8", letterSpacing: 8 }} type="password" inputMode="numeric" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value.replace(/\D/g, ""))} aria-label="PIN wiederholen" placeholder="wiederholen" /> : null}
        {err ? <p role="alert" style={{ color: "#f09a80", fontSize: 13 }}>{err}</p> : null}
        <button type="submit" className="btn btn-gold btn-lg">{stored ? "Entsperren" : "PIN festlegen"}</button>
      </form>
    </main>
  );
}

/** Lehrerbereich (Design 2c/3c/3d): Seitenleiste mit Klassen und Bereichen, mobil als Leiste zum Ausklappen. */
export function TeacherShell({ children, title }: { children: ReactNode; title: string }) {
  const path = usePathname() ?? "";
  const { classes, setClasses, active, setActive } = useTeacherClasses();
  const [nav, setNav] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const addClass = () => {
    const label = newLabel.trim();
    if (!label) return;
    const id = `k-${Date.now().toString(36)}`;
    setClasses([...classes, { id, label, sub: "", count: 0 }]);
    setActive(id);
    setNewLabel(""); setAdding(false);
  };

  const side = (
    <>
      <div className="between"><span className="side-title">Lernraum · Lehrer</span>{nav ? <button type="button" className="icon-btn square" style={{ background: "transparent", borderColor: "var(--nav-line)", color: "var(--nav-ink2)", width: 34, height: 34 }} aria-label="Leiste schließen" onClick={() => setNav(false)}><Icon name="close" size={16} /></button> : null}</div>
      <div className="stack" style={{ ["--gap" as string]: "7px" }}>
        <span className="side-label">Klassen</span>
        {classes.map((k) => (
          <button key={k.id} type="button" className="class-row" aria-current={k.id === active.id ? "true" : undefined} onClick={() => { setActive(k.id); setNav(false); }}>
            <span className="stack" style={{ ["--gap" as string]: "2px" }}><span style={{ fontSize: 14, fontWeight: 700 }}>{k.label}</span><span className="tiny" style={{ color: "var(--nav-ink2)" }}>{k.sub || "–"}</span></span>
            <span className="pill">{k.count}</span>
          </button>
        ))}
        {adding ? (
          <form className="row" onSubmit={(e) => { e.preventDefault(); addClass(); }}>
            <input className="input grow" style={{ background: "var(--nav-line)", borderColor: "#4a4438", color: "var(--nav-ink)", height: 42 }} value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="z. B. Klasse 5a" aria-label="Name der Klasse" />
            <button type="submit" className="btn btn-gold btn-xs">OK</button>
          </form>
        ) : <button type="button" className="dashed-dark" onClick={() => setAdding(true)}><Icon name="plus" size={16} />Klasse anlegen</button>}
      </div>
      <div className="stack" style={{ ["--gap" as string]: "3px" }}>
        <span className="side-label" style={{ paddingBottom: 6 }}>Bereich</span>
        {AREAS.map((a) => (
          <Link key={a.href} href={a.href} className="area-link" aria-current={(a.href === "/lehrer" ? path === "/lehrer" : path.startsWith(a.href)) ? "page" : undefined} onClick={() => setNav(false)}>
            <Icon name={a.icon} size={18} />{a.label}
          </Link>
        ))}
      </div>
      <div className="row" style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid var(--nav-line)" }}>
        <span className="avatar-initials">LK</span>
        <span className="stack grow" style={{ ["--gap" as string]: "0" }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Lehrkraft</span>
          <button type="button" className="btn-link" style={{ color: "var(--nav-ink2)", fontSize: 11.5, fontWeight: 600, minHeight: 0, textAlign: "left" }} onClick={() => { try { sessionStorage.removeItem("lernraum:teacher:unlocked"); } catch { /* ignorieren */ } location.href = "/"; }}>Sperren und abmelden</button>
        </span>
        <ThemeToggle className="icon-btn" />
      </div>
    </>
  );

  return (
    <PinGate>
      <div className="teacher">
        <aside className="teacher-side">{side}</aside>
        <header className="teacher-top">
          <button type="button" className="icon-btn square" aria-label="Klassen und Bereiche" onClick={() => setNav(true)}><Icon name="menu" size={20} /></button>
          <span className="stack grow" style={{ ["--gap" as string]: "0" }}><span className="truncate" style={{ fontSize: 14.5, fontWeight: 700 }}>{active.label}</span><span className="tiny muted">{title}</span></span>
          <ThemeToggle />
        </header>
        {nav ? (
          <>
            <button type="button" className="scrim" aria-label="Leiste schließen" onClick={() => setNav(false)} />
            <aside className="drawer">{side}</aside>
          </>
        ) : null}
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>{children}</div>
      </div>
    </PinGate>
  );
}
