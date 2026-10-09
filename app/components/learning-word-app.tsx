"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ZodError } from "zod";
import { getLearningWordCollection } from "../../src/domain/german-learning-content";
import {
  LEARNING_WORD_STAGES,
  parseLearningWords,
  type LearningWordBlockSize,
  type LearningWordStage,
} from "../../src/domain/learning-word";
import { learningWordId } from "../../src/domain/learning-word-progress";
import {
  buildTextboxLink,
  parseCollectionParam,
  parseWordsParam,
} from "../../src/domain/practice-bridge";
import type { WordBoxView } from "../../src/domain/word-box";
import {
  advanceWordRound,
  applyHelp,
  continueAfterFeedback,
  currentBlock,
  finishMemorize,
  startWordRound,
  submitWordAnswer,
  wordRoundPercent,
  type WordRoundState,
} from "../../src/domain/word-round";
import {
  headlineForBox,
  isNewBest,
  recommendedStage,
  summarizeWordBox,
  type WordRoundRecord,
} from "../../src/domain/word-store-progress";
import { useRelease } from "../release/release-context";
import { EmptyState } from "../ui/primitives";
import { StudentPage } from "../ui/shell/student-page";
import { BoxEditorScreen } from "../views/wortspeicher/box-editor-screen";
import { CompletionScreen } from "../views/wortspeicher/completion-screen";
import {
  OverviewScreen,
  type WordBoxTile,
} from "../views/wortspeicher/overview-screen";
import { RoundScreen } from "../views/wortspeicher/round-screen";
import type { RoundSize } from "../views/wortspeicher/stage-copy";
import { StartSheet } from "../views/wortspeicher/start-sheet";
import {
  TEXTBOX_BOX_TITLE,
  TextboxWordsSheet,
} from "../views/wortspeicher/textbox-words-sheet";
import { useHydrated } from "./use-hydrated";
import { useWordStore, type WordStoreRepositories } from "./use-word-store";

const SAVE_ISSUE =
  "Dein Lernstand konnte gerade nicht vollständig gespeichert werden. Du kannst trotzdem weiterüben.";
const FALLIGE_ID = "faellig";
const TEXTBOX_ID = "textbox";
/** Wie lange „Richtig“ steht, bevor es automatisch weitergeht (Plan 3.3). */
const SUCCESS_MS = 650;

type Config = {
  stage: LearningWordStage;
  roundSize: RoundSize;
  blockSize: LearningWordBlockSize;
};

type Run = {
  state: WordRoundState;
  view: WordBoxView;
  config: Config;
  startedAt: string;
};

type Completion = {
  view: WordBoxView;
  config: Config;
  stage: LearningWordStage;
  percent: number;
  results: WordRoundState["results"];
  record: "new" | "first" | undefined;
  notice?: string;
};

/** Nutzertaugliche Meldung; englische Validierungsfehler werden nicht gezeigt. */
function messageOf(error: unknown, fallback: string) {
  return error instanceof Error && !(error instanceof ZodError)
    ? error.message
    : fallback;
}

const STAGES_IN_USE = LEARNING_WORD_STAGES.filter((stage) => stage <= 5);

/**
 * Steuert den Wortspeicher: Wortboxen, Startblatt, Runden und Ergebnis. Die
 * Ansichten bekommen nur Props; der Rundenverlauf liegt im Zustandsautomaten
 * `word-round`, die Speicherung in den Repositories.
 */
