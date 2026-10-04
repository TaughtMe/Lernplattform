"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { deterministicOrder } from "../../../src/domain/running-dictation";
import type { LiveSession } from "../../../src/integrations/laufdiktat/live-session";
import type { ProgressDeliveryStatus } from "../../../src/integrations/laufdiktat/progress-delivery";
import type { LiveProgress } from "../../../src/integrations/laufdiktat/room-api";
import { MathDisplay } from "../../components/math-display";
import { useThemeToggle } from "../../ui/theme";
import { StudentDictationScreen } from "../../views/laufdiktat/student-dictation-screen";
import { useHoldToReveal } from "./use-hold-to-reveal";
import { DeliveryNotice, GameWarning } from "./game-parts";

type Props = {
  code: string;
  animal?: string | null;
  session: LiveSession;
  connectionWarning: string;
  deliveryStatus?: ProgressDeliveryStatus;
  onRetryProgress?: (() => void) | undefined;
  onProgress: (progress: LiveProgress) => void;
  onLoadProgress: (studentKey: string) => Promise<LiveProgress | null>;
};

export function LiveStationGame({
  code,
  animal = null,
  session,
  connectionWarning,
  onProgress,
  onLoadProgress,
  deliveryStatus = "idle",
  onRetryProgress,
}: Props) {
  const [stationNumber, setStationNumber] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const [peeks, setPeeks] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [activity, setActivity] = useState(0);
  const request = useRef(0);
  const revealing = useRef(false);
  const surfaceRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!revealed) revealing.current = false;
  }, [revealed]);
  const { theme, toggleTheme } = useThemeToggle();
  const reachedIndex = useRef(0);

  const words = useMemo(() => {
    if (!session.stationShuffle || stationNumber === null) return session.words;
    return deterministicOrder(
      session.words.length,
      `${code}:${session.sessionId}:${stationNumber}`,
    ).map((wordIndex) => session.words[wordIndex]!);
  }, [code, session, stationNumber]);

  const seenKey = stationNumber + ":" + index;
  const currentPrompt = words[index]?.prompt ?? words[index]?.targetWord ?? "";
  useEffect(() => {
    if (stationNumber === null || loading || revealed || loadError) return;
    const timer = window.setTimeout(() => {
      setStationNumber(null);
      setRevealed(false);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [stationNumber, loading, revealed, loadError, activity]);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );

  async function chooseStation(number: number) {
    const activeRequest = ++request.current;
    setLoadError("");
    setLoading(true);
    setStationNumber(number);
    try {
      const saved = await onLoadProgress(`station-${number}`);
      if (request.current !== activeRequest) return;
      const restoredIndex = Math.min(
        saved?.currentIndex ?? 0,
        Math.max(0, session.words.length - 1),
      );
      setIndex(restoredIndex);
      reachedIndex.current = restoredIndex;
      setPeeks(saved?.peeks ?? 0);
      setFinished(saved?.finished ?? false);
    } catch {
      if (request.current === activeRequest)
        setLoadError(
          "Dein Stand konnte nicht geladen werden. Bitte erneut versuchen.",
        );
    } finally {
      if (request.current === activeRequest) {
        setRevealed(false);
        setLoading(false);
        setActivity((value) => value + 1);
      }
    }
  }

  function report(nextIndex: number, nextPeeks: number, done: boolean) {
    if (stationNumber === null) return;
    onProgress({
      currentIndex: Math.max(nextIndex, reachedIndex.current),
      peeks: nextPeeks,
      attempts: 0,
      errors: 0,
      finished: done,
      stationNumber,
    });
  }

  function reveal(show = true) {
    // Geste und Knopf können im selben Moment auslösen: nur einmal zählen.
    if (loading || loadError || revealed || revealing.current) return;
    if (show) revealing.current = true;
    const wasSeen = seen.has(seenKey);
    const nextPeeks = wasSeen ? peeks + 1 : peeks;
    const done = finished || index === words.length - 1;
    setSeen((current) => new Set(current).add(seenKey));
    setPeeks(nextPeeks);
    setFinished(done);
    setRevealed(show);
    setActivity((value) => value + 1);
    report(index, nextPeeks, done);
  }

  const readAloud = () => {
    const current = words[index];
    if (!current || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(currentPrompt);
    utterance.lang = current.promptLang ?? "de-DE";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    reveal(false);
  };
  const notices =
    deliveryStatus !== "idle" || connectionWarning ? (
      <div className="ui-stack">
        <DeliveryNotice status={deliveryStatus} onRetry={onRetryProgress} />
        {connectionWarning ? (
          <GameWarning>{connectionWarning}</GameWarning>
        ) : null}
      </div>
    ) : null;
  const common = {
    roomCode: code,
    animal,
    className: "",
    theme,
    onToggleTheme: toggleTheme,
    sentenceCount: words.length,
    hintsUsed: peeks,
    typed: "",
    station: { count: session.stationCount, selected: stationNumber },
    battle: { charge: 0, shieldActive: false },
    result: { mistakes: 0, hints: peeks, points: 0, savedWords: [] },
    unit: "Aufgabe" as const,
    notices,
  };

  const blocked = loading || Boolean(loadError);
  function hide() {
    setRevealed(false);
    setActivity((value) => value + 1);
  }
  useHoldToReveal(surfaceRef, {
    enabled: stationNumber !== null && !blocked,
    phase: revealed ? "read" : "wait",
    onReveal: () => reveal(),
    onRelease: hide,
  });

  if (stationNumber === null) {
    return (
      <div className="ui-dictation">
        <StudentDictationScreen
          {...common}
          phase="station"
          onLeave={() => window.location.assign("/lernen")}
          subtitle="Stationen"
          sentenceIndex={0}
          sentence=""
          stationIntro="Tippe deine Nummer an und merke dir die Aufgaben an der Station."
          onPickStation={(number) => void chooseStation(number)}
        />
      </div>
    );
  }

  const current = words[index];
  if (!current) return null;
  return (
    <div
      className="ui-dictation is-active-round"
      data-game-surface=""
      ref={surfaceRef}
      onContextMenu={(event) => event.preventDefault()}
    >
      <StudentDictationScreen
        {...common}
        phase={revealed ? "read" : "hold"}
        subtitle={`Nummer ${stationNumber} · Aufgabe ${index + 1} / ${words.length}`}
        sentenceIndex={index}
        sentence={currentPrompt}
        prompt={
          <MathDisplay
            text={current.prompt ?? current.targetWord}
            isLatex={current.isLatex ?? false}
          />
        }
        readAloud={session.isTtsEnabled && !blocked}
        onReadAloud={readAloud}
        hold={{
          title: `Aufgabe ${index + 1}`,
          ...(loading ? { text: "Dein Stand wird geladen …" } : {}),
          ...(loadError
            ? {
                error: {
                  text: loadError,
                  onRetry: () => void chooseStation(stationNumber),
                },
              }
            : {}),
        }}
        read={{ maxFontSize: 72 }}
        stationNav={{
          canPrev: index > 0 && !blocked,
          canNext: seen.has(seenKey) && !blocked,
          isLast: index >= words.length - 1,
          onPrev: () => {
            setActivity((value) => value + 1);
            const next = index - 1;
            setIndex(next);
            setRevealed(false);
            report(next, peeks, finished);
          },
          onNext: () => {
            setActivity((value) => value + 1);
            const next = index + 1;
            reachedIndex.current = Math.max(reachedIndex.current, next);
            setIndex(next);
            setRevealed(false);
            report(next, peeks, finished);
          },
          onDone: () => {
            setStationNumber(null);
            setIndex(0);
            setRevealed(false);
          },
          onToStations: () => {
            request.current++;
            setStationNumber(null);
            setRevealed(false);
          },
          note: "Erstes Ansehen ist frei. Erneutes Öffnen zählt als Spicker.",
        }}
        onLeave={() => {
          request.current++;
          setStationNumber(null);
          setRevealed(false);
        }}
      />
    </div>
  );
}
