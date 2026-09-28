"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LearningDirection } from "@/src/domain/learning-bundle";
import { applyReview, newLearningProgress, visibleBox, type ReviewMode, type ReviewOutcome } from "@/src/domain/leitner";
import { parseVocabularyPairs } from "@/src/domain/dictation";
import { writeValue } from "@/src/storage/local-store";
import { KEYS, randomId, recordActivity, type Deck, type VocabItem } from "@/src/storage/personal";
import { boxCounts, dueItems } from "@/src/storage/selectors";
import { Icon } from "../components/icons";
import { LearnTabs } from "../components/learn-tabs";
import { ThemeToggle } from "../components/theme-toggle";
import { usePersonal } from "../hooks/use-personal";
import { speak } from "../lib/speak";

export const BOX_COLORS = ["#c7674a", "#d58a3f", "#e0a83a", "#7fa25a", "#2f6b4f"];

type Phase = "ask" | "right" | "wrong" | "reveal";
interface Card { deckId: string; item: VocabItem }
interface Session { title: string; queue: Card[]; index: number; total: number; risen: string[]; correct: number; wrong: number }

const norm = (v: string) => v.trim().toLowerCase().replace(/\s+/g, " ").normalize("NFC");

function BoxBar({ counts, height = 7 }: { counts: number[]; height?: number }) {
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  return (
    <span style={{ display: "flex", gap: 2, width: "100%", height, borderRadius: 999, overflow: "hidden" }} aria-label={`Boxen: ${counts.join(", ")}`}>
      {counts.map((n, i) => n ? <span key={i} style={{ flex: n / total, background: BOX_COLORS[i] }} /> : null)}
    </span>
  );
}

