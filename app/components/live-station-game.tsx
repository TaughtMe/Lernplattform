"use client";
import { LiveProgressNotice } from "./live-progress-notice";
import type { ProgressDeliveryStatus } from "../../src/integrations/laufdiktat/progress-delivery";

import { useEffect, useMemo, useRef, useState } from "react";
import { deterministicOrder } from "../../src/domain/running-dictation";
import type { LiveSession } from "../../src/integrations/laufdiktat/live-session";
import type { LiveProgress } from "../../src/integrations/laufdiktat/room-api";
import { MathDisplay } from "./math-display";

import { useAutoFitFontSize } from "./use-auto-fit-font-size";

type Props = {
  code: string;
  session: LiveSession;
  connectionWarning: string;
  deliveryStatus?: ProgressDeliveryStatus;
  onRetryProgress?: (() => void) | undefined;
  onProgress: (progress: LiveProgress) => void;
  onLoadProgress: (studentKey: string) => Promise<LiveProgress | null>;
};

export function LiveStationGame({
  code,
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
  const { containerRef, textRef, fontSize } = useAutoFitFontSize(
    currentPrompt,
    { min: 28, max: 72 },
  );
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
    if (loading || loadError || revealed) return;
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

  if (stationNumber === null) {
    return (
      <div className="live-game-page">
        <section className="live-station" aria-labelledby="station-title">
          <p className="eyebrow">Raum {code} · Laufdiktat</p>
          <h1 id="station-title">Wähle deine Nummer</h1>
          <p>
            Tippe deine Nummer an und merke dir die Aufgaben an der Station.
          </p>
          <div className="live-station__grid">
            {Array.from(
              { length: session.stationCount },
              (_, item) => item + 1,
            ).map((number) => (
              <button key={number} onClick={() => void chooseStation(number)}>
                {number}
              </button>
            ))}
          </div>
          <LiveProgressNotice
            status={deliveryStatus}
            onRetry={onRetryProgress}
          />
          {connectionWarning ? (
            <p className="live-game-warning" role="status">
              {connectionWarning}
            </p>
          ) : null}
        </section>
      </div>
    );
  }

  const current = words[index];
  if (!current) return null;
  return (
    <div
      className="live-game-page is-active-round"
      onTouchStart={(event) => {
        if (event.touches.length >= 2) reveal();
      }}
      onTouchEnd={(event) => {
        if (event.touches.length < 2) {
          setRevealed(false);
          setActivity((value) => value + 1);
        }
      }}
      onTouchCancel={() => {
        setRevealed(false);
        setActivity((value) => value + 1);
      }}
    >
      <header className="live-game-page__header">
        <div className="live-game-page__meta">
          <span>Nummer</span>
          <strong>{stationNumber}</strong>
        </div>
        <div className="live-game-page__meta">
          <span>Aufgabe</span>
          <strong>
            {index + 1} / {words.length}
          </strong>
        </div>
      </header>
      <section className="live-station live-station--active" aria-live="polite">
        {loadError ? (
          <div role="alert">
            <p>{loadError}</p>
            <button onClick={() => void chooseStation(stationNumber)}>
              Erneut laden
            </button>
          </div>
        ) : null}
        {session.isTtsEnabled ? (
          <button
            disabled={loading || Boolean(loadError)}
            aria-label="Vorlesen"
            onClick={() => {
              if (!("speechSynthesis" in window)) return;
              const utterance = new SpeechSynthesisUtterance(currentPrompt);
              utterance.lang = current.promptLang ?? "de-DE";
              window.speechSynthesis.cancel();
              window.speechSynthesis.speak(utterance);
              reveal(false);
            }}
          >
            Vorlesen
          </button>
        ) : null}
        {loading ? (
          <p>Dein Stand wird geladen …</p>
        ) : revealed ? (
          <>
            <p className="eyebrow">Merken und auf Papier schreiben</p>
            <div ref={containerRef} className="live-station__reveal">
              <h1 ref={textRef} style={{ fontSize }}>
                <MathDisplay
                  text={current.prompt ?? current.targetWord}
                  isLatex={current.isLatex ?? false}
                />
              </h1>
            </div>
            <button className="text-button" onClick={() => setRevealed(false)}>
              Aufgabe wieder verdecken
            </button>
          </>
        ) : (
          <>
            <p className="eyebrow">Bereit?</p>
            <h1>Aufgabe {index + 1}</h1>
            <button
              className="button button--primary"
              disabled={loading || Boolean(loadError)}
              onClick={() => reveal()}
            >
              Aufgabe zeigen
            </button>
          </>
        )}
        <div className="live-station__navigation">
          <button
            className="text-button"
            disabled={index === 0 || loading || Boolean(loadError)}
            onClick={() => {
              setActivity((value) => value + 1);
              const next = index - 1;
              setIndex(next);
              setRevealed(false);
              report(next, peeks, finished);
            }}
          >
            Zurück
          </button>
          {index < words.length - 1 ? (
            <button
              className="button button--primary"
              disabled={!seen.has(seenKey) || loading || Boolean(loadError)}
              onClick={() => {
                setActivity((value) => value + 1);
                const next = index + 1;
                reachedIndex.current = Math.max(reachedIndex.current, next);
                setIndex(next);
                setRevealed(false);
                report(next, peeks, finished);
              }}
            >
              Nächste Aufgabe
            </button>
          ) : (
            <button
              className="button button--primary"
              disabled={!seen.has(seenKey) || loading || Boolean(loadError)}
              onClick={() => {
                setStationNumber(null);
                setIndex(0);
                setRevealed(false);
              }}
            >
              Fertig · nächste Nummer
            </button>
          )}
        </div>
        <LiveProgressNotice status={deliveryStatus} onRetry={onRetryProgress} />
        {connectionWarning ? <p role="status">{connectionWarning}</p> : null}
        <button
          className="text-button"
          onClick={() => {
            request.current++;
            setStationNumber(null);
            setRevealed(false);
          }}
        >
          Zur Nummernauswahl
        </button>
        <p className="live-station__hint">
          Erstes Ansehen ist frei. Erneutes Öffnen zählt als Spicker.
        </p>
      </section>
    </div>
  );
}
