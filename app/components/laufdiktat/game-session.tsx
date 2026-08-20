"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useGameRoom } from "../../../src/laufdiktat/use-game-room.ts";
import { useBattleMode } from "../../../src/laufdiktat/use-battle-mode.ts";
import { checkAnswer } from "../../../src/laufdiktat/check-answer.ts";
import { buildHint } from "../../../src/laufdiktat/build-hint.ts";
import { computeStars } from "../../../src/laufdiktat/scoring.ts";
import { seededShuffle } from "../../../src/laufdiktat/seeded-shuffle.ts";
import { isSuspiciousBulkInsert, sanitizeMathInput, STRICT_INPUT_ATTRS } from "../../../src/laufdiktat/strict-typing.ts";
import { APP_VERSION } from "../../../src/laufdiktat/app-version.ts";
import { upsertProgress, getMyProgress } from "../../../src/laufdiktat/room-api.ts";
import { clearRoomIdentity } from "../../../src/laufdiktat/room-identity.ts";
import { animalToFileName, parseStudentName } from "../../../src/laufdiktat/animal-names.ts";
import type { AttackType, BattleOptions, GameMode, GameState, GameMetrics, SessionStartData, WordItem } from "../../../src/laufdiktat/types.ts";

type Props = {
  roomCode: string;
  studentName: string;
  roomId: string;
  participantToken: string;
  onLeave: () => void;
};

const DEFAULT_BATTLE_OPTIONS: BattleOptions = { ink: true, flicker: true };

