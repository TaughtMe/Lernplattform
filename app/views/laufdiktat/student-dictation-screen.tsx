"use client";

import type { CSSProperties, PointerEvent, TouchEvent } from "react";
import { BoltIcon, Icon, InkIcon, ShieldIcon } from "../../ui/icons";
import {
  Animal,
  cx,
  Pill,
  PrimaryButton,
  SquareIconButton,
  ThemeSwitch,
  type Theme,
} from "../parts/parts";
import styles from "./student-dictation-screen.module.css";

export type StudentDictationPhase =
  "station" | "hold" | "read" | "write" | "battle" | "done";

export type BattlePower = "ink" | "flicker";

export type StudentDictationScreenProps = {
  roomCode: string;
  animal: string;
  className: string;
  theme: Theme;
  phase: StudentDictationPhase;
  /** Abschnitt, 0-basiert, und Gesamtzahl der Abschnitte. */
  sentenceIndex: number;
  sentenceCount: number;
  sentence: string;
  hintsUsed: number;
  typed: string;
  station: { count: number; selected: number | null };
  battle: { charge: number; shieldActive: boolean };
  result: {
    mistakes: number;
    hints: number;
    points: number;
    savedWords: readonly string[];
  };
  onToggleTheme?: () => void;
  onLeave?: () => void;
  onPickStation?: (station: number) => void;
  onHoldStart?: () => void;
  onHoldEnd?: () => void;
  onType?: (value: string) => void;
  onCheck?: () => void;
  onPower?: (power: BattlePower) => void;
  onShield?: () => void;
  onReadAloud?: () => void;
  onFinish?: () => void;
};

/** Laufdiktat für Schüler (Design 5a mobil, 5b Tablet/Laptop). */
export function StudentDictationScreen(props: StudentDictationScreenProps) {
  const { phase, sentenceIndex, sentenceCount } = props;
  const showProgress = phase !== "station" && phase !== "done";
  return (
    <div className={styles.screen}>
      <div className={styles.layout}>
        <header className={styles.header}>
          <SquareIconButton
            label="Laufdiktat verlassen"
            icon="back"
            onClick={props.onLeave}
          />
          <Animal
            animal={props.animal}
            size={40}
            className={styles.headerAnimal}
          />
          <span className={styles.titles}>
            <span className={styles.title}>
              Laufdiktat · Raum {props.roomCode}
            </span>
            <span className={styles.subtitle}>
              {props.animal} · <span className={styles.wideOnly}>Klasse </span>
              {props.className}
            </span>
          </span>
          <ThemeSwitch theme={props.theme} onToggle={props.onToggleTheme} />
        </header>

        {showProgress ? (
          <div
            className={styles.progress}
            style={{ "--segments": sentenceCount } as CSSProperties}
            aria-hidden="true"
          >
            {Array.from({ length: sentenceCount }, (_, index) => (
              <span
                key={index}
                className={cx(index <= sentenceIndex && styles.reached)}
              />
            ))}
          </div>
        ) : null}

        {phase === "station" ? <StationPhase {...props} /> : null}
        {phase === "hold" ? <HoldPhase {...props} /> : null}
        {phase === "read" ? <ReadPhase {...props} /> : null}
        {phase === "write" ? <WritePhase {...props} /> : null}
        {phase === "battle" ? <BattlePhase {...props} /> : null}
        {phase === "done" ? <DonePhase {...props} /> : null}
      </div>
    </div>
  );
}

function stationGrid(count: number): CSSProperties {
  const compact = count <= 12;
  const colsWide = Math.min(10, Math.max(4, Math.ceil(Math.sqrt(count * 2))));
  const rowsWide = Math.ceil(count / colsWide);
  const rowWide = Math.min(
    130,
    Math.floor((560 - 10 * (rowsWide - 1)) / rowsWide),
  );
  return {
    "--cols": compact ? 3 : 4,
    "--tile-height": compact ? "84px" : "66px",
    "--tile-font": compact ? "30px" : "24px",
    "--cols-wide": colsWide,
    "--row-wide": `${rowWide}px`,
    "--tile-font-wide": `${Math.round(Math.min(46, rowWide * 0.42))}px`,
  } as CSSProperties;
}

