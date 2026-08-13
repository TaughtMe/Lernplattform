"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import {
  LEARNING_WORD_STAGES,
  buildLearningWordLengthPattern,
  buildLearningWordPattern,
  chunkLearningWords,
  evaluateLearningWords,
  parseLearningWords,
  updateLearningWordStage,
  type LearningWordBlockSize,
  type LearningWordStage,
} from "../../src/domain/learning-word";

type Phase = "setup" | "memorize" | "recall" | "feedback" | "complete";
type Result = {
  words: string[];
  usedHelp: boolean;
  incorrectAttempts: number;
  nextStage: LearningWordStage;
};

const sampleWords =
  "Schulweg\nBibliothek\nLieblingsfach\nHausaufgabe\nFreundschaft";

const stageCopy: Record<LearningWordStage, { title: string; detail: string }> =
  {
    1: {
      title: "Abschreiben",
      detail: "Das vollständige Wort bleibt sichtbar.",
    },
    2: { title: "Wenige Lücken", detail: "Ein Teil der Buchstaben fehlt." },
    3: {
      title: "Viele Lücken",
      detail: "Du rekonstruierst fast das ganze Wort.",
    },
    4: {
      title: "Ansehen & verdecken",
      detail: "Danach hilft nur noch die Wortlänge.",
    },
    5: {
      title: "Wörter merken",
      detail: "Mehrere Wörter, Reihenfolge ist egal.",
    },
  };

