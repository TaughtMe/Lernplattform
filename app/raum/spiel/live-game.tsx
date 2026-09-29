"use client";

import {
  FormEvent,
  TouchEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { LearningEventV1 } from "../../../src/domain/learning-bundle";
import {
  battleChargeGain,
  speedPoints,
} from "../../../src/domain/live-game-feedback";
import { mathTaskFromPrompt } from "../../../src/domain/math-practice";
import {
  buildRunningDictationHint,
  computeRunningDictationStars,
} from "../../../src/domain/running-dictation";
import {
  isBlockedRunningDictationInput,
  isSuspiciousRunningDictationInsert,
  pickRunningDictationBattleCandidates,
  sanitizeStrictMathAnswer,
  STRICT_RUNNING_DICTATION_INPUT_ATTRIBUTES,
} from "../../../src/domain/running-dictation-input";
import {
  checkLiveAnswer,
  liveWordKind,
  type LiveSession,
} from "../../../src/integrations/laufdiktat/live-session";
import type { ProgressDeliveryStatus } from "../../../src/integrations/laufdiktat/progress-delivery";
import type { LiveProgress } from "../../../src/integrations/laufdiktat/room-api";
import {
  buildLiveVocabularyTransfer,
  liveWordErrorKey,
} from "../../../src/integrations/laufdiktat/vocabulary-transfer";
import { LAUFDIKTAT_PILOT } from "../../../src/pilot-mode";
import { createMathAttempt } from "../../../src/storage/math-practice";
import {
  createLearningBoxRepository,
  createPersonalLearningEventRepository,
} from "../../../src/storage/personal-learning-events";
import { MathDisplay } from "../../components/math-display";
import { useAutoFitFontSize } from "../../components/use-auto-fit-font-size";
import { useLiveSessionGuards } from "../../components/use-live-session-guards";
import { AnimalImage } from "../../ui/animal";
import { Icon } from "../../ui/icons";
import { Button, ButtonLink, Pill, ProgressBar } from "../../ui/primitives";
import { Sheet } from "../../ui/sheet";
import {
  CopyGuide,
  DeliveryNotice,
  GameHeader,
  GameWarning,
  HoldEdges,
  ProgressSegments,
} from "./game-parts";
import { LiveStationGame } from "./station-game";

type Phase = "idle" | "revealed" | "write" | "correct" | "complete";
type AttackType = "ink" | "flicker";

type LiveRunningDictationGameProps = {
  code: string;
  studentName: string;
  session: LiveSession;
  connectionWarning: string;
  initialProgress: LiveProgress | null;
  onProgress: (progress: LiveProgress) => void;
  deliveryStatus?: ProgressDeliveryStatus;
  onRetryProgress?: () => void;
  onLoadProgress?: (studentKey: string) => Promise<LiveProgress | null>;
  roster?: Record<string, number>;
  incomingAttack?: { id: number; type: AttackType; from: string } | null;
  onSendAttack?: (to: string, type: AttackType) => boolean;
  /** Angezeigter Tiername (z. B. „Fuchs 2“); studentName ist ein anonymer Schlüssel. */
  displayName?: string | null;
  animal?: string | null;
};

export function LiveRunningDictationGame({
  code,
  studentName,
  session,
  connectionWarning,
  initialProgress,
  onProgress,
  onLoadProgress,
  deliveryStatus = "idle",
  onRetryProgress,
  roster = {},
  incomingAttack,
  onSendAttack,
  displayName: displayNameProp = null,
  animal = null,
}: LiveRunningDictationGameProps) {
  // Ältere Räume vergeben lesbare Namen; neue nur anonyme Schlüssel.
  const displayName =
    displayNameProp ??
    (studentName.startsWith("participant-") ? null : studentName);
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
  const [wrongCount, setWrongCount] = useState(0);
  const [answerFeedback, setAnswerFeedback] = useState("");
  const [finalDuration, setFinalDuration] = useState(
    initialProgress?.durationMs ?? 0,
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
  const shieldRef = useRef(false);
  const attackUntil = useRef(0);
  const attackTimer = useRef(0);
  useEffect(() => {
    shieldRef.current = shield;
  }, [shield]);
  useEffect(() => () => window.clearTimeout(attackTimer.current), []);
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
  const mathSaving = useRef(false);
  const pendingMath = useRef<LearningEventV1 | null>(null);
  const [savingMath, setSavingMath] = useState(false);
  const answerRef = useRef<HTMLInputElement>(null);
  const current = session.words[index];
  useLiveSessionGuards(
    phase !== "complete" ||
      deliveryStatus === "saving" ||
      deliveryStatus === "error",
  );

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
        setFinalDuration(
          Math.min(
            86_400_000,
            (initialProgress?.durationMs ?? 0) +
              (startedAt.current ? Date.now() - startedAt.current : 0),
          ),
        );
        setPhase("complete");
        onProgress({
          currentIndex: session.words.length - 1,
          peeks,
          attempts,
          errors,
          finished: true,
          durationMs: Math.min(
            86_400_000,
            (initialProgress?.durationMs ?? 0) +
              (startedAt.current ? Date.now() - startedAt.current : 0),
          ),
          wordErrors,
        });
        return;
      }
      setIndex((value) => value + 1);
      setAnswer("");
      setWrongCount(0);
      setAnswerFeedback("");
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
    initialProgress?.durationMs,
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
    const startTimer = window.setTimeout(() => {
      if (shieldRef.current) {
        shieldRef.current = false;
        setShield(false);
        setBattleMessage(`Angriff von ${incomingAttack.from} geblockt.`);
        return;
      }
      if (attackUntil.current > Date.now()) return;
      attackUntil.current = Date.now() + 15_000;
      setActiveAttack(incomingAttack.type);
      setBattleMessage(
        incomingAttack.type === "ink"
          ? `Tintenangriff von ${incomingAttack.from}`
          : `Flimmerangriff von ${incomingAttack.from}`,
      );
      attackTimer.current = window.setTimeout(() => {
        setActiveAttack(null);
        setBattleMessage("");
      }, 15_000);
    }, 0);
    return () => {
      window.clearTimeout(startTimer);
    };
  }, [incomingAttack, session.gameMode]);

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
        deliveryStatus={deliveryStatus}
        onRetryProgress={onRetryProgress}
      />
    ) : null;
  }

  if (phase === "complete") {
    const stars = computeRunningDictationStars(errors, session.words.length);
    const hasMath = session.words.some((word) => liveWordKind(word) === "math");
    return (
      <div className="ui ui-game">
        <section className="ui-game__done" aria-live="polite">
          <span className="ui-game__done-ring">
            {animal ? (
              <AnimalImage animal={animal} size={112} />
            ) : (
              <Icon name="trophy" size={56} />
            )}
          </span>
          <p className="ui-eyebrow">Raum {code} · Runde abgeschlossen</p>
          {session.showStars ? (
            <p
              className="ui-game__stars"
              role="img"
              aria-label={`${stars} von 5 Sternen`}
            >
              {"★".repeat(stars)}
              <span className="ui-faint">{"★".repeat(5 - stars)}</span>
            </p>
          ) : null}
          <h1 className="ui-h-fun">
            {displayName ? `Geschafft, ${displayName}!` : "Geschafft!"}
          </h1>
          <div className="ui-grid3 ui-game__tiles">
            <span>
              <strong>{session.words.length}</strong> Aufgaben
            </span>
            <span>
              <strong>{errors}</strong> Fehlversuche
            </span>
            <span>
              <strong>{peeks}</strong> Spicker
            </span>
          </div>
          {session.showStars ? (
            <p className="ui-small ui-muted">
              Tempo:{" "}
              {speedPoints(
                session.words.reduce(
                  (sum, word) => sum + word.targetWord.length,
                  0,
                ),
                finalDuration,
              )}{" "}
              Punkte
            </p>
          ) : null}
          <DeliveryNotice
            status={
              deliveryStatus === "idle" && initialProgress?.finished
                ? "saved"
                : deliveryStatus
            }
            onRetry={onRetryProgress}
          />
          {connectionWarning ? (
            <GameWarning>{connectionWarning}</GameWarning>
          ) : null}
          {localSaveWarning ? (
            <GameWarning alert>{localSaveWarning}</GameWarning>
          ) : null}
          {transferNotice ? (
            <p className="ui-notice ui-notice--good" role="status">
              {transferNotice}
            </p>
          ) : null}
          {hasMath ? (
            <div className="ui-stack">
              <p className="ui-small">
                Du kannst jetzt allein weiterüben. Dein Unterrichtsergebnis
                bleibt gleich.
              </p>
              {deliveryStatus === "saving" || deliveryStatus === "error" ? (
                <p className="ui-small ui-muted">
                  Warte kurz, bis dein Ergebnis gesendet wurde.
                </p>
              ) : (
                <div className="ui-grid2">
                  {errors > 0 ? (
                    <ButtonLink
                      href={`/frei/mathematics?round=${encodeURIComponent(session.sessionId)}&mode=errors`}
                    >
                      Meine Fehler üben
                    </ButtonLink>
                  ) : null}
                  <ButtonLink
                    variant="ghost"
                    href={`/frei/mathematics?round=${encodeURIComponent(session.sessionId)}&mode=more`}
                  >
                    Weitere Aufgaben üben
                  </ButtonLink>
                </div>
              )}
            </div>
          ) : null}
          <div className="ui-stack">
            <ButtonLink href="/lernen" size="lg" block>
              Zum persönlichen Lernraum
            </ButtonLink>
            {transferStatus === "success" ? (
              <ButtonLink href="/lernbox" variant="ghost" block>
                Übernommene Vokabeln üben
              </ButtonLink>
            ) : null}
          </div>
        </section>
      </div>
    );
  }

  if (!current) return null;
  const activeWord = current;
  const errorKey = liveWordErrorKey(activeWord);
  const copyMode =
    session.gameMode === "UEBUNG" && wrongCount >= session.uebungMaxAttempts;
  const hint =
    session.gameMode === "UEBUNG" &&
    wrongCount > 0 &&
    !copyMode &&
    kind !== "math"
      ? buildRunningDictationHint(
          activeWord.targetWord,
          wrongCount / session.uebungMaxAttempts,
        )
      : "";
  const battleCandidates = pickRunningDictationBattleCandidates(
    roster,
    studentName,
    index,
  );
  const objectLabel =
    kind === "math"
      ? "die Aufgabe"
      : kind === "vocabulary"
        ? "das Wort"
        : "den Satz";

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
    if (
      event.touches.length >= 2 &&
      phase !== "revealed" &&
      phase !== "correct"
    )
      revealWord();
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase !== "write" || !answer.trim() || mathSaving.current) return;
    if (kind === "math") {
      const task = mathTaskFromPrompt(prompt, activeWord.targetWord, index);
      if (task) {
        mathSaving.current = true;
        setSavingMath(true);
        try {
          pendingMath.current ??= await createMathAttempt({
            task,
            answer,
            roundId: session.sessionId,
            // Server counters can lag behind local storage after a disconnect.
            // This ID belongs to this submission and survives its save retries.
            attemptId: crypto.randomUUID(),
            selfCorrected: Boolean(wordErrors[errorKey]),
            usedHelp: copyMode,
            source: "running-dictation",
            ...(session.mathPracticeOptions
              ? { options: session.mathPracticeOptions }
              : {}),
          });
          await learningEventRepository.put(pendingMath.current);
          pendingMath.current = null;
          setLocalSaveWarning("");
        } catch {
          setLocalSaveWarning(
            "Nicht auf diesem Gerät gespeichert. Bitte bestätige deine Antwort erneut.",
          );
          return;
        } finally {
          mathSaving.current = false;
          setSavingMath(false);
        }
      }
    }
    if (!startedAt.current) startedAt.current = Date.now();
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    const isCorrect = checkLiveAnswer(activeWord, answer);
    if (!LAUFDIKTAT_PILOT && kind !== "math") {
      void learningEventRepository
        .put({
          id: crypto.randomUUID(),
          learningObjectId: `live:${liveWordErrorKey(activeWord)}`.slice(
            0,
            200,
          ),
          occurredAt: new Date().toISOString(),
          source: "running-dictation",
          learningArea: kind === "vocabulary" ? "vocabulary" : "german",
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
        setCharge((value) =>
          Math.min(100, value + battleChargeGain(roster, studentName, index)),
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

    setAnswerFeedback("Noch nicht richtig. Versuche es erneut.");
    if (!copyMode) setAnswer("");
    if (session.gameMode === "UEBUNG" && !copyMode)
      setWrongCount((value) => value + 1);
    answerRef.current?.focus();
  }

  const unit =
    kind === "math" ? "Aufgabe" : kind === "vocabulary" ? "Vokabel" : "Satz";
  const position = `${unit} ${index + 1} von ${session.words.length}`;

  return (
    <div
      className={`ui ui-game is-active-round${activeAttack === "flicker" ? " is-flickering" : ""}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <GameHeader
        code={code}
        animal={animal}
        subtitle={`${displayName ? `${displayName} · ` : ""}${index + 1} / ${session.words.length}`}
        onBack={() => {
          setExitCountdown(3);
          setShowExitConfirm(true);
        }}
      >
        {session.isTtsEnabled ? (
          <button
            type="button"
            className="ui-icon-btn"
            onClick={readPromptAloud}
            title="Vorlesen (zählt als Spicker)"
            aria-label="Vorlesen"
          >
            <Icon name="speaker" size={18} />
          </button>
        ) : null}
        <span className="ui-row ui-game__counters">
          <Pill>Spicker {peeks}</Pill>
          <Pill {...(errors ? { tone: "bad" as const } : {})}>
            Fehler {errors}
          </Pill>
        </span>
      </GameHeader>
      <ProgressSegments total={session.words.length} current={index} />

      {connectionWarning ? (
        <GameWarning>{connectionWarning}</GameWarning>
      ) : null}
      {deliveryStatus === "error" ? (
        <DeliveryNotice status={deliveryStatus} onRetry={onRetryProgress} />
      ) : null}
      {localSaveWarning ? (
        <GameWarning alert>{localSaveWarning}</GameWarning>
      ) : null}

      {session.gameMode === "BATTLE" ? (
        <section className="ui-game__battle" aria-label="Battle-Aktionen">
          <div className="ui-row ui-game__attacks">
            {session.battleOptions.ink ? (
              <button
                type="button"
                className="ui-game__attack"
                disabled={charge < 100}
                onClick={() => setPicker("ink")}
              >
                <Icon name="drop" size={22} />
                Tinte
              </button>
            ) : null}
            {session.battleOptions.flicker ? (
              <button
                type="button"
                className="ui-game__attack"
                disabled={charge < 100}
                onClick={() => setPicker("flicker")}
              >
                <Icon name="bolt" size={22} />
                Flimmern
              </button>
            ) : null}
            <button
              type="button"
              className="ui-game__attack"
              disabled={charge < 100}
              aria-pressed={shield}
              onClick={() => {
                setShield(true);
                setCharge(0);
                setPicker(null);
                setBattleMessage("Schild aktiviert.");
              }}
            >
              <Icon name="shield" size={22} />
              Schild
            </button>
          </div>
          <span className="ui-tiny ui-muted">Ladung · {charge} %</span>
          <ProgressBar value={charge} max={100} label="Battle-Ladung" />
          {picker ? (
            <div className="ui-stack ui-game__targets">
              <strong>Wen möchtest du treffen?</strong>
              <div className="ui-row ui-wrap">
                {battleCandidates.map(({ name }) => (
                  <Button
                    key={name}
                    variant="soft"
                    size="sm"
                    onClick={() => {
                      if (onSendAttack?.(name, picker)) {
                        setCharge(0);
                        setPicker(null);
                        setBattleMessage(`Angriff auf ${name} gestartet.`);
                      }
                    }}
                  >
                    {name}
                  </Button>
                ))}
              </div>
              {!Object.keys(roster).some((name) => name !== studentName) ? (
                <p className="ui-small ui-muted">
                  Noch kein Mitspieler als Ziel sichtbar.
                </p>
              ) : null}
              <Button variant="link" onClick={() => setPicker(null)}>
                Abbrechen
              </Button>
            </div>
          ) : null}
          {battleMessage ? (
            <p className="ui-small" role="status">
              {battleMessage}
            </p>
          ) : null}
        </section>
      ) : null}

      {activeAttack === "ink" ? (
        <div className="ui-game__ink" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      ) : null}

      <main
        className={`ui-game__stage${phase === "idle" || phase === "revealed" ? " is-holdable" : ""}${phase === "write" ? " is-writing" : ""}`}
      >
        {phase === "idle" || phase === "revealed" ? (
          <HoldEdges holding={phase === "revealed"} />
        ) : null}

        {phase === "idle" ? (
          <div className="ui-game__card">
            <span className="ui-game__card-icon" aria-hidden="true">
              <Icon name="hand" size={26} />
            </span>
            <h1 className="ui-h-section ui-game__card-title">
              Mit zwei Fingern an beiden Rändern halten
            </h1>
            <p className="ui-small ui-muted">
              Solange du hältst, siehst du {objectLabel}. Loslassen öffnet das
              Schreibfeld.
            </p>
            <Button variant="ghost" size="sm" onClick={revealWord}>
              Aufgabe zeigen
            </Button>
          </div>
        ) : null}

        {phase === "revealed" ? (
          <div className="ui-game__card is-revealed">
            <Pill>{position}</Pill>
            <div ref={revealContainerRef} className="ui-game__reveal">
              <h1
                ref={revealTextRef}
                className="ui-game__prompt"
                style={{ fontSize: `${revealFontSize}px` }}
              >
                <MathDisplay text={prompt} isLatex={isLatexPrompt} />
              </h1>
            </div>
            <p className="ui-small ui-muted">Loslassen, um zu schreiben</p>
            <Button variant="ghost" size="sm" onClick={() => setPhase("write")}>
              Jetzt schreiben
            </Button>
          </div>
        ) : null}

        {phase === "write" ? (
          <form className="ui-game__write" onSubmit={submit}>
            <h2 className="ui-h-section">{position} schreiben</h2>
            {kind === "vocabulary" || kind === "math" ? (
              <p className="ui-game__question">
                <MathDisplay text={prompt} isLatex={isLatexPrompt} />
              </p>
            ) : (
              <p className="ui-small ui-muted">Was hast du dir gemerkt?</p>
            )}
            {copyMode ? (
              <CopyGuide target={activeWord.targetWord} answer={answer} />
            ) : hint ? (
              <p className="ui-game__hint" aria-label="Buchstabenhilfe">
                {hint}
              </p>
            ) : null}
            {answerFeedback ? (
              <p className="ui-notice ui-notice--bad" role="status">
                {answerFeedback}
              </p>
            ) : null}
            <input
              ref={answerRef}
              id="live-game-answer"
              className="ui-field ui-game__answer"
              aria-label="Deine Antwort"
              placeholder={
                kind === "math"
                  ? "Ergebnis"
                  : kind === "vocabulary"
                    ? "Übersetzung"
                    : "Tippe aus dem Gedächtnis"
              }
              inputMode={kind === "math" ? "decimal" : "text"}
              autoComplete="off"
              spellCheck={false}
              disabled={savingMath}
              maxLength={2000}
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
                pendingMath.current = null;
                setAnswer(next);
              }}
            />
            <div className="ui-row ui-wrap">
              <Button type="submit" disabled={savingMath}>
                <Icon name="check" size={18} />
                Prüfen
              </Button>
              <Button variant="link" onClick={() => setPhase("idle")}>
                {unit} nochmal ansehen
              </Button>
            </div>
          </form>
        ) : null}

        {phase === "correct" ? (
          <div
            className={`ui-game__verdict ${lastAnswerCorrect ? "is-correct" : "is-wrong"}`}
          >
            <span aria-hidden="true">
              <Icon name={lastAnswerCorrect ? "check" : "close"} size={44} />
            </span>
            <p>{lastAnswerCorrect ? "Richtig" : "Nicht richtig"}</p>
          </div>
        ) : null}
      </main>

      <Sheet
        open={showExitConfirm}
        title="Spiel verlassen?"
        onClose={() => setShowExitConfirm(false)}
      >
        <p className="ui-small">
          Dein bisheriger Fortschritt in dieser Runde bleibt erhalten.
        </p>
        <div className="ui-grid2">
          <Button variant="ghost" onClick={() => setShowExitConfirm(false)}>
            Weiter üben
          </Button>
          {exitCountdown > 0 ? (
            <Button disabled>Zum Lernraum ({exitCountdown})</Button>
          ) : (
            <ButtonLink href="/lernen">Zum persönlichen Lernraum</ButtonLink>
          )}
        </div>
      </Sheet>
    </div>
  );
}
