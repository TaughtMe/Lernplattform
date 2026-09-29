"use client";

import Link from "next/link";
import { StudentPage } from "../ui/shell/student-page";
import { Icon } from "../ui/icons";
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
import { createLearningWordProgressRepository } from "../../src/storage/personal-learning-events";

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
  const repository = useMemo(() => createLearningWordProgressRepository(), []);
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
  const [dueWords, setDueWords] = useState<
    Array<{ word: string; stage: LearningWordStage }>
  >([]);
  const [secureWords, setSecureWords] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const dueCount = dueWords.length;
  const [storageIssue, setStorageIssue] = useState(false);
  const answerRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundIdRef = useRef(crypto.randomUUID());
  const interactionReady = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const current = blocks[index] ?? [];
  const words = useMemo(() => parseLearningWords(source), [source]);

  useEffect(() => {
    if (phase !== "setup") return;
    Promise.all([repository.listDue(), repository.list()])
      .then(([due, all]) => {
        setDueWords(due.map(({ word, stage }) => ({ word, stage })));
        // „Sicher“ heißt: mindestens Box 3, also mehrfach verdeckt richtig.
        setSecureWords(
          new Set(
            all
              .filter((entry) => entry.box >= 3)
              .map((entry) => wordKey(entry.word)),
          ),
        );
      })
      .catch(() => setStorageIssue(true));
  }, [repository, phase]);

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

  function startMixed() {
    if (!dueWords.length) return;
    // Fällige Wörter aus allen Themen; die Runde beginnt auf der leichtesten Stufe.
    const mixedStage = Math.min(
      ...dueWords.map((entry) => entry.stage),
    ) as LearningWordStage;
    const mixedWords = dueWords.map((entry) => entry.word);
    setCollectionId("due");
    setSource(mixedWords.join("\n"));
    setStage(mixedStage);
    beginRound(mixedWords, mixedStage);
  }

  function start() {
    beginRound(words, stage);
  }

  function beginRound(pool: string[], roundStage: LearningWordStage) {
    if (!pool.length) return;
    const roundWords = selectLearningWordRound(pool, roundSize);
    setBlocks(chunkLearningWords(roundWords, roundStage === 5 ? blockSize : 1));
    setIndex(0);
    setAnswer("");
    setUsedHelp(false);
    setIncorrectAttempts(0);
    setResults([]);
    roundIdRef.current = crypto.randomUUID();
    setPhase(roundStage >= 4 ? "memorize" : "recall");
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
      repository
        .recordAttempt({
          words: current,
          correct: true,
          usedHelp,
          selfCorrected: nextIncorrectAttempts > 0,
          stage,
          roundId: roundIdRef.current,
          attemptId: `${index}:${incorrectAttempts + 1}`,
        })
        .catch(() => setStorageIssue(true));
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
    repository
      .recordAttempt({
        words: current,
        correct: false,
        usedHelp,
        selfCorrected: false,
        stage,
        roundId: roundIdRef.current,
        attemptId: `${index}:${incorrectAttempts + 1}`,
      })
      .catch(() => setStorageIssue(true));
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

  const collection = getLearningWordCollection(collectionId);
  const inSession =
    phase === "memorize" ||
    phase === "recall" ||
    phase === "feedback" ||
    phase === "success";
  const sessionTitle =
    collectionId === "due"
      ? "Gemischt"
      : (collection?.title ?? "Eigene Wörter");

  return (
    <StudentPage activePath="/frei/german/lernwoerter">
      <div className="ui-ws">
        {phase === "setup" && (
          <section className="ui-stack" aria-labelledby="word-title">
            <h1 id="word-title" className="ui-h-page">
              Wortspeicher
            </h1>

            <div className="ui-card ui-card--dark ui-ws__hero">
              <div className="ui-grow">
                <p>
                  <span className="ui-ws__hero-count">{dueCount}</span>{" "}
                  <span className="ui-ws__hero-label">
                    {dueCount === 1
                      ? "Trainingswort heute"
                      : "Trainingswörter heute"}
                  </span>
                </p>
                <p className="ui-small ui-muted">
                  {dueCount > 0
                    ? "Fällige Wörter aus deinen Runden, quer durch alle Themen."
                    : "Noch nichts fällig. Wähle ein Thema und probiere eine Merkstufe aus."}
                </p>
              </div>
              <button
                type="button"
                className="ui-btn ui-btn--gold"
                disabled={!interactionReady || dueCount === 0}
                onClick={startMixed}
              >
                Gemischt trainieren
              </button>
            </div>

            {storageIssue && (
              <p className="ui-notice ui-notice--bad" role="status">
                Dein Lernstand konnte gerade nicht vollständig gespeichert
                werden.
              </p>
            )}

            <div className="ui-between">
              <h2 id="collection-title" className="ui-label">
                Themen · antippen wählt die Wörter
              </h2>
              <span className="ui-small ui-muted">
                {words.length} Wörter ausgewählt
              </span>
            </div>
            <div className="ui-ws__grid" aria-labelledby="collection-title">
              {LEARNING_WORD_COLLECTIONS.map((item) => {
                const secure = item.words.filter((word) =>
                  secureWords.has(wordKey(word)),
                ).length;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="ui-select-card ui-ws__set"
                    aria-pressed={collectionId === item.id}
                    onClick={() => {
                      selectCollection(item.id);
                    }}
                    disabled={!interactionReady}
                  >
                    <strong>{item.title}</strong>
                    <span className="ui-small ui-muted">
                      {item.words.slice(0, 3).join(", ")}
                    </span>
                    <span className="ui-pill">{item.strategy}</span>
                    <span className="ui-ws__set-progress">
                      <span className="ui-bar ui-bar--green ui-grow">
                        <span
                          style={{
                            width: `${(secure / Math.max(1, item.words.length)) * 100}%`,
                          }}
                        />
                      </span>
                      <span className="ui-tiny">
                        {secure} / {item.words.length} sicher
                      </span>
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                className="ui-select-card ui-ws__set"
                aria-pressed={collectionId === "own"}
                onClick={() => {
                  setCollectionId("own");
                }}
                disabled={!interactionReady}
              >
                <strong>Eigene Wörter</strong>
                <span className="ui-small ui-muted">frei eingeben</span>
                <span className="ui-pill">Wortliste</span>
              </button>
            </div>

            <section
              className="ui-card ui-card--pad ui-stack ui-ws__config"
              aria-labelledby="stage-title"
            >
              <div className="ui-between ui-wrap">
                <h2 id="stage-title" className="ui-h-section">
                  Merkstufe wählen
                </h2>
                {collection ? (
                  <span className="ui-small ui-muted">
                    Strategie: <strong>{collection.strategy}</strong> ·{" "}
                    {collection.detail}
                  </span>
                ) : null}
              </div>
              <ol className="ui-ws__stages" aria-label="Merkstufe wählen">
                {LEARNING_WORD_STAGES.map((value) => (
                  <li key={value}>
                    <button
                      type="button"
                      className="ui-select-card"
                      aria-pressed={stage === value}
                      onClick={() => setStage(value)}
                      disabled={!interactionReady}
                    >
                      <span className="ui-ws__stage-number">{value}</span>
                      <strong>{stageCopy[value].title}</strong>
                      <small className="ui-tiny ui-muted">
                        {stageCopy[value].detail}
                      </small>
                    </button>
                  </li>
                ))}
              </ol>

              <details className="ui-ws__words" open>
                <summary>
                  <Icon name="list" size={16} /> Wortliste ansehen und
                  bearbeiten
                </summary>
                <label
                  className="ui-stack"
                  style={{ ["--gap" as string]: "6px" }}
                >
                  <span className="ui-small ui-muted">Deine Lernwörter</span>
                  <textarea
                    className="ui-textarea"
                    rows={6}
                    value={source}
                    onChange={(event) => {
                      setSource(event.target.value);
                      setCollectionId("own");
                    }}
                  />
                  <small className="ui-tiny ui-muted">
                    Ein Wort pro Zeile oder durch Komma getrennt.
                  </small>
                </label>
              </details>

              <div className="ui-row ui-wrap ui-ws__settings">
                {stage === 5 && (
                  <label
                    className="ui-stack"
                    style={{ ["--gap" as string]: "4px" }}
                  >
                    <span className="ui-tiny ui-muted">
                      Wörter pro Merkblock
                    </span>
                    <select
                      className="ui-input"
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
                <label
                  className="ui-stack"
                  style={{ ["--gap" as string]: "4px" }}
                >
                  <span className="ui-tiny ui-muted">
                    Wörter in dieser Runde
                  </span>
                  <select
                    className="ui-input"
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
                <button
                  type="button"
                  className="ui-btn ui-btn--primary ui-ws__start"
                  onClick={start}
                  disabled={!interactionReady || words.length === 0}
                >
                  Stufe ausprobieren
                </button>
              </div>
            </section>
          </section>
        )}

        {inSession && (
          <section className="ui-ws__session" aria-live="polite">
            <header className="ui-row">
              <button
                type="button"
                className="ui-icon-btn ui-icon-btn--square"
                aria-label="Übung beenden"
                onClick={reset}
              >
                <Icon name="back" size={18} />
              </button>
              <div className="ui-grow ui-ws__progress">
                <p className="ui-h-section">{sessionTitle}</p>
                <span className="ui-small ui-muted">
                  Merkstufe {stage} · {stageCopy[stage].title} · Wort{" "}
                  <strong>
                    {index + 1} / {blocks.length}
                  </strong>
                </span>
              </div>
            </header>
            <div
              className="ui-bar"
              role="progressbar"
              aria-label="Fortschritt der Runde"
              aria-valuemin={0}
              aria-valuemax={blocks.length}
              aria-valuenow={index + 1}
            >
              <span
                style={{ width: `${((index + 1) / blocks.length) * 100}%` }}
              />
            </div>

            <article className="ui-card ui-card--raised ui-ws__card">
              {phase === "memorize" && (
                <>
                  <p className="ui-eyebrow">Ansehen und merken</p>
                  <div className="ui-ws__memory">
                    {current.map((word) => (
                      <strong key={word}>{word}</strong>
                    ))}
                  </div>
                  <p className="ui-small ui-muted">
                    {stage === 5
                      ? "Merke dir alle Wörter. Beim Eingeben ist die Reihenfolge egal."
                      : "Präge dir das Wort ein. Danach bleibt nur seine Länge sichtbar."}
                  </p>
                  <button
                    ref={actionRef}
                    type="button"
                    className="ui-btn ui-btn--primary"
                    onClick={() => setPhase("recall")}
                  >
                    Wörter verdecken
                  </button>
                </>
              )}

              {phase === "recall" && (
                <form className="ui-ws__recall" onSubmit={submit}>
                  <p className="ui-eyebrow">Selbstständig schreiben</p>
                  {stage !== 4 && (
                    <h2 className="ui-ws__prompt">
                      {getPrompt(current[0] ?? "", stage)}
                    </h2>
                  )}
                  {stage === 5 && (
                    <p className="ui-small ui-muted">
                      {current.length} Wörter aus dem Merkblock
                    </p>
                  )}
                  {usedHelp && (
                    <div className="ui-notice" role="status">
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
                    <label
                      className="ui-stack"
                      style={{ ["--gap" as string]: "6px" }}
                    >
                      <span className="ui-small ui-muted">
                        {stage === 5
                          ? "Wörter eingeben · Enter prüft, Umschalt + Enter erzeugt eine neue Zeile"
                          : "Deine Lösung"}
                      </span>
                      {stage === 5 ? (
                        <textarea
                          ref={(element) => {
                            answerRef.current = element;
                          }}
                          className="ui-textarea"
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
                          className="ui-field ui-center"
                          placeholder="Wort schreiben"
                          value={answer}
                          onChange={(event) => setAnswer(event.target.value)}
                          spellCheck={false}
                          autoComplete="off"
                          autoCapitalize="off"
                        />
                      )}
                    </label>
                  )}
                  <div className="ui-grid2">
                    <button
                      type="button"
                      className="ui-btn ui-btn--ghost"
                      onClick={() => setUsedHelp(true)}
                    >
                      Wort noch einmal zeigen
                    </button>
                    <button type="submit" className="ui-btn ui-btn--primary">
                      Prüfen
                    </button>
                  </div>
                </form>
              )}

              {phase === "feedback" && (
                <div className="ui-stack ui-center">
                  <p className="ui-eyebrow">Auswertung</p>
                  <h2 className="ui-h-fun">Noch nicht sicher</h2>
                  <p className="ui-small ui-muted">
                    Die Wörter bleiben auf Merkstufe {stage}. Versuche sie noch
                    einmal verdeckt abzurufen.
                  </p>
                  <div className="ui-feedback ui-feedback--bad">
                    <span>
                      Richtig: <strong>{current.join(" · ")}</strong>
                    </span>
                  </div>
                  <button
                    ref={actionRef}
                    type="button"
                    className="ui-btn ui-btn--primary"
                    onClick={continueRound}
                  >
                    Verdeckt noch einmal versuchen
                  </button>
                </div>
              )}

              {phase === "success" && (
                <div className="ui-feedback ui-feedback--good" role="status">
                  <Icon name="check" size={22} />
                  <strong>Richtig</strong>
                </div>
              )}
            </article>
          </section>
        )}

        {phase === "complete" && (
          <section className="ui-card ui-card--raised ui-ws__complete">
            <p className="ui-eyebrow">Merkstrecke abgeschlossen</p>
            <h1 className="ui-h-fun">Du hast die Stufe ausprobiert.</h1>
            <div className="ui-grid3 ui-ws__results">
              <article>
                <strong>
                  {results.filter((result) => result.nextStage > stage).length}
                </strong>
                <span className="ui-tiny ui-muted">
                  bereit für die nächste Stufe
                </span>
              </article>
              <article>
                <strong>
                  {results.filter((result) => result.nextStage <= stage).length}
                </strong>
                <span className="ui-tiny ui-muted">
                  auf dieser oder einer leichteren Stufe
                </span>
              </article>
              <article>
                <strong>
                  {results.filter((result) => result.usedHelp).length}
                </strong>
                <span className="ui-tiny ui-muted">mit Hilfe</span>
              </article>
            </div>
            <p className="ui-small ui-muted">
              Merkstufe und Wiederholungsfälligkeit wurden lokal gespeichert.
              Fehler machen die betroffenen Wörter sofort wieder fällig; sichere
              Lösungen verlängern den Abstand bis zur nächsten Wiederholung.
            </p>
            <div
              className="ui-row ui-wrap"
              style={{ justifyContent: "center" }}
            >
              <button
                type="button"
                className="ui-btn ui-btn--primary"
                onClick={reset}
              >
                Andere Stufe testen
              </button>
              <Link className="ui-btn ui-btn--ghost" href="/lernen">
                Andere Übung wählen
              </Link>
            </div>
          </section>
        )}
      </div>
    </StudentPage>
  );
}

function wordKey(word: string) {
  return word.normalize("NFC").trim().toLocaleLowerCase("de-DE");
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
    <label className="ui-ws__slots-answer">
      <span>Deine Lösung</span>
      <span className="ui-ws__slots" aria-hidden="true">
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
        className="ui-ws__slot-input"
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