/** LernBox (Design 4a–4c): Stapel mit fünf Boxen, Schreiben oder mündlich, beide Richtungen. */
export function LernBoxClient() {
  const { decks, setDecks } = usePersonal();
  const params = useSearchParams();
  const [deckId, setDeckId] = useState("pp");
  const [mode, setMode] = useState<ReviewMode>("writing");
  const [dir, setDir] = useState<LearningDirection>("prompt-to-answer");
  const [session, setSession] = useState<Session | null>(null);
  const [phase, setPhase] = useState<Phase>("ask");
  const [input, setInput] = useState("");
  const [panel, setPanel] = useState(true);
  const [newDeck, setNewDeck] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const now = useMemo(() => new Date(), [session?.index, decks]); // eslint-disable-line react-hooks/exhaustive-deps

  const deck = decks.find((d) => d.id === deckId) ?? decks[0];
  const allDue = decks.reduce((n, d) => n + dueItems(d, mode, dir, now).length, 0);
  const errorCount = decks.reduce((n, d) => n + d.errorIds.length, 0);

  const start = (cards: Card[], title: string) => {
    setSession({ title, queue: cards, index: 0, total: cards.length, risen: [], correct: 0, wrong: 0 });
    setPhase("ask");
    setInput("");
  };
  const startDeck = (d: Deck, all = false) => start((all ? d.items : dueItems(d, mode, dir, now)).map((item) => ({ deckId: d.id, item })), d.title);
  const startAllDue = () => start(decks.flatMap((d) => dueItems(d, mode, dir, now).map((item) => ({ deckId: d.id, item }))), "Alle fälligen");
  const startErrors = () => start(decks.flatMap((d) => d.errorIds.map((id) => d.items.find((i) => i.id === id)).filter(Boolean).map((item) => ({ deckId: d.id, item: item! }))), "Meine Fehler");

  // „Nur diese üben" (Dashboard) startet direkt die Fehlerrunde – einmalig, sobald die Stapel geladen sind.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current || !params?.get("fehler") || !decks.length) return;
    autoStarted.current = true;
    startErrors();
  }, [params, decks.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const card = session && session.index < session.queue.length ? session.queue[session.index] : null;
  const cardDeck = card ? decks.find((d) => d.id === card.deckId) : undefined;
  const question = card ? (dir === "prompt-to-answer" ? card.item.prompt : card.item.answer) : "";
  const answer = card ? (dir === "prompt-to-answer" ? card.item.answer : card.item.prompt) : "";
  const alternatives = card && dir === "prompt-to-answer" ? card.item.alternatives ?? [] : [];
  const answerLang = cardDeck ? (dir === "prompt-to-answer" ? cardDeck.answerLang : cardDeck.promptLang) : "en-GB";
  const answerLabel = cardDeck ? (dir === "prompt-to-answer" ? cardDeck.answerLabel : cardDeck.promptLabel) : "";
  const progress = card && cardDeck ? cardDeck.progress[card.item.id] ?? newLearningProgress(card.item.id, now) : null;

  const choiceRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (phase === "ask") inputRef.current?.focus(); else if (phase !== "right") choiceRef.current?.focus(); }, [phase, session?.index]);

  const commit = (outcome: ReviewOutcome) => {
    if (!card || !session) return;
    const risen = session.risen.includes(card.item.id);
    const nowTs = new Date();
    setDecks((prev) => prev.map((d) => {
      if (d.id !== card.deckId) return d;
      const p = d.progress[card.item.id] ?? newLearningProgress(card.item.id, nowTs);
      return {
        ...d,
        progress: { ...d.progress, [card.item.id]: applyReview(p, dir, mode, outcome, nowTs, risen) },
        errorIds: outcome === "correct" ? d.errorIds.filter((id) => id !== card.item.id) : d.errorIds,
      };
    }));
    recordActivity({ cards: 1, points: outcome === "correct" ? 5 : 2 });
    const ok = outcome === "correct";
    setSession({
      ...session,
      // Falsche Karten kommen am Ende der Runde noch einmal (kurzfristige Wiederholung).
      queue: ok ? session.queue : [...session.queue, card],
      index: session.index + 1,
      risen: ok && !risen ? [...session.risen, card.item.id] : session.risen,
      correct: session.correct + (ok ? 1 : 0),
      wrong: session.wrong + (ok ? 0 : 1),
    });
    setPhase("ask");
    setInput("");
  };

  const check = () => {
    if (phase === "right") return commit("correct");
    if (!input.trim()) return;
    const ok = [answer, ...alternatives].some((a) => norm(a) === norm(input));
    setPhase(ok ? "right" : "wrong");
    if (ok) speak(answer, answerLang);
  };

  const saveDeck = (title: string, text: string) => {
    const items = parseVocabularyPairs(text).map((w, i) => ({ id: `${randomId()}-${i}`, prompt: w.prompt ?? "", answer: w.targetWord, alternatives: w.acceptedAnswers }));
    if (!title.trim() || !items.length) return false;
    const now2 = new Date();
    const d: Deck = { id: randomId(), title: title.trim(), sub: "eigener Stapel", promptLabel: "Deutsch", answerLabel: "Fremdsprache", promptLang: "de-DE", answerLang: "en-GB", items, progress: Object.fromEntries(items.map((it) => [it.id, newLearningProgress(it.id, now2)])), errorIds: [] };
    writeValue<Deck[]>("personal", KEYS.decks, (prev) => [...(prev ?? []), d], []);
    setDeckId(d.id);
    setNewDeck(false);
    return true;
  };

  const deckList = (compact: boolean) => (
    <div className="stack" style={{ ["--gap" as string]: "8px" }}>
      {decks.map((d) => {
        const due = dueItems(d, mode, dir, now).length;
        return (
          <button key={d.id} type="button" className="select-card" aria-pressed={d.id === deck?.id} onClick={() => { setDeckId(d.id); if (!compact) startDeck(d); }} style={{ gap: 9 }}>
            <span className="between" style={{ width: "100%", alignItems: "flex-start" }}>
              <span className="stack grow" style={{ ["--gap" as string]: "2px" }}><span style={{ fontSize: 14.5, fontWeight: 700 }}>{d.title}</span><span className="tiny muted">{compact ? `${d.sub} · ` : ""}{d.items.length} Karten</span></span>
              <span className={`pill ${due ? "pill-accent" : "pill-good"}`}>{due ? `${due} fällig` : "erledigt"}</span>
            </span>
            <BoxBar counts={boxCounts(d, mode, dir)} height={compact ? 7 : 6} />
          </button>
        );
      })}
    </div>
  );

  const modeControls = (
    <>
      <div className="seg" role="group" aria-label="Modus">
        <button type="button" aria-pressed={mode === "writing"} onClick={() => setMode("writing")}>Schreiben</button>
        <button type="button" aria-pressed={mode === "oral"} onClick={() => setMode("oral")}>Mündlich</button>
      </div>
      <div className="seg" role="group" aria-label="Richtung">
        <button type="button" aria-pressed={dir === "prompt-to-answer"} onClick={() => setDir("prompt-to-answer")}>{deck ? `${deck.promptLabel.slice(0, 2).toUpperCase()} → ${deck.answerLabel.slice(0, 2).toUpperCase()}` : "DE → EN"}</button>
        <button type="button" aria-pressed={dir === "answer-to-prompt"} onClick={() => setDir("answer-to-prompt")}>{deck ? `${deck.answerLabel.slice(0, 2).toUpperCase()} → ${deck.promptLabel.slice(0, 2).toUpperCase()}` : "EN → DE"}</button>
      </div>
    </>
  );

  /* ---------- Übungsfläche ---------- */
  const practice = session ? (
    <div className="stack lb-practice" style={{ ["--gap" as string]: "12px" }}>
      <div className="topbar">
        <button type="button" className="icon-btn square" aria-label="Runde beenden" onClick={() => setSession(null)}><Icon name="back" size={18} strokeWidth={2.4} /></button>
        <span className="stack grow" style={{ ["--gap" as string]: "0" }}>
          <span className="truncate" style={{ fontSize: 15, fontWeight: 700 }}>{session.title}</span>
          <span className="tiny muted">{card ? `${session.queue.length - session.index} übrig · ${mode === "writing" ? "Schreiben" : "Mündlich"}` : "Runde geschafft"}</span>
        </span>
        <ThemeToggle />
      </div>
      <div className="bar" style={{ height: 6 }}><span style={{ width: `${Math.round((Math.min(session.index, session.queue.length) / Math.max(1, session.queue.length)) * 100)}%` }} /></div>

      {card && progress ? (
        <>
          <div className="card lb-card">
            <div className="between">
              <span className="eyebrow" style={{ fontSize: 11.5 }}>Auf {answerLabel}</span>
              <span className="pill">Box {visibleBox(progress, dir, mode)}</span>
            </div>
            <p className="lb-question">{question}</p>
            {mode === "oral" && phase === "reveal" ? <p className="center" style={{ fontSize: 24, fontWeight: 700, color: "var(--accent)" }}>{answer}</p> : null}
          </div>

          {mode === "writing" ? (
            <>
              {phase === "ask" || phase === "right" ? (
                <form className="lb-answer" onSubmit={(e) => { e.preventDefault(); check(); }}>
                  <input ref={inputRef} className={`field center ${phase === "right" ? "ok" : ""}`} value={input} onChange={(e) => setInput(e.target.value)} readOnly={phase === "right"} placeholder="Antwort tippen" autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} enterKeyHint="done" aria-label="Antwort" lang={answerLang} />
                  {phase === "ask" ? <button type="submit" className="btn btn-primary">Prüfen<span className="kbd-hint desktop-only">↵</span></button> : null}
                </form>
              ) : null}
              {phase === "right" ? (
                <div className="lb-feedback feedback-good">
                  <Icon name="check" size={22} strokeWidth={2.4} /><span className="grow">Richtig — rauf in die nächste Box</span>
                  <button type="button" className="btn btn-green" onClick={() => commit("correct")}>Weiter<span className="kbd-hint desktop-only">↵</span></button>
                </div>
              ) : null}
              {phase === "wrong" ? (
                <div className="stack">
                  <div className="feedback-bad">
                    <span className="label">Richtig wäre</span>
                    <span className="row" style={{ fontSize: 22, fontWeight: 800 }}>{answer}<button type="button" className="icon-btn" style={{ width: 32, height: 32 }} aria-label="Anhören" onClick={() => speak(answer, answerLang)}><Icon name="speaker" size={16} /></button></span>
                    <span className="small muted">Du: {input} · Wusstest du es trotzdem?</span>
                  </div>
                  <div className="grid2">
                    <button type="button" className="btn btn-ghost" onClick={() => commit("wrong")}>Nein, zurück in Box 1</button>
                    <button ref={choiceRef} type="button" className="btn btn-primary" onClick={() => commit("misspelled")}>Ja, Box bleibt</button>
                  </div>
                </div>
              ) : null}
            </>
          ) : phase === "reveal" ? (
            <div className="grid2">
              <button type="button" className="btn btn-ghost" onClick={() => commit("wrong")}>Nicht gewusst</button>
              <button ref={choiceRef} type="button" className="btn btn-green" onClick={() => commit("correct")}>Gewusst</button>
            </div>
          ) : (
            <button type="button" className="btn btn-primary btn-lg" onClick={() => { setPhase("reveal"); speak(answer, answerLang); }}>Karte umdrehen</button>
          )}
        </>
      ) : (
        <div className="card card-pad stack center" style={{ alignItems: "center", paddingBlock: 30 }}>
          <span style={{ fontSize: 30, letterSpacing: 4, color: "var(--gold)" }}>{session.wrong === 0 ? "★★★" : session.wrong <= 2 ? "★★☆" : "★☆☆"}</span>
          <p style={{ fontSize: 22, fontWeight: 700 }}>{session.total ? "Runde geschafft" : "Gerade nichts fällig"}</p>
          <p className="small muted">{session.total ? `${session.correct} richtig · ${session.wrong} zum Wiederholen` : "Alle Karten sitzen. Du kannst den Stapel trotzdem üben."}</p>
          <div className="row wrap" style={{ justifyContent: "center" }}>
            {deck ? <button type="button" className="btn btn-ghost" onClick={() => startDeck(deck, true)}>Ganzen Stapel üben</button> : null}
            <button type="button" className="btn btn-primary" onClick={() => setSession(null)}>Zurück</button>
          </div>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className={`lb ${panel ? "" : "lb-collapsed"} ${session ? "lb-in-session" : ""}`}>
      {/* Übersicht (mobil) bzw. Seitenleiste (Desktop) */}
      <aside className="lb-panel stack">
        <div className="between">
          <h1 className="h-page">Lernen</h1>
          <div className="row">
            <span className="mobile-only"><ThemeToggle /></span>
            <button type="button" className="icon-btn desktop-only" style={{ border: 0 }} aria-label="Leiste einklappen" onClick={() => setPanel(false)}><Icon name="panelClose" size={20} /></button>
          </div>
        </div>
        <LearnTabs active="vokabeln" />

        <div className="card-dark stack mobile-only" style={{ padding: 16 }}>
          <div className="between baseline">
            <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-.03em" }}>{allDue} <span style={{ fontSize: 15, fontWeight: 600 }} className="muted">Karten fällig</span></span>
            <span style={{ fontSize: 12.5, color: "var(--nav-accent)", fontWeight: 700 }}>Streak hält ab 6</span>
          </div>
          <div className="seg dark" role="group" aria-label="Modus">
            <button type="button" aria-pressed={mode === "writing"} onClick={() => setMode("writing")}>Schreiben</button>
            <button type="button" aria-pressed={mode === "oral"} onClick={() => setMode("oral")}>Mündlich</button>
          </div>
          <button type="button" className="btn btn-gold" onClick={startAllDue}>Alle fälligen lernen</button>
        </div>

        <div className="stack" style={{ ["--gap" as string]: "9px" }}>
          <div className="between baseline">
            <span className="label">Stapel</span>
            <button type="button" className="btn-link" onClick={() => setNewDeck(true)}>+ Neuer Stapel</button>
          </div>
          {deckList(true)}
          <div className="between tiny faint" style={{ fontWeight: 600, padding: "0 2px" }}><span>Box 1 · neu</span><span>Box 5 · sitzt</span></div>
        </div>

        <div className="stack desktop-only" style={{ ["--gap" as string]: "8px", display: "flex" }}>
          <span className="label">Modus</span>
          {modeControls}
          {deck ? <button type="button" className="btn btn-primary btn-sm" onClick={() => startDeck(deck)}>„{deck.title}“ lernen</button> : null}
        </div>

        <button type="button" className="btn btn-ghost" style={{ justifyContent: "space-between", marginTop: "auto", whiteSpace: "normal", textAlign: "left" }} onClick={startErrors} disabled={!errorCount}>
          <span>Meine Fehler jetzt üben</span><span className="pill pill-bad">{errorCount} {errorCount === 1 ? "Fehler" : "Fehler"}</span>
        </button>
        <Link href="/tastenwelt" className="select-card mobile-only" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><Icon name="keyboard" size={20} /><strong className="grow">Tastenwelt</strong><Icon name="forward" size={18} /></Link>
      </aside>

      <main className="lb-main">
        {!panel ? <button type="button" className="icon-btn desktop-only" style={{ border: 0, marginBottom: 8 }} aria-label="Stapel und Modus ausklappen" onClick={() => setPanel(true)}><Icon name="panelOpen" size={20} /></button> : null}
        {practice ?? (
          <div className="stack desktop-only" style={{ display: "flex", margin: "auto", maxWidth: 520, alignItems: "center", textAlign: "center" }}>
            <div className="between" style={{ width: "100%" }}><span /><ThemeToggle /></div>
            <p className="h-page">{deck?.title}</p>
            <p className="muted">{deck ? `${dueItems(deck, mode, dir, now).length} von ${deck.items.length} Karten fällig` : ""}</p>
            {deck ? <div style={{ width: "100%" }}><BoxBar counts={boxCounts(deck, mode, dir)} height={10} /></div> : null}
            <div className="row">
              <button type="button" className="btn btn-primary btn-lg" onClick={() => deck && startDeck(deck)}>Fällige lernen</button>
              <button type="button" className="btn btn-ghost btn-lg" onClick={startAllDue}>Alle Stapel ({allDue})</button>
            </div>
          </div>
        )}
      </main>

      {newDeck ? <NewDeckSheet onClose={() => setNewDeck(false)} onSave={saveDeck} /> : null}
    </div>
  );
}