function StationPhase({ station, onPickStation }: StudentDictationScreenProps) {
  return (
    <section
      className={cx(styles.phase, styles.station)}
      aria-labelledby="dictation-station"
    >
      <div className={styles.stationHead}>
        <h1 id="dictation-station" className={styles.question}>
          Welche Nummer bist du?
        </h1>
        <span className={styles.count}>{station.count} Schüler</span>
      </div>
      <div className={styles.tilesScroll}>
        <div className={styles.tiles} style={stationGrid(station.count)}>
          {Array.from({ length: station.count }, (_, index) => index + 1).map(
            (number) => (
              <button
                key={number}
                type="button"
                className={styles.tile}
                aria-pressed={number === station.selected}
                onClick={() => onPickStation?.(number)}
              >
                {number}
              </button>
            ),
          )}
        </div>
      </div>
    </section>
  );
}

/** Beginnt das Lesen: zwei Finger (Touch) oder gedrückte Maustaste. */
function holdHandlers(onHoldStart: (() => void) | undefined) {
  return {
    onTouchStart: (event: TouchEvent) => {
      if (event.touches.length >= 2) onHoldStart?.();
    },
    onPointerDown: (event: PointerEvent) => {
      if (event.pointerType === "mouse") onHoldStart?.();
    },
  };
}

function Edge({ label }: { label: string }) {
  return (
    <span className={styles.edge} aria-hidden="true">
      <Icon name="hand" size={26} strokeWidth={1.8} />
      <span>{label}</span>
    </span>
  );
}

function HoldPhase({
  sentenceIndex,
  onHoldStart,
}: StudentDictationScreenProps) {
  return (
    <section
      className={cx(styles.phase, styles.hold)}
      aria-labelledby="dictation-hold"
      {...holdHandlers(onHoldStart)}
    >
      <Edge label="hier" />
      <div className={styles.card}>
        <span className={styles.eyeDisc} aria-hidden="true">
          <Icon name="eye" size={30} strokeLinejoin="miter" />
        </span>
        <h1 id="dictation-hold" className={styles.holdTitle}>
          Mit zwei Fingern an beiden Rändern halten
        </h1>
        <p className={styles.holdText}>
          Solange du hältst, siehst du Satz {sentenceIndex + 1}. Loslassen
          öffnet das Schreibfeld.
          <span className={styles.wideOnly}>
            {" "}
            Am Laptop: Maustaste auf der Fläche gedrückt halten.
          </span>
        </p>
      </div>
      <Edge label="hier" />
    </section>
  );
}

function ReadPhase({
  sentence,
  sentenceIndex,
  sentenceCount,
  onHoldEnd,
}: StudentDictationScreenProps) {
  return (
    <section
      className={cx(styles.phase, styles.read)}
      aria-label="Satz lesen"
      onTouchEnd={onHoldEnd}
      onPointerUp={onHoldEnd}
      onPointerLeave={onHoldEnd}
    >
      <Edge label="halten" />
      <div className={styles.card}>
        <Pill>
          Satz {sentenceIndex + 1} von {sentenceCount}
        </Pill>
        <p className={styles.sentence}>{sentence}</p>
        <span className={styles.releaseHint}>Loslassen, um zu schreiben</span>
      </div>
      <Edge label="halten" />
    </section>
  );
}

function WritePhase({
  sentenceIndex,
  sentenceCount,
  hintsUsed,
  typed,
  onType,
  onCheck,
}: StudentDictationScreenProps) {
  return (
    <section
      className={cx(styles.phase, styles.write)}
      aria-labelledby="dictation-write"
    >
      <div className={styles.writeHead}>
        <h1 id="dictation-write" className={styles.writeTitle}>
          Satz {sentenceIndex + 1} von {sentenceCount} schreiben
        </h1>
        <Pill>Spicker {hintsUsed}</Pill>
      </div>
      <textarea
        className={styles.answer}
        value={typed}
        onChange={(event) => onType?.(event.target.value)}
        placeholder="Tippe den Satz aus dem Gedächtnis"
        aria-label="Satz"
        rows={3}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="sentences"
        spellCheck={false}
      />
      <PrimaryButton className={styles.check} onClick={onCheck}>
        Prüfen
      </PrimaryButton>
    </section>
  );
}

const POWERS = [
  { id: "ink", label: "Tinte", aria: "Tinten-Angriff", color: "#3b6fd1" },
  {
    id: "flicker",
    label: "Flimmern",
    aria: "Flimmer-Angriff",
    color: "#e0a83a",
  },
] as const;

