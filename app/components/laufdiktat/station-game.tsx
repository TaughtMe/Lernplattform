"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useGameRoom } from "../../../src/laufdiktat/use-game-room.ts";
import { checkAnswer } from "../../../src/laufdiktat/check-answer.ts";
import { buildHint } from "../../../src/laufdiktat/build-hint.ts";
import { computeStars } from "../../../src/laufdiktat/scoring.ts";
import { isSuspiciousBulkInsert, sanitizeMathInput, STRICT_INPUT_ATTRS } from "../../../src/laufdiktat/strict-typing.ts";
import { APP_VERSION } from "../../../src/laufdiktat/app-version.ts";
import { upsertProgress, getMyProgress } from "../../../src/laufdiktat/room-api.ts";
import type { GameMode, GameState, GameMetrics, SessionStartData, WordItem } from "../../../src/laufdiktat/types.ts";

type Props = {
  roomCode: string;
  roomId: string;
  participantToken: string;
  onLeave: () => void;
};

/**
 * Station mode: a tablet placed at a numbered station, shared by whichever
 * student is currently there — as opposed to a personal per-student device.
 * Reuses the same realtime connection and reveal/hide/write loop as
 * GameSession, keyed by "station-N" instead of a student name (see
 * upsert_progress_secure()/get_my_progress_secure() in the migrations, which
 * both understand that key pattern). No battle mode here: attacking a fixed
 * classroom tablet doesn't map to a single student.
 */
