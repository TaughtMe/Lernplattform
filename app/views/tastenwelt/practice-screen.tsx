"use client";

import {
  useId,
  useRef,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import type { Finger } from "../../../src/tastschreiben/keyboard-layout";
import { Icon } from "../../ui/icons";
import { Animal, cx, type Theme } from "../parts/parts";
import { FingerLegend, Keyboard } from "./keyboard";
import styles from "./practice-screen.module.css";

export type TileState = "todo" | "current" | "right" | "corrected" | "bad";
export type PracticeTile = { char: string; state: TileState };

export type PracticeScreenProps = {
  animal: string | null;
  theme: Theme;
  stationNumber: number;
  lessonTitle: string;
  lessonIndex: number;
  lessonCount: number;
  tiles: readonly PracticeTile[];
  position: number;
  /** Zähler für Fehlanschläge; ändert sich, damit die Kachel wackelt. */
  shake: number;
  combo: number;
  bestCombo: number;
  accuracy: number;
  perMinute: number | null;
  say: string;
  hint: { text: string; hue: number } | null;
  keyboard: {
    targets: readonly string[];
    wrong: string | null;
    fingers: readonly Finger[];
  };
  started: boolean;
  result: {
    stars: number;
    text: string;
    weakKeys: readonly string[];
    nextLabel: string | null;
  } | null;
  onBack?: () => void;
  onToggleTheme?: () => void;
  onChar?: (char: string) => void;
  onRetry?: () => void;
  onNext?: () => void;
};

function words(tiles: readonly PracticeTile[]) {
  const groups: Array<Array<PracticeTile & { index: number }>> = [];
  let current: Array<PracticeTile & { index: number }> = [];
  tiles.forEach((tile, index) => {
    current.push({ ...tile, index });
    if (tile.char === " ") {
      groups.push(current);
      current = [];
    }
  });
  if (current.length) groups.push(current);
  return groups;
}

/** Übung der Tastenwelt (Design 6b mobil, 6a mit Tastatur). */
export function PracticeScreen(props: PracticeScreenProps) {
  const input = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const textId = useId();
  const focusInput = () => input.current?.focus();
  const { tiles, result } = props;

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key.length !== 1) return;
    event.preventDefault();
    props.onChar?.(event.key);
  }

  // Bildschirmtastaturen melden oft keine Taste; dann zählt die Eingabe.
  function onInput(event: FormEvent<HTMLInputElement>) {
    const value = event.currentTarget.value;
    event.currentTarget.value = "";
    const char = value.slice(-1);
    if (char) props.onChar?.(char);
  }

  const comboClass =
    props.combo >= 10 ? styles.hot : props.combo >= 5 ? styles.warm : null;

  return (
    <div className={styles.screen}>
      <div className={styles.layout}>
        <header className={styles.head}>
          <button
            type="button"
            className={styles.raised}
            aria-label="Zur Übersicht"
            onClick={props.onBack}
          >
            <Icon
              name="back"
              size={18}
              strokeWidth={2.2}
              strokeLinejoin="miter"
            />
          </button>
          <span className={styles.titles}>
            <h1 className={styles.title}>
              <span className={styles.wideOnly}>Tastenwelt · </span>Stufe{" "}
              {props.stationNumber}
              <span className={styles.narrowOnly}> · {props.lessonTitle}</span>
            </h1>
            <span className={styles.subtitle}>
              <span className={styles.wideOnly}>{props.lessonTitle} · </span>
              Übung {props.lessonIndex} von {props.lessonCount}
              <span className={styles.wideOnly}>
                {" "}
                · erst genau, dann schnell
              </span>
            </span>
          </span>
          <span
            className={cx(styles.combo, comboClass)}
            aria-label={`Serie ${props.combo}`}
          >
            <Icon name="flame" size={16} />
            <span className={styles.comboLabel}>Serie</span> {props.combo}
          </span>
          <button
            type="button"
            className={cx(styles.raised, styles.round)}
            aria-label="Hell oder dunkel"
            onClick={props.onToggleTheme}
          >
            <Icon name={props.theme === "dark" ? "sun" : "moon"} size={19} />
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.coach} aria-live="polite">
            <span className={styles.stage}>
              {props.animal ? (
                <Animal
                  key={props.shake}
                  animal={props.animal}
                  size={118}
                  fluid
                  className={cx(styles.animal, props.shake > 0 && styles.shake)}
                />
              ) : null}
            </span>
            <p className={styles.bubble}>{props.say}</p>
            {!result ? (
              <div className={styles.stats}>
                <Stat value={props.perMinute ?? "–"} label="pro Min" />
                <Stat value={`${props.accuracy} %`} label="genau" />
                <Stat value={props.bestCombo} label="beste Serie" />
              </div>
            ) : null}
          </div>

          {result ? (
            <section className={styles.done} aria-labelledby="tw-done">
              <div
                className={styles.stars}
                aria-label={`${result.stars} von 3 Sternen`}
              >
                {[0, 1, 2].map((star) => (
                  <Icon
                    key={star}
                    name="star"
                    size={star === 1 ? 66 : 50}
                    className={cx(
                      styles.star,
                      star < result.stars && styles.won,
                    )}
                    style={{ animationDelay: `${star * 0.15}s` }}
                  />
                ))}
              </div>
              <h2 id="tw-done" className={styles.doneTitle}>
                Geschafft!
              </h2>
              <p className={styles.doneText}>{result.text}</p>
              <div className={styles.weak}>
                {result.weakKeys.length ? (
                  <>
                    <span className={styles.weakLabel}>Üben wir extra:</span>
                    {result.weakKeys.map((key) => (
                      <span key={key} className={styles.weakKey}>
                        {key === " " ? "␣" : key}
                      </span>
                    ))}
                  </>
                ) : (
                  <span className={styles.allSafe}>nichts, alles sicher</span>
                )}
              </div>
              <div className={styles.doneActions}>
                <button
                  type="button"
                  className={styles.again}
                  onClick={props.onRetry}
                >
                  Nochmal
                </button>
                {result.nextLabel ? (
                  <button
                    type="button"
                    className={styles.next}
                    onClick={props.onNext}
                  >
                    {result.nextLabel}
                  </button>
                ) : null}
              </div>
            </section>
          ) : (
            <label className={styles.card} htmlFor={inputId}>
              <span className={styles.cardHead}>
                <span className={styles.cardLabel}>Tippe ab</span>
                <span className={styles.cardCount}>
                  {props.position} / {tiles.length}
                </span>
              </span>
              <span id={textId} className={styles.srOnly}>
                Tippe ab: {tiles.map((tile) => tile.char).join("")}
              </span>
              <span className={styles.tiles} aria-hidden="true">
                {words(tiles).map((word, index) => (
                  <span key={index} className={styles.word} aria-hidden="true">
                    {word.map((tile) => (
                      <span
                        key={
                          tile.state === "current"
                            ? `${tile.index}-${props.shake}`
                            : tile.index
                        }
                        className={cx(
                          styles.tile,
                          tile.char === " " && styles.space,
                          tile.state !== "todo" && styles[tile.state],
                          tile.state === "current" &&
                            props.shake > 0 &&
                            styles.shake,
                        )}
                      >
                        {tile.char === " " ? "·" : tile.char}
                      </span>
                    ))}
                  </span>
                ))}
              </span>
              <span className={styles.track} aria-hidden="true">
                <span
                  style={{
                    width: `${tiles.length ? Math.round((props.position / tiles.length) * 100) : 0}%`,
                  }}
                />
              </span>
              {props.hint ? (
                <span
                  className={styles.hint}
                  style={{ "--hue": props.hint.hue } as CSSProperties}
                >
                  <span className={styles.hintDot} />
                  {props.hint.text}
                </span>
              ) : null}
              <span className={styles.statsLine}>
                <span>{props.accuracy} % genau</span>
                <span>{props.perMinute ?? "–"} pro Min</span>
                <span>beste Serie {props.bestCombo}</span>
              </span>
            </label>
          )}
        </div>

        {!result ? (
          <input
            ref={input}
            id={inputId}
            aria-describedby={textId}
            className={styles.capture}
            placeholder="Hier tippen"
            aria-label="Tippfeld"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            onKeyDown={onKeyDown}
            onInput={onInput}
          />
        ) : null}

        {!result ? (
          <div className={styles.keys}>
            <Keyboard
              size="large"
              targets={props.keyboard.targets}
              wrong={props.keyboard.wrong}
            />
            <FingerLegend active={props.keyboard.fingers} />
            {!props.started ? (
              <button
                type="button"
                className={styles.prompt}
                onClick={focusInput}
              >
                <span className={styles.promptLabel}>
                  <Icon name="pointer" size={18} />
                  Hier klicken und lostippen
                </span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}
