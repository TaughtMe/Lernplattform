"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { applyWordReview } from "@/src/domain/leitner";
import { SPELLING_SETS, spellingSetFor, type SpellingSetId } from "@/src/domain/dictation";
import { randomId, recordActivity, type WordEntry, type WordSource } from "@/src/storage/personal";
import { dueWords } from "@/src/storage/selectors";
import { Icon } from "../../components/icons";
import { LearnTabs } from "../../components/learn-tabs";
import { ThemeToggle } from "../../components/theme-toggle";
import { usePersonal } from "../../hooks/use-personal";
import { speak } from "../../lib/speak";
import { BOX_COLORS } from "../lernbox-client";

type View = "sets" | "train" | "list";
type Phase = "ask" | "right" | "wrong";
interface Round { title: string; ids: string[]; index: number; risen: string[]; retry: boolean }

/** Wortspeicher (Design 4d–4f): Trainingswörter aus Laufdiktat, Test und eigenen Einträgen. */
export function WortspeicherClient() {
  const { words, setWords } = usePersonal();
  const [view, setView] = useState<View>("sets");
  const [setId, setSetId] = useState<SpellingSetId>("verl");
  const [round, setRound] = useState<Round | null>(null);
  const [phase, setPhase] = useState<Phase>("ask");
  const [input, setInput] = useState("");
  const [typed, setTyped] = useState("");
  const [tip, setTip] = useState(false);
  const [filter, setFilter] = useState<WordSource | "alle">("alle");
  const [newWord, setNewWord] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const now = useMemo(() => new Date(), [words]); // eslint-disable-line react-hooks/exhaustive-deps

  const due = dueWords(words, now);
  const current = round ? words.find((w) => w.id === round.ids[round.index]) : undefined;
  const set = SPELLING_SETS.find((s) => s.id === setId) ?? SPELLING_SETS[0];
  const inSet = (id: string) => words.filter((w) => w.set === id);

  const retryRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (phase === "ask") inputRef.current?.focus(); else if (phase === "wrong") retryRef.current?.focus(); }, [phase, round?.index]);

  const startTrain = (id: SpellingSetId | "mix") => {
    const pool = id === "mix" ? due : inSet(id).filter((w) => due.includes(w)).concat(inSet(id).filter((w) => !due.includes(w)));
    const ids = (pool.length ? pool : id === "mix" ? words : inSet(id)).slice(0, 12).map((w) => w.id);
    if (id !== "mix") setSetId(id);
    setRound({ title: id === "mix" ? "Gemischt" : SPELLING_SETS.find((s) => s.id === id)!.name, ids, index: 0, risen: [], retry: false });
    setPhase("ask"); setInput(""); setTip(false); setView("train");
  };

  const review = (w: WordEntry, outcome: "correct" | "wrong" | "helped", risen: boolean) => {
    const at = new Date();
    setWords((prev) => prev.map((x) => (x.id === w.id ? { ...x, ...applyWordReview(x, outcome, at, risen) } : x)));
    recordActivity({ cards: 1, points: outcome === "correct" ? 5 : 2 });
  };

  const check = () => {
    if (!current || !round) return;
    if (phase === "right") return next(false);
    if (!input.trim()) return;
    // Groß- und Kleinschreibung zählt im Wortspeicher.
    const ok = input.trim() === current.word;
    setTyped(input.trim());
    if (ok) {
      // Nach einer Hilfe (Tipp oder verdecktes Neuschreiben) kein Aufstieg.
      review(current, round.retry || tip ? "helped" : "correct", round.risen.includes(current.id));
      setPhase("right");
    } else {
      if (!round.retry) review(current, "wrong", false);
      setPhase("wrong");
    }
  };

  const next = (again: boolean) => {
    if (!round || !current) return;
    const ids = again ? [...round.ids, current.id] : round.ids;
    setRound({ ...round, ids, index: round.index + 1, retry: false, risen: phase === "right" ? [...round.risen, current.id] : round.risen });
    setPhase("ask"); setInput(""); setTip(false);
  };

  const addWord = () => {
    const v = newWord.trim();
    if (!v || words.some((w) => w.word === v)) { setNewWord(""); return; }
    const entry: WordEntry = { id: randomId(), word: v, set: setId ?? spellingSetFor(v), source: "eigenes Wort", pre: "", post: "", tip: "", box: 1, dueAt: new Date().toISOString(), wrongCount: 0 };
    setWords((prev) => [entry, ...prev]);
    setNewWord("");
  };

  const header = (title: string, sub: string, extra?: ReactNode) => (
    <div className="topbar">
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setView("sets"); setRound(null); }}><Icon name="back" size={16} strokeWidth={2.4} />Themen</button>
      <span className="stack grow" style={{ ["--gap" as string]: "0" }}><span className="truncate" style={{ fontSize: 17, fontWeight: 700 }}>{title}</span><span className="tiny muted">{sub}</span></span>
      {extra}
      <ThemeToggle />
    </div>
  );

  if (view === "train" && round) {
    const done = !current;
    return (
      <main className="page ws-train">
        {header(round.title, done ? "Runde geschafft" : `Wort ${Math.min(round.index + 1, round.ids.length)} von ${round.ids.length}`,
          <button type="button" className="icon-btn square" aria-label="Wortliste öffnen" onClick={() => setView("list")}><Icon name="list" size={18} /></button>)}
        <div className="bar" style={{ height: 6 }}><span style={{ width: `${Math.round((Math.min(round.index + (done ? 0 : 1), round.ids.length) / Math.max(1, round.ids.length)) * 100)}%` }} /></div>
        {done ? (
          <div className="card card-pad stack center" style={{ alignItems: "center", margin: "auto", maxWidth: 520, width: "100%", paddingBlock: 30 }}>
            <span style={{ fontSize: 30, letterSpacing: 4, color: "var(--gold)" }}>★★★</span>
            <p style={{ fontSize: 22, fontWeight: 700 }}>Alle Wörter geübt</p>
            <p className="small muted">Falsche Wörter kommen morgen wieder dran.</p>
            <button type="button" className="btn btn-primary" onClick={() => { setView("sets"); setRound(null); }}>Zurück zu den Themen</button>
          </div>
        ) : current ? (
          <div className="stack ws-stage">
            <div className="card ws-card">
              <button type="button" className="ws-speak" aria-label="Wort anhören" onClick={() => speak(current.pre || current.post ? `${current.word}. ${current.pre} ${current.word} ${current.post}` : current.word, "de-DE")}><Icon name="speaker" size={26} /></button>
              <p style={{ fontSize: 20, fontWeight: 600, textAlign: "center" }}>
                {current.pre || current.post ? <>{current.pre} <span className="ws-gap">{phase === "ask" ? " " : current.word}</span> {current.post}</> : phase === "ask" ? "Hör gut zu und schreib das Wort." : current.word}
              </p>
              {current.tip ? <button type="button" className="chip" aria-pressed={tip} onClick={() => setTip((t) => !t)} style={{ color: tip ? undefined : "var(--accent)", borderColor: "var(--accent)" }}>Tipp</button> : null}
              {tip && current.tip ? <p className="notice" style={{ textAlign: "center" }}>{current.tip}</p> : null}
            </div>
            {phase !== "wrong" ? (
              <form className="stack" style={{ ["--gap" as string]: "9px" }} onSubmit={(e) => { e.preventDefault(); check(); }}>
                <input ref={inputRef} className={`field center ${phase === "right" ? "ok" : ""}`} value={input} readOnly={phase === "right"} onChange={(e) => setInput(e.target.value)} placeholder={round.retry ? "Verdeckt neu schreiben" : "Wort schreiben"} autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} enterKeyHint="done" aria-label="Wort" lang="de" />
                {phase === "ask" ? <button type="submit" className="btn btn-primary">Prüfen<span className="kbd-hint desktop-only">↵</span></button> : null}
              </form>
            ) : null}
            {phase === "right" ? (
              <>
                <div className="feedback-good"><Icon name="check" size={22} strokeWidth={2.4} />{current.word} — richtig geschrieben</div>
                <button type="button" className="btn btn-green" onClick={() => next(false)}>Weiter</button>
              </>
            ) : null}
            {phase === "wrong" ? (
              <>
                <div className="feedback-bad" style={{ gap: 8 }}>
                  <span className="label">So schreibt man es · du: {typed}</span>
                  <span className="row wrap" style={{ ["--gap" as string]: "5px" }}>
                    {[...current.word].map((ch, i) => (
                      <span key={i} className="ws-letter" data-ok={typed[i] === ch}>{ch}</span>
                    ))}
                  </span>
                </div>
                <div className="grid2">
                  <button type="button" className="btn btn-ghost" onClick={() => next(true)}>Später nochmal</button>
                  <button ref={retryRef} type="button" className="btn btn-primary" onClick={() => { setRound({ ...round, retry: true }); setInput(""); setPhase("ask"); }}>Verdeckt neu schreiben</button>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </main>
    );
  }

  if (view === "list") {
    const list = inSet(setId).filter((w) => filter === "alle" || w.source === filter);
    return (
      <main className="page page-wide">
        {header(`${set.name} · Wortliste`, `${inSet(setId).length} Wörter in deiner Box`,
          <button type="button" className="btn btn-primary btn-sm desktop-only" onClick={() => startTrain(setId)}>Training starten</button>)}
        <form className="card row" style={{ padding: 12 }} onSubmit={(e) => { e.preventDefault(); addWord(); }}>
          <input className="input grow" value={newWord} onChange={(e) => setNewWord(e.target.value)} placeholder="Neues Wort eintragen, z. B. Zug" aria-label="Neues Wort" spellCheck={false} />
          <button type="submit" className="btn btn-green btn-sm" style={{ minHeight: 48 }}>Hinzufügen</button>
        </form>
        <div className="row wrap" role="group" aria-label="Herkunft filtern" style={{ ["--gap" as string]: "6px" }}>
          {(["alle", "Laufdiktat", "Test", "Lehrkraft", "eigenes Wort"] as const).map((f) => (
            <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === "alle" ? "Alle" : f === "eigenes Wort" ? "eigene" : `aus ${f}`}</button>
          ))}
        </div>
        <div className="list">
          {list.length ? list.map((w) => (
            <div key={w.id} className="ws-row">
              {editId === w.id ? (
                <form className="row grow" onSubmit={(e) => { e.preventDefault(); const v = editText.trim(); if (v) setWords((prev) => prev.map((x) => (x.id === w.id ? { ...x, word: v } : x))); setEditId(null); }}>
                  <input className="input grow" value={editText} onChange={(e) => setEditText(e.target.value)} aria-label="Wort bearbeiten" />
                  <button type="submit" className="btn btn-primary btn-xs">Speichern</button>
                </form>
              ) : <span style={{ fontSize: 17, fontWeight: 700 }}>{w.word}</span>}
              <span className="small muted desktop-only">{w.source}</span>
              <span className="row small" style={{ fontWeight: 700, color: "var(--ink2)", ["--gap" as string]: "7px" }}><span className="dot" style={{ width: 9, height: 9, background: BOX_COLORS[w.box - 1] }} />Box {w.box}</span>
              <span className="row" style={{ ["--gap" as string]: "6px" }}>
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => { setEditId(w.id); setEditText(w.word); }}>Bearbeiten</button>
                <button type="button" className="icon-btn square" style={{ width: 36, height: 36 }} aria-label={`${w.word} entfernen`} onClick={() => setWords((prev) => prev.filter((x) => x.id !== w.id))}><Icon name="trash" size={16} /></button>
              </span>
            </div>
          )) : <p className="empty">Noch keine Wörter in dieser Sammlung.</p>}
        </div>
        <button type="button" className="btn btn-primary mobile-only" onClick={() => startTrain(setId)}>Training starten</button>
      </main>
    );
  }

  return (
    <main className="page page-wide">
      <div className="row wrap" style={{ ["--gap" as string]: "16px" }}>
        <h1 className="h-page">Lernen</h1>
        <div style={{ flex: "1 1 240px", maxWidth: 320 }}><LearnTabs active="wortspeicher" /></div>
        <span style={{ marginLeft: "auto" }}><ThemeToggle /></span>
      </div>
      <div className="card-dark ws-hero">
        <span className="stack grow" style={{ ["--gap" as string]: "4px" }}>
          <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-.03em" }}>{due.length} <span className="muted" style={{ fontSize: 15, fontWeight: 600 }}>Trainingswörter heute</span></span>
          <span className="small muted">Aus deinen Fehlern im Laufdiktat und im Test. Du hörst das Wort und schreibst es.</span>
        </span>
        <button type="button" className="btn btn-gold" onClick={() => startTrain("mix")}>Gemischt trainieren</button>
      </div>
      <div className="between baseline">
        <span className="label">Themen · antippen startet das Training</span>
        <span className="row tiny faint desktop-only" style={{ ["--gap" as string]: "6px" }}><Icon name="list" size={14} />Wortliste ansehen und bearbeiten</span>
      </div>
      <div className="ws-grid">
        {SPELLING_SETS.map((s) => {
          const all = inSet(s.id);
          const known = all.filter((w) => w.box >= 4).length;
          return (
            <div key={s.id} style={{ position: "relative" }}>
              <button type="button" className="select-card ws-set" onClick={() => startTrain(s.id)}>
                <span className="stack" style={{ ["--gap" as string]: "2px" }}><span style={{ fontSize: 16, fontWeight: 700 }}>{s.name}</span><span className="small muted">{s.ex}</span></span>
                <span className="row" style={{ width: "100%", marginTop: "auto" }}><span className="bar green grow" style={{ height: 6 }}><span style={{ width: `${all.length ? Math.round((known / all.length) * 100) : 0}%` }} /></span><span className="tiny muted" style={{ fontWeight: 700 }}>{known} / {all.length} sicher</span></span>
              </button>
              <button type="button" className="icon-btn square ws-list-btn" aria-label={`Wortliste ${s.name} öffnen`} onClick={() => { setSetId(s.id); setView("list"); }}><Icon name="list" size={16} /></button>
            </div>
          );
        })}
      </div>
    </main>
  );
}
