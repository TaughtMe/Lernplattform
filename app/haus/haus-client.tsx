"use client";

import { useState } from "react";
import { encodeLetter, houseById, HOUSES, isoWeek, perHead, DAILY_POINT_LIMIT, type PerformanceLetterV1 } from "@/src/domain/houses";
import { dayKey } from "@/src/storage/personal";
import { Animal } from "../components/animal";
import { Icon } from "../components/icons";
import { QrCode } from "../components/qr-code";
import { ThemeToggle, useIsDark } from "../components/theme-toggle";
import { usePersonal } from "../hooks/use-personal";
import { Towers, type TowerData } from "./towers";

/**
 * Beispielstand der anderen Häuser. Schülergeräte haben bewusst keinen
 * Rückkanal (Air-Gap, Entscheidungsprotokoll Nr. 5); der echte Stand steht in
 * der Beamer-Ansicht der Lehrkraft.
 */
const SAMPLE: Record<string, { pts: number; active: number; members: number; trend: string }> = {
  phoenix: { pts: 3420, active: 7, members: 8, trend: "+12 %" },
  orca: { pts: 3180, active: 8, members: 8, trend: "+4 %" },
  chameleon: { pts: 2890, active: 6, members: 7, trend: "+18 %" },
  einhorn: { pts: 3050, active: 7, members: 8, trend: "+7 %" },
};

const SHARE_LABELS = { xp: "XP", hp: "Hauspunkte", words: "Gelernte Wörter", impr: "Verbesserungen" } as const;