export function LearningWordApp() {
  const [source, setSource] = useState(sampleWords);
  const [stage, setStage] = useState<LearningWordStage>(1);
  const [blockSize, setBlockSize] = useState<LearningWordBlockSize>(3);
  const [blocks, setBlocks] = useState<string[][]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("setup");
  const [answer, setAnswer] = useState("");
  const [usedHelp, setUsedHelp] = useState(false);
  const [incorrectAttempts, setIncorrectAttempts] = useState(0);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const interactionReady = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const current = blocks[index] ?? [];
  const words = useMemo(() => parseLearningWords(source), [source]);

  function start() {
    if (!words.length) return;
    setBlocks(chunkLearningWords(words, stage === 5 ? blockSize : 1));
    setIndex(0);
    setAnswer("");
    setUsedHelp(false);
    setIncorrectAttempts(0);
    setResults([]);
    setPhase(stage >= 4 ? "memorize" : "recall");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!answer.trim()) return;
    const attempt = evaluateLearningWords(current, answer);
    const nextIncorrectAttempts = attempt.correct
      ? incorrectAttempts
      : incorrectAttempts + 1;
    setIncorrectAttempts(nextIncorrectAttempts);
    setLastCorrect(attempt.correct);
    setPhase("feedback");
  }

  function continueRound() {
    if (!lastCorrect) {
      setAnswer("");
      setPhase(stage >= 4 ? "memorize" : "recall");
      return;
    }
    setResults((previous) => [
      ...previous,
      {
        words: [...current],
        usedHelp,
        incorrectAttempts,
        nextStage: updateLearningWordStage(stage, {
          correct: true,
          usedHelp,
          incorrectAttempts,
        }),
      },
    ]);
    if (index + 1 >= blocks.length) {
      setPhase("complete");
      return;
    }
    setIndex((value) => value + 1);
    setAnswer("");
    setUsedHelp(false);
    setIncorrectAttempts(0);
    setPhase(stage >= 4 ? "memorize" : "recall");
  }

  function reset() {
    setBlocks([]);
    setResults([]);
    setPhase("setup");
  }

  return (
    <main className="learning-word-shell">
      <header className="running-topbar">
        <Link href="/frei/german" className="back-link">
          ← Deutsch
        </Link>
        <div>
          <strong>Lernwörter</strong>
          <span>Fünfstufige Merkstrecke</span>
        </div>
        <Link href="/" className="back-link">
          Lernraum
        </Link>
      </header>

      {phase === "setup" && (
        <section className="learning-word-setup" aria-labelledby="word-title">
          <div className="learning-word-heading">
            <p className="eyebrow">Deutsch · Lernwörter</p>
            <h1 id="word-title">Vom Ansehen zum sicheren Abruf</h1>
            <p>
              Probiere jede Stufe direkt aus. Hilfen und Fehler verhindern einen
              Aufstieg; nach wiederholten Fehlern wird eine leichtere Stufe
              empfohlen.
            </p>
          </div>

          <ol className="learning-word-stages" aria-label="Merkstufe wählen">
            {LEARNING_WORD_STAGES.map((value) => (
              <li key={value}>
                <button
                  aria-pressed={stage === value}
                  onClick={() => setStage(value)}
                  disabled={!interactionReady}
                >
                  <span>{value}</span>
                  <strong>{stageCopy[value].title}</strong>
                  <small>{stageCopy[value].detail}</small>
                </button>
              </li>
            ))}
          </ol>

          <div className="learning-word-config">
            <label>
              Deine Lernwörter
              <textarea
                rows={7}
                value={source}
                onChange={(event) => setSource(event.target.value)}
              />
              <small>Ein Wort pro Zeile oder durch Komma getrennt.</small>
            </label>
            <aside>
              <p className="eyebrow">Ausgewählte Stufe</p>
              <h2>
                {stage}. {stageCopy[stage].title}
              </h2>
              <p>{stageCopy[stage].detail}</p>
              {stage === 5 && (
                <label>
                  Wörter pro Merkblock
                  <select
                    value={blockSize}
                    onChange={(event) =>
                      setBlockSize(
                        Number(event.target.value) as LearningWordBlockSize,
                      )
                    }
                  >
                    {[1, 2, 3, 5].map((size) => (
                      <option value={size} key={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <strong>{words.length} unterschiedliche Wörter</strong>
              <button
                className="button button--primary"
                onClick={start}
                disabled={!interactionReady || words.length === 0}
              >
                Stufe ausprobieren
              </button>
            </aside>
          </div>
        </section>
      )}

      {(phase === "memorize" || phase === "recall" || phase === "feedback") && (
        <section className="learning-word-session" aria-live="polite">
          <div className="running-progress">
            <span>
              Merkstufe {stage} · {stageCopy[stage].title}
            </span>
            <strong>
              {index + 1} / {blocks.length}
            </strong>
            <div>
              <span
                style={{ width: `${((index + 1) / blocks.length) * 100}%` }}
              />
            </div>
          </div>

          <article className="learning-word-card">
            {phase === "memorize" && (
              <>
                <p className="eyebrow">Ansehen und merken</p>
                <div className="learning-word-memory-list">
                  {current.map((word) => (
                    <strong key={word}>{word}</strong>
                  ))}
                </div>
                <p>
                  {stage === 5
                    ? "Merke dir alle Wörter. Beim Eingeben ist die Reihenfolge egal."
                    : "Präge dir das Wort ein. Danach bleibt nur seine Länge sichtbar."}
                </p>
                <button
                  className="button button--primary"
                  onClick={() => setPhase("recall")}
                >
                  Wörter verdecken
                </button>
              </>
            )}

            {phase === "recall" && (
              <form onSubmit={submit}>
                <p className="eyebrow">Selbstständig schreiben</p>
                <h1>{getPrompt(current[0] ?? "", stage)}</h1>
                {stage === 5 && (
                  <p>{current.length} Wörter aus dem Merkblock</p>
                )}
                {usedHelp && (
                  <div className="learning-word-help" role="status">
                    {current.join(" · ")}
                  </div>
                )}
                <label>
                  {stage === 5 ? "Ein Wort pro Zeile" : "Deine Lösung"}
                  {stage === 5 ? (
                    <textarea
                      rows={Math.max(3, current.length)}
                      value={answer}
                      onChange={(event) => setAnswer(event.target.value)}
                      spellCheck={false}
                    />
                  ) : (
                    <input
                      value={answer}
                      onChange={(event) => setAnswer(event.target.value)}
                      spellCheck={false}
                      autoComplete="off"
                    />
                  )}
                </label>
                <div className="learning-word-actions">
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setUsedHelp(true)}
                  >
                    Wort noch einmal zeigen
                  </button>
                  <button className="button button--primary">Prüfen</button>
                </div>
              </form>
            )}

            {phase === "feedback" && (
              <div className={lastCorrect ? "is-correct" : "is-wrong"}>
                <p className="eyebrow">Auswertung</p>
                <h1>
                  {lastCorrect ? "Richtig geschrieben" : "Noch nicht sicher"}
                </h1>
                <p>
                  {lastCorrect && !usedHelp
                    ? incorrectAttempts >= 2
                      ? `Nach mehreren Anläufen wird Merkstufe ${Math.max(1, stage - 1)} empfohlen.`
                      : incorrectAttempts === 0
                        ? `Ohne Hilfe geschafft – Merkstufe ${Math.min(5, stage + 1)} wird empfohlen.`
                        : `Nach dem Fehler richtig abgerufen – die Wörter bleiben auf Merkstufe ${stage}.`
                    : `Die Wörter bleiben auf Merkstufe ${stage}.`}
                </p>
                {!lastCorrect && (
                  <div className="learning-word-solution">
                    Richtig: <strong>{current.join(" · ")}</strong>
                  </div>
                )}
                <button
                  className="button button--primary"
                  onClick={continueRound}
                >
                  {!lastCorrect
                    ? "Verdeckt noch einmal versuchen"
                    : index + 1 < blocks.length
                      ? "Weiter"
                      : "Runde auswerten"}
                </button>
              </div>
            )}
          </article>
          <button className="text-button" onClick={reset}>
            Übung beenden
          </button>
        </section>
      )}

      {phase === "complete" && (
        <section className="learning-word-complete">
          <p className="eyebrow">Merkstrecke abgeschlossen</p>
          <h1>Du hast die Stufe ausprobiert.</h1>
          <div className="learning-word-result-grid">
            <article>
              <strong>
                {results.filter((result) => result.nextStage > stage).length}
              </strong>
              <span>bereit für die nächste Stufe</span>
            </article>
            <article>
              <strong>
                {results.filter((result) => result.nextStage <= stage).length}
              </strong>
              <span>auf dieser oder einer leichteren Stufe</span>
            </article>
            <article>
              <strong>
                {results.filter((result) => result.usedHelp).length}
              </strong>
              <span>mit Hilfe</span>
            </article>
          </div>
          <p className="prototype-note">
            In diesem Funktionsprototyp bleibt die Auswertung nur für diese
            Runde bestehen. Die dauerhafte Trennung von Merkstufe und
            Leitner-Fälligkeit folgt mit dem Lernwort-Datenmodell.
          </p>
          <div className="running-complete-actions">
            <button className="button button--primary" onClick={reset}>
              Andere Stufe testen
            </button>
            <Link className="button button--quiet" href="/frei/german">
              Zur Deutschübersicht
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}

function getPrompt(word: string, stage: LearningWordStage): string {
  if (stage === 1) return word;
  if (stage === 2 || stage === 3) return buildLearningWordPattern(word, stage);
  if (stage === 4) return buildLearningWordLengthPattern(word);
  return "Welche Wörter hast du dir gemerkt?";
}
