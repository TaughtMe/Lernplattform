"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import {
  buildRunningDictationHint,
  buildVocabularyItems,
  checkRunningDictationAnswer,
  computeRunningDictationStars,
  parseRunningDictationText,
  parseVocabularyTable,
  type RunningDictationItem,
  type RunningDictationKind,
  type RunningDictationMode,
  type VocabularyDirection,
} from "../../../../src/domain/running-dictation";
import { STRICT_RUNNING_DICTATION_INPUT_ATTRIBUTES } from "../../../../src/domain/running-dictation-input";
import {
  LEARNING_BUNDLE_VERSION,
  parseLearningBundleV1,
} from "../../../../src/domain/learning-bundle";
import {
  buildRunningDictationSnapshot,
  restoreRunningDictationItems,
  runningDictationSnapshotSchema,
} from "../../../../src/domain/running-dictation-snapshot";
import { createLearningBoxRepository } from "../../../../src/storage/personal-learning-events";
import { HydrationGate } from "../../../ui/hydration-gate";
import { Icon } from "../../../ui/icons";
import { ReadAloudButton } from "../../../ui/read-aloud-button";
import { useRoundGuard } from "../../../ui/round-guard";
import { useRoundSnapshot } from "../../../ui/use-round-snapshot";
import { ResumeOffer } from "../../../views/shell/resume-offer";
import { useLaufdiktatStars } from "./stars-preference";
import {
  Button,
  ButtonLink,
  Card,
  Pill,
  ProgressBar,
  Segmented,
  Toggle,
} from "../../../ui/primitives";

type Phase = "setup" | "reveal" | "write" | "feedback" | "complete";
type TransferChoice = "errors" | "all" | "none";

const sampleText =
  "Der kleine Fuchs läuft durch den Wald. Am Bach entdeckt er leuchtende Steine.";
const sampleVocabulary =
  "library;Bibliothek\nclassroom;Klassenzimmer\nschool;Schule";

/** Anleitung auf der Startseite; wird auch vorgelesen. */
const SETUP_INTRO =
  "Ansehen, merken, verdecken und aus dem Gedächtnis schreiben.";

