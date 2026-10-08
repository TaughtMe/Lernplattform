"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { layoutText } from "../../src/domain/text-compare";
import {
  buildBlankingPlan,
  finishMemorize,
  memorizeSeconds,
  nextRound,
  runFromSession,
  sessionFromRun,
  startRun,
  submitRound,
  type TextboxRunState,
} from "../../src/domain/textbox-session";
import type { TextboxText } from "../../src/domain/textbox-text";
import { CompletionScreen } from "../views/textbox/completion-screen";
import { FreeWritingScreen } from "../views/textbox/free-writing-screen";
import { GapWritingScreen } from "../views/textbox/gap-writing-screen";
import {
  LibraryScreen,
  type LibraryEntry,
} from "../views/textbox/library-screen";
import { MemorizeScreen } from "../views/textbox/memorize-screen";
import { TextDetailScreen } from "../views/textbox/text-detail-screen";
import { ReviewScreen } from "../views/textbox/review-screen";
import { EmptyState, Notice } from "../ui/primitives";
import { useTextbox, type TextboxRepository } from "./use-textbox";

type Run = {
  text: TextboxText;
  state: TextboxRunState;
  startedAt: string;
  /** Beginn der aktuellen Merkphase (Millisekunden). */
  memorizeStartedAt: number;
  /** Bestwert vor dieser Einheit, für „Neuer Bestwert!“. */
  previousBest: number | undefined;
};

const SAVE_ISSUE =
  "Die Übung konnte auf diesem Gerät nicht gespeichert werden. Du kannst trotzdem weiterüben.";

/**
 * Steuert die Textbox: Bibliothek, vier Durchgänge mit Merken, Schreiben und
 * Kontrolle sowie das Speichern. Die Ansichten bekommen nur Props.
 */