function BattlePhase({
  sentence,
  typed,
  battle,
  onPower,
  onShield,
  onReadAloud,
}: StudentDictationScreenProps) {
  const charge = Math.min(100, Math.max(0, battle.charge));
  const ready = charge >= 100;
  const fill = { "--charge": `${charge}%` } as CSSProperties;
  const shieldFill = {
    "--charge": `${battle.shieldActive ? 100 : charge}%`,
    "--ring-color": battle.shieldActive ? "var(--green)" : "#c7674a",
  } as CSSProperties;
  return (
    <section className={cx(styles.phase, styles.battle)} aria-label="Battle">
      <div className={styles.battleControls}>
        <div className={styles.powers}>
          {POWERS.map((power) => (
            <div key={power.id} className={styles.power}>
              <button
                type="button"
                aria-label={power.aria}
                className={cx(styles.ring, ready && styles.ready)}
                style={
                  { ...fill, "--ring-color": power.color } as CSSProperties
                }
                onClick={() => onPower?.(power.id)}
              >
                <span className={styles.ringEmpty}>
                  {power.id === "ink" ? <InkIcon /> : <BoltIcon />}
                </span>
                <span className={styles.ringFill}>
                  {power.id === "ink" ? <InkIcon /> : <BoltIcon />}
                </span>
              </button>
              <span className={styles.powerLabel}>{power.label}</span>
            </div>
          ))}
          <div className={styles.power}>
            <button
              type="button"
              aria-label="Schild"
              aria-pressed={battle.shieldActive}
              className={cx(
                styles.ring,
                (ready || battle.shieldActive) && styles.ready,
              )}
              style={shieldFill}
              onClick={onShield}
            >
              <span className={styles.ringEmpty}>
                <ShieldIcon />
              </span>
              <span className={styles.ringFill}>
                <ShieldIcon />
              </span>
            </button>
            <span className={styles.powerLabel}>
              {battle.shieldActive ? "aktiv" : "Schild"}
            </span>
          </div>
        </div>
        <div className={styles.charge}>
          <span className={styles.chargeLabel}>
            Ladung · {ready ? "Aufgeladen" : `${charge} %`}
          </span>
          <span
            className={cx(styles.chargeTrack, ready && styles.full)}
            style={fill}
          >
            <span />
          </span>
        </div>
      </div>
      <div className={styles.battleText}>
        <div className={styles.copyBox}>
          <p className={styles.copyText} aria-label={sentence}>
            {[...sentence].map((char, index) => (
              <span
                key={index}
                aria-hidden="true"
                className={cx(
                  styles.char,
                  index < typed.length &&
                    (typed[index] === char ? styles.right : styles.wrong),
                  index === typed.length && styles.cursor,
                )}
              >
                {char === " " ? " " : char}
              </span>
            ))}
          </p>
        </div>
        <SquareIconButton
          label="Vorlesen, zählt als Spicker"
          icon="speaker"
          iconSize={20}
          strokeWidth={2}
          roundJoins
          className={styles.readAloud}
          onClick={onReadAloud}
        />
      </div>
    </section>
  );
}

function DonePhase({
  animal,
  sentenceCount,
  result,
  onFinish,
}: StudentDictationScreenProps) {
  const words = result.savedWords.map((word) => `„${word}"`);
  return (
    <section
      className={cx(styles.phase, styles.done)}
      aria-labelledby="dictation-done"
    >
      <div className={styles.doneDisc}>
        <Animal animal={animal} size={120} label="Dein Tier" />
      </div>
      <span className={styles.stars} aria-hidden="true">
        ★★★
      </span>
      <h1 id="dictation-done" className={styles.doneTitle}>
        Alle {sentenceCount} Sätze geschafft
      </h1>
      <div className={styles.stats}>
        <Stat value={result.mistakes} label="Fehler" />
        <Stat value={result.hints} label="Spicker" />
        <Stat value={`+${result.points}`} label="Streak-Punkte" />
      </div>
      {words.length ? (
        <p className={styles.doneNote}>
          {words.join(" und ")} {words.length === 1 ? "liegt" : "liegen"} jetzt
          in deinem Wortspeicher.
        </p>
      ) : null}
      <PrimaryButton className={styles.doneButton} onClick={onFinish}>
        Zurück zum Lernraum
      </PrimaryButton>
    </section>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className={styles.stat}>
      <p className={styles.statValue}>{value}</p>
      <p className={styles.statLabel}>{label}</p>
    </div>
  );
}