export function RunningDictationApp() {
  const repository = useMemo(() => createLearningBoxRepository(), []);
  const [kind, setKind] = useState<RunningDictationKind>("text");
  const [mode, setMode] = useState<RunningDictationMode>("running-dictation");
  const [direction, setDirection] =
    useState<VocabularyDirection>("left-to-right");
  const [source, setSource] = useState(sampleText);
  const [transfer, setTransfer] = useState<TransferChoice>("errors");
  const [items, setItems] = useState<RunningDictationItem[]>([]);
  const [phase, setPhase] = useState<Phase>("setup");
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [wrongForCurrent, setWrongForCurrent] = useState(0);
  const [errorCounts, setErrorCounts] = useState<Record<string, number>>({});
  const [lastCorrect, setLastCorrect] = useState(false);
  const [transferNotice, setTransferNotice] = useState("");
  const [transferDeckId, setTransferDeckId] = useState<string>();
  const [showStars, setShowStars] = useLaufdiktatStars();
  const round = useRef({ id: "", startedAt: "" });
  /** Zwischenstand der unterbrochenen Runde (C-001): „Weitermachen“ in den Einstellungen. */
  const roundSnapshot = useRoundSnapshot(
    "laufdiktat",
    runningDictationSnapshotSchema,
  );
  const current = items[index];
  const totalErrors = Object.values(errorCounts).reduce(
    (sum, value) => sum + value,
    0,
  );

  function selectKind(next: RunningDictationKind) {
    setKind(next);
    setSource(next === "text" ? sampleText : sampleVocabulary);
    if (next === "text") setTransfer("none");
    else setTransfer("errors");
  }

  function start() {
    const nextItems =
      kind === "text"
        ? parseRunningDictationText(source)
        : buildVocabularyItems(parseVocabularyTable(source), direction);
    if (!nextItems.length) return;
    // Eine neue Runde ersetzt den Zwischenstand einer früheren.
    roundSnapshot.clear();
    round.current = {
      id: crypto.randomUUID(),
      startedAt: new Date().toISOString(),
    };
    setItems(nextItems);
    setIndex(0);
    setAnswer("");
    setWrongForCurrent(0);
    setErrorCounts({});
    setTransferNotice("");
    setPhase("reveal");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!current || !answer.trim()) return;
    const correct = checkRunningDictationAnswer(current, answer);
    setLastCorrect(correct);
    if (!correct) {
      const counts = {
        ...errorCounts,
        [current.id]: (errorCounts[current.id] ?? 0) + 1,
      };
      setWrongForCurrent(wrongForCurrent + 1);
      setErrorCounts(counts);
      persistRound({
        index,
        wrongForCurrent: wrongForCurrent + 1,
        errorCounts: counts,
      });
    }
    setPhase("feedback");
  }

  /** Hält den Zwischenstand; ist die Runde fertig, bleibt nichts fortzusetzen. */
  function persistRound(next: {
    index: number;
    wrongForCurrent: number;
    errorCounts: Record<string, number>;
  }) {
    const content = buildRunningDictationSnapshot({
      mode,
      transfer,
      items,
      ...next,
    });
    if (!content) return roundSnapshot.clear();
    roundSnapshot.save({
      roundId: round.current.id,
      startedAt: round.current.startedAt,
      done: next.index,
      total: items.length,
      state: content,
    });
  }

  /** „Weitermachen“: an der gespeicherten Aufgabe weiter, mit den bisherigen Fehlversuchen. */
  function resumeRound() {
    const saved = roundSnapshot.snapshot;
    if (!saved) return;
    const { state } = saved;
    round.current = { id: saved.roundId, startedAt: saved.startedAt };
    setMode(state.mode);
    setTransfer(state.transfer);
    setItems(restoreRunningDictationItems(state));
    setIndex(state.index);
    setAnswer("");
    setWrongForCurrent(state.wrongForCurrent);
    setErrorCounts(state.errorCounts);
    setTransferNotice("");
    // Nach einem Fehlversuch mit Tipps geht es dort weiter, wo geschrieben wird.
    setPhase(
      state.mode === "practice" && state.wrongForCurrent > 0
        ? "write"
        : "reveal",
    );
  }

  function continueRound() {
    if (!lastCorrect) {
      setAnswer("");
      setPhase(mode === "practice" ? "write" : "reveal");
      return;
    }
    persistRound({ index: index + 1, wrongForCurrent: 0, errorCounts });
    if (index + 1 >= items.length) {
      setPhase("complete");
      void transferVocabulary();
      return;
    }
    setIndex((value) => value + 1);
    setWrongForCurrent(0);
    setAnswer("");
    setPhase("reveal");
  }

  async function transferVocabulary() {
    const vocabulary = items.filter((item) => item.kind === "vocabulary");
    const selected =
      transfer === "all"
        ? vocabulary
        : transfer === "errors"
          ? vocabulary.filter((item) => (errorCounts[item.id] ?? 0) > 0)
          : [];
    if (!selected.length) return;
    const now = new Date().toISOString();
    const runId = crypto.randomUUID();
    const bundle = parseLearningBundleV1({
      schemaVersion: LEARNING_BUNDLE_VERSION,
      id: runId,
      revision: 1,
      createdAt: now,
      source: { kind: "self", id: runId },
      vocabulary: selected.map((item) => ({
        kind: "vocabulary" as const,
        id: item.id,
        prompt: {
          text: item.prompt ?? item.target,
          locale: item.promptLocale ?? "de-DE",
        },
        answer: {
          text: item.target,
          locale: item.answerLocale ?? "de-DE",
          ...(item.acceptedAnswers?.length
            ? { alternatives: item.acceptedAnswers }
            : {}),
        },
        tagIds: ["laufdiktat"],
        createdAt: now,
        updatedAt: now,
      })),
      stacks: [
        {
          id: `stack-${runId}`,
          title:
            transfer === "errors"
              ? "Fehler aus Laufdiktat"
              : "Vokabeln aus Laufdiktat",
          itemIds: selected.map((item) => item.id),
          tagIds: ["laufdiktat"],
        },
      ],
    });
    const result = await repository.ingestBundle({
      bundle,
      title:
        transfer === "errors"
          ? "Fehler aus Laufdiktat"
          : "Vokabeln aus Laufdiktat",
      source: { kind: "running-dictation", sourceId: runId },
    });
    setTransferDeckId(result.deckId);
    setTransferNotice(
      result.added > 0
        ? `${result.added} Vokabeln sind heute in deiner LernBox dran.`
        : `${result.reused} vorhandene Vokabeln sind heute wieder dran.`,
    );
  }

  function reset() {
    setPhase("setup");
    setItems([]);
    setTransferNotice("");
  }

  // Logo, Leiste und Zurück-Geste fragen nach; „Beenden“ lässt den Zwischenstand stehen.
  const requestLeave = useRoundGuard({
    active: phase !== "setup" && phase !== "complete",
    onLeave: reset,
  });

  if (phase === "setup") {
    return (
      <section className="ui-page ui-stack" aria-labelledby="running-title">
        <div className="ui-stack" style={{ ["--gap" as string]: "4px" }}>
          <p className="ui-eyebrow">Deutsch · allein üben</p>
          <h1 id="running-title" className="ui-h-page">
            Laufdiktat
          </h1>
          <p className="ui-small ui-muted">{SETUP_INTRO}</p>
          <ReadAloudButton text={SETUP_INTRO} />
        </div>

        {roundSnapshot.snapshot ? (
          <ResumeOffer
            detail={`Laufdiktat · ${roundSnapshot.snapshot.state.items.length} Aufgaben`}
            done={roundSnapshot.snapshot.done}
            total={roundSnapshot.snapshot.total}
            onResume={resumeRound}
            onDiscard={roundSnapshot.clear}
          />
        ) : null}

        {/* Bis zur Hydration gesperrt: sonst setzt React den Text zurück. */}
        <Card look="pop">
          <HydrationGate className="ui-stack">
            <div
              className="ui-grid-auto"
              style={{ ["--min" as string]: "240px" }}
            >
              <div className="ui-stack" style={{ ["--gap" as string]: "6px" }}>
                <span className="ui-label">Inhalt</span>
                <Segmented
                  label="Inhalt"
                  value={kind}
                  onChange={selectKind}
                  options={[
                    { value: "text", label: "Text und Sätze" },
                    { value: "vocabulary", label: "Vokabeln" },
                  ]}
                />
              </div>
              <div className="ui-stack" style={{ ["--gap" as string]: "6px" }}>
                <span className="ui-label">Übungsart</span>
                <Segmented
                  label="Übungsart"
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: "running-dictation", label: "Klassisch" },
                    { value: "practice", label: "Mit Tipps" },
                  ]}
                />
              </div>
            </div>

            <label
              className="ui-stack ui-label"
              style={{ ["--gap" as string]: "6px" }}
            >
              {kind === "text"
                ? "Text – Sätze und Zeilen werden getrennt"
                : "Vokabeln – eine Zeile pro Paar: Vorderseite;Rückseite"}
              <textarea
                className="ui-textarea"
                value={source}
                onChange={(event) => setSource(event.target.value)}
                rows={7}
              />
            </label>

            {kind === "vocabulary" ? (
              <div className="ui-grid2">
                <label
                  className="ui-stack ui-label"
                  style={{ ["--gap" as string]: "6px" }}
                >
                  Abfragerichtung
                  <select
                    className="ui-input"
                    value={direction}
                    onChange={(event) =>
                      setDirection(event.target.value as VocabularyDirection)
                    }
                  >
                    <option value="left-to-right">Links → rechts</option>
                    <option value="right-to-left">Rechts → links</option>
                    <option value="mixed">Gemischt</option>
                  </select>
                </label>
                <label
                  className="ui-stack ui-label"
                  style={{ ["--gap" as string]: "6px" }}
                >
                  Nach der Runde
                  <select
                    className="ui-input"
                    value={transfer}
                    onChange={(event) =>
                      setTransfer(event.target.value as TransferChoice)
                    }
                  >
                    <option value="errors">Nur Fehler in die LernBox</option>
                    <option value="all">Alle in die LernBox</option>
                    <option value="none">Nichts übernehmen</option>
                  </select>
                </label>
              </div>
            ) : null}

            <Toggle
              label="Sterne am Ende zeigen"
              hint="Nur auf diesem Gerät. Ohne Sterne siehst du nur deine Zahlen."
              checked={showStars}
              onChange={setShowStars}
            />

            <Button
              size="lg"
              variant="green"
              onClick={start}
              disabled={!source.trim()}
            >
              Laufdiktat starten
            </Button>
          </HydrationGate>
        </Card>
      </section>
    );
  }

  if (phase === "complete") {
    const stars = computeRunningDictationStars(totalErrors, items.length);
    return (
      <section className="ui-page">
        <div className="ui-game__done">
          <span className="ui-game__done-ring">
            <Icon name="trophy" size={56} />
          </span>
          <p className="ui-eyebrow">Runde abgeschlossen</p>
          {showStars ? (
            <p
              className="ui-game__stars"
              role="img"
              aria-label={`${stars} von 5 Sternen`}
            >
              {"★".repeat(stars)}
              <span className="ui-faint">{"★".repeat(5 - stars)}</span>
            </p>
          ) : null}
          <h1 className="ui-h-fun">Geschafft!</h1>
          <div className="ui-grid2 ui-game__tiles">
            <span>
              <strong>{items.length}</strong> Aufgaben
            </span>
            <span>
              <strong>{totalErrors}</strong> Fehlversuche
            </span>
          </div>
          {transferNotice ? (
            <p className="ui-notice ui-notice--good" role="status">
              {transferNotice}
            </p>
          ) : null}
          <div className="ui-grid2">
            <Button variant="ghost" onClick={reset}>
              Neue Runde
            </Button>
            {transferNotice ? (
              <ButtonLink
                href={
                  transferDeckId
                    ? `/lernbox?stapel=${encodeURIComponent(transferDeckId)}`
                    : "/lernbox"
                }
              >
                Meine Fehler jetzt üben
              </ButtonLink>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (!current) return null;
  const visiblePrompt = current.prompt ?? current.target;
  const hint = buildRunningDictationHint(
    current.target,
    Math.min(1, wrongForCurrent / 3),
  );

  return (
    <section className="ui-page ui-stack" aria-labelledby="running-prompt">
      <div className="ui-stack" style={{ ["--gap" as string]: "6px" }}>
        <div className="ui-between">
          <span className="ui-small ui-muted">
            {mode === "practice" ? "Mit Tipps" : "Laufdiktat"} · Aufgabe{" "}
            {index + 1}
          </span>
          <Pill>
            {index + 1} / {items.length}
          </Pill>
        </div>
        <ProgressBar
          value={index + 1}
          max={items.length}
          label="Fortschritt der Runde"
        />
      </div>

      <div className="ui-game__card ui-running__card">
        {phase === "reveal" ? (
          <>
            <Pill>Ansehen und merken</Pill>
            <h1
              id="running-prompt"
              className="ui-game__prompt ui-running__prompt"
            >
              {visiblePrompt}
            </h1>
            <Button onClick={() => setPhase("write")}>
              Verstanden – jetzt schreiben
            </Button>
          </>
        ) : null}

        {phase === "write" ? (
          <form className="ui-game__write" onSubmit={submit}>
            <p className="ui-eyebrow">Aus dem Gedächtnis</p>
            <h1 id="running-prompt" className="ui-h-section">
              {current.kind === "vocabulary"
                ? visiblePrompt
                : "Was hast du dir gemerkt?"}
            </h1>
            {mode === "practice" && wrongForCurrent > 0 ? (
              <p className="ui-game__hint" aria-label="Tipp">
                {hint}
              </p>
            ) : null}
            <label
              className="ui-stack ui-label"
              style={{ ["--gap" as string]: "6px" }}
            >
              Deine Antwort
              <input
                className="ui-field"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                {...STRICT_RUNNING_DICTATION_INPUT_ATTRIBUTES}
              />
            </label>
            <div className="ui-row ui-wrap">
              <Button type="submit">Prüfen</Button>
              <Button variant="link" onClick={() => setPhase("reveal")}>
                Noch einmal ansehen
              </Button>
            </div>
          </form>
        ) : null}

        {phase === "feedback" ? (
          <div
            className={`ui-game__verdict ${lastCorrect ? "is-correct" : "is-wrong"}`}
          >
            <span aria-hidden="true">
              <Icon name={lastCorrect ? "check" : "close"} size={44} />
            </span>
            <h1 id="running-prompt" className="ui-h-section">
              {lastCorrect ? "Richtig" : "Noch nicht richtig"}
            </h1>
            {!lastCorrect && mode === "practice" ? (
              <p className="ui-small ui-muted">
                Beim nächsten Versuch bekommst du einen gezielten Tipp.
              </p>
            ) : null}
            <Button onClick={continueRound}>
              {lastCorrect
                ? index + 1 < items.length
                  ? "Nächste Aufgabe"
                  : "Runde abschließen"
                : "Noch einmal versuchen"}
            </Button>
          </div>
        ) : null}
      </div>
      <Button variant="link" onClick={requestLeave}>
        Runde beenden
      </Button>
    </section>
  );
}
