"use client";

import { useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
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
import {
  LEARNING_BUNDLE_VERSION,
  parseLearningBundleV1,
} from "../../../../src/domain/learning-bundle";
import { createLearningBoxRepository } from "../../../../src/storage/personal-learning-events";
import { Icon } from "../../../ui/icons";
import {
  Button,
  ButtonLink,
  Card,
  Pill,
  ProgressBar,
  Segmented,
} from "../../../ui/primitives";

type Phase = "setup" | "reveal" | "write" | "feedback" | "complete";
type TransferChoice = "errors" | "all" | "none";

const sampleText =
  "Der kleine Fuchs läuft durch den Wald. Am Bach entdeckt er leuchtende Steine.";
const sampleVocabulary =
  "library;Bibliothek\nclassroom;Klassenzimmer\nschool;Schule";

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
  const interactionReady = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
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
      setWrongForCurrent((value) => value + 1);
      setErrorCounts((value) => ({
        ...value,
        [current.id]: (value[current.id] ?? 0) + 1,
      }));
    }
    setPhase("feedback");
  }

  function continueRound() {
    if (!lastCorrect) {
      setAnswer("");
      setPhase(mode === "practice" ? "write" : "reveal");
      return;
    }
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
        ? `${result.added} Vokabeln sind jetzt in deiner LernBox fällig.`
        : `${result.reused} vorhandene Vokabeln wurden wieder fällig markiert.`,
    );
  }

  function reset() {
    setPhase("setup");
    setItems([]);
    setTransferNotice("");
  }

  if (phase === "setup") {
    return (
      <section className="ui-page ui-stack" aria-labelledby="running-title">
        <div className="ui-stack" style={{ ["--gap" as string]: "4px" }}>
          <p className="ui-eyebrow">Deutsch · allein üben</p>
          <h1 id="running-title" className="ui-h-page">
            Laufdiktat
          </h1>
          <p className="ui-small ui-muted">
            Ansehen, merken, verdecken und aus dem Gedächtnis schreiben.
          </p>
        </div>

        <Card look="pop" className="ui-stack">
          <div
            className="ui-grid-auto"
            style={{ ["--min" as string]: "240px" }}
          >
            <div className="ui-stack" style={{ ["--gap" as string]: "6px" }}>
              <span className="ui-label">Inhalt</span>
              <Segmented
                label="Inhalt"
                value={kind}
                disabled={!interactionReady}
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
                disabled={!interactionReady}
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

          <Button
            size="lg"
            variant="green"
            onClick={start}
            disabled={!interactionReady || !source.trim()}
          >
            Laufdiktat starten
          </Button>
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
          <p
            className="ui-game__stars"
            role="img"
            aria-label={`${stars} von 5 Sternen`}
          >
            {"★".repeat(stars)}
            <span className="ui-faint">{"★".repeat(5 - stars)}</span>
          </p>
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
                autoComplete="off"
                spellCheck={false}
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
      <Button variant="link" onClick={reset}>
        Runde beenden
      </Button>
    </section>
  );
}