export function StationGame({ roomCode, roomId, participantToken, onLeave }: Props) {
  const [stationNumber, setStationNumber] = useState<number | null>(null);
  const [stationInput, setStationInput] = useState("");

  if (stationNumber === null) {
    return (
      <div className="game-card">
        <p>Stationsmodus – an welcher Station steht dieses Gerät?</p>
        <form
          className="game-card__form"
          onSubmit={(event) => {
            event.preventDefault();
            const n = Number(stationInput);
            if (Number.isInteger(n) && n > 0) setStationNumber(n);
          }}
        >
          <input
            value={stationInput}
            onChange={(event) => setStationInput(event.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            placeholder="Stationsnummer, z. B. 3"
            aria-label="Stationsnummer"
          />
          <button className="button button--primary" type="submit">Bestätigen</button>
        </form>
        <button className="button button--quiet game-card__leave" type="button" onClick={onLeave}>Raum verlassen</button>
      </div>
    );
  }

  return <StationGameSession roomCode={roomCode} roomId={roomId} participantToken={participantToken} stationNumber={stationNumber} onChangeStation={() => setStationNumber(null)} onLeave={onLeave} />;
}

function StationGameSession({
  roomCode,
  roomId,
  participantToken,
  stationNumber,
  onChangeStation,
  onLeave,
}: Props & { stationNumber: number; onChangeStation: () => void }) {
  const studentKey = `station-${stationNumber}`;

  const [words, setWords] = useState<WordItem[]>([]);
  const [gameMode, setGameMode] = useState<GameMode>("LAUFDIKTAT");
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
  const [finalStars, setFinalStars] = useState<number | null>(null);
  const [wrongCount, setWrongCount] = useState(0);
  const [copyMode, setCopyMode] = useState(false);

  const errorsRef = useRef(0);
  const startedAtRef = useRef(0);
  const sessionIdRef = useRef("");
  const hasSentFinishedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onSessionStart = useCallback(
    (data: SessionStartData) => {
      const isNewSession = data.sessionId !== sessionIdRef.current;
      sessionIdRef.current = data.sessionId ?? "";
      if (!isNewSession) return;

      setSessionEnded(false);
      setGameState("IDLE");
      setFeedback(null);
      setFinalStars(null);
      setWrongCount(0);
      setCopyMode(false);
      startedAtRef.current = 0;
      errorsRef.current = 0;
      hasSentFinishedRef.current = false;

      setGameMode(data.gameMode ?? "LAUFDIKTAT");
      setUebungMaxAttempts(data.uebungMaxAttempts ?? 3);
      setShowStars(data.showStars ?? true);
      setStrictTypingMode(data.strictTypingMode ?? true);
      // Station numbers have a fixed spatial mapping to a word — never shuffled.
      setWords(data.words);
      setCurrentWordIndex(0);
      setInputValue("");
      setMetrics({ peeks: 0, attempts: 0 });

      const restoreSessionId = data.sessionId;
      if (roomId && participantToken && restoreSessionId) {
        getMyProgress(roomId, restoreSessionId, participantToken, studentKey)
          .then((progress) => {
            if (sessionIdRef.current !== restoreSessionId) return;
            if (progress && progress.currentIndex >= 0 && progress.currentIndex < data.words.length) {
              setCurrentWordIndex(progress.currentIndex);
              setMetrics({ peeks: progress.peeks, attempts: progress.attempts });
              errorsRef.current = progress.errors;
            }
          })
          .catch(() => {});
      }
    },
    [roomId, participantToken, studentKey],
  );

  const onSessionEnded = useCallback(() => setSessionEnded(true), []);

  const { connectionWarning, presenceOk } = useGameRoom({
    roomCode,
    studentName: studentKey,
    roomId,
    participantToken,
    currentWordIndexRef,
    onSessionStart,
    onSessionEnded,
  });

  useEffect(() => {
    if (!roomId || !participantToken || !sessionIdRef.current || gameState === "FINISHED") return;
    upsertProgress({
      roomId,
      sessionId: sessionIdRef.current,
      participantToken,
      studentKey,
      currentIndex: currentWordIndex,
      peeks: metrics.peeks,
      attempts: metrics.attempts,
      errors: errorsRef.current,
      finished: false,
      stationNumber,
    }).catch(() => {});
  }, [roomId, participantToken, studentKey, stationNumber, currentWordIndex, gameState, metrics.peeks, metrics.attempts]);

  useEffect(() => {
    if (gameState !== "FINISHED" || hasSentFinishedRef.current) return;
    hasSentFinishedRef.current = true;
    setFinalStars(computeStars(errorsRef.current, words.length));
    if (roomId && participantToken && sessionIdRef.current) {
      upsertProgress({
        roomId,
        sessionId: sessionIdRef.current,
        participantToken,
        studentKey,
        currentIndex: currentWordIndexRef.current,
        peeks: metrics.peeks,
        attempts: metrics.attempts,
        errors: errorsRef.current,
        finished: true,
        appVersion: APP_VERSION,
        stationNumber,
      }).catch(() => {});
    }
  }, [gameState, roomId, participantToken, studentKey, stationNumber, metrics.peeks, metrics.attempts, words.length]);

  useEffect(() => {
    if (gameState !== "WRITING") return;
    const timer = setTimeout(() => inputRef.current?.focus(), 10);
    return () => clearTimeout(timer);
  }, [gameState]);

  const currentWord = words[currentWordIndex];
  const isMath = currentWord?.kind === "math";
  const displayPrompt = currentWord ? (currentWord.prompt ?? currentWord.targetWord) : "";

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

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (gameState !== "WRITING" || !currentWord) return;
    setMetrics((prev) => ({ ...prev, attempts: prev.attempts + 1 }));

    if (checkAnswer(currentWord, inputValue)) {
      setFeedback("correct");
      setTimeout(() => setFeedback(null), 350);
      const newIndex = currentWordIndex + 1;
      if (newIndex < words.length) {
        setCurrentWordIndex(newIndex);
        setInputValue("");
        setGameState("IDLE");
        setWrongCount(0);
        setCopyMode(false);
      } else {
        setGameState("FINISHED");
      }
    } else {
      setFeedback("wrong");
      setTimeout(() => setFeedback(null), 350);
      errorsRef.current += 1;

      if (gameMode === "UEBUNG") {
        if (!copyMode) {
          const nextWrong = wrongCount + 1;
          setWrongCount(nextWrong);
          setInputValue("");
          if (nextWrong >= uebungMaxAttempts) setCopyMode(true);
        }
      } else {
        setInputValue("");
      }
      inputRef.current?.focus();
    }
  }

  if (sessionEnded) {
    return (
      <div className="game-card">
        <p>Die Lehrkraft hat den Raum beendet.</p>
        <button className="button button--primary" type="button" onClick={onLeave}>Zurück zur Startseite</button>
      </div>
    );
  }

  if (gameState === "FINISHED") {
    return (
      <div className="game-card">
        {showStars && (
          <p className="game-card__stars" aria-label={`${finalStars ?? 0} von 5 Sternen`}>
            {"★".repeat(finalStars ?? 0)}{"☆".repeat(5 - (finalStars ?? 0))}
          </p>
        )}
        <p>Station {stationNumber} geschafft!</p>
        <button className="button button--secondary" type="button" onClick={onChangeStation}>Andere Station</button>
        <button className="button button--primary" type="button" onClick={onLeave}>Zurück zur Startseite</button>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="game-card">
        <p>Station {stationNumber}</p>
        <p className="game-card__meta">{presenceOk ? "Verbunden" : "Verbinde …"} · Warte auf die Lehrkraft …</p>
        {connectionWarning && <p className="game-card__warning">Verbindung wackelt gerade.</p>}
        <button className="button button--quiet" type="button" onClick={onChangeStation}>Andere Station</button>
        <button className="button button--quiet" type="button" onClick={onLeave}>Raum verlassen</button>
      </div>
    );
  }

  const hintFraction = uebungMaxAttempts > 0 ? wrongCount / uebungMaxAttempts : 0;
  const showHint = gameMode === "UEBUNG" && !copyMode && wrongCount > 0 && !isMath && currentWord;
  const hintText = showHint ? buildHint(currentWord.targetWord, hintFraction) : "";

  return (
    <div className={`game-card${feedback ? ` game-card--${feedback}` : ""}`}>
      <p className="game-card__progress">Station {stationNumber} · Wort {currentWordIndex + 1} von {words.length}</p>

      {gameState === "IDLE" && (
        <>
          {copyMode && currentWord && <p className="game-card__word game-card__word--copy">{currentWord.targetWord}</p>}
          {showHint && <p className="game-card__hint-text">{hintText}</p>}
          <p className="game-card__hint">Wort ansehen, dann wird es wieder versteckt.</p>
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
            aria-label="Antwort"
            {...STRICT_INPUT_ATTRS}
          />
          <button className="button button--primary" type="submit">Prüfen</button>
        </form>
      )}

      <button className="button button--quiet game-card__leave" type="button" onClick={onLeave}>Raum verlassen</button>
    </div>
  );
}
