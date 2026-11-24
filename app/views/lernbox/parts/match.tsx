"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import {
  matchReducer,
  startMatch,
  type MatchAction,
} from "../../../../src/domain/learning-box-forms";
import { Icon } from "../../../ui/icons";
import { cx } from "../../parts/parts";
import { FormHead, FormProgress } from "./form-head";
import { plural } from "./format";
import type { LbMatch, LernBoxScreenProps } from "./types";
import styles from "../lernbox-screen.module.css";

/** So lange zeigt ein falsches Paar die Rückmeldung (keine Uhr im Spiel). */
const WRONG_MS = 1200;

/**
 * Zuordnen in zwei Spalten: links die Begriffe, rechts die Bedeutungen, je
 * Seite gemischt; je eine Kachel links und rechts antippen. Es gibt keine Uhr,
 * keine Punkte und nichts wird gespeichert (LF-1). Der Elternteil setzt
 * `key={match.gameKey}`.
 */
export function Match(props: LernBoxScreenProps & { match: LbMatch }) {
  const { match } = props;
  const [state, dispatch] = useReducer(matchReducer, match.rounds, startMatch);
  const [message, setMessage] = useState("");
  const grid = useRef<HTMLDivElement>(null);
  const nextRound = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const onFinished = useRef(props.onFormFinished);
  useEffect(() => {
    onFinished.current = props.onFormFinished;
  });

  // Nur die Fehl-Markierung räumt ein Zeitgeber ab; beim Verlassen läuft er nicht weiter.
  useEffect(() => {
    if (!state.wrong) return;
    const timer = window.setTimeout(
      () => dispatch({ type: "clear-wrong" }),
      WRONG_MS,
    );
    return () => window.clearTimeout(timer);
  }, [state.wrong]);

  useEffect(() => {
    if (state.finished) onFinished.current?.();
  }, [state.finished]);

  // Fokus: nach einem Paar auf die erste offene Kachel, am Rundenende auf den Weiter-Knopf.
  useEffect(() => {
    if (state.finished) heading.current?.focus();
    else if (state.roundDone) nextRound.current?.focus();
    else if (state.lastPair || state.round > 0) {
      grid.current?.querySelector("button")?.focus();
    }
  }, [state.lastPair, state.roundDone, state.finished, state.round]);

  const round = match.rounds[state.round];
  const tiles = round?.tiles ?? [];

  function act(action: MatchAction) {
    const next = matchReducer(state, action);
    if (action.type === "pick") {
      if (next.lastPair && next.lastPair !== state.lastPair) {
        const [first, second] = next.lastPair.map((id) =>
          tiles.find((tile) => tile.id === id),
        );
        const term = first?.side === "term" ? first : second;
        const meaning = first?.side === "term" ? second : first;
        setMessage(`Richtig: ${term?.text ?? ""} – ${meaning?.text ?? ""}`);
      } else if (next.mistakes !== state.mistakes) {
        // Jeder Fehlversuch ändert den Text (unsichtbares Zeichen im Wechsel),
        // sonst sagt ein Screenreader die gleiche Meldung nicht noch einmal an.
        setMessage(
          `Das passt nicht zusammen. Versuch es noch einmal.${
            next.mistakes % 2 === 0 ? "\u200b" : ""
          }`,
        );
      }
    }
    dispatch(action);
  }

  const total = match.rounds.reduce((sum, entry) => sum + entry.pairs, 0);
  const subtitle = state.finished
    ? "Spiel geschafft"
    : `Zuordnen · Runde ${state.round + 1} von ${match.rounds.length}`;
  const roundDone = state.roundDone && !state.finished;
  const status = state.finished
    ? `${plural(state.found, "Paar", "Paare")} · ${
        state.mistakes === 0
          ? "ohne Fehlversuch"
          : plural(state.mistakes, "Fehlversuch", "Fehlversuche")
      }`
    : message;

  return (
    <div className={styles.study}>
      <FormHead {...props} title={match.title} subtitle={subtitle} />
      <FormProgress value={total ? state.found / total : 1} />
      <div
        className={
          state.finished
            ? cx(styles.result, styles.formResult)
            : styles.formBody
        }
      >
        {state.finished ? (
          <h2 ref={heading} tabIndex={-1} className={styles.doneTitle}>
            Alle Paare gefunden
          </h2>
        ) : roundDone ? (
          <h2 className={styles.matchRoundDone}>
            Runde {state.round + 1} von {match.rounds.length} geschafft
          </h2>
        ) : (
          <div
            ref={grid}
            className={styles.matchGrid}
            role="group"
            aria-label="Kacheln: Finde die Paare"
          >
            {(["term", "meaning"] as const).map((side) => (
              <div
                key={side}
                className={styles.matchColumn}
                role="group"
                aria-label={side === "term" ? "Begriffe" : "Bedeutungen"}
              >
                {tiles
                  .filter((tile) => tile.side === side)
                  .map((tile) => {
                    if (state.solved.includes(tile.id)) {
                      return (
                        <div
                          key={tile.id}
                          className={styles.matchGap}
                          aria-hidden="true"
                        />
                      );
                    }
                    const chosen = state.selected === tile.id;
                    const wrong = state.wrong?.includes(tile.id) ?? false;
                    return (
                      <button
                        key={tile.id}
                        type="button"
                        className={cx(
                          styles.matchTile,
                          chosen && styles.matchTileOn,
                          wrong && styles.matchTileWrong,
                        )}
                        aria-pressed={chosen}
                        onClick={() => act({ type: "pick", tileId: tile.id })}
                      >
                        {wrong ? (
                          <Icon name="close" size={18} strokeWidth={2.6} />
                        ) : null}
                        <span>{tile.text}</span>
                      </button>
                    );
                  })}
              </div>
            ))}
          </div>
        )}
        <p className={styles.matchStatus} role="status">
          {status}
        </p>
        {roundDone ? (
          <button
            ref={nextRound}
            type="button"
            className={styles.cta}
            onClick={() => act({ type: "next-round" })}
          >
            Nächste Runde
          </button>
        ) : null}
        {state.finished ? (
          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.cta}
              onClick={props.onMatchAgain}
            >
              Noch einmal
            </button>
            <button
              type="button"
              className={styles.cta}
              onClick={props.onEndSession}
            >
              Zur LernBox
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
