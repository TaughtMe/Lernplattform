"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { placementRulesFor } from "../../../src/domain/live-vocabulary-placement";
import {
  evaluateLiveAnswer,
  liveWordKind,
  type LiveSession,
} from "../../../src/integrations/laufdiktat/live-session";
import type { ProgressDeliveryStatus } from "../../../src/integrations/laufdiktat/progress-delivery";
import type { LiveProgress } from "../../../src/integrations/laufdiktat/room-api";
import {
  readLiveTrace,
  writeLiveTrace,
} from "../../../src/integrations/laufdiktat/live-trace";
import { liveWordErrorKey } from "../../../src/integrations/laufdiktat/vocabulary-transfer";
import { LAUFDIKTAT_PILOT } from "../../../src/pilot-mode";
import { createMathAttempt } from "../../../src/storage/math-practice";
import { createPersonalLearningEventRepository } from "../../../src/storage/personal-learning-events";
import { MathDisplay } from "../../components/math-display";
import { useLiveSessionGuards } from "../../components/use-live-session-guards";
import { useLiveVocabularyTransfer } from "../../components/use-live-vocabulary-transfer";
import { useWritingRelief } from "../../components/use-writing-relief";
import { Button, ButtonLink } from "../../ui/primitives";
import { Sheet } from "../../ui/sheet";
import { useFullscreenFrame } from "../../ui/shell/fullscreen";
import { useThemeToggle } from "../../ui/theme";
import { StudentDictationScreen } from "../../views/laufdiktat/student-dictation-screen";
import { CopyGuide, DeliveryNotice, GameWarning } from "./game-parts";
import { useHoldToReveal } from "./use-hold-to-reveal";
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
  /** Anzeigename und Tier der Mitspieler, nach Raumschlüssel. */
  peers?: Record<string, { label: string; animal: string | null }>;
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
  peers = {},
  incomingAttack,
  onSendAttack,
  displayName: displayNameProp = null,
  animal = null,
}: LiveRunningDictationGameProps) {
  // Ältere Räume vergeben lesbare Namen; neue nur anonyme Schlüssel.
  const displayName =
    displayNameProp ??
    (studentName.startsWith("participant-") ? null : studentName);
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
  // Spiegel der Phase für Gesten, die im selben Ereignis mehrfach auslösen.
  const phaseRef = useRef<Phase>(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  const [wrongCount, setWrongCount] = useState(0);
  const [answerFeedback, setAnswerFeedback] = useState("");
  const [finalDuration, setFinalDuration] = useState(
    initialProgress?.durationMs ?? 0,
  );
  const [answer, setAnswer] = useState("");
  const [attempts, setAttempts] = useState(initialProgress?.attempts ?? 0);
  const [peeks, setPeeks] = useState(initialProgress?.peeks ?? 0);
  const [errors, setErrors] = useState(initialProgress?.errors ?? 0);
  // Lokaler Schnappschuss (sessionStorage) überlebt ein Neuladen der Seite.
  const [restoredTrace] = useState(() => readLiveTrace(session.sessionId));
  const [wordErrors, setWordErrors] = useState<Record<string, number>>(() =>
    mergeWordErrors(initialProgress?.wordErrors, restoredTrace?.wordErrors),
  );
  // Hilfen pro Wort bleiben auf dem Gerät und gehen nie an den Server.
  const [wordHelps, setWordHelps] = useState<Record<string, true>>(
    restoredTrace?.wordHelps ?? {},
  );
  // Mit Schreiberleichterung tolerant angenommene Wörter, ebenfalls nur lokal.
  const [wordTolerated, setWordTolerated] = useState<Record<string, true>>(
    restoredTrace?.wordTolerated ?? {},
  );
  // Ohne Klassenstempel im Raum gelten immer die Standardregeln.
  const writingRelief = useWritingRelief(session.classSeal);
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
  const [localSaveWarning, setLocalSaveWarning] = useState("");
  const {
    status: transferStatus,
    notice: transferNotice,
    transfer,
  } = useLiveVocabularyTransfer();
  const startedAt = useRef(0);
  const lastAttackId = useRef(0);
  const mathSaving = useRef(false);
  const pendingMath = useRef<LearningEventV1 | null>(null);
  const [savingMath, setSavingMath] = useState(false);
  const answerRef = useRef<HTMLTextAreaElement>(null);
  const { theme, toggleTheme } = useThemeToggle();
  // Während der Runde ohne Schülernavigation (Vollbild wie im Entwurf).
  useFullscreenFrame();
  const current = session.words[index];
  useLiveSessionGuards(
    phase !== "complete" ||
      deliveryStatus === "saving" ||
      deliveryStatus === "error",
  );

  const kind = current ? liveWordKind(current) : "text";
  const prompt = current ? (current.prompt ?? current.targetWord) : "";
  const isLatexPrompt = current?.isLatex ?? false;
  const errorKey = current ? liveWordErrorKey(current) : "";
  const copyMode =
    session.gameMode === "UEBUNG" && wrongCount >= session.uebungMaxAttempts;
  const hint =
    current &&
    session.gameMode === "UEBUNG" &&
    wrongCount > 0 &&
    !copyMode &&
    kind !== "math"
      ? buildRunningDictationHint(
          current.targetWord,
          wrongCount / session.uebungMaxAttempts,
        )
      : "";
  // Als Hilfe zählt nur die Abschreibvorlage (Lösung sichtbar). Die
  // Buchstabenhilfe erscheint im Üben schon nach einem Tippfehler und zählt nicht.
  // Mit Schreiberleichterung zählt auch die Abschreibvorlage nicht: Sie
  // erscheint schon nach 3 Fehlversuchen und höbe sonst die Grenze von 5 aus.
  const helpShown = kind === "vocabulary" && copyMode && writingRelief !== true;
  // Abgeleiteter Zustand: während des Renderns nachziehen, nicht per Effekt.
  if (helpShown && errorKey && !wordHelps[errorKey]) {
    setWordHelps({ ...wordHelps, [errorKey]: true });
  }

  // Schnappschuss für Neuladen und vorzeitiges Ende; nur lokal gespeichert.
  useEffect(() => {
    writeLiveTrace({
      sessionId: session.sessionId,
      currentIndex: phase === "correct" ? index + 1 : index,
      finished: phase === "complete",
      wordErrors,
      wordHelps,
      wordTolerated,
    });
  }, [index, phase, session.sessionId, wordErrors, wordHelps, wordTolerated]);

  // Ein tolerant angenommenes Wort bleibt länger stehen: Das Kind soll die
  // richtige Schreibweise lesen können.
  const correctDelay = wordTolerated[errorKey] ? 2500 : 550;
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
    }, correctDelay);
    return () => window.clearTimeout(timer);
  }, [
    attempts,
    correctDelay,
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
    // Die Lehrkraft entscheidet im Vokabelheft, ob Vokabeln übernommen werden.
    // Die Regeln hängen von der Schreiberleichterung ab: erst nach deren Prüfung.
    if (phase !== "complete" || session.stationMode) return;
    if (writingRelief === undefined) return;
    transfer(
      session,
      {
        currentIndex: session.words.length - 1,
        finished: true,
        wordErrors,
        wordHelps,
        wordTolerated,
      },
      placementRulesFor(writingRelief),
    );
  }, [
    phase,
    session,
    transfer,
    wordErrors,
    wordHelps,
    wordTolerated,
    writingRelief,
  ]);

  function revealWord() {
    // Finger und Tasten können im selben Moment auslösen: nur einmal zählen.
    if (phaseRef.current === "revealed" || phaseRef.current === "correct")
      return;
    phaseRef.current = "revealed";
    if (startedAt.current === 0) startedAt.current = Date.now();
    if (revealedCurrentWord) {
      setPeeks((value) => value + 1);
    } else {
      setRevealedCurrentWord(true);
    }
    setPhase("revealed");
  }

  function startWriting() {
    if (phaseRef.current !== "revealed") return;
    phaseRef.current = "write";
    setPhase("write");
  }

  function reviewAgain() {
    phaseRef.current = "idle";
    setPhase("idle");
  }

  const surfaceRef = useRef<HTMLDivElement>(null);
  const hold = useHoldToReveal(surfaceRef, {
    enabled:
      !session.stationMode &&
      phase !== "complete" &&
      phase !== "correct" &&
      !showExitConfirm,
    phase: phase === "idle" ? "wait" : phase === "revealed" ? "read" : "write",
    onReveal: revealWord,
    onRelease: startWriting,
  });

  useEffect(() => {
    if (phase !== "write") return;
    // Nach A + L erst fokussieren, wenn beide Tasten oben sind: Eine noch
    // gehaltene Taste würde sonst per Wiederholung ins Feld schreiben.
    let timer = 0;
    const focusField = () => {
      if (hold.keysHeld()) {
        timer = window.setTimeout(focusField, 40);
        return;
      }
      answerRef.current?.focus();
    };
    timer = window.setTimeout(focusField, 10);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (session.stationMode) {
    return onLoadProgress ? (
      <LiveStationGame
        code={code}
        animal={animal}
        session={session}
        connectionWarning={connectionWarning}
        onProgress={onProgress}
        onLoadProgress={onLoadProgress}
        deliveryStatus={deliveryStatus}
        onRetryProgress={onRetryProgress}
      />
    ) : null;
  }

  const stars = computeRunningDictationStars(errors, session.words.length);
  const tempo = speedPoints(
    session.words.reduce((sum, word) => sum + word.targetWord.length, 0),
    finalDuration,
  );
  const exitSheet = (
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
  );
  const common = {
    roomCode: code,
    animal,
    className: "",
    theme,
    onToggleTheme: toggleTheme,
    sentenceCount: session.words.length,
    typed: answer,
    station: { count: session.stationCount, selected: null },
    battle: { charge, shieldActive: shield },
    result: { mistakes: errors, hints: peeks, points: tempo, savedWords: [] },
  };

  if (phase === "complete") {
    const hasMath = session.words.some((word) => liveWordKind(word) === "math");
    return (
      <div className="ui-dictation">
        <StudentDictationScreen
          {...common}
          phase="done"
          onLeave={() => window.location.assign("/lernen")}
          subtitle={`${displayName ? `${displayName} · ` : ""}Runde abgeschlossen`}
          sentenceIndex={session.words.length - 1}
          sentence=""
          hintsUsed={peeks}
          unit={unitOf(session.words[0])}
          done={{
            ...(displayName ? { title: `Geschafft, ${displayName}!` } : {}),
            stars: session.showStars ? { value: stars, max: 5 } : null,
            pointsLabel: "Tempo-Punkte",
            finishLabel: "Zum persönlichen Lernraum",
            finishHref: "/lernen",
            extras: (
              <div className="ui-stack ui-dictation__extras">
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
                      Du kannst jetzt allein weiterüben. Dein
                      Unterrichtsergebnis bleibt gleich.
                    </p>
                    {deliveryStatus === "saving" ||
                    deliveryStatus === "error" ? (
                      <p className="ui-small ui-muted">
                        Warte kurz, bis dein Ergebnis gesendet wurde.
                      </p>
                    ) : (
                      <div className="ui-stack">
                        {errors > 0 ? (
                          <ButtonLink
                            block
                            href={`/frei/mathematics?round=${encodeURIComponent(session.sessionId)}&mode=errors`}
                          >
                            Meine Fehler üben
                          </ButtonLink>
                        ) : null}
                        <ButtonLink
                          variant="ghost"
                          block
                          href={`/frei/mathematics?round=${encodeURIComponent(session.sessionId)}&mode=more`}
                        >
                          Weitere Aufgaben üben
                        </ButtonLink>
                      </div>
                    )}
                  </div>
                ) : null}
                {transferStatus === "success" ? (
                  <ButtonLink href="/lernbox" variant="ghost" block>
                    Übernommene Vokabeln üben
                  </ButtonLink>
                ) : null}
              </div>
            ),
          }}
        />
      </div>
    );
  }

  if (!current) return null;
  const activeWord = current;
  const battleCandidates = pickRunningDictationBattleCandidates(
    roster,
    studentName,
    index,
  );

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

  async function submit() {
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
    // Die Toleranz gilt auch im strengen Tippmodus: Er sperrt nur Einfügen und
    // Autokorrektur, nicht einzelne falsche Tasten.
    const verdict = evaluateLiveAnswer(activeWord, answer, {
      tolerance: writingRelief === true && kind === "vocabulary",
    });
    const isCorrect = verdict !== "wrong";
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
      if (session.gameMode === "BATTLE") {
        setCharge((value) =>
          Math.min(100, value + battleChargeGain(roster, studentName, index)),
        );
      }
      if (verdict === "tolerated" && errorKey) {
        // Richtig angenommen, in der LernBox aber nur „üben“ (nicht „sicher“).
        setWordTolerated((value) => ({ ...value, [errorKey]: true }));
      }
      phaseRef.current = "correct";
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

  const unit = unitOf(activeWord);
  const promptNode =
    kind === "text" ? undefined : (
      <MathDisplay text={prompt} isLatex={isLatexPrompt} />
    );
  const battlePowers = (["ink", "flicker"] as const).filter(
    (power) => session.battleOptions[power],
  );
  const viewPhase =
    phase === "idle" ? "hold" : phase === "revealed" ? "read" : "write";

  return (
    <div
      className={`ui-dictation is-active-round${activeAttack === "flicker" ? " is-flickering" : ""}`}
      data-game-surface=""
      ref={surfaceRef}
      onContextMenu={(event) => event.preventDefault()}
    >
      <StudentDictationScreen
        {...common}
        phase={viewPhase}
        subtitle={`${displayName ? `${displayName} · ` : ""}${index + 1} / ${session.words.length}`}
        sentenceIndex={index}
        sentence={prompt}
        {...(promptNode ? { prompt: promptNode } : {})}
        unit={unit}
        hintsUsed={peeks}
        counters={
          viewPhase === "write"
            ? { mistakes: errors }
            : { hints: peeks, mistakes: errors }
        }
        readAloud={session.isTtsEnabled}
        onReadAloud={readPromptAloud}
        notices={
          connectionWarning ||
          deliveryStatus === "error" ||
          localSaveWarning ? (
            <div className="ui-stack">
              {connectionWarning ? (
                <GameWarning>{connectionWarning}</GameWarning>
              ) : null}
              {deliveryStatus === "error" ? (
                <DeliveryNotice
                  status={deliveryStatus}
                  onRetry={onRetryProgress}
                />
              ) : null}
              {localSaveWarning ? (
                <GameWarning alert>{localSaveWarning}</GameWarning>
              ) : null}
            </div>
          ) : null
        }
        write={{
          // Mathe-Aufgaben sollen gemerkt werden: erst nach 2 Fehlern (Lehrkraft-Option) wieder zeigen.
          ...(kind === "vocabulary" ||
          (kind === "math" &&
            session.showTaskAfterErrors &&
            (wordErrors[errorKey] ?? 0) >= 2)
            ? { question: promptNode }
            : {}),
          help: copyMode ? (
            <CopyGuide target={activeWord.targetWord} answer={answer} />
          ) : hint ? (
            <p className="ui-game__hint" aria-label="Buchstabenhilfe">
              {hint}
            </p>
          ) : null,
          feedback:
            phase === "correct"
              ? {
                  text: wordTolerated[errorKey]
                    ? `Richtig! So schreibt man es: ${activeWord.targetWord}`
                    : "Richtig",
                  tone: "good",
                }
              : answerFeedback
                ? { text: answerFeedback, tone: "bad" }
                : null,
          disabled: savingMath || phase === "correct",
          // Mathe und einzelne Wörter einzeilig, Sätze mit etwas mehr Platz.
          size: unit === "Satz" ? "large" : "compact",
          placeholder:
            kind === "math"
              ? "Ergebnis"
              : kind === "vocabulary"
                ? "Übersetzung"
                : "Tippe aus dem Gedächtnis",
          onReview: reviewAgain,
          inputRef: answerRef,
          inputProps: {
            id: "live-game-answer",
            // Nach dem Öffnen der Bildschirmtastatur ins Sichtfeld holen.
            onFocus: (event) => {
              const field = event.currentTarget;
              window.setTimeout(
                () => field.scrollIntoView?.({ block: "center" }),
                300,
              );
            },
            inputMode: kind === "math" ? "decimal" : "text",
            maxLength: 2000,
            ...(session.strictTypingMode
              ? {
                  autoCorrect:
                    STRICT_RUNNING_DICTATION_INPUT_ATTRIBUTES.autoCorrect,
                  autoCapitalize:
                    STRICT_RUNNING_DICTATION_INPUT_ATTRIBUTES.autoCapitalize,
                }
              : {}),
            onKeyDown: (event) => {
              // Esc verlässt das Feld; die Antwort bleibt für A + L erhalten.
              if (event.key !== "Escape") return;
              event.preventDefault();
              event.currentTarget.blur();
              reviewAgain();
            },
            onBeforeInput: (event) => {
              if (
                session.strictTypingMode &&
                isBlockedRunningDictationInput(
                  (event.nativeEvent as InputEvent).inputType,
                )
              ) {
                event.preventDefault();
              }
            },
            onPaste: (event) => {
              if (session.strictTypingMode) event.preventDefault();
            },
            onDrop: (event) => {
              if (session.strictTypingMode) event.preventDefault();
            },
          },
        }}
        onType={(value) => {
          let next = value.replace(/\n/g, "");
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
        onCheck={() => void submit()}
        {...(session.gameMode === "BATTLE"
          ? {
              battleBar: {
                powers: battlePowers,
                picking: picker,
                targets: battleCandidates.map(({ name }) => ({
                  key: name,
                  label:
                    peers[name]?.label ??
                    (name.startsWith("participant-") ? "Mitspieler" : name),
                  animal: peers[name]?.animal ?? null,
                })),
                message: battleMessage,
                onPickTarget: (name: string) => {
                  const label =
                    peers[name]?.label ??
                    (name.startsWith("participant-") ? "Mitspieler" : name);
                  if (picker && onSendAttack?.(name, picker)) {
                    setCharge(0);
                    setPicker(null);
                    setBattleMessage(`Angriff auf ${label} gestartet.`);
                  }
                },
                onCancelPick: () => setPicker(null),
              },
              onPower: (power: AttackType) => {
                if (charge >= 100) setPicker(power);
              },
              onShield: () => {
                if (charge < 100) return;
                setShield(true);
                setCharge(0);
                setPicker(null);
                setBattleMessage("Schild aktiviert.");
              },
            }
          : {})}
        onLeave={() => {
          setExitCountdown(3);
          setShowExitConfirm(true);
        }}
      />
      {activeAttack === "ink" ? (
        <div className="ui-game__ink" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      ) : null}
      {exitSheet}
    </div>
  );
}

/** Bezeichnung eines Abschnitts: Mathe als Aufgabe, Vokabeln und Einzelwörter als Wort. */
function unitOf(word: LiveSession["words"][number] | undefined) {
  if (!word) return "Satz" as const;
  const kind = liveWordKind(word);
  if (kind === "math") return "Aufgabe" as const;
  if (kind === "vocabulary" || !/\s/.test(word.targetWord.trim()))
    return "Wort" as const;
  return "Satz" as const;
}

/** Serverstand und lokaler Schnappschuss: pro Wort gilt der höhere Wert. */
function mergeWordErrors(
  server: Record<string, number> | undefined,
  local: Record<string, number> | undefined,
) {
  const merged = { ...server };
  for (const [key, count] of Object.entries(local ?? {})) {
    merged[key] = Math.max(merged[key] ?? 0, count);
  }
  return merged;
}