function NewDeckSheet({ onClose, onSave }: { onClose: () => void; onSave: (title: string, text: string) => boolean }) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  return (
    <>
      <button type="button" className="scrim" aria-label="Schließen" onClick={onClose} />
      <div className="sheet stack" role="dialog" aria-modal="true" aria-labelledby="nd-title">
        <span className="grip" />
        <div className="between"><h2 id="nd-title" style={{ fontSize: 20, fontWeight: 700 }}>Neuer Stapel</h2><button type="button" className="icon-btn square" aria-label="Schließen" onClick={onClose}><Icon name="close" size={16} /></button></div>
        <label className="stack" style={{ ["--gap" as string]: "6px" }}><span className="label">Name</span><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Unit 4" /></label>
        <label className="stack" style={{ ["--gap" as string]: "6px" }}><span className="label">Paare · eine Zeile je Vokabel, getrennt mit ; oder Tab</span><textarea className="textarea" rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder={"schon; already\nnoch nicht; not yet\nHaus; house/home"} /></label>
        {err ? <p className="notice bad">{err}</p> : null}
        <button type="button" className="btn btn-primary btn-lg" onClick={() => { if (!onSave(title, text)) setErr("Bitte einen Namen und mindestens ein Paar eingeben."); }}>Stapel anlegen</button>
      </div>
    </>
  );
}
