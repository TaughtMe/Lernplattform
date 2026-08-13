"use client";

import Link from "next/link";
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
} from "../../src/domain/running-dictation";
import {
  LEARNING_BUNDLE_VERSION,
  parseLearningBundleV1,
} from "../../src/domain/learning-bundle";
import { createLearningBoxRepository } from "../../src/storage/personal-learning-events";

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
      <RunningDictationShell>
        <section className="running-setup" aria-labelledby="running-title">
          <div className="running-heading">
            <p className="eyebrow">Deutsch · freies Üben</p>
            <h1 id="running-title">Laufdiktat</h1>
            <p>
              Ansehen, merken, verdecken und aus dem Gedächtnis schreiben. Die
              bewährte Fachlogik läuft jetzt direkt im Lernraum.
            </p>
          </div>

          <div className="running-choice-grid">
            <fieldset>
              <legend>Inhalt</legend>
              <button
                aria-pressed={kind === "text"}
                disabled={!interactionReady}
                onClick={() => selectKind("text")}
              >
                Text und Sätze
              </button>
              <button
                aria-pressed={kind === "vocabulary"}
                disabled={!interactionReady}
                onClick={() => selectKind("vocabulary")}
              >
                Vokabeln
              </button>
            </fieldset>
            <fieldset>
              <legend>Übungsart</legend>
              <button
                aria-pressed={mode === "running-dictation"}
                disabled={!interactionReady}
                onClick={() => setMode("running-dictation")}
              >
                Klassisches Laufdiktat
              </button>
              <button
                aria-pressed={mode === "practice"}
                disabled={!interactionReady}
                onClick={() => setMode("practice")}
              >
                Freies Üben mit Tipps
              </button>
            </fieldset>
          </div>

          <label className="running-source">
            {kind === "text"
              ? "Text – Sätze und Zeilen werden getrennt"
              : "Vokabeln – eine Zeile pro Paar: Vorderseite;Rückseite"}
            <textarea
              value={source}
              onChange={(event) => setSource(event.target.value)}
              rows={7}
            />
          </label>

          {kind === "vocabulary" && (
            <div className="running-settings-row">
              <label>
                Abfragerichtung
                <select
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
              <label>
                Nach der Runde
                <select
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
          )}

          <button
            className="button button--primary running-start"
            onClick={start}
            disabled={!interactionReady || !source.trim()}
          >
            Laufdiktat starten
          </button>
        </section>
      </RunningDictationShell>
    );
  }

  if (phase === "complete") {
    const stars = computeRunningDictationStars(totalErrors, items.length);
    return (
      <RunningDictationShell>
        <section className="running-complete">
          <p className="eyebrow">Runde abgeschlossen</p>
          <h1>Geschafft!</h1>
          <div className="running-stars" aria-label={`${stars} von 5 Sternen`}>
            <span>{"★".repeat(stars)}</span>
            <i>{"★".repeat(5 - stars)}</i>
          </div>
          <p>
            {items.length} Aufgaben · {totalErrors} Fehlversuche
          </p>
          {transferNotice && (
            <p className="learning-box-notice" role="status">
              {transferNotice}
            </p>
          )}
          <div className="running-complete-actions">
            <button className="button button--quiet" onClick={reset}>
              Neue Runde
            </button>
            {transferNotice && (
              <Link className="button button--primary" href="/lernbox">
                Meine Fehler jetzt üben
              </Link>
            )}
          </div>
        </section>
      </RunningDictationShell>
    );
  }

  if (!current) return null;
  const visiblePrompt = current.prompt ?? current.target;
  const hint = buildRunningDictationHint(
    current.target,
    Math.min(1, wrongForCurrent / 3),
  );

  return (
    <RunningDictationShell>
      <section className="running-session" aria-labelledby="running-prompt">
        <div className="running-progress">
          <span>
            {mode === "practice" ? "Freies Üben" : "Laufdiktat"} · Aufgabe{" "}
            {index + 1}
          </span>
          <strong>
            {index + 1} / {items.length}
          </strong>
          <div>
            <span style={{ width: `${((index + 1) / items.length) * 100}%` }} />
          </div>
        </div>

        <article className="running-task-card">
          {phase === "reveal" && (
            <>
              <p className="eyebrow">Ansehen und merken</p>
              <h1 id="running-prompt">{visiblePrompt}</h1>
              <button
                className="button button--primary"
                onClick={() => setPhase("write")}
              >
                Verstanden – jetzt schreiben
              </button>
            </>
          )}

          {phase === "write" && (
            <form onSubmit={submit}>
              <p className="eyebrow">Aus dem Gedächtnis</p>
              <h1 id="running-prompt">
                {current.kind === "vocabulary"
                  ? visiblePrompt
                  : "Was hast du dir gemerkt?"}
              </h1>
              {mode === "practice" && wrongForCurrent > 0 && (
                <p className="running-hint" aria-label="Tipp">
                  {hint}
                </p>
              )}
              <label>
                Deine Antwort
                <input
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              <div className="running-write-actions">
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setPhase("reveal")}
                >
                  Noch einmal ansehen
                </button>
                <button className="button button--primary">Prüfen</button>
              </div>
            </form>
          )}

          {phase === "feedback" && (
            <div
              className={
                lastCorrect
                  ? "running-feedback is-correct"
                  : "running-feedback is-wrong"
              }
            >
              <p className="eyebrow">Rückmeldung</p>
              <h1 id="running-prompt">
                {lastCorrect ? "Richtig" : "Noch nicht richtig"}
              </h1>
              {!lastCorrect && mode === "practice" && (
                <p>Beim nächsten Versuch bekommst du einen gezielten Tipp.</p>
              )}
              <button
                className="button button--primary"
                onClick={continueRound}
              >
                {lastCorrect
                  ? index + 1 < items.length
                    ? "Nächste Aufgabe"
                    : "Runde abschließen"
                  : "Noch einmal versuchen"}
              </button>
            </div>
          )}
        </article>
        <button className="text-button" onClick={reset}>
          Runde beenden
        </button>
      </section>
    </RunningDictationShell>
  );
}

function RunningDictationShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="running-shell">
      <header className="running-topbar">
        <Link href="/frei/german" className="back-link">
          ← Deutsch
        </Link>
        <div>
          <strong>Laufdiktat</strong>
          <span>Im Lernraum</span>
        </div>
        <Link href="/" className="back-link">
          Lernraum
        </Link>
      </header>
      {children}
    </main>
  );
}