/** Mein Haus (Design 7a/7b): Türme, Tagesbeitrag, Missionen und QR-Leistungsbrief. */
export function HausClient() {
  const { profile, house, setHouse, activity, typing, words } = usePersonal();
  const dark = useIsDark();
  const [qr, setQr] = useState(false);
  const mine = houseById(profile.house);
  const week = isoWeek(new Date());
  const weekPoints = house.week === week ? house.points : 0;
  const today = activity[dayKey()]?.points ?? 0;
  const knownWords = words.filter((w) => w.box >= 4).length;
  const improved = words.filter((w) => w.wrongCount > 0 && w.box >= 2).length;

  const towers: TowerData[] = HOUSES.map((h) => {
    const s = SAMPLE[h.id];
    const pts = s.pts + (h.id === mine.id ? weekPoints : 0);
    return { id: h.id, name: h.name, hue: h.hue, animal: h.animal, perHead: perHead(pts, s.active), active: `${s.active}/${s.members} aktiv`, trend: s.trend };
  });
  const own = towers.find((t) => t.id === mine.id)!;
  const ownSample = SAMPLE[mine.id];

  const missions = [
    { t: "Gemeinsam 100 Fehler verbessern", n: Math.min(100, 64 + improved), of: 100 },
    { t: "50 Wörter sicher schreiben", n: Math.min(50, 38 + knownWords), of: 50 },
    { t: "20 persönliche Lernstufen aufsteigen", n: Math.min(20, 13 + typing.stars.filter(Boolean).length % 5), of: 20 },
    { t: "An fünf Tagen gemeinsam lernen", n: Math.min(5, Object.keys(activity).filter((d) => d.startsWith(new Date().getFullYear().toString())).length), of: 5 },
  ];

  const letter: PerformanceLetterV1 = {
    v: 1, c: profile.classId, m: profile.memberId, h: mine.id, w: week, s: Math.max(1, house.seq),
    ...(house.share.xp ? { xp: typing.xp } : {}),
    ...(house.share.hp ? { hp: weekPoints } : {}),
    ...(house.share.words ? { words: knownWords } : {}),
    ...(house.share.impr ? { impr: improved } : {}),
  };

  const openQr = () => {
    // Jeder geöffnete Brief bekommt eine neue, höhere Standnummer.
    setHouse((h) => ({ ...(h.week === week ? h : { ...h, week, points: 0 }), seq: h.seq + 1 }));
    setQr(true);
  };

  const hero = (
    <div className="row" style={{ padding: "14px 16px", borderRadius: 22, ...(dark ? { background: `oklch(0.4 0.09 ${mine.hue})`, color: "#fff", boxShadow: `0 5px 0 oklch(0.28 0.07 ${mine.hue})` } : { background: `oklch(0.84 0.11 ${mine.hue})`, color: "#211f1b", boxShadow: `0 5px 0 oklch(0.58 0.14 ${mine.hue})` }) }}>
      <Animal id={mine.animal} size={64} className="bob" label={false} />
      <span className="stack grow" style={{ ["--gap" as string]: "3px" }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", opacity: 0.75 }}>Dein Haus</span>
        <span className="fun" style={{ fontSize: 25 }}>{mine.name}</span>
        <span style={{ fontSize: 12.5, fontWeight: 600, opacity: 0.8 }}>{ownSample.active} von {ownSample.members} haben diese Woche gelernt</span>
      </span>
      <span className="stack" style={{ alignItems: "flex-end", ["--gap" as string]: "2px" }}><span className="fun" style={{ fontSize: 30, fontWeight: 700 }}>{own.perHead}</span><span style={{ fontSize: 11, fontWeight: 700, opacity: 0.8 }}>pro Kopf</span></span>
    </div>
  );

  const contribution = (
    <div className="card-pop stack" style={{ padding: 16, ["--gap" as string]: "8px" }}>
      <div className="between baseline"><span className="fun" style={{ fontSize: 16 }}>Dein Beitrag heute</span><span className="fun" style={{ fontSize: 16, color: "var(--accent)" }}>{today} / {DAILY_POINT_LIMIT}</span></div>
      <div className="bar" style={{ height: 10, padding: 2 }}><span style={{ width: `${(today / DAILY_POINT_LIMIT) * 100}%` }} /></div>
      <span className="small muted">{today >= DAILY_POINT_LIMIT ? "Tageslimit erreicht – morgen geht es weiter." : `Noch ${DAILY_POINT_LIMIT - today} Punkte bis zum Tageslimit.`} Diese Woche: {weekPoints} Punkte für {mine.name}.</span>
    </div>
  );

  const missionList = (grid: boolean) => (
    <div className={grid ? "haus-missions" : "stack"} style={{ ["--gap" as string]: "8px" }}>
      {missions.map((m) => {
        const done = m.n >= m.of;
        const mark = <span className="fun" style={{ display: "grid", placeItems: "center", minWidth: 38, height: 30, padding: "0 6px", borderRadius: 10, fontSize: done ? 16 : 12, ...(done ? { background: "var(--green)", color: "var(--green-ink)" } : { background: "var(--accent-bg)", color: "var(--accent)" }) }}>{done ? "✓" : `${Math.round((m.n / m.of) * 100)}%`}</span>;
        const bar = <span className={`bar ${done ? "green" : ""}`} style={{ height: 7 }}><span style={{ width: `${Math.min(100, (m.n / m.of) * 100)}%` }} /></span>;
        return grid ? (
          <div key={m.t} className="card-pop stack" style={{ padding: 14, ["--gap" as string]: "10px" }}>
            <div className="between">{mark}<span className="fun muted" style={{ fontSize: 15 }}>{m.n} / {m.of}</span></div>
            <span style={{ fontSize: 13.5, fontWeight: 700 }}>{m.t}</span>
            <div style={{ marginTop: "auto" }}>{bar}</div>
          </div>
        ) : (
          <div key={m.t} className="card-pop row" style={{ padding: "10px 12px", borderRadius: 14 }}>
            {mark}
            <span className="stack grow" style={{ ["--gap" as string]: "5px" }}><span className="between small" style={{ fontWeight: 700 }}><span>{m.t}</span><span className="muted" style={{ whiteSpace: "nowrap" }}>{m.n} / {m.of}</span></span>{bar}</span>
          </div>
        );
      })}
    </div>
  );

  return (
    <main className="page dots haus">
      <div className="between" style={{ alignItems: "flex-end" }}>
        <span className="stack" style={{ ["--gap" as string]: "4px" }}><h1 className="h-fun">Mein Haus</h1><span className="small muted desktop-only">{profile.className} · Woche {week.slice(-2)} · gezählt wird pro aktivem Mitglied</span></span>
        <ThemeToggle />
      </div>

      <div className="haus-grid">
        <div className="card-pop stack" style={{ padding: "16px 16px 12px", borderRadius: 26 }}>
          <div className="between baseline"><span className="fun" style={{ fontSize: 17 }}>Alle Häuser</span><span className="tiny muted" style={{ fontWeight: 700 }}>1 Stock = 50 Punkte pro Kopf</span></div>
          <div className="mobile-only"><Towers houses={towers} mine={mine.id} dark={dark} size="s" height={230} /></div>
          <div className="desktop-only"><Towers houses={towers} mine={mine.id} dark={dark} size="m" height={370} /></div>
          <p className="tiny faint">Beispielstand. Den echten Wochenstand zeigt deine Lehrkraft am Beamer.</p>
        </div>
        <div className="stack" style={{ ["--gap" as string]: "14px" }}>
          {hero}
          {contribution}
          <div className="card-pop stack desktop-only" style={{ padding: 16, ["--gap" as string]: "9px" }}>
            <span className="fun" style={{ fontSize: 16 }}>Gerade im Haus</span>
            {[["Blauer Komet", "hat 12 alte Fehler richtig gelöst", "+60"], ["Leiser Luchs", "ist mit 9 Karten in Box 5 aufgestiegen", "+45"], ["Du", today >= 30 ? "hast heute schon fleißig gelernt" : "kannst heute noch Punkte sammeln", `+${today}`]].map(([who, what, pts]) => (
              <div key={who} className="row small" style={{ alignItems: "flex-start" }}><span className="pill pill-good">{pts}</span><span><b>{who}</b> {what}</span></div>
            ))}
          </div>
        </div>
      </div>

      <span className="fun mobile-only" style={{ fontSize: 15 }}>Hausmissionen</span>
      <div className="mobile-only">{missionList(false)}</div>
      <div className="desktop-only">{missionList(true)}</div>

      <button type="button" className="btn btn-dark btn-lg fun" style={{ boxShadow: "0 4px 0 var(--gold)", fontSize: 16 }} onClick={openQr}><Icon name="qr" size={20} />Leistungsbrief an Lehrkraft</button>

      {qr ? (
        <>
          <button type="button" className="scrim" aria-label="Schließen" onClick={() => setQr(false)} />
          <div className="sheet stack" role="dialog" aria-modal="true" aria-labelledby="lb-title" style={{ alignItems: "center", background: "var(--surface)" }}>
            <span className="grip" />
            <div className="between" style={{ alignSelf: "stretch" }}><span id="lb-title" className="fun" style={{ fontSize: 20 }}>Leistungsbrief</span><button type="button" className="btn btn-soft btn-sm" onClick={() => setQr(false)}>Schließen</button></div>
            <div className="row wrap" style={{ alignSelf: "stretch", ["--gap" as string]: "6px" }}>
              {(Object.keys(SHARE_LABELS) as (keyof typeof SHARE_LABELS)[]).map((k) => (
                <button key={k} type="button" className="chip" aria-pressed={house.share[k]} onClick={() => setHouse((h) => ({ ...h, seq: h.seq + 1, share: { ...h.share, [k]: !h.share[k] } }))}>{SHARE_LABELS[k]}</button>
              ))}
            </div>
            <QrCode value={encodeLetter(letter)} size={240} label="QR-Code mit deinem Leistungsbrief" />
            <span className="small muted center">Halte den Code vor das Lehrergerät. Er bleibt sichtbar, bis du ihn schließt. Die Bestätigung siehst du dort. Übertragen werden nur die markierten Werte, Stand {letter.s}.</span>
          </div>
        </>
      ) : null}
    </main>
  );
}