export function LearningWordApp({
  repositories,
}: {
  repositories?: WordStoreRepositories;
}) {
  const store = useWordStore(repositories);
  const textboxVisible = useRelease()["textbox"];
  const searchParams = useSearchParams();
  const hydrated = useHydrated();
  const ready = hydrated && store.status === "ready";

  // Vorbelegung aus der Adresse: `?woerter=` öffnet das Blatt „Wörter aus der
  // Textbox“, `?sammlung=` das Startblatt der Wortbox. Es wird nichts gespeichert.
  const [bridgeWords] = useState(() =>
    parseWordsParam(searchParams.get("woerter")),
  );
  const [bridgeOpen, setBridgeOpen] = useState(bridgeWords.length > 0);
  const [bridgeSaved, setBridgeSaved] = useState<string>();
  const [bridgeError, setBridgeError] = useState<string>();
  const [sheetId, setSheetId] = useState<string | undefined>(() =>
    bridgeWords.length === 0
      ? parseCollectionParam(searchParams.get("sammlung"))
      : undefined,
  );
  const [config, setConfig] = useState<Config>({
    stage: 1,
    roundSize: 10,
    blockSize: 3,
  });
  const [editorId, setEditorId] = useState<string>();
  const [run, setRunState] = useState<Run | null>(null);
  const [completion, setCompletion] = useState<Completion>();
  const [notice, setNotice] = useState<string>();
  const [editorNotice, setEditorNotice] = useState<string>();
  const [newBoxError, setNewBoxError] = useState<string>();
  const runRef = useRef<Run | null>(null);
  const finished = useRef(new Set<string>());
  /** Alle laufenden Speichervorgänge der Runde; der Abschluss wartet darauf. */
  const pendingWrites = useRef<Promise<unknown>>(Promise.resolve());
  const roundsRef = useRef<WordRoundRecord[]>([]);

  useEffect(() => {
    roundsRef.current = store.rounds;
  }, [store.rounds]);

  function setRun(next: Run | null) {
    runRef.current = next;
    setRunState(next);
  }

  /** Einheitliche Sicht auf alle Wortboxen, auch die vorübergehenden. */
  function findView(id: string): WordBoxView | undefined {
    if (id === FALLIGE_ID) {
      return {
        id,
        kind: "faellig",
        title: "Trainingswörter heute",
        words: store.due.map((entry) => entry.word),
        editable: false,
      };
    }
    if (id === TEXTBOX_ID) {
      return {
        id,
        kind: "textbox",
        title: TEXTBOX_BOX_TITLE,
        words: bridgeWords,
        editable: false,
      };
    }
    return store.views.find((view) => view.id === id);
  }

  const progressByWord = useMemo(
    () => new Map(store.progress.map((entry) => [entry.id, entry])),
    [store.progress],
  );

  function lastStageOf(boxId: string): LearningWordStage | undefined {
    return store.rounds
      .filter((round) => round.boxId === boxId)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0]?.stage;
  }

  function openStart(id: string) {
    const view = findView(id);
    if (!view) return;
    // Vorauswahl: Stufe der letzten Runde, bei „Gemischt“ die leichteste fällige.
    const dueStage =
      id === FALLIGE_ID && store.due.length > 0
        ? (Math.min(
            ...store.due.map((entry) => entry.stage),
          ) as LearningWordStage)
        : undefined;
    const stage = Math.min(
      5,
      lastStageOf(id) ?? dueStage ?? 1,
    ) as LearningWordStage;
    setConfig((current) => ({ ...current, stage }));
    setNotice(undefined);
    setSheetId(id);
  }

  function begin(view: WordBoxView, chosen: Config) {
    if (view.words.length === 0) return;
    finished.current = new Set();
    setCompletion(undefined);
    setNotice(undefined);
    setSheetId(undefined);
    setRun({
      state: startWordRound({
        roundId: crypto.randomUUID(),
        boxId: view.id,
        stage: chosen.stage,
        blockSize: chosen.blockSize,
        roundSize: chosen.roundSize,
        words: view.words,
        random: Math.random,
      }),
      view,
      config: chosen,
      startedAt: new Date().toISOString(),
    });
  }

  function onStartRound() {
    const view = sheetId ? findView(sheetId) : undefined;
    if (view) begin(view, config);
  }

  function enqueue(write: () => Promise<unknown>) {
    pendingWrites.current = pendingWrites.current
      .then(write)
      .catch(() => setNotice(SAVE_ISSUE));
  }

  function onSubmit(answer: string) {
    const current = runRef.current;
    // Doppeltes Absenden: nach der ersten Antwort ist die Phase nicht mehr „recall“.
    if (!current || current.state.phase !== "recall") return;
    let result: ReturnType<typeof submitWordAnswer>;
    try {
      result = submitWordAnswer(current.state, answer);
    } catch {
      return;
    }
    setRun({ ...current, state: result.state });
    for (const attempt of result.attempts) {
      enqueue(() =>
        store.recordAttempt({
          words: attempt.words,
          correct: attempt.correct,
          usedHelp: attempt.usedHelp,
          selfCorrected: attempt.selfCorrected,
          stage: attempt.stage,
          attemptId: attempt.attemptId,
          roundId: result.state.roundId,
        }),
      );
    }
  }

  async function finish(done: Run) {
    const { state, view, config: chosen } = done;
    // Ein doppelter Abschluss darf keine zweite Runde speichern.
    if (finished.current.has(state.roundId)) return;
    finished.current.add(state.roundId);

    const percent = wordRoundPercent(state.results);
    const earlier = roundsRef.current;
    const hadBefore = earlier.some(
      (round) => round.boxId === view.id && round.stage === state.stage,
    );
    const record = !hadBefore
      ? "first"
      : isNewBest(view.id, state.stage, percent, earlier)
        ? "new"
        : undefined;
    const base: Completion = {
      view,
      config: chosen,
      stage: state.stage,
      percent,
      results: state.results,
      record,
    };
    setCompletion(base);

    await pendingWrites.current;
    try {
      await store.saveRound({
        id: state.roundId,
        boxId: view.id,
        boxTitle: view.title.slice(0, 60),
        stage: state.stage,
        ...(state.stage === 5 ? { blockSize: state.blockSize } : {}),
        startedAt: done.startedAt,
        completedAt: new Date().toISOString(),
        words: state.results.map((entry) => ({
          ...entry,
          word: entry.word.slice(0, 60),
        })),
        percent,
      });
    } catch {
      setCompletion({ ...base, notice: SAVE_ISSUE });
    }
  }

  function onAdvance() {
    const current = runRef.current;
    if (
      !current ||
      current.state.phase !== "feedback" ||
      current.state.lastFeedback?.correct !== true
    ) {
      return;
    }
    const next = advanceWordRound(current.state);
    setRun({ ...current, state: next });
    if (next.phase === "complete") void finish({ ...current, state: next });
  }

  // Nach „Richtig“ geht es von selbst weiter.
  const phase = run?.state.phase;
  const justRight = run?.state.lastFeedback?.correct === true;
  const attemptCount = run?.state.blockAttempts;
  const blockIndex = run?.state.index;
  useEffect(() => {
    if (phase !== "feedback" || !justRight) return;
    const timer = window.setTimeout(() => onAdvance(), SUCCESS_MS);
    return () => window.clearTimeout(timer);
  }, [phase, justRight, attemptCount, blockIndex]); // eslint-disable-line react-hooks/exhaustive-deps -- onAdvance liest nur den Ref

  async function leaveRound() {
    setRun(null);
    setCompletion(undefined);
    await pendingWrites.current;
    await store.refresh();
  }

  // ---- Wortlisten ----
  async function guard(action: () => Promise<unknown>, fallback: string) {
    setEditorNotice(undefined);
    try {
      await action();
    } catch (error) {
      setEditorNotice(messageOf(error, fallback));
    }
  }

  async function createBox(title: string) {
    setNewBoxError(undefined);
    try {
      const box = await store.createBox(title);
      setEditorNotice(undefined);
      setEditorId(box.id);
    } catch (error) {
      setNewBoxError(
        messageOf(error, "Die Wortbox konnte nicht angelegt werden."),
      );
    }
  }

  async function addWords(id: string, text: string) {
    await guard(async () => {
      const words = parseLearningWords(text);
      const result = await store.addWords(id, words);
      if (result.skipped.length > 0) {
        setEditorNotice(
          `${result.skipped.length} ${result.skipped.length === 1 ? "Eintrag konnte" : "Einträge konnten"} nicht hinzugefügt werden (zu lang oder die Wortbox ist voll).`,
        );
      } else if (result.added.length === 0) {
        setEditorNotice("Diese Wörter stehen schon in der Wortbox.");
      }
    }, "Das Wort konnte nicht hinzugefügt werden.");
  }

  async function copyCollection(id: string) {
    await guard(async () => {
      const box = await store.copyCollection(id);
      setEditorId(box.id);
      setEditorNotice(
        `Die Kopie ‚${box.title}‘ ist jetzt eine eigene Wortbox.`,
      );
    }, "Die Wortbox konnte nicht kopiert werden.");
  }

  async function removeBox(id: string) {
    await guard(async () => {
      await store.removeBox(id);
      setEditorId(undefined);
    }, "Die Wortbox konnte nicht gelöscht werden.");
  }

  async function saveBridgeWords(target: { boxId?: string; title: string }) {
    setBridgeError(undefined);
    setBridgeSaved(undefined);
    try {
      if (target.boxId) {
        const result = await store.addWordsFrom(
          target.boxId,
          bridgeWords,
          "textbox",
        );
        if (result.skipped.length > 0) {
          setBridgeError(
            "Nicht alle Wörter passten in die Wortbox. Sie ist voll oder ein Wort ist zu lang.",
          );
        }
      } else {
        await store.createBox(target.title, bridgeWords, "textbox");
      }
      setBridgeSaved(target.title);
    } catch (error) {
      setBridgeError(
        messageOf(error, "Die Wörter konnten nicht gespeichert werden."),
      );
    }
  }

  // Fokus auf die Überschrift, wenn sich die Ansicht ändert.
  const screenKey = run
    ? "round"
    : completion
      ? "done"
      : (editorId ?? "overview");
  useEffect(() => {
    if (screenKey === "round") return;
    document
      .getElementById("wortspeicher-title")
      ?.focus({ preventScroll: true });
  }, [screenKey, store.status]);

  // ---- Darstellung ----
  const tiles: WordBoxTile[] = store.views.map((view) => {
    const secure = view.words.filter(
      (word) => (progressByWord.get(learningWordId(word))?.box ?? 0) >= 3,
    ).length;
    return {
      id: view.id,
      title: view.title,
      kind:
        view.kind === "eigen" || view.kind === "unterricht"
          ? view.kind
          : "fest",
      examples: view.words.slice(0, 3),
      total: view.words.length,
      secure,
      headline: headlineForBox(summarizeWordBox(view.id, store.rounds)),
    };
  });

  const sheetView = sheetId ? findView(sheetId) : undefined;
  const sheetSummary = sheetView
    ? summarizeWordBox(sheetView.id, store.rounds)
    : undefined;
  const recommended = sheetView
    ? recommendedStage(sheetView.words, store.progress)
    : undefined;
  const collection = sheetView
    ? getLearningWordCollection(sheetView.id)
    : undefined;

  let body;
  if (store.status === "unavailable") {
    body = (
      <EmptyState title="Der Wortspeicher ist gerade nicht verfügbar">
        Dein Gerät lässt das Speichern nicht zu. Lade die Seite neu oder
        probiere einen anderen Browser.
      </EmptyState>
    );
  } else if (run && run.state.phase !== "complete") {
    const { state, view } = run;
    const roundPhase = state.phase === "complete" ? "recall" : state.phase;
    body = (
      <RoundScreen
        key={`${state.roundId}:${state.index}:${state.blockAttempts}`}
        title={view.title}
        stage={state.stage}
        index={state.index}
        total={state.blocks.length}
        phase={roundPhase}
        block={currentBlock(state)}
        usedHelp={state.usedHelp}
        feedback={state.lastFeedback}
        onBack={() => void leaveRound()}
        onFinishMemorize={() => {
          const current = runRef.current;
          if (current?.state.phase === "memorize") {
            setRun({ ...current, state: finishMemorize(current.state) });
          }
        }}
        onHelp={() => {
          const current = runRef.current;
          if (current?.state.phase === "recall") {
            setRun({ ...current, state: applyHelp(current.state) });
          }
        }}
        onSubmit={onSubmit}
        onRetry={() => {
          const current = runRef.current;
          if (
            current?.state.phase === "feedback" &&
            current.state.lastFeedback?.correct === false
          ) {
            setRun({ ...current, state: continueAfterFeedback(current.state) });
          }
        }}
      />
    );
  } else if (completion) {
    const words = completion.results.map((entry) => entry.word);
    body = (
      <CompletionScreen
        title={completion.view.title}
        stage={completion.stage}
        percent={completion.percent}
        results={completion.results}
        record={completion.record}
        notice={completion.notice ?? notice}
        textboxHref={
          textboxVisible && words.length > 0
            ? buildTextboxLink(
                words,
                completion.view.kind === "fest"
                  ? completion.view.id
                  : undefined,
              )
            : undefined
        }
        onAgain={() => {
          const view = findView(completion.view.id) ?? completion.view;
          begin(view, completion.config);
        }}
        onOtherStage={() => {
          const id = completion.view.id;
          setConfig(completion.config);
          setRun(null);
          setCompletion(undefined);
          void store.refresh();
          setSheetId(id);
        }}
      />
    );
  } else if (editorId && findView(editorId)) {
    const view = findView(editorId)!;
    const kind =
      view.kind === "eigen" || view.kind === "unterricht" ? view.kind : "fest";
    body = (
      <BoxEditorScreen
        key={view.id}
        title={view.title}
        kind={kind}
        words={view.words}
        notice={editorNotice}
        ready={ready}
        onBack={() => {
          setEditorId(undefined);
          setEditorNotice(undefined);
        }}
        onRenameBox={(title) =>
          void guard(
            () => store.renameBox(view.id, title),
            "Der Titel konnte nicht geändert werden.",
          )
        }
        onAddWords={(text) => void addWords(view.id, text)}
        onRenameWord={(from, to) =>
          void guard(
            () => store.renameWord(view.id, from, to),
            "Das Wort konnte nicht geändert werden.",
          )
        }
        onRemoveWord={(word) =>
          void guard(
            () => store.removeWord(view.id, word),
            "Das Wort konnte nicht gelöscht werden.",
          )
        }
        onRemoveBox={() => void removeBox(view.id)}
        onCopy={() => void copyCollection(view.id)}
      />
    );
  } else {
    body = (
      <OverviewScreen
        tiles={tiles}
        dueCount={store.due.length}
        notice={notice}
        ready={ready}
        newBoxError={newBoxError}
        onStart={openStart}
        onMenu={(id) => {
          setEditorNotice(undefined);
          setEditorId(id);
        }}
        onCreate={(title) => void createBox(title)}
        onMixed={() => openStart(FALLIGE_ID)}
      />
    );
  }

  return (
    <StudentPage activePath="/frei/german/lernwoerter">
      {body}
      {sheetView && !run ? (
        <StartSheet
          title={sheetView.title}
          strategy={sheetView.strategy ?? collection?.strategy}
          detail={collection?.detail}
          wordCount={sheetView.words.length}
          stages={STAGES_IN_USE.map((stage) => ({
            stage,
            bestPercent: sheetSummary?.[stage].bestPercent,
            recommended: recommended === stage,
          }))}
          stage={config.stage}
          roundSize={config.roundSize}
          blockSize={config.blockSize}
          onStage={(stage) => setConfig((current) => ({ ...current, stage }))}
          onRoundSize={(roundSize) =>
            setConfig((current) => ({ ...current, roundSize }))
          }
          onBlockSize={(blockSize) =>
            setConfig((current) => ({ ...current, blockSize }))
          }
          onStart={onStartRound}
          onClose={() => setSheetId(undefined)}
        />
      ) : null}
      {bridgeOpen && !run && !sheetView ? (
        <TextboxWordsSheet
          words={bridgeWords}
          ownBoxes={store.ownBoxes
            .filter((box) => box.kind === "eigen")
            .map((box) => ({ id: box.id, title: box.title }))}
          error={bridgeError}
          saved={bridgeSaved}
          onPractice={() => {
            setBridgeOpen(false);
            openStart(TEXTBOX_ID);
          }}
          onSave={(target) => void saveBridgeWords(target)}
          onClose={() => setBridgeOpen(false)}
        />
      ) : null}
    </StudentPage>
  );
}
