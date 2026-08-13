"use client";

import Link from "next/link";
import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import {
  LEARNING_WORD_COLLECTIONS,
  getLearningWordCollection,
} from "../../src/domain/german-learning-content";
import {
  LEARNING_WORD_STAGES,
  buildLearningWordLengthPattern,
  buildLearningWordPattern,
  chunkLearningWords,
  evaluateLearningWords,
  parseLearningWords,
  selectLearningWordRound,
  updateLearningWordStage,
  type LearningWordBlockSize,
  type LearningWordStage,
} from "../../src/domain/learning-word";

type Phase =
  "setup" | "memorize" | "recall" | "feedback" | "success" | "complete";
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
  const [roundSize, setRoundSize] = useState<5 | 10 | 20 | "all">(10);
  const [blocks, setBlocks] = useState<string[][]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("setup");
  const [answer, setAnswer] = useState("");
  const [usedHelp, setUsedHelp] = useState(false);
  const [incorrectAttempts, setIncorrectAttempts] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [collectionId, setCollectionId] = useState("own");
  const answerRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactionReady = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const current = blocks[index] ?? [];
  const words = useMemo(() => parseLearningWords(source), [source]);

  useEffect(() => {
    if (phase === "recall") answerRef.current?.focus();
    if (phase === "memorize" || phase === "feedback") {
      actionRef.current?.focus();
    }
  }, [phase, index]);

  useEffect(
    () => () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    },
    [],
  );

  function selectCollection(id: string) {
    setCollectionId(id);
    const collection = getLearningWordCollection(id);
    if (collection) setSource(collection.words.join("\n"));
  }

  function start() {
    if (!words.length) return;
    const roundWords = selectLearningWordRound(words, roundSize);
    setBlocks(chunkLearningWords(roundWords, stage === 5 ? blockSize : 1));
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
    if (attempt.correct) {
      const result: Result = {
        words: [...current],
        usedHelp,
        incorrectAttempts: nextIncorrectAttempts,
        nextStage: updateLearningWordStage(stage, {
          correct: true,
          usedHelp,
          incorrectAttempts: nextIncorrectAttempts,
        }),
      };
      setResults((previous) => [...previous, result]);
      setPhase("success");
      successTimerRef.current = setTimeout(() => advanceAfterSuccess(), 650);
      return;
    }
    setPhase("feedback");
  }

  function advanceAfterSuccess() {
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

  function continueRound() {
    setAnswer("");
    setPhase(stage >= 4 ? "memorize" : "recall");
  }

  function reset() {
    setBlocks([]);
    setResults([]);
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    setPhase("setup");
  }

  return (
    <main className="learning-word-shell">
      <header className="running-topbar">
        <Link href="/frei" className="back-link">
          ← Freies Üben
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

          <section
            className="learning-word-collections"
            aria-labelledby="collection-title"
          >
            <div>
              <p className="eyebrow">Wörter auswählen</p>
              <h2 id="collection-title">Eigene Wörter oder eine Sammlung</h2>
              <p>
                Die Sammlungen verbinden ein Rechtschreibphänomen mit der
                passenden Strategie aus dem Vault.
              </p>
            </div>
            <div className="learning-word-collection-list">
              <button
                aria-pressed={collectionId === "own"}
                onClick={() => setCollectionId("own")}
                disabled={!interactionReady}
              >
                <strong>Eigene Wörter</strong>
                <span>frei eingeben</span>
              </button>
              {LEARNING_WORD_COLLECTIONS.map((collection) => (
                <button
                  key={collection.id}
                  aria-pressed={collectionId === collection.id}
                  onClick={() => selectCollection(collection.id)}
                  disabled={!interactionReady}
                >
                  <strong>{collection.title}</strong>
                  <span>
                    {collection.strategy} · {collection.words.length} Wörter
                  </span>
                </button>
              ))}
            </div>
          </section>

          <div className="learning-word-config">
            <label>
              Deine Lernwörter
              <textarea
                rows={7}
                value={source}
                onChange={(event) => {
                  setSource(event.target.value);
                  setCollectionId("own");
                }}
              />
              <small>Ein Wort pro Zeile oder durch Komma getrennt.</small>
            </label>
            <aside>
              <p className="eyebrow">Ausgewählte Stufe</p>
              <h2>
                {stage}. {stageCopy[stage].title}
              </h2>
              <p>{stageCopy[stage].detail}</p>
              {collectionId !== "own" && (
                <div className="learning-word-strategy">
                  <strong>
                    {getLearningWordCollection(collectionId)?.strategy}
                  </strong>
                  <span>{getLearningWordCollection(collectionId)?.detail}</span>
                </div>
              )}
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
              <label>
                Wörter in dieser Runde
                <select
                  value={roundSize}
                  onChange={(event) =>
                    setRoundSize(
                      event.target.value === "all"
                        ? "all"
                        : (Number(event.target.value) as 5 | 10 | 20),
                    )
                  }
                >
                  <option value={5}>5 Wörter</option>
                  <option value={10}>10 Wörter</option>
                  <option value={20}>20 Wörter</option>
                  <option value="all">Alle Wörter</option>
                </select>
              </label>
              <strong>{words.length} Wörter in der Wortbank</strong>
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

      {(phase === "memorize" ||
        phase === "recall" ||
        phase === "feedback" ||
        phase === "success") && (
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
                  ref={actionRef}
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
                {stage !== 4 && <h1>{getPrompt(current[0] ?? "", stage)}</h1>}
                {stage === 5 && (
                  <p>{current.length} Wörter aus dem Merkblock</p>
                )}
                {usedHelp && (
                  <div className="learning-word-help" role="status">
                    {current.join(" · ")}
                  </div>
                )}
                {stage === 4 ? (
                  <UnderlineAnswer
                    ref={(element) => {
                      answerRef.current = element;
                    }}
                    word={current[0] ?? ""}
                    value={answer}
                    onChange={setAnswer}
                  />
                ) : (
                  <label>
                    {stage === 5
                      ? "Wörter eingeben · Enter prüft, Umschalt + Enter erzeugt eine neue Zeile"
                      : "Deine Lösung"}
                    {stage === 5 ? (
                      <textarea
                        ref={(element) => {
                          answerRef.current = element;
                        }}
                        rows={Math.max(3, current.length)}
                        value={answer}
                        onChange={(event) => setAnswer(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            event.currentTarget.form?.requestSubmit();
                          }
                        }}
                        spellCheck={false}
                      />
                    ) : (
                      <input
                        ref={(element) => {
                          answerRef.current = element;
                        }}
                        value={answer}
                        onChange={(event) => setAnswer(event.target.value)}
                        spellCheck={false}
                        autoComplete="off"
                      />
                    )}
                  </label>
                )}
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
              <div className="is-wrong">
                <p className="eyebrow">Auswertung</p>
                <h1>Noch nicht sicher</h1>
                <p>
                  Die Wörter bleiben auf Merkstufe {stage}. Versuche sie noch
                  einmal verdeckt abzurufen.
                </p>
                <div className="learning-word-solution">
                  Richtig: <strong>{current.join(" · ")}</strong>
                </div>
                <button
                  ref={actionRef}
                  className="button button--primary"
                  onClick={continueRound}
                >
                  Verdeckt noch einmal versuchen
                </button>
              </div>
            )}

            {phase === "success" && (
              <div className="learning-word-success" role="status">
                <span aria-hidden="true">✓</span>
                <strong>Richtig</strong>
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
            <Link className="button button--quiet" href="/frei">
              Andere Übung wählen
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

const UnderlineAnswer = forwardRef<
  HTMLInputElement,
  { word: string; value: string; onChange: (value: string) => void }
>(function UnderlineAnswer({ word, value, onChange }, ref) {
  const slots = Array.from(word);
  const entered = Array.from(value);

  return (
    <label className="learning-word-underline-answer">
      <span>Deine Lösung</span>
      <span className="learning-word-letter-slots" aria-hidden="true">
        {slots.map((letter, index) => {
          const isLetter = /[\p{L}\p{M}]/u.test(letter);
          return (
            <i
              className={
                isLetter && index === entered.length ? "is-active" : undefined
              }
              key={`${letter}-${index}`}
            >
              {isLetter ? (entered[index] ?? "\u00a0") : letter}
            </i>
          );
        })}
      </span>
      <input
        ref={ref}
        className="learning-word-slot-input"
        aria-label="Deine Lösung"
        value={value}
        maxLength={slots.length}
        onChange={(event) =>
          onChange(
            Array.from(event.target.value).slice(0, slots.length).join(""),
          )
        }
        autoComplete="off"
        spellCheck={false}
      />
    </label>
  );
});