export function TextboxApp({ repository }: { repository?: TextboxRepository }) {
  const store = useTextbox(repository);
  const { refresh, saveRound, complete, discard } = store;
  const [run, setRunState] = useState<Run | null>(null);
  const runRef = useRef<Run | null>(null);
  const completing = useRef(false);
  const [pendingId, setPendingId] = useState<string>();
  const [detailId, setDetailId] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [tick, setTick] = useState(0);

  function setRun(next: Run | null) {
    runRef.current = next;
    setRunState(next);
  }

  const textId = run?.text.id;
  const phase = run?.state.phase;
  const tokens = useMemo(
    () => (run ? layoutText(run.text.text) : []),
    [run?.text.id], // eslint-disable-line react-hooks/exhaustive-deps -- der Text ändert sich nur mit der Id
  );
  const plan = useMemo(
    () =>
      run
        ? buildBlankingPlan(run.text, run.state.seed, run.state.extraTargets)
        : undefined,
    [run?.text.id, run?.state.seed, run?.state.extraTargets], // eslint-disable-line react-hooks/exhaustive-deps -- nur diese Werte bestimmen den Plan
  );

  const totalSeconds = run ? memorizeSeconds(run.text.difficulty) : 0;

  function endMemorize(ms: number) {
    const current = runRef.current;
    if (!current || current.state.phase !== "memorize") return;
    setRun({ ...current, state: finishMemorize(current.state, ms) });
  }

  // Der Takt läuft nur in der Merkphase; nach Ablauf geht es von selbst weiter.
  useEffect(() => {
    if (phase !== "memorize") return;
    const timer = window.setInterval(() => {
      const current = runRef.current;
      if (!current || current.state.phase !== "memorize") return;
      const limit = memorizeSeconds(current.text.difficulty) * 1000;
      const elapsed = Date.now() - current.memorizeStartedAt;
      if (elapsed >= limit) endMemorize(limit);
      else setTick(Date.now());
    }, 250);
    return () => window.clearInterval(timer);
  }, [phase, textId, run?.state.round]); // eslint-disable-line react-hooks/exhaustive-deps -- endMemorize liest nur den Ref

  // Fokus auf die Überschrift, wenn sich die Ansicht ändert (außer beim Schreiben).
  useEffect(() => {
    if (phase === "write") return;
    document.getElementById("textbox-title")?.focus({ preventScroll: true });
  }, [phase, textId, run?.state.round, store.status]);

  function begin(
    text: TextboxText,
    resumeFrom?: Parameters<typeof runFromSession>[0],
  ) {
    setPendingId(undefined);
    setNotice(undefined);
    completing.current = false;
    setRun({
      text,
      state: resumeFrom
        ? runFromSession(resumeFrom)
        : startRun(text, crypto.randomUUID()),
      startedAt: resumeFrom?.startedAt ?? new Date().toISOString(),
      memorizeStartedAt: Date.now(),
      previousBest: store.summaries.get(text.id)?.bestPercent,
    });
  }

  function onStart(id: string) {
    const text = store.texts.find((entry) => entry.id === id);
    if (!text) return;
    if (store.open.has(id)) setPendingId(id);
    else begin(text);
  }

  function onResume(id: string) {
    const text = store.texts.find((entry) => entry.id === id);
    const open = store.open.get(id);
    if (text && open) begin(text, open);
  }

  async function onRestart(id: string) {
    const text = store.texts.find((entry) => entry.id === id);
    const open = store.open.get(id);
    if (!text) return;
    try {
      if (open) await discard(open.id);
      await refresh();
    } catch {
      setNotice(SAVE_ISSUE);
    }
    begin(text);
  }

  async function afterRound(current: Run, next: TextboxRunState) {
    const updated = { ...current, state: next };
    setRun(updated);
    try {
      await saveRound(
        sessionFromRun(next, current.text, {
          startedAt: current.startedAt,
          now: new Date().toISOString(),
        }),
      );
    } catch {
      setNotice(SAVE_ISSUE);
    }
  }

  function onSubmitRound(inputs: string[] | string, writingMs: number) {
    const current = runRef.current;
    if (!current || current.state.phase !== "write") return;
    void afterRound(
      current,
      submitRound(current.state, current.text, inputs, writingMs),
    );
  }

  async function onNext() {
    const current = runRef.current;
    if (!current || current.state.phase !== "review" || completing.current) {
      return;
    }
    const next = nextRound(current.state);
    if (next.phase !== "complete") {
      setRun({ ...current, state: next, memorizeStartedAt: Date.now() });
      return;
    }
    completing.current = true;
    try {
      await complete(
        sessionFromRun(next, current.text, {
          startedAt: current.startedAt,
          now: new Date().toISOString(),
        }),
      );
      setRun({ ...current, state: next });
      await refresh();
    } catch {
      completing.current = false;
      setNotice(
        "Das Ergebnis konnte nicht gespeichert werden. Bitte versuche es noch einmal.",
      );
    }
  }

  function showDetails(id: string) {
    setRun(null);
    setPendingId(undefined);
    setDetailId(id);
  }

  function practiceFromDetails(id: string) {
    setDetailId(undefined);
    onStart(id);
  }

  function backToLibrary() {
    setRun(null);
    setDetailId(undefined);
    setNotice(undefined);
    void refresh();
  }

  if (!run) {
    if (store.status === "loading") {
      return <p role="status">Texte werden geladen …</p>;
    }
    if (store.status === "unavailable") {
      return (
        <EmptyState title="Die Textbox ist gerade nicht verfügbar">
          Dein Gerät lässt das Speichern nicht zu. Lade die Seite neu oder
          probiere einen anderen Browser.
        </EmptyState>
      );
    }
    const detailText = store.texts.find((entry) => entry.id === detailId);
    if (detailText) {
      return (
        <TextDetailScreen
          text={detailText}
          summary={store.summaries.get(detailText.id)}
          onPractice={() => practiceFromDetails(detailText.id)}
          onBack={backToLibrary}
        />
      );
    }
    const entries: LibraryEntry[] = store.texts.map((text) => ({
      text,
      summary: store.summaries.get(text.id),
      open: store.open.get(text.id),
    }));
    return (
      <LibraryScreen
        entries={entries}
        pending={entries.find((entry) => entry.text.id === pendingId)}
        notice={notice}
        onStart={onStart}
        onResume={onResume}
        onRestart={(id) => void onRestart(id)}
        onCancelPending={() => setPendingId(undefined)}
        onDetails={showDetails}
      />
    );
  }

  const { state, text } = run;
  const banner = notice ? <Notice tone="bad">{notice}</Notice> : null;

  if (state.phase === "memorize") {
    const elapsed = Math.max(0, tick - run.memorizeStartedAt);
    return (
      <>
        {banner}
        <MemorizeScreen
          round={state.round}
          title={text.title}
          tokens={tokens}
          markedWords={state.round === 1 ? plan![0] : new Set()}
          secondsLeft={Math.max(0, totalSeconds - elapsed / 1000)}
          totalSeconds={totalSeconds}
          onReady={() => endMemorize(Date.now() - run.memorizeStartedAt)}
        />
      </>
    );
  }

  if (state.phase === "write") {
    return (
      <>
        {banner}
        {state.round === 4 ? (
          <FreeWritingScreen
            key={`${state.trainingId}-4`}
            title={text.title}
            onSubmit={onSubmitRound}
          />
        ) : (
          <GapWritingScreen
            key={`${state.trainingId}-${state.round}`}
            round={state.round}
            title={text.title}
            tokens={tokens}
            blanked={[...plan![state.round - 1]!].sort((a, b) => a - b)}
            onSubmit={onSubmitRound}
          />
        )}
      </>
    );
  }

  if (state.phase === "review") {
    return (
      <>
        {banner}
        <ReviewScreen
          title={text.title}
          tokens={tokens}
          result={state.rounds[state.rounds.length - 1]!}
          onNext={() => void onNext()}
        />
      </>
    );
  }

  return (
    <>
      {banner}
      <CompletionScreen
        title={text.title}
        rounds={state.rounds}
        finalPercent={state.rounds[3]?.score.percent ?? 0}
        previousBest={run.previousBest}
        onAgain={() => begin(text)}
        onLibrary={backToLibrary}
        onHistory={() => showDetails(text.id)}
      />
    </>
  );
}
