"use client";

import Link from "next/link";
import { animalName } from "@/src/domain/animals";
import { weekDays } from "@/src/storage/personal";
import { overview } from "@/src/storage/selectors";
import { Animal, ProgressRing } from "../components/animal";
import { Icon } from "../components/icons";
import { ThemeToggle } from "../components/theme-toggle";
import { usePersonal } from "../hooks/use-personal";

/** Schülerdashboard (Design 2b/3a/3b): Streak-Ring um das Tier, Fortschritt rechts. */
export function DashboardClient() {
  const { profile, decks, words, activity, streak, typing } = usePersonal();
  const o = overview(decks, words, activity, typing, streak);
  const week = weekDays(activity);
  const doneDays = week.filter((d) => d.state === "done").length;

  return (
    <div className="dash">
      <main className="page">
        <div className="between">
          <span style={{ fontSize: 15, fontWeight: 700 }}>{profile.className}</span>
          <div className="row">
            <Link href="/profil" className="icon-btn mobile-only" aria-label="Profileinstellungen"><Icon name="gear" size={18} /></Link>
            <ThemeToggle />
          </div>
        </div>

        <div className="stack" style={{ alignItems: "center", margin: "auto 0", ["--gap" as string]: "16px", paddingBlock: 20 }}>
          <div className="animal-stage" style={{ width: 290, height: 290 }}>
            <ProgressRing size={290} value={o.todayCards / o.goal} />
            <Link href="/lernen" className="animal-disc" style={{ width: 236, height: 236, boxShadow: "0 14px 38px var(--shadow)" }} aria-label="Weiterlernen">
              <Animal id={profile.animal} size={194} label={false} />
            </Link>
            <span className="streak-badge"><Icon name="bolt" size={15} />{streak} {streak === 1 ? "Tag" : "Tage"}</span>
          </div>
          <div className="stack center" style={{ alignItems: "center", ["--gap" as string]: "5px", marginTop: 6 }}>
            <p style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.02em" }}>{animalName(profile.animal)} · Stufe {o.level}</p>
            <p className="muted small">
              {o.todayCards} von {o.goal} Karten heute — {o.streakLeft > 0 ? `${o.streakLeft} halten den Streak` : "Streak für heute gesichert"}
            </p>
          </div>
          <div className="row" style={{ width: "100%", maxWidth: 470 }}>
            <Link href="/lernen" className="btn btn-primary btn-lg grow"><Icon name="arrow" size={19} />Weiterlernen</Link>
            <Link href="/duell" className="btn btn-ghost btn-lg desktop-only"><Icon name="trophy" size={19} />Duell</Link>
          </div>
          <div className="grid2 mobile-only" style={{ width: "100%" }}>
            <div className="card card-pad"><p className="big-num">{o.badges.length}</p><p className="tiny muted" style={{ fontWeight: 600 }}>Abzeichen</p></div>
            <div className="card card-pad"><p className="big-num">{o.hardWords.length}</p><p className="tiny muted" style={{ fontWeight: 600 }}>schwierige Wörter</p></div>
          </div>
          <div className="grid2" style={{ width: "100%", maxWidth: 470 }}>
            <Link href="/tastenwelt" className="select-card"><span className="row" style={{ fontWeight: 700 }}><Icon name="keyboard" size={18} />Tastenwelt</span><span className="tiny muted">Stufe {typing.stage + 1} von 10</span></Link>
            <Link href="/haus" className="select-card"><span className="row" style={{ fontWeight: 700 }}><Icon name="house" size={18} />Mein Haus</span><span className="tiny muted">Punkte fürs Team</span></Link>
          </div>
        </div>
      </main>

      <aside className="dash-side">
        <div className="card-soft card-pad stack" style={{ ["--gap" as string]: "11px" }}>
          <div className="between baseline"><span className="h-section" style={{ fontSize: 13.5 }}>Diese Woche</span><span className="small muted">{doneDays} von 7 Tagen</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
            {week.map((d) => (
              <span key={d.label} className={`weekday ${d.state}`}>{d.label}</span>
            ))}
          </div>
        </div>
        <div className="card-soft card-pad stack" style={{ ["--gap" as string]: "9px" }}>
          <div className="between baseline"><span className="h-section" style={{ fontSize: 13.5 }}>Heute fällig</span><span style={{ fontWeight: 700, color: "var(--accent)" }}>{o.todayCards} / {o.goal}</span></div>
          <div className="bar"><span style={{ width: `${Math.round((o.todayCards / o.goal) * 100)}%` }} /></div>
          <p className="small muted">{o.due > 0 ? `Noch ${o.due} Karten, dann ist der Tag voll.` : "Alles erledigt für heute."}</p>
        </div>
        <div className="card-soft card-pad stack" style={{ ["--gap" as string]: "9px" }}>
          <span className="h-section" style={{ fontSize: 13.5 }}>Schwierige Wörter</span>
          {o.hardWords.length ? o.hardWords.map((w) => (
            <div key={w.text} className="between" style={{ padding: "9px 12px", borderRadius: 11, background: "var(--surface)" }}>
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{w.text}</span><span className="pill">{w.wrong}×falsch</span>
            </div>
          )) : <p className="small muted">Keine – stark!</p>}
          <Link href="/lernen?fehler=1" className="btn btn-ghost btn-sm">Nur diese üben</Link>
        </div>
        <div className="card-soft card-pad between">
          <span className="stack" style={{ ["--gap" as string]: "2px" }}><span className="h-section" style={{ fontSize: 13.5 }}>Abzeichen</span><span className="small muted">{o.badges.length ? o.badges.slice(-2).join(" · ") : "Das erste wartet auf dich"}</span></span>
          <span style={{ display: "grid", placeItems: "center", width: 34, height: 34, borderRadius: "50%", background: "var(--accent-bg)", color: "var(--accent)", fontWeight: 800 }}>{o.badges.length}</span>
        </div>
      </aside>
    </div>
  );
}
