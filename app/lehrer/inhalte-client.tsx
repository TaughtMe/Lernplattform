"use client";

import Link from "next/link";
import { useState } from "react";
import { seedContents, TEACHER_KEYS, type Content, type ContentKind } from "@/src/storage/teacher";
import { Icon, type IconName } from "../components/icons";
import { useStored } from "../hooks/use-stored";
import { ContentEditor } from "./content-editor";
import { TeacherShell, useTeacherClasses } from "./teacher-shell";

const KINDS: { kind: ContentKind; label: string; icon: IconName; hint: string }[] = [
  { kind: "text", label: "Text", icon: "text", hint: "Einfügen oder tippen — wird in Wörter und Sätze zerlegt" },
  { kind: "math", label: "Mathe", icon: "math", hint: "Generator für + − · : im gewählten Zahlenraum" },
  { kind: "vocabulary", label: "Vokabeln", icon: "cards", hint: "Paare mit Lernrichtung, Alternativen mit /" },
];
const KIND_LABEL: Record<ContentKind, string> = { text: "Text", math: "Mathe", vocabulary: "Vokabeln" };
const SEED = seedContents();

export function useContents() {
  return useStored<Content[]>("teacher", TEACHER_KEYS.contents, SEED);
}

/** Lehrer: Inhalte anlegen und ablegen (Design 2c/3c/3d). */
export function InhalteClient() {
  return <TeacherShell title="Inhalte"><Inhalte /></TeacherShell>;
}

function Inhalte() {
  const { active } = useTeacherClasses();
  const [contents, setContents] = useContents();
  const [kind, setKind] = useState<ContentKind>("text");
  const [editing, setEditing] = useState<Content | "new" | null>(null);
  const list = contents.filter((c) => c.classId === active.id);
  const others = contents.filter((c) => c.classId !== active.id);

  const save = (c: Content) => {
    setContents((prev) => (prev.some((x) => x.id === c.id) ? prev.map((x) => (x.id === c.id ? c : x)) : [c, ...prev]));
    setEditing(null);
  };

  return (
    <main className="page page-wide" style={{ gap: 22 }}>
      <div className="between" style={{ alignItems: "flex-end" }}>
        <div><p className="eyebrow">{active.label}</p><h1 style={{ marginTop: 5, fontSize: 29, fontWeight: 700, letterSpacing: "-.03em" }}>Inhalte</h1></div>
        <Link href="/lehrer/laufdiktat" className="btn btn-green btn-sm" style={{ minHeight: 46 }}><Icon name="play" size={16} />Raum öffnen</Link>
      </div>

      <section className="stack" style={{ ["--gap" as string]: "11px" }}>
        <span className="label">Neu anlegen</span>
        <div className="grid3">
          {KINDS.map((k) => (
            <button key={k.kind} type="button" className="select-card" aria-pressed={kind === k.kind} style={{ gap: 6, minHeight: 100 }} onClick={() => { setKind(k.kind); setEditing("new"); }}>
              <Icon name={k.icon} size={22} />
              <span style={{ fontSize: 15, fontWeight: 700 }}>{k.label}</span>
              <span className="small muted desktop-only">{k.hint}</span>
            </button>
          ))}
        </div>
        {editing ? (
          <ContentEditor key={editing === "new" ? `new-${kind}` : editing.id} kind={editing === "new" ? kind : editing.kind} classId={active.id} initial={editing === "new" ? undefined : editing} onSave={save} onCancel={() => setEditing(null)} />
        ) : null}
      </section>

      <section className="stack" style={{ ["--gap" as string]: "11px" }}>
        <div className="between baseline"><span className="label">Abgelegt · lässt sich jederzeit wieder öffnen</span><span className="small faint">{list.length} Inhalte</span></div>
        <div className="list">
          {list.length ? list.map((c) => (
            <div key={c.id} className="content-row">
              <span className="stack" style={{ ["--gap" as string]: "2px", minWidth: 0 }}>
                <span className="truncate" style={{ fontSize: 14.5, fontWeight: 700 }}>{c.title}</span>
                <span className="small muted">{c.words.length} {c.kind === "math" ? "Aufgaben" : c.kind === "vocabulary" ? "Vokabeln" : "Abschnitte"}</span>
              </span>
              <span className="pill desktop-only" style={{ justifySelf: "start" }}>{KIND_LABEL[c.kind]}</span>
              <span className="small muted desktop-only">{c.usedAt ? new Date(c.usedAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }) : "neu"}</span>
              <span className="row" style={{ justifyContent: "flex-end", ["--gap" as string]: "7px" }}>
                <button type="button" className="btn btn-ghost btn-xs desktop-only" onClick={() => setEditing(c)}>Bearbeiten</button>
                <button type="button" className="icon-btn square desktop-only" style={{ width: 34, height: 34 }} aria-label={`${c.title} löschen`} onClick={() => { if (confirm(`„${c.title}" löschen?`)) setContents((p) => p.filter((x) => x.id !== c.id)); }}><Icon name="trash" size={15} /></button>
                <Link href={`/lehrer/laufdiktat?inhalt=${encodeURIComponent(c.id)}`} className="btn btn-xs" style={{ border: "1px solid var(--green)", color: "var(--green)", background: "transparent" }}>Öffnen</Link>
              </span>
            </div>
          )) : <p className="empty" style={{ border: 0 }}>Für {active.label} ist noch nichts abgelegt.</p>}
        </div>
        {others.length ? <p className="small muted">{others.length} weitere Inhalte liegen bei anderen Klassen.</p> : null}
        <p className="small muted">Modi beim Öffnen: Laufdiktat · Freie Übung · Battle · Stationen — wie im bestehenden Laufdiktat, inklusive Hilfen und Vorlesen.</p>
      </section>
    </main>
  );
}