export function GameSession({ roomCode, studentName, roomId, participantToken, onLeave }: Props) {
  const [words, setWords] = useState<WordItem[]>([]);
  const [gameMode, setGameModeState] = useState<GameMode>("LAUFDIKTAT");
  const [battleOptions, setBattleOptions] = useState<BattleOptions>(DEFAULT_BATTLE_OPTIONS);
  const [uebungMaxAttempts, setUebungMaxAttempts] = useState(3);
  const [showStars, setShowStars] = useState(true);
  const [strictTypingMode, setStrictTypingMode] = useState(true);

  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const currentWordIndexRef = useRef(0);
  useEffect(() => {
    currentWordIndexRef.current = currentWordIndex;
  }, [currentWordIndex]);

  const [gameState, setGameState] = useState<GameState>("IDLE");
  const [inputValue, setInputValue] = useState("");
  const [metrics, setMetrics] = useState<GameMetrics>({ peeks: 0, attempts: 0 });
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [versionMismatch, setVersionMismatch] = useState(false);
  const [finalStars, setFinalStars] = useState<number | null>(null);
  const [finalErrorCount, setFinalErrorCount] = useState(0);

  // Freies Üben (UEBUNG): consecutive wrong attempts on the current word,
  // and whether the max was reached (show the full word to copy instead of hints).
  const [wrongCount, setWrongCount] = useState(0);
  const [copyMode, setCopyMode] = useState(false);

  // "Nur meine Fehler üben": a local practice round over just the words the
  // student got wrong. Never reported to the teacher's room.
  const [practiceWords, setPracticeWords] = useState<WordItem[] | null>(null);

  const errorsRef = useRef(0);
  const wordErrorsRef = useRef<Record<string, number>>({});
  const startedAtRef = useRef(0);
  const sessionIdRef = useRef("");
  const hasSentFinishedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onSessionStart = useCallback(
    (data: SessionStartData) => {
      if (data.appVersion && data.appVersion !== APP_VERSION) {
        setVersionMismatch(true);
        return;
      }
      setVersionMismatch(false);

      const isNewSession = data.sessionId !== sessionIdRef.current;
      sessionIdRef.current = data.sessionId ?? "";
      if (!isNewSession) return;

      setSessionEnded(false);
      setGameState("IDLE");
      setFeedback(null);
      setFinalStars(null);
      setWrongCount(0);
      setCopyMode(false);
      setPracticeWords(null);
      startedAtRef.current = 0;
      errorsRef.current = 0;
      wordErrorsRef.current = {};
      hasSentFinishedRef.current = false;

      setGameModeState(data.gameMode ?? "LAUFDIKTAT");
      setBattleOptions(data.battleOptions ?? DEFAULT_BATTLE_OPTIONS);
      setUebungMaxAttempts(data.uebungMaxAttempts ?? 3);
      setShowStars(data.showStars ?? true);
      setStrictTypingMode(data.strictTypingMode ?? true);

      const orderedWords =
        data.shuffleWords && data.sessionId
          ? seededShuffle(data.words, `${roomCode}:${studentName}:${data.sessionId}`)
          : data.words;
      setWords(orderedWords);
      setCurrentWordIndex(0);
      setInputValue("");
      setMetrics({ peeks: 0, attempts: 0 });

      const restoreSessionId = data.sessionId;
      if (roomId && participantToken && studentName && restoreSessionId) {
        getMyProgress(roomId, restoreSessionId, participantToken, studentName)
          .then((progress) => {
            if (sessionIdRef.current !== restoreSessionId) return;
            if (progress && progress.currentIndex >= 0 && progress.currentIndex < orderedWords.length) {
              setCurrentWordIndex(progress.currentIndex);
              setMetrics({ peeks: progress.peeks, attempts: progress.attempts });
              errorsRef.current = progress.errors;
            }
          })
          .catch(() => {});
      }
    },
    [roomCode, studentName, roomId, participantToken],
  );

  const onSessionEnded = useCallback(() => setSessionEnded(true), []);

  // useBattleMode needs `roster`/`sendAttack` from useGameRoom, but useGameRoom
  // needs an onAttack callback up front — resolved with a ref the battle hook
  // fills in once it exists (same pattern as TaughtMe/Laufdiktat's Game.tsx).
  const battleRef = useRef<{ onAttack: (type: AttackType) => void }>({ onAttack: () => {} });
  const dispatchAttack = useCallback((type: AttackType) => battleRef.current.onAttack(type), []);

  const { connectionWarning, presenceOk, roster, sendProgress, sendFinished, sendAttack } = useGameRoom({
    roomCode,
    studentName,
    roomId,
    participantToken,
    currentWordIndexRef,
    onSessionStart,
    onSessionEnded,
    onAttack: dispatchAttack,
  });

  const battle = useBattleMode({ studentName, currentWordIndex, battleOptions, roster, sendAttack });
  useEffect(() => {
    battleRef.current = battle;
  });

  // Persist progress as it changes, so a reload/reconnect resumes here instead of at word 1.
  useEffect(() => {
    if (practiceWords) return; // local practice round — never reported
    if (!roomId || !participantToken || !studentName || !sessionIdRef.current || gameState === "FINISHED") return;
    upsertProgress({
      roomId,
      sessionId: sessionIdRef.current,
      participantToken,
      studentKey: studentName,
      currentIndex: currentWordIndex,
      peeks: metrics.peeks,
      attempts: metrics.attempts,
      errors: errorsRef.current,
      finished: false,
    }).catch(() => {});
  }, [roomId, participantToken, studentName, currentWordIndex, gameState, metrics.peeks, metrics.attempts, practiceWords]);

  useEffect(() => {
    if (practiceWords) return;
    if (gameState !== "FINISHED" || hasSentFinishedRef.current) return;
    hasSentFinishedRef.current = true;
    const durationMs = startedAtRef.current ? Date.now() - startedAtRef.current : 0;
    setFinalStars(computeStars(errorsRef.current, words.length));
    setFinalErrorCount(errorsRef.current);
    if (roomId && participantToken && studentName && sessionIdRef.current) {
      upsertProgress({
        roomId,
        sessionId: sessionIdRef.current,
        participantToken,
        studentKey: studentName,
        currentIndex: currentWordIndexRef.current,
        peeks: metrics.peeks,
        attempts: metrics.attempts,
        errors: errorsRef.current,
        finished: true,
        durationMs,
        wordErrors: wordErrorsRef.current,
        appVersion: APP_VERSION,
      })
        .then(() => sendFinished({ name: studentName }))
        .catch(() => {});
    }
  }, [gameState, roomId, participantToken, studentName, metrics.peeks, metrics.attempts, sendFinished, words.length, practiceWords]);

  useEffect(() => {
    if (gameState !== "WRITING") return;
    const timer = setTimeout(() => inputRef.current?.focus(), 10);
    return () => clearTimeout(timer);
  }, [gameState]);

  const activeWords = practiceWords ?? words;
  const currentWord = activeWords[currentWordIndex];
  const { animal } = parseStudentName(studentName);
  const isMath = currentWord?.kind === "math";
  const displayPrompt = currentWord ? (currentWord.prompt ?? currentWord.targetWord) : "";
  const effectiveMode: GameMode = practiceWords ? "UEBUNG" : gameMode;

  function reveal() {
    if (startedAtRef.current === 0) startedAtRef.current = Date.now();
    setMetrics((prev) => ({ ...prev, peeks: prev.peeks + 1 }));
    setGameState("REVEALED");
  }

  function handleInputChange(raw: string) {
    if (!strictTypingMode) {
      setInputValue(raw);
      return;
    }
    if (isSuspiciousBulkInsert(inputValue, raw)) return;
    setInputValue(isMath ? sanitizeMathInput(raw) : raw);
  }

  function advanceOrFinish(newIndex: number) {
    if (newIndex < activeWords.length) {
      setCurrentWordIndex(newIndex);
      setInputValue("");
      setGameState("IDLE");
      setWrongCount(0);
      setCopyMode(false);
    } else {
      setGameState("FINISHED");
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (gameState !== "WRITING" || !currentWord) return;
    setMetrics((prev) => ({ ...prev, attempts: prev.attempts + 1 }));

    if (checkAnswer(currentWord, inputValue)) {
      setFeedback("correct");
      setTimeout(() => setFeedback(null), 350);
      const newIndex = currentWordIndex + 1;
      if (!practiceWords) sendProgress(newIndex);
      if (!practiceWords && effectiveMode === "BATTLE") battle.fillCharge();
      advanceOrFinish(newIndex);
    } else {
      setFeedback("wrong");
      setTimeout(() => setFeedback(null), 350);
      errorsRef.current += 1;
      wordErrorsRef.current[currentWord.id] = (wordErrorsRef.current[currentWord.id] || 0) + 1;

      if (effectiveMode === "UEBUNG") {
        if (!copyMode) {
          const nextWrong = wrongCount + 1;
          setWrongCount(nextWrong);
          setInputValue("");
          if (nextWrong >= uebungMaxAttempts) setCopyMode(true);
        }
        // In the copy phase, don't clear the input — the mistake stays visible and correctable.
      } else {
        setInputValue("");
      }
      inputRef.current?.focus();
    }
  }

  function startErrorPractice() {
    const wrongIds = new Set(Object.keys(wordErrorsRef.current));
    const wrongWords = words.filter((w) => wrongIds.has(w.id));
    if (wrongWords.length === 0) return;
    setPracticeWords(wrongWords);
    setCurrentWordIndex(0);
    setInputValue("");
    setGameState("IDLE");
    setFeedback(null);
    setWrongCount(0);
    setCopyMode(false);
    errorsRef.current = 0;
    wordErrorsRef.current = {};
    startedAtRef.current = 0;
    hasSentFinishedRef.current = true; // local round — the FINISHED effect above must not report it
  }

  function leave() {
    clearRoomIdentity();
    onLeave();
  }

  if (versionMismatch) {
    return (
      <div className="game-card">
        <p>Deine Lehrkraft nutzt eine andere Version der App.</p>
        <p>Bitte lade diese Seite einmal neu und versuche es erneut.</p>
        <button className="button button--primary" type="button" onClick={() => window.location.reload()}>Neu laden</button>
      </div>
    );
  }

  if (sessionEnded) {
    return (
      <div className="game-card">
        <p>Die Lehrkraft hat den Raum beendet.</p>
        <button className="button button--primary" type="button" onClick={leave}>Zurück zur Startseite</button>
      </div>
    );
  }

  if (gameState === "FINISHED") {
    const hasErrors = finalErrorCount > 0;
    return (
      <div className="game-card">
        {showStars && !practiceWords && (
          <p className="game-card__stars" aria-label={`${finalStars ?? 0} von 5 Sternen`}>
            {"★".repeat(finalStars ?? 0)}{"☆".repeat(5 - (finalStars ?? 0))}
          </p>
        )}
        <p>{practiceWords ? "Fehler-Übung geschafft!" : `Geschafft, ${studentName}!`}</p>
        {!practiceWords && <p className="game-card__meta">{finalErrorCount} Fehler bei {words.length} Wörtern</p>}
        {!practiceWords && hasErrors && (
          <button className="button button--secondary" type="button" onClick={startErrorPractice}>Nur meine Fehler üben</button>
        )}
        {practiceWords && (
          <button className="button button--quiet" type="button" onClick={() => setPracticeWords(null)}>Zurück zum Ergebnis</button>
        )}
        <button className="button button--primary" type="button" onClick={leave}>Zurück zur Startseite</button>
      </div>
    );
  }

  if (activeWords.length === 0) {
    return (
      <div className="game-card">
        <img src={`/animals/${animalToFileName(animal)}.svg`} alt="" className="game-card__avatar" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        <p>Hallo {studentName}!</p>
        <p className="game-card__meta">{presenceOk ? "Verbunden" : "Verbinde …"} · Warte auf die Lehrkraft …</p>
        {connectionWarning && <p className="game-card__warning">Verbindung wackelt gerade.</p>}
        <button className="button button--quiet" type="button" onClick={leave}>Raum verlassen</button>
      </div>
    );
  }

  const hintFraction = uebungMaxAttempts > 0 ? wrongCount / uebungMaxAttempts : 0;
  const showHint = effectiveMode === "UEBUNG" && !copyMode && wrongCount > 0 && !isMath && currentWord;
  const hintText = showHint ? buildHint(currentWord.targetWord, hintFraction) : "";

  return (
    <div className={`game-card${feedback ? ` game-card--${feedback}` : ""}${battle.isFlickerActive ? " game-card--flicker" : ""}`}>
      {practiceWords && <p className="game-card__practice-badge">Fehler-Übung (wird nicht gemeldet)</p>}
      <p className="game-card__progress">Wort {currentWordIndex + 1} von {activeWords.length}</p>

      {effectiveMode === "BATTLE" && !practiceWords && (
        <BattlePanel battle={battle} />
      )}

      {gameState === "IDLE" && (
        <>
          {copyMode && currentWord && <p className="game-card__word game-card__word--copy">{currentWord.targetWord}</p>}
          {showHint && <p className="game-card__hint-text">{hintText}</p>}
          <p className="game-card__hint">Bereit? Schau dir das Wort an, dann wird es wieder versteckt.</p>
          <button className="button button--primary" type="button" onClick={reveal}>Wort ansehen</button>
        </>
      )}

      {gameState === "REVEALED" && currentWord && (
        <>
          <p className="game-card__word">{displayPrompt}</p>
          <button className="button button--secondary" type="button" onClick={() => setGameState("WRITING")}>Verdecken &amp; schreiben</button>
        </>
      )}

      {gameState === "WRITING" && (
        <form onSubmit={handleSubmit} className="game-card__form">
          {copyMode && currentWord && <p className="game-card__word game-card__word--copy">{currentWord.targetWord}</p>}
          {showHint && <p className="game-card__hint-text">{hintText}</p>}
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(event) => handleInputChange(event.target.value)}
            inputMode={isMath ? "decimal" : undefined}
            aria-label="Deine Antwort"
            {...STRICT_INPUT_ATTRS}
          />
          <button className="button button--primary" type="submit">Prüfen</button>
        </form>
      )}

      {battle.battleToast && <p className="game-card__toast" role="status">{battle.battleToast}</p>}
      {battle.inkSplats.map((splat) => (
        <span
          key={splat.id}
          className="game-card__ink-splat"
          style={{ top: splat.top, left: splat.left, width: splat.width, height: splat.height, borderRadius: splat.borderRadius, transform: `rotate(${splat.rotation}deg)` }}
          aria-hidden="true"
        />
      ))}

      <button className="button button--quiet game-card__leave" type="button" onClick={leave}>Raum verlassen</button>
    </div>
  );
}

