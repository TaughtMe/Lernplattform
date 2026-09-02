"use client";

import Link from "next/link";
import {
  FormEvent,
  TouchEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { computeRunningDictationStars } from "../../src/domain/running-dictation";
import {
  isBlockedRunningDictationInput,
  isSuspiciousRunningDictationInsert,
  pickRunningDictationBattleCandidates,
  sanitizeStrictMathAnswer,
  STRICT_RUNNING_DICTATION_INPUT_ATTRIBUTES,
} from "../../src/domain/running-dictation-input";
import {
  checkLiveAnswer,
  liveWordKind,
  type LiveSession,
} from "../../src/integrations/laufdiktat/live-session";
import type { LiveProgress } from "../../src/integrations/laufdiktat/room-api";
import {
  buildLiveVocabularyTransfer,
  liveWordErrorKey,
} from "../../src/integrations/laufdiktat/vocabulary-transfer";
import {
  createLearningBoxRepository,
  createPersonalLearningEventRepository,
} from "../../src/storage/personal-learning-events";
import { LiveStationGame } from "./live-station-game";
import { MathDisplay } from "./math-display";
import { LAUFDIKTAT_PILOT } from "../../src/pilot-mode";
import { useLiveSessionGuards } from "./use-live-session-guards";
import { useAutoFitFontSize } from "./use-auto-fit-font-size";

type Phase = "idle" | "revealed" | "write" | "wrong" | "correct" | "complete";
type AttackType = "ink" | "flicker";

type LiveRunningDictationGameProps = {
  code: string;
  studentName: string;
  session: LiveSession;
  connectionWarning: string;
  initialProgress: LiveProgress | null;
  onProgress: (progress: LiveProgress) => void;
  onLoadProgress?: (studentKey: string) => Promise<LiveProgress | null>;
  roster?: Record<string, number>;
  incomingAttack?: { id: number; type: AttackType; from: string } | null;
  onSendAttack?: (to: string, type: AttackType) => boolean;
};

export function LiveRunningDictationGame({
  code,
  studentName,
  session,
  connectionWarning,
  initialProgress,
  onProgress,
  onLoadProgress,
  roster = {},
  incomingAttack,
  onSendAttack,
}: LiveRunningDictationGameProps) {
  const learningBoxRepository = useMemo(
    () => createLearningBoxRepository(),
    [],
  );
  const learningEventRepository = useMemo(
    () => createPersonalLearningEventRepository(),
    [],
  );
  const restoredIndex = Math.min(
    initialProgress?.currentIndex ?? 0,
    session.words.length - 1,
  );
  const [index, setIndex] = useState(restoredIndex);
  const [phase, setPhase] = useState<Phase>(
    initialProgress?.finished ? "complete" : "idle",
  );
  const [answer, setAnswer] = useState("");
  const [attempts, setAttempts] = useState(initialProgress?.attempts ?? 0);
  const [peeks, setPeeks] = useState(initialProgress?.peeks ?? 0);
  const [errors, setErrors] = useState(initialProgress?.errors ?? 0);
  const [wordErrors, setWordErrors] = useState<Record<string, number>>(
    initialProgress?.wordErrors ?? {},
  );
  const [revealedCurrentWord, setRevealedCurrentWord] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [exitCountdown, setExitCountdown] = useState(3);
  useEffect(() => {
    if (!showExitConfirm || exitCountdown <= 0) return;
    const timer = window.setTimeout(
      () => setExitCountdown((value) => value - 1),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [showExitConfirm, exitCountdown]);
  const [charge, setCharge] = useState(0);
  const [shield, setShield] = useState(false);
  const [picker, setPicker] = useState<AttackType | null>(null);
  const [activeAttack, setActiveAttack] = useState<AttackType | null>(null);
  const [battleMessage, setBattleMessage] = useState("");
  const [transferNotice, setTransferNotice] = useState("");
  const [localSaveWarning, setLocalSaveWarning] = useState("");
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(true);
  const [transferStatus, setTransferStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const startedAt = useRef(0);
  const lastAttackId = useRef(0);
  const transferStartedFor = useRef("");
  const answerRef = useRef<HTMLInputElement>(null);
  const current = session.words[index];
  useLiveSessionGuards(phase !== "complete");

  const kind = current ? liveWordKind(current) : "text";
  const prompt = current ? (current.prompt ?? current.targetWord) : "";
  const isLatexPrompt = current?.isLatex ?? false;
  const {
    containerRef: revealContainerRef,
    textRef: revealTextRef,
    fontSize: revealFontSize,
  } = useAutoFitFontSize(prompt, { min: 28, max: 88 });

  useEffect(() => {
    if (phase !== "correct") return;
    const timer = window.setTimeout(() => {
      if (index + 1 >= session.words.length) {
        setPhase("complete");
        onProgress({
          currentIndex: session.words.length,
          peeks,
          attempts,
          errors,
          finished: true,
          durationMs: Date.now() - startedAt.current,
          wordErrors,
        });
        return;
      }
      setIndex((value) => value + 1);
      setAnswer("");
      setRevealedCurrentWord(false);
      setPhase("idle");
      onProgress({
        currentIndex: index + 1,
        peeks,
        attempts,
        errors,
        finished: false,
        wordErrors,
      });
    }, 550);
    return () => window.clearTimeout(timer);
  }, [
    attempts,
    errors,
    index,
    onProgress,
    peeks,
    phase,
    session.words.length,
    wordErrors,
  ]);

  useEffect(() => {
    if (phase !== "write") return;
    const timer = window.setTimeout(() => answerRef.current?.focus(), 10);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (!incomingAttack || session.gameMode !== "BATTLE") return;
    if (lastAttackId.current === incomingAttack.id) return;
    lastAttackId.current = incomingAttack.id;
    let endTimer = 0;
    const startTimer = window.setTimeout(() => {
      if (shield) {
        setShield(false);
        setBattleMessage(`Angriff von ${incomingAttack.from} geblockt.`);
        return;
      }
      setActiveAttack(incomingAttack.type);
      setBattleMessage(
        incomingAttack.type === "ink"
          ? `Tintenangriff von ${incomingAttack.from}`
          : `Flimmerangriff von ${incomingAttack.from}`,
      );
      endTimer = window.setTimeout(() => {
        setActiveAttack(null);
        setBattleMessage("");
      }, 15_000);
    }, 0);
    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(endTimer);
    };
  }, [incomingAttack, session.gameMode, shield]);

  useEffect(() => {
    if (LAUFDIKTAT_PILOT || phase !== "complete" || session.stationMode) return;
    const transfer = buildLiveVocabularyTransfer(session, wordErrors);
    if (!transfer || transferStartedFor.current === session.sessionId) return;
    transferStartedFor.current = session.sessionId;
    learningBoxRepository
      .ingestBundle({
        bundle: transfer.bundle,
        title: transfer.title,
        source: {
          kind: "running-dictation",
          sourceId: session.sessionId,
        },
      })
      .then((result) => {
        setTransferStatus("success");
        setTransferNotice(
          result.added > 0
            ? result.added === 1
              ? "1 Vokabel wurde in deine LernBox übernommen."
              : `${result.added} Vokabeln wurden in deine LernBox übernommen.`
            : result.reused === 1
              ? "1 vorhandene Vokabel wurde wieder fällig markiert."
              : `${result.reused} vorhandene Vokabeln wurden wieder fällig markiert.`,
        );
      })
      .catch(() => {
        setTransferStatus("error");
        setTransferNotice(
          "Die Vokabeln konnten auf diesem Gerät nicht übernommen werden.",
        );
      });
  }, [learningBoxRepository, phase, session, wordErrors]);

  if (session.stationMode) {
    return onLoadProgress ? (
      <LiveStationGame
        code={code}
        session={session}
        connectionWarning={connectionWarning}
        onProgress={onProgress}
        onLoadProgress={onLoadProgress}
      />
    ) : null;
  }

  if (phase === "complete") {
    const stars = computeRunningDictationStars(errors, session.words.length);
    return (
      <div className="live-game-page">
        <section className="live-game-complete" aria-live="polite">
          <span aria-hidden="true" className="live-game-complete__trophy">
            🏆
          </span>
          <p className="eyebrow">Raum {code} · Runde abgeschlossen</p>
          <h1>Geschafft, {studentName}!</h1>
          {session.showStars ? (
            <div
              className="running-stars"
              aria-label={`${stars} von 5 Sternen`}
            >
              <span>{"★".repeat(stars)}</span>
              <i>{"★".repeat(5 - stars)}</i>
            </div>
          ) : null}
          <p>
            {session.words.length} Aufgaben · {errors} Fehlversuche
          </p>
          <p>
            Dein Ergebnis wurde nur an diese kurzlebige Unterrichtsrunde
            zurückgegeben.
          </p>
          {localSaveWarning ? (
            <p className="live-game-warning" role="alert">
              {localSaveWarning}
            </p>
          ) : null}
          {transferNotice ? <p role="status">{transferNotice}</p> : null}
          <div className="live-game-complete__actions">
            <Link className="button button--primary" href="/">
              Zurück zur Startseite
            </Link>
            {transferStatus === "success" ? (
              <Link className="button" href="/lernbox">
                Übernommene Vokabeln üben
              </Link>
            ) : null}
          </div>
        </section>
      </div>
    );
  }

  if (!current) return null;
  const activeWord = current;
  const errorKey = liveWordErrorKey(activeWord);
  const assistanceVisible =
    phase === "wrong" &&
    session.uebungAssistanceEnabled &&
    (wordErrors[errorKey] ?? 0) >= session.uebungMaxAttempts;
  const battleCandidates = pickRunningDictationBattleCandidates(
    roster,
    studentName,
    index,
  );
  const objectLabel = kind === "math" ? "die Aufgabe" : "das Wort";

  function revealWord() {
    if (startedAt.current === 0) startedAt.current = Date.now();
    if (revealedCurrentWord) {
      setPeeks((value) => value + 1);
    } else {
      setRevealedCurrentWord(true);
    }
    setPhase("revealed");
  }

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (phase === "complete") return;
    if (event.touches.length >= 2 && phase === "idle") revealWord();
  }

  function onTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (phase === "complete") return;
    if (event.touches.length < 2 && phase === "revealed") setPhase("write");
  }

  function readPromptAloud() {
    if (!("speechSynthesis" in window) || !prompt) return;
    window.speechSynthesis.cancel();
    const spoken =
      kind === "math"
        ? prompt
            .replace(/\+/g, " plus ")
            .replace(/[−-]/g, " minus ")
            .replace(/[·*×]/g, " mal ")
            .replace(/[:/÷]/g, " geteilt durch ")
        : prompt;
    const utterance = new SpeechSynthesisUtterance(spoken);
    utterance.lang = activeWord.promptLang ?? "de-DE";
    window.speechSynthesis.speak(utterance);
    setPeeks((value) => value + 1);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!answer.trim()) return;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    const isCorrect = checkLiveAnswer(activeWord, answer);
    if (!LAUFDIKTAT_PILOT) {
      void learningEventRepository
        .put({
          id: crypto.randomUUID(),
          learningObjectId: `live:${liveWordErrorKey(activeWord)}`.slice(
            0,
            200,
          ),
          occurredAt: new Date().toISOString(),
          source: "running-dictation",
          learningArea:
            kind === "vocabulary"
              ? "vocabulary"
              : kind === "math"
                ? "mathematics"
                : "german",
          roundId: session.sessionId,
          direction: "prompt-to-answer",
          answerMode: "typed",
          help: "none",
          practice: {
            title: "Unterrichtsrunde wiederholen",
            route: "/lernen",
          },
          assessment: {
            knowledge: isCorrect ? "correct" : "incorrect",
            writing: isCorrect ? "correct" : "incorrect",
            selfCorrected: false,
          },
        })
        .catch(() =>
          setLocalSaveWarning(
            "Dieser Versuch konnte nicht im lokalen Lernverlauf gespeichert werden.",
          ),
        );
    }
    if (isCorrect) {
      setLastAnswerCorrect(true);
      if (session.gameMode === "BATTLE") {
        const othersAhead = Object.entries(roster).filter(
          ([name, otherIndex]) => name !== studentName && otherIndex > index,
        ).length;
        setCharge((value) =>
          Math.min(100, value + (othersAhead >= 1 ? 34 : 25)),
        );
      }
      setPhase("correct");
      return;
    }

    const key = errorKey;
    const nextErrors = errors + 1;
    const nextWordErrors = {
      ...wordErrors,
      [key]: (wordErrors[key] ?? 0) + 1,
    };
    setErrors(nextErrors);
    setWordErrors(nextWordErrors);
    onProgress({
      currentIndex: index,
      peeks,
      attempts: nextAttempts,
      errors: nextErrors,
      finished: false,
      wordErrors: nextWordErrors,
    });

    if (session.gameMode === "LAUFDIKTAT") {
      setLastAnswerCorrect(false);
      setPhase("correct");
    } else {
      setPhase("wrong");
    }
  }

  return (
    <div
      className={`live-game-page is-active-round${activeAttack === "flicker" ? " is-flickering" : ""}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <header className="live-game-page__header">
        <button
          type="button"
          className="live-game-page__icon-button"
          onClick={() => {
            setExitCountdown(3);
            setShowExitConfirm(true);
          }}
          aria-label="Spiel verlassen"
          title="Spiel verlassen"
        >
          ←
        </button>
        <div className="live-game-page__meta">
          <span>Raum {code}</span>
          <strong>
            {index + 1} / {session.words.length}
          </strong>
        </div>
        <div className="live-game-page__stats">
          {session.isTtsEnabled ? (
            <button
              type="button"
              className="live-game-page__icon-button"
              onClick={readPromptAloud}
              title="Vorlesen (zählt als Spicker)"
              aria-label="Vorlesen"
            >
              🔊
            </button>
          ) : null}
          <span>Spicker {peeks}</span>
          <span>Fehler {errors}</span>
        </div>
      </header>

      {connectionWarning ? (
        <p className="live-game-warning" role="status">
          {connectionWarning}
        </p>
      ) : null}

      {session.gameMode === "BATTLE" ? (
        <section className="live-battle" aria-label="Battle-Aktionen">
          <div className="live-battle__charge">
            <span>Battle-Ladung</span>
            <progress max="100" value={charge}>
              {charge}%
            </progress>
            <strong>{charge}%</strong>
          </div>
          <div className="live-battle__actions">
            {session.battleOptions.ink ? (
              <button disabled={charge < 100} onClick={() => setPicker("ink")}>
                Tinte
              </button>
            ) : null}
            {session.battleOptions.flicker ? (
              <button
                disabled={charge < 100}
                onClick={() => setPicker("flicker")}
              >
                Flimmern
              </button>
            ) : null}
            <button
              disabled={charge < 100}
              aria-pressed={shield}
              onClick={() => {
                setShield(true);
                setCharge(0);
                setPicker(null);
                setBattleMessage("Schild aktiviert.");
              }}
            >
              Schild
            </button>
          </div>
          {picker ? (
            <div className="live-battle__targets">
              <strong>Wen möchtest du treffen?</strong>
              {battleCandidates.map(({ name }) => (
                <button
                  key={name}
                  onClick={() => {
                    if (onSendAttack?.(name, picker)) {
                      setCharge(0);
                      setPicker(null);
                      setBattleMessage(`Angriff auf ${name} gestartet.`);
                    }
                  }}
                >
                  {name}
                </button>
              ))}
              {!Object.keys(roster).some((name) => name !== studentName) ? (
                <p>Noch kein Mitspieler als Ziel sichtbar.</p>
              ) : null}
              <button className="text-button" onClick={() => setPicker(null)}>
                Abbrechen
              </button>
            </div>
          ) : null}
          {battleMessage ? <p role="status">{battleMessage}</p> : null}
        </section>
      ) : null}

      {activeAttack === "ink" ? (
        <div className="live-battle__ink" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      ) : null}

      <main className="live-game-page__stage">
        <div
          className={`live-game-page__edge live-game-page__edge--left${phase === "idle" ? " is-waiting" : ""}`}
          aria-hidden="true"
        />
        <div
          className={`live-game-page__edge live-game-page__edge--right${phase === "idle" ? " is-waiting" : ""}`}
          aria-hidden="true"
        />

        {phase === "idle" ? (
          <p className="live-game-idle-hint">
            Mit zwei Fingern an den Bildschirmrändern halten, um {objectLabel}{" "}
            zu sehen.
          </p>
        ) : null}

        {phase === "revealed" ? (
          <div ref={revealContainerRef} className="live-game-reveal">
            <h1 ref={revealTextRef} style={{ fontSize: `${revealFontSize}px` }}>
              <MathDisplay text={prompt} isLatex={isLatexPrompt} />
            </h1>
          </div>
        ) : null}

        {phase === "write" ? (
          <form className="live-game-write" onSubmit={submit}>
            <p className="eyebrow">Aus dem Gedächtnis</p>
            <h2>
              {kind === "vocabulary" || kind === "math" ? (
                <MathDisplay text={prompt} isLatex={isLatexPrompt} />
              ) : (
                "Was hast du dir gemerkt?"
              )}
            </h2>
            <div className="live-game-write__field">
              <input
                ref={answerRef}
                id="live-game-answer"
                aria-label="Deine Antwort"
                inputMode={kind === "math" ? "decimal" : "text"}
                autoComplete="off"
                spellCheck={false}
                value={answer}
                {...(session.strictTypingMode
                  ? {
                      autoCorrect:
                        STRICT_RUNNING_DICTATION_INPUT_ATTRIBUTES.autoCorrect,
                      autoCapitalize:
                        STRICT_RUNNING_DICTATION_INPUT_ATTRIBUTES.autoCapitalize,
                    }
                  : {})}
                onBeforeInput={(event) => {
                  if (
                    session.strictTypingMode &&
                    isBlockedRunningDictationInput(
                      (event.nativeEvent as InputEvent).inputType,
                    )
                  ) {
                    event.preventDefault();
                  }
                }}
                onPaste={(event) => {
                  if (session.strictTypingMode) event.preventDefault();
                }}
                onDrop={(event) => {
                  if (session.strictTypingMode) event.preventDefault();
                }}
                onChange={(event) => {
                  let next = event.target.value;
                  if (session.strictTypingMode && kind === "math") {
                    next = sanitizeStrictMathAnswer(next);
                  }
                  if (
                    session.strictTypingMode &&
                    isSuspiciousRunningDictationInsert(answer, next)
                  ) {
                    return;
                  }
                  setAnswer(next);
                }}
              />
              <button
                type="submit"
                className="live-game-write__submit"
                aria-label="Bestätigen"
              >
                ✓
              </button>
            </div>
            <button
              type="button"
              className="text-button"
              onClick={() => setPhase("idle")}
            >
              {objectLabel === "die Aufgabe" ? "Aufgabe" : "Wort"} nochmal
              ansehen
            </button>
          </form>
        ) : null}

        {phase === "wrong" ? (
          <div className="live-game-feedback is-wrong">
            <span aria-hidden="true">×</span>
            <p className="eyebrow">Noch nicht richtig</p>
            <h1>
              {assistanceVisible
                ? "Präge dir die Lösung ein."
                : "Versuch es noch einmal."}
            </h1>
            {assistanceVisible ? (
              <p className="live-game-assistance">
                Die Lösung ist: <strong>{activeWord.targetWord}</strong>
              </p>
            ) : null}
            <button
              className="button button--primary"
              onClick={() => {
                setAnswer("");
                setPhase("write");
              }}
            >
              {assistanceVisible
                ? "Lösung verdecken und erneut abrufen"
                : "Weiter üben"}
            </button>
          </div>
        ) : null}

        {phase === "correct" ? (
          <div
            className={`live-game-feedback ${lastAnswerCorrect ? "is-correct" : "is-wrong"}`}
          >
            <span aria-hidden="true">{lastAnswerCorrect ? "✓" : "×"}</span>
            <p>{lastAnswerCorrect ? "Richtig" : "Nicht richtig"}</p>
          </div>
        ) : null}
      </main>

      {showExitConfirm ? (
        <div
          className="live-game-exit-confirm"
          role="alertdialog"
          aria-modal="true"
        >
          <div className="live-game-exit-confirm__card">
            <h2>Spiel verlassen?</h2>
            <p>Dein bisheriger Fortschritt in dieser Runde bleibt erhalten.</p>
            <div className="live-game-exit-confirm__actions">
              <button
                type="button"
                className="button button--quiet"
                onClick={() => setShowExitConfirm(false)}
              >
                Weiter üben
              </button>
              {exitCountdown > 0 ? (
                <button
                  type="button"
                  className="button button--primary"
                  disabled
                >
                  Zur Startseite ({exitCountdown})
                </button>
              ) : (
                <Link className="button button--primary" href="/">
                  Zur Startseite
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
