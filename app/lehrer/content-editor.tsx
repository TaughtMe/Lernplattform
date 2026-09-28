"use client";

import { useState } from "react";
import { generateMath, parseVocabularyPairs, sectionsToWords, splitSections, type MathOp, type SplitMode } from "@/src/domain/dictation";
import type { Content, ContentKind } from "@/src/storage/teacher";
import { randomId } from "@/src/storage/personal";

const LANGS: [string, string][] = [["en-GB", "Englisch"], ["fr-FR", "Französisch"], ["es-ES", "Spanisch"], ["la", "Latein"], ["de-DE", "Deutsch"]];

/** Inhalt anlegen oder bearbeiten: Text (in Abschnitte zerlegt), Mathe-Generator, Vokabelpaare. */
export function ContentEditor({ kind, classId, initial, onSave, onCancel }: { kind: ContentKind; classId: string; initial?: Content; onSave: (c: Content) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [source, setSource] = useState(initial?.source ?? "");
  const [split, setSplit] = useState<SplitMode>(initial?.split ?? (kind === "vocabulary" ? "zeile" : "satz"));
  const [ops, setOps] = useState<MathOp[]>(["+", "-"]);
  const [max, setMax] = useState(20);
  const [count, setCount] = useState(10);
  const [lang, setLang] = useState(initial?.words.find((w) => w.answerLang)?.answerLang ?? "en-GB");
  const [mathWords, setMathWords] = useState(kind === "math" ? initial?.words ?? generateMath(["+", "-"], 20, 10) : []);
  const [err, setErr] = useState("");

  const words = kind === "text" ? sectionsToWords(splitSections(source, split))
    : kind === "vocabulary" ? parseVocabularyPairs(source, "de-DE", lang)
      : mathWords;

  const save = () => {
    if (!title.trim()) return setErr("Bitte einen Titel eingeben.");
    if (!words.length) return setErr(kind === "vocabulary" ? "Bitte mindestens ein Paar eintragen (deutsch ; fremdsprachig)." : "Bitte Inhalt eingeben.");
    onSave({ id: initial?.id ?? randomId(), classId, kind, title: title.trim(), source, split, words, createdAt: initial?.createdAt ?? new Date().toISOString(), usedAt: initial?.usedAt });
  };

  return (
    <div className="card card-pad stack">
      <label className="stack" style={{ ["--gap" as string]: "6px" }}><span className="label">Titel</span><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === "math" ? "z. B. Einmaleins bis 100" : kind === "vocabulary" ? "z. B. Unit 4 · Food" : "z. B. Im Wald"} /></label>

      {kind === "text" ? (
        <>
          <label className="stack" style={{ ["--gap" as string]: "6px" }}><span className="label">Text einfügen oder tippen</span><textarea className="textarea" rows={6} value={source} onChange={(e) => setSource(e.target.value)} placeholder="Der Hund bellt laut im Hof. Die Katze schläft auf dem Sofa." /></label>
          <div className="row wrap" style={{ ["--gap" as string]: "6px" }}>
            <span className="label" style={{ marginRight: 4 }}>Teilen nach</span>
            {(["satz", "zeile", "wort"] as const).map((s) => <button key={s} type="button" className="chip" aria-pressed={split === s} onClick={() => setSplit(s)}>{s[0].toUpperCase() + s.slice(1)}</button>)}
            <label className="btn btn-ghost btn-xs" style={{ marginLeft: "auto", borderStyle: "dashed", color: "var(--accent)" }}>
              Datei importieren
              <input type="file" accept=".txt,text/plain" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) setSource(await f.text()); e.target.value = ""; }} />
            </label>
          </div>
        </>
      ) : null}

      {kind === "vocabulary" ? (
        <>
          <label className="stack" style={{ ["--gap" as string]: "6px" }}><span className="label">Paare · eine Zeile je Vokabel: deutsch ; fremdsprachig (Alternativen mit /)</span><textarea className="textarea" rows={7} value={source} onChange={(e) => setSource(e.target.value)} placeholder={"schon, bereits; already\nnoch nicht; not yet\nHaus; house/home"} /></label>
          <label className="row"><span className="label">Sprache</span><select className="input" style={{ width: "auto" }} value={lang} onChange={(e) => setLang(e.target.value)}>{LANGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        </>
      ) : null}

      {kind === "math" ? (
        <>
          <div className="row wrap" style={{ ["--gap" as string]: "6px" }}>
            <span className="label" style={{ marginRight: 4 }}>Rechenarten</span>
            {(["+", "-", "·", ":"] as MathOp[]).map((o) => <button key={o} type="button" className="chip" style={{ minWidth: 44, fontSize: 16 }} aria-pressed={ops.includes(o)} onClick={() => setOps((p) => (p.includes(o) ? p.filter((x) => x !== o) : [...p, o]))}>{o === "-" ? "−" : o}</button>)}
          </div>
          <div className="row wrap">
            <label className="row"><span className="label">Zahlenraum bis</span><input className="input" style={{ width: 90 }} type="number" min={5} max={1000} value={max} onChange={(e) => setMax(Math.max(5, Math.min(1000, Number(e.target.value) || 20)))} /></label>
            <label className="row"><span className="label">Aufgaben</span><input className="input" style={{ width: 80 }} type="number" min={1} max={60} value={count} onChange={(e) => setCount(Math.max(1, Math.min(60, Number(e.target.value) || 10)))} /></label>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMathWords(generateMath(ops, max, count))}>Neu erzeugen</button>
          </div>
        </>
      ) : null}

      <div className="stack" style={{ ["--gap" as string]: "8px" }}>
        <div className="between baseline"><span className="label">{words.length} {kind === "math" ? "Aufgaben" : kind === "vocabulary" ? "Vokabeln" : "Abschnitte"} · so sehen es die Schüler</span></div>
        <div className="list" style={{ maxHeight: 260, overflow: "auto" }}>
          {words.length ? words.map((w, i) => (
            <div key={w.id} className="row" style={{ padding: "10px 13px" }}>
              <span style={{ display: "grid", placeItems: "center", width: 26, height: 26, flex: "none", borderRadius: 8, background: "var(--surface2)", color: "var(--ink2)", fontSize: 12, fontWeight: 800 }}>{i + 1}</span>
              <span className="grow" style={{ fontSize: 14, fontWeight: 600 }}>{w.prompt ? <>{w.prompt} <span className="muted">→ {w.targetWord}</span></> : w.targetWord}</span>
            </div>
          )) : <p className="empty" style={{ border: 0 }}>Noch leer.</p>}
        </div>
      </div>
      {err ? <p className="notice bad" role="alert">{err}</p> : null}
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Abbrechen</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={save}>Ablegen</button>
      </div>
    </div>
  );
}