function BattlePanel({ battle }: { battle: ReturnType<typeof useBattleMode> }) {
  return (
    <div className="battle-panel">
      <div className="battle-panel__charge">
        <div className="battle-panel__charge-fill" style={{ width: `${battle.charge}%` }} />
      </div>
      {battle.chargeReady && !battle.picker && (
        <div className="battle-panel__actions">
          {battle.availableAttacks.map((type) => (
            <button key={type} type="button" className="button button--secondary" onClick={() => battle.setPicker(type)}>
              {type === "ink" ? "🖋️ Angriff" : "✨ Angriff"}
            </button>
          ))}
          <button type="button" className="button button--quiet" onClick={battle.raiseShield}>🛡️ Schild</button>
        </div>
      )}
      {battle.picker && (
        <div className="battle-panel__picker">
          <p>Ziel wählen:</p>
          <div className="battle-panel__actions">
            {battle.attackCandidates.map((c) => (
              <button key={c.name} type="button" className="button button--secondary" onClick={() => battle.launchAttack(c.name)}>{c.name}</button>
            ))}
            <button type="button" className="button button--quiet" onClick={() => battle.setPicker(null)}>Abbrechen</button>
          </div>
        </div>
      )}
      {battle.shieldActive && <p className="battle-panel__shield">🛡️ Schild aktiv</p>}
    </div>
  );
}
