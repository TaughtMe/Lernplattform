"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { TEACHER_KEYS, topErrors, type SessionResult } from "@/src/storage/teacher";
import { Icon } from "../../components/icons";
import { useStored } from "../../hooks/use-stored";
import { downloadCsv } from "../laufdiktat/laufdiktat-client";
import { TeacherShell, useTeacherClasses } from "../teacher-shell";

const EMPTY: SessionResult[] = [];

export function AuswertungClient() {
  return <TeacherShell title="Auswertung"><Auswertung /></TeacherShell>;
}

/** Abgeschlossene Sitzungen: nur lokal auf dem Lehrergerät, mit Löschfunktion. */
function Auswertung() {
  const params = useSearchParams();
  const { active } = useTeacherClasses();
  const [results, setResults] = useStored<SessionResult[]>("teacher", TEACHER_KEYS.results, EMPTY);
  const list = results.filter((r) => r.classId === active.id);
  const [openId, setOpenId] = useState<string | null>(params?.get("id") ?? null);
  const open = results.find((r) => r.id === openId);

  return (
    <main className="page page-wide" style={{ gap: 20 }}>
      <div><p className="eyebrow">{active.label}</p><h1 style={{ marginTop: 5, fontSize: 29, fontWeight: 700, letterSpacing: "-.03em" }}>Auswertung</h1></div>
      <p className="small muted">Ergebnisse liegen nur auf diesem Gerät. Schüler erscheinen mit ihrem Tiernamen, nicht mit Klarnamen.</p>
      {open ? (
        <section className="card card-pad stack">
          <div className="between wrap">
            <span className="stack" style={{ ["--gap" as string]: "2px" }}><span style={{ fontSize: 18, fontWeight: 700 }}>{open.title}</span><span className="small muted">{open.mode} · {new Date(open.date).toLocaleString("de-DE")} · {open.rows.length} Teilnehmende</span></span>
            <span className="row"><button type="button" className="btn btn-green btn-sm" onClick={() => downloadCsv(open)}><Icon name="download" size={16} />CSV</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpenId(null)}>Schließen</button></span>
          </div>
          <div className="list" style={{ overflowX: "auto" }}>
            <div className="aw-row aw-head"><span>Tier / Station</span><span>Stand</span><span>Fehler</span><span>Spicker</span><span>Dauer</span></div>
            {open.rows.map((r) => (
              <div key={r.studentKey + (r.stationNumber ?? "")} className="aw-row">
                <span style={{ fontWeight: 700 }}>{r.stationNumber ? `Station ${r.stationNumber}` : r.studentKey}</span>
                <span>{r.finished ? <span className="pill pill-good">Fertig</span> : `${Math.min(r.currentIndex, open.total)}/${open.total}`}</span>
                <span>{r.errors}</span><span>{r.peeks}</span><span>{r.durationMs ? `${Math.round(r.durationMs / 60000)} min` : "–"}</span>
              </div>
            ))}
          </div>
          <span className="eyebrow">Häufigste Fehler</span>
          <div className="row wrap">{topErrors(open.rows, 10).map((e) => <span key={e.word} className="pill pill-bad">{e.word} · {e.count}</span>)}{!topErrors(open.rows).length ? <span className="small muted">Keine Fehler.</span> : null}</div>
        </section>
      ) : null}
      <div className="list">
        {list.length ? list.map((r) => (
          <div key={r.id} className="content-row">
            <span className="stack" style={{ ["--gap" as string]: "2px", minWidth: 0 }}><span className="truncate" style={{ fontWeight: 700 }}>{r.title}</span><span className="small muted">{r.rows.filter((x) => x.finished).length}/{r.rows.length} fertig · {topErrors(r.rows, 1)[0]?.word ?? "keine Fehler"}</span></span>
            <span className="pill desktop-only">{r.mode}</span>
            <span className="small muted desktop-only">{new Date(r.date).toLocaleDateString("de-DE")}</span>
            <span className="row" style={{ justifyContent: "flex-end", ["--gap" as string]: "6px" }}>
              <button type="button" className="icon-btn square" style={{ width: 34, height: 34 }} aria-label="Ergebnis löschen" onClick={() => { if (confirm("Ergebnis löschen?")) setResults((p) => p.filter((x) => x.id !== r.id)); }}><Icon name="trash" size={15} /></button>
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => setOpenId(r.id)}>Ansehen</button>
            </span>
          </div>
        )) : <p className="empty" style={{ border: 0 }}>Noch keine abgeschlossenen Sitzungen für {active.label}.</p>}
      </div>
    </main>
  );
}
