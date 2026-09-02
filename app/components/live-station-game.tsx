"use client";

import { useMemo, useRef, useState } from "react";
import { deterministicOrder } from "../../src/domain/running-dictation";
import type { LiveSession } from "../../src/integrations/laufdiktat/live-session";
import type { LiveProgress } from "../../src/integrations/laufdiktat/room-api";
import { MathDisplay } from "./math-display";

type Props = {
  code: string;
  session: LiveSession;
  connectionWarning: string;
  onProgress: (progress: LiveProgress) => void;
  onLoadProgress: (studentKey: string) => Promise<LiveProgress | null>;
};

export function LiveStationGame({
  code,
  session,
  connectionWarning,
  onProgress,
  onLoadProgress,
}: Props) {
  const [stationNumber, setStationNumber] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const [peeks, setPeeks] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [seen, setSeen] = useState<Set<number>>(new Set());
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const reachedIndex = useRef(0);

  const words = useMemo(() => {
    if (!session.stationShuffle || stationNumber === null) return session.words;
    return deterministicOrder(
      session.words.length,
      `${code}:${session.sessionId}:${stationNumber}`,
    ).map((wordIndex) => session.words[wordIndex]!);
  }, [code, session, stationNumber]);

  async function chooseStation(number: number) {
    setLoading(true);
    setStationNumber(number);
    try {
      const saved = await onLoadProgress(`station-${number}`);
      const restoredIndex = Math.min(
        saved?.currentIndex ?? 0,
        Math.max(0, session.words.length - 1),
      );
      setIndex(restoredIndex);
      reachedIndex.current = restoredIndex;
      setPeeks(saved?.peeks ?? 0);
      setFinished(saved?.finished ?? false);
    } finally {
      setSeen(new Set());
      setRevealed(false);
      setLoading(false);
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

  function reveal() {
    const wasSeen = seen.has(index);
    const nextPeeks = wasSeen ? peeks + 1 : peeks;
    const done = finished || index === words.length - 1;
    setSeen((current) => new Set(current).add(index));
    setPeeks(nextPeeks);
    setFinished(done);
    setRevealed(true);
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
    <div className="live-game-page is-active-round">
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
        {loading ? (
          <p>Dein Stand wird geladen …</p>
        ) : revealed ? (
          <>
            <p className="eyebrow">Merken und auf Papier schreiben</p>
            <h1>
              <MathDisplay
                text={current.prompt ?? current.targetWord}
                isLatex={current.isLatex ?? false}
              />
            </h1>
            <button className="text-button" onClick={() => setRevealed(false)}>
              Aufgabe wieder verdecken
            </button>
          </>
        ) : (
          <>
            <p className="eyebrow">Bereit?</p>
            <h1>Aufgabe {index + 1}</h1>
            <button className="button button--primary" onClick={reveal}>
              Aufgabe zeigen
            </button>
          </>
        )}
        <div className="live-station__navigation">
          <button
            className="text-button"
            disabled={index === 0}
            onClick={() => {
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
              disabled={!seen.has(index)}
              onClick={() => {
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
              disabled={!seen.has(index)}
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
        <p className="live-station__hint">
          Erstes Ansehen ist frei. Erneutes Öffnen zählt als Spicker.
        </p>
      </section>
    </div>
  );
}
