"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useGameRoom } from "../../../src/laufdiktat/use-game-room.ts";
import { checkAnswer } from "../../../src/laufdiktat/check-answer.ts";
import { computeStars } from "../../../src/laufdiktat/scoring.ts";
import { seededShuffle } from "../../../src/laufdiktat/seeded-shuffle.ts";
import { APP_VERSION } from "../../../src/laufdiktat/app-version.ts";
import { upsertProgress, getMyProgress } from "../../../src/laufdiktat/room-api.ts";
import { clearRoomIdentity } from "../../../src/laufdiktat/room-identity.ts";
import { animalToFileName, parseStudentName } from "../../../src/laufdiktat/animal-names.ts";
import type { GameState, GameMetrics, SessionStartData, WordItem } from "../../../src/laufdiktat/types.ts";

type Props = {
  roomCode: string;
  studentName: string;
  roomId: string;
  participantToken: string;
  onLeave: () => void;
};

export function GameSession({ roomCode, studentName, roomId, participantToken, onLeave }: Props) {
  const [words, setWords] = useState<WordItem[]>([]);
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
      startedAtRef.current = 0;
      errorsRef.current = 0;
      wordErrorsRef.current = {};
      hasSentFinishedRef.current = false;

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

  const { connectionWarning, presenceOk, sendProgress, sendFinished } = useGameRoom({
    roomCode,
    studentName,
    roomId,
    participantToken,
    currentWordIndexRef,
    onSessionStart,
    onSessionEnded,
  });

  // Persist progress as it changes, so a reload/reconnect resumes here instead of at word 1.
  useEffect(() => {
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
  }, [roomId, participantToken, studentName, currentWordIndex, gameState, metrics.peeks, metrics.attempts]);

  useEffect(() => {
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
  }, [gameState, roomId, participantToken, studentName, metrics.peeks, metrics.attempts, sendFinished, words.length]);

  useEffect(() => {
    if (gameState !== "WRITING") return;
    const timer = setTimeout(() => inputRef.current?.focus(), 10);
    return () => clearTimeout(timer);
  }, [gameState]);

  const currentWord = words[currentWordIndex];
  const { animal } = parseStudentName(studentName);

  function reveal() {
    if (startedAtRef.current === 0) startedAtRef.current = Date.now();
    setMetrics((prev) => ({ ...prev, peeks: prev.peeks + 1 }));
    setGameState("REVEALED");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (gameState !== "WRITING" || !currentWord) return;
    setMetrics((prev) => ({ ...prev, attempts: prev.attempts + 1 }));

    if (checkAnswer(currentWord, inputValue)) {
      setFeedback("correct");
      setTimeout(() => setFeedback(null), 350);
      const newIndex = currentWordIndex + 1;
      sendProgress(newIndex);
      if (newIndex < words.length) {
        setCurrentWordIndex(newIndex);
        setInputValue("");
        setGameState("IDLE");
      } else {
        setGameState("FINISHED");
      }
    } else {
      setFeedback("wrong");
      setTimeout(() => setFeedback(null), 350);
      errorsRef.current += 1;
      wordErrorsRef.current[currentWord.targetWord] = (wordErrorsRef.current[currentWord.targetWord] || 0) + 1;
      setInputValue("");
      inputRef.current?.focus();
    }
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
    return (
      <div className="game-card">
        <p className="game-card__stars" aria-label={`${finalStars ?? 0} von 5 Sternen`}>
          {"★".repeat(finalStars ?? 0)}{"☆".repeat(5 - (finalStars ?? 0))}
        </p>
        <p>Geschafft, {studentName}!</p>
        <p className="game-card__meta">{finalErrorCount} Fehler bei {words.length} Wörtern</p>
        <button className="button button--primary" type="button" onClick={leave}>Zurück zur Startseite</button>
      </div>
    );
  }

  if (words.length === 0) {
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

  return (
    <div className={`game-card${feedback ? ` game-card--${feedback}` : ""}`}>
      <p className="game-card__progress">Wort {currentWordIndex + 1} von {words.length}</p>

      {gameState === "IDLE" && (
        <>
          <p className="game-card__hint">Bereit? Schau dir das Wort an, dann wird es wieder versteckt.</p>
          <button className="button button--primary" type="button" onClick={reveal}>Wort ansehen</button>
        </>
      )}

      {gameState === "REVEALED" && currentWord && (
        <>
          <p className="game-card__word">{currentWord.targetWord}</p>
          <button className="button button--secondary" type="button" onClick={() => setGameState("WRITING")}>Verdecken &amp; schreiben</button>
        </>
      )}

      {gameState === "WRITING" && (
        <form onSubmit={handleSubmit} className="game-card__form">
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-label="Deine Antwort"
          />
          <button className="button button--primary" type="submit">Prüfen</button>
        </form>
      )}

      <button className="button button--quiet game-card__leave" type="button" onClick={leave}>Raum verlassen</button>
    </div>
  );
}
