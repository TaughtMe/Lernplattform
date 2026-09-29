"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { deterministicOrder } from "../../../src/domain/running-dictation";
import type { LiveSession } from "../../../src/integrations/laufdiktat/live-session";
import type { ProgressDeliveryStatus } from "../../../src/integrations/laufdiktat/progress-delivery";
import type { LiveProgress } from "../../../src/integrations/laufdiktat/room-api";
import { MathDisplay } from "../../components/math-display";
import { useAutoFitFontSize } from "../../components/use-auto-fit-font-size";
import { Icon } from "../../ui/icons";
import { Button, Pill } from "../../ui/primitives";
import { DeliveryNotice, GameHeader, GameWarning } from "./game-parts";

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
      <div className="ui ui-game">
        <GameHeader code={code} subtitle="Stationen" />
        <section
          className="ui-stack ui-game__stations"
          aria-labelledby="station-title"
        >
          <div className="ui-between">
            <h1 id="station-title" className="ui-h-page">
              Wähle deine Nummer
            </h1>
            <span className="ui-small ui-muted">
              {session.stationCount} Schüler
            </span>
          </div>
          <p className="ui-small ui-muted">
            Tippe deine Nummer an und merke dir die Aufgaben an der Station.
          </p>
          <div className="ui-game__numbers">
            {Array.from(
              { length: session.stationCount },
              (_, item) => item + 1,
            ).map((number) => (
              <button
                key={number}
                type="button"
                onClick={() => void chooseStation(number)}
              >
                {number}
              </button>
            ))}
          </div>
          <DeliveryNotice status={deliveryStatus} onRetry={onRetryProgress} />
          {connectionWarning ? (
            <GameWarning>{connectionWarning}</GameWarning>
          ) : null}
        </section>
      </div>
    );
  }

  const current = words[index];
  if (!current) return null;
  const blocked = loading || Boolean(loadError);
  return (
    <div
      className="ui ui-game is-active-round"
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
      <GameHeader
        code={code}
        subtitle={`Nummer ${stationNumber} · Aufgabe ${index + 1} / ${words.length}`}
      >
        {session.isTtsEnabled ? (
          <button
            type="button"
            className="ui-icon-btn"
            disabled={blocked}
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
            <Icon name="speaker" size={18} />
          </button>
        ) : null}
      </GameHeader>
      <main className="ui-game__stage" aria-live="polite">
        <div className={`ui-game__card${revealed ? " is-revealed" : ""}`}>
          {loadError ? (
            <div className="ui-notice ui-notice--bad ui-stack" role="alert">
              <p>{loadError}</p>
              <Button
                size="sm"
                onClick={() => void chooseStation(stationNumber)}
              >
                Erneut laden
              </Button>
            </div>
          ) : null}
          {loading ? (
            <p className="ui-small ui-muted">Dein Stand wird geladen …</p>
          ) : revealed ? (
            <>
              <Pill>Merken und auf Papier schreiben</Pill>
              <div ref={containerRef} className="ui-game__reveal">
                <h1
                  ref={textRef}
                  className="ui-game__prompt"
                  style={{ fontSize }}
                >
                  <MathDisplay
                    text={current.prompt ?? current.targetWord}
                    isLatex={current.isLatex ?? false}
                  />
                </h1>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRevealed(false)}
              >
                Aufgabe wieder verdecken
              </Button>
            </>
          ) : (
            <>
              <Pill>Bereit?</Pill>
              <h1 className="ui-h-fun">Aufgabe {index + 1}</h1>
              <Button disabled={blocked} onClick={() => reveal()}>
                Aufgabe zeigen
              </Button>
            </>
          )}
        </div>
        <div className="ui-between ui-game__station-nav">
          <Button
            variant="ghost"
            disabled={index === 0 || blocked}
            onClick={() => {
              setActivity((value) => value + 1);
              const next = index - 1;
              setIndex(next);
              setRevealed(false);
              report(next, peeks, finished);
            }}
          >
            Zurück
          </Button>
          {index < words.length - 1 ? (
            <Button
              disabled={!seen.has(seenKey) || blocked}
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
            </Button>
          ) : (
            <Button
              variant="green"
              disabled={!seen.has(seenKey) || blocked}
              onClick={() => {
                setStationNumber(null);
                setIndex(0);
                setRevealed(false);
              }}
            >
              Fertig · nächste Nummer
            </Button>
          )}
        </div>
        <DeliveryNotice status={deliveryStatus} onRetry={onRetryProgress} />
        {connectionWarning ? (
          <GameWarning>{connectionWarning}</GameWarning>
        ) : null}
        <Button
          variant="link"
          onClick={() => {
            request.current++;
            setStationNumber(null);
            setRevealed(false);
          }}
        >
          Zur Nummernauswahl
        </Button>
        <p className="ui-tiny ui-muted ui-center">
          Erstes Ansehen ist frei. Erneutes Öffnen zählt als Spicker.
        </p>
      </main>
    </div>
  );
}
