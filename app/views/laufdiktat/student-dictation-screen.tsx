"use client";

import Link from "next/link";
import type {
  CSSProperties,
  KeyboardEvent,
  ReactNode,
  Ref,
  TextareaHTMLAttributes,
} from "react";
import { BoltIcon, InkIcon, ShieldIcon } from "../../ui/icons";
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
import { useAutoFitText } from "./use-auto-fit-text";

export type StudentDictationPhase =
  "station" | "hold" | "read" | "write" | "battle" | "done";

export type BattlePower = "ink" | "flicker";

/** Wie ein Abschnitt heißt: Text in Sätzen, Vokabeln als Wort, Mathe als Aufgabe. */
export type DictationUnit = "Satz" | "Wort" | "Aufgabe";

const PLURAL: Record<DictationUnit, string> = {
  Satz: "Sätze",
  Wort: "Wörter",
  Aufgabe: "Aufgaben",
};

export type StudentDictationScreenProps = {
  roomCode: string;
  animal: string | null;
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
  /*
   * Ab hier optional: was das laufende Spiel zusätzlich braucht. Ohne diese
   * Angaben zeigt die Ansicht genau die Vorlage.
   */
  unit?: DictationUnit;
  /** Ersetzt die Unterzeile im Kopf (sonst „Tier · Klasse …“). */
  subtitle?: string;
  /** Ersetzt den Abschnittstext, z. B. für Formeln. */
  prompt?: ReactNode;
  /** Spicker- und Fehlerzähler im Kopf. */
  counters?: { hints?: number; mistakes: number };
  /** Vorlesen im Kopf anbieten (außerhalb von Battle). */
  readAloud?: boolean;
  /** Hinweise zu Verbindung und Speicherung unter dem Fortschritt. */
  notices?: ReactNode;
  hold?: {
    /** Ersetzt „Satz 1“ im Hinweis, z. B. an Stationen. */
    title?: string;
    /** Ersetzt die ganze Hinweiszeile, z. B. beim Laden. */
    text?: string;
    error?: { text: string; onRetry: () => void };
  };
  read?: {
    /** Größte Schrift des Worts in px (Standard 88, Stationen 72). */
    maxFontSize?: number;
  };
  write?: {
    /** Vorgabe bei Vokabeln und Mathe (Frage statt Gedächtnis). */
    question?: ReactNode;
    /** Buchstabenhilfe oder Abschreibvorlage. */
    help?: ReactNode;
    feedback?: { text: string; tone: "good" | "bad" } | null;
    disabled?: boolean;
    placeholder?: string;
    /**
     * Größe des Antwortfelds: einzeilig für Mathe und Wörter, mittel für
     * Sätze. Ohne Angabe füllt es wie in der Vorlage den Platz.
     */
    size?: "compact" | "large";
    onReview?: () => void;
    inputRef?: Ref<HTMLTextAreaElement>;
    inputProps?: Omit<
      TextareaHTMLAttributes<HTMLTextAreaElement>,
      "value" | "onChange" | "className" | "disabled" | "placeholder"
    >;
  };
  /** Battle-Leiste über dem Spiel (Ladung, Tinte, Flimmern, Schild). */
  battleBar?: {
    powers: readonly BattlePower[];
    picking: BattlePower | null;
    targets: readonly string[];
    message: string;
    onPickTarget?: (name: string) => void;
    onCancelPick?: () => void;
  };
  /** Stationen: blättern zwischen den Aufgaben einer Nummer. */
  stationNav?: {
    canPrev: boolean;
    canNext: boolean;
    isLast: boolean;
    onPrev?: () => void;
    onNext?: () => void;
    onDone?: () => void;
    onToStations?: () => void;
    note?: string;
  };
  stationIntro?: string;
  done?: {
    title?: string;
    stars?: { value: number; max: number } | null;
    pointsLabel?: string;
    extras?: ReactNode;
    finishLabel?: string;
    finishHref?: string;
  };
  onToggleTheme?: () => void;
  onLeave?: () => void;
  onPickStation?: (station: number) => void;
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
  const showBar =
    props.battleBar &&
    (phase === "hold" || phase === "read" || phase === "write");
  const extras =
    props.counters ||
    (props.readAloud && phase !== "battle" && phase !== "done");
  return (
    <div className={styles.screen}>
      <div className={styles.layout}>
        <header className={styles.header}>
          <SquareIconButton
            label="Laufdiktat verlassen"
            icon="back"
            onClick={props.onLeave}
          />
          {props.animal ? (
            <Animal
              animal={props.animal}
              size={40}
              className={styles.headerAnimal}
            />
          ) : null}
          <span className={styles.titles}>
            <span className={styles.title}>
              Laufdiktat · Raum {props.roomCode}
            </span>
            <span className={styles.subtitle}>
              {props.subtitle ?? (
                <>
                  {props.animal} ·{" "}
                  <span className={styles.wideOnly}>Klasse </span>
                  {props.className}
                </>
              )}
            </span>
          </span>
          {extras ? (
            <span className={styles.headerExtras}>
              {props.readAloud && phase !== "battle" && phase !== "done" ? (
                <SquareIconButton
                  label="Vorlesen"
                  title="Vorlesen (zählt als Spicker)"
                  icon="speaker"
                  iconSize={19}
                  strokeWidth={2}
                  roundJoins
                  onClick={props.onReadAloud}
                />
              ) : null}
              {props.counters ? (
                <>
                  {props.counters.hints !== undefined ? (
                    <span className={styles.hintsPill}>
                      <Pill>Spicker {props.counters.hints}</Pill>
                    </span>
                  ) : null}
                  <span
                    className={cx(
                      styles.mistakes,
                      props.counters.mistakes > 0 && styles.bad,
                    )}
                  >
                    Fehler {props.counters.mistakes}
                  </span>
                </>
              ) : null}
            </span>
          ) : null}
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

        {props.notices}
        {showBar ? <BattleBar {...props} /> : null}

        {phase === "station" ? <StationPhase {...props} /> : null}
        {phase === "hold" ? <HoldPhase {...props} /> : null}
        {phase === "read" ? <ReadPhase {...props} /> : null}
        {phase === "write" ? <WritePhase {...props} /> : null}
        {phase === "battle" ? <BattlePhase {...props} /> : null}
        {phase === "done" ? <DonePhase {...props} /> : null}

        {props.stationNav && phase === "hold" ? (
          <StationNav nav={props.stationNav} />
        ) : null}
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

function StationPhase({
  station,
  stationIntro,
  onPickStation,
}: StudentDictationScreenProps) {
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
      {stationIntro ? <p className={styles.intro}>{stationIntro}</p> : null}
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

function HoldPhase({
  sentenceIndex,
  unit = "Satz",
  hold,
}: StudentDictationScreenProps) {
  const title = hold?.title ?? `${unit} ${sentenceIndex + 1}`;
  return (
    <section
      className={cx(styles.phase, styles.hold)}
      aria-labelledby="dictation-hold"
    >
      <span className={styles.rail} aria-hidden="true">
        <kbd className={styles.keycap}>A</kbd>
      </span>
      <div className={styles.holdBody}>
        <h1 id="dictation-hold" className={styles.holdLine}>
          {hold?.text ? (
            hold.text
          ) : (
            <>
              <span className={styles.touchHint}>
                Mit zwei Fingern an den Rändern halten, um {title} zu sehen.
              </span>
              <span className={styles.keyHint}>
                Halte <kbd className={styles.keycap}>A</kbd> und{" "}
                <kbd className={styles.keycap}>L</kbd> gleichzeitig gedrückt, um{" "}
                {title} zu sehen.
              </span>
            </>
          )}
        </h1>
        {hold?.error ? (
          <div className={styles.alert} role="alert">
            <p>{hold.error.text}</p>
            <button
              type="button"
              className={styles.ghost}
              onClick={hold.error.onRetry}
            >
              Erneut laden
            </button>
          </div>
        ) : null}
      </div>
      <span className={styles.rail} aria-hidden="true">
        <kbd className={styles.keycap}>L</kbd>
      </span>
    </section>
  );
}

function ReadPhase({
  sentence,
  prompt,
  unit = "Satz",
  read,
}: StudentDictationScreenProps) {
  const fit = useAutoFitText<HTMLParagraphElement>(sentence, {
    max: read?.maxFontSize ?? 88,
  });
  return (
    <section
      className={cx(styles.phase, styles.read)}
      aria-label={`${unit} lesen`}
    >
      <div className={styles.readBox}>
        <p ref={fit} className={styles.sentence}>
          {prompt ?? sentence}
        </p>
      </div>
    </section>
  );
}

function WritePhase({
  sentenceIndex,
  sentenceCount,
  hintsUsed,
  typed,
  unit = "Satz",
  write,
  onType,
  onCheck,
}: StudentDictationScreenProps) {
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    write?.inputProps?.onKeyDown?.(event);
    // Eine Zeile genügt: Enter prüft wie im Original-Laufdiktat.
    if (event.key === "Enter" && !event.shiftKey && !event.defaultPrevented) {
      event.preventDefault();
      onCheck?.();
    }
  }
  return (
    <section
      className={cx(styles.phase, styles.write)}
      aria-labelledby="dictation-write"
    >
      <div className={styles.writeHead}>
        <h1 id="dictation-write" className={styles.writeTitle}>
          {unit} {sentenceIndex + 1} von {sentenceCount} schreiben
        </h1>
        <Pill>Spicker {hintsUsed}</Pill>
      </div>
      {write?.question ? (
        <p className={styles.question2}>{write.question}</p>
      ) : null}
      {write?.help}
      {write?.feedback ? (
        <p
          className={cx(
            styles.feedback,
            write.feedback.tone === "good" ? styles.good : styles.bad,
          )}
          role="status"
        >
          {write.feedback.text}
        </p>
      ) : null}
      <textarea
        {...write?.inputProps}
        ref={write?.inputRef}
        className={cx(styles.answer, write?.size && styles[write.size])}
        value={typed}
        disabled={write?.disabled}
        onChange={(event) => onType?.(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={write?.placeholder ?? "Tippe den Satz aus dem Gedächtnis"}
        aria-label={write ? "Deine Antwort" : "Satz"}
        rows={write?.size === "compact" ? 1 : 3}
        autoComplete="off"
        autoCorrect={write?.inputProps?.autoCorrect ?? "off"}
        autoCapitalize={write?.inputProps?.autoCapitalize ?? "sentences"}
        spellCheck={false}
      />
      <PrimaryButton
        className={styles.check}
        onClick={onCheck}
        disabled={write?.disabled}
      >
        Prüfen
      </PrimaryButton>
      {write?.onReview ? (
        <button type="button" className={styles.link} onClick={write.onReview}>
          {unit} nochmal ansehen
        </button>
      ) : null}
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

function PowerRings({
  battle,
  powers,
  onPower,
  onShield,
}: {
  battle: StudentDictationScreenProps["battle"];
  powers: readonly BattlePower[];
  onPower?: ((power: BattlePower) => void) | undefined;
  onShield?: (() => void) | undefined;
}) {
  const charge = Math.min(100, Math.max(0, battle.charge));
  const ready = charge >= 100;
  const fill = { "--charge": `${charge}%` } as CSSProperties;
  const shieldFill = {
    "--charge": `${battle.shieldActive ? 100 : charge}%`,
    "--ring-color": battle.shieldActive ? "var(--green)" : "#c7674a",
  } as CSSProperties;
  return (
    <div className={styles.battleControls}>
      <div className={styles.powers}>
        {POWERS.filter((power) => powers.includes(power.id)).map((power) => (
          <div key={power.id} className={styles.power}>
            <button
              type="button"
              aria-label={power.aria}
              className={cx(styles.ring, ready && styles.ready)}
              style={{ ...fill, "--ring-color": power.color } as CSSProperties}
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
  );
}

/** Battle im laufenden Spiel: Ladung und Angriffe über Halten und Schreiben. */
function BattleBar({
  battle,
  battleBar,
  onPower,
  onShield,
}: StudentDictationScreenProps) {
  if (!battleBar) return null;
  return (
    <section className={styles.battleBar} aria-label="Battle-Aktionen">
      <PowerRings
        battle={battle}
        powers={battleBar.powers}
        onPower={onPower}
        onShield={onShield}
      />
      {battleBar.picking ? (
        <div className={styles.targets}>
          <strong>Wen möchtest du treffen?</strong>
          <div className={styles.targetList}>
            {battleBar.targets.map((name) => (
              <button
                key={name}
                type="button"
                className={styles.ghost}
                onClick={() => battleBar.onPickTarget?.(name)}
              >
                {name}
              </button>
            ))}
          </div>
          {!battleBar.targets.length ? (
            <p className={styles.small}>
              Noch kein Mitspieler als Ziel sichtbar.
            </p>
          ) : null}
          <button
            type="button"
            className={styles.link}
            onClick={battleBar.onCancelPick}
          >
            Abbrechen
          </button>
        </div>
      ) : null}
      {battleBar.message ? (
        <p className={styles.small} role="status">
          {battleBar.message}
        </p>
      ) : null}
    </section>
  );
}

function BattlePhase({
  sentence,
  typed,
  battle,
  onPower,
  onShield,
  onReadAloud,
}: StudentDictationScreenProps) {
  return (
    <section className={cx(styles.phase, styles.battle)} aria-label="Battle">
      <PowerRings
        battle={battle}
        powers={["ink", "flicker"]}
        onPower={onPower}
        onShield={onShield}
      />
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
                {char === " " ? " " : char}
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

function StationNav({
  nav,
}: {
  nav: NonNullable<StudentDictationScreenProps["stationNav"]>;
}) {
  return (
    <div className={styles.stationNav}>
      <div className={styles.stationButtons}>
        <button
          type="button"
          className={styles.ghost}
          disabled={!nav.canPrev}
          onClick={nav.onPrev}
        >
          Zurück
        </button>
        {nav.isLast ? (
          <button
            type="button"
            className={styles.next}
            disabled={!nav.canNext}
            onClick={nav.onDone}
          >
            Fertig · nächste Nummer
          </button>
        ) : (
          <button
            type="button"
            className={styles.next}
            disabled={!nav.canNext}
            onClick={nav.onNext}
          >
            Nächste Aufgabe
          </button>
        )}
      </div>
      <button type="button" className={styles.link} onClick={nav.onToStations}>
        Zur Nummernauswahl
      </button>
      {nav.note ? <p className={styles.small}>{nav.note}</p> : null}
    </div>
  );
}

function DonePhase({
  animal,
  sentenceCount,
  unit = "Satz",
  result,
  done,
  onFinish,
}: StudentDictationScreenProps) {
  const words = result.savedWords.map((word) => `„${word}"`);
  const stars = done?.stars;
  return (
    <section
      className={cx(styles.phase, styles.done)}
      aria-labelledby="dictation-done"
    >
      {animal ? (
        <div className={styles.doneDisc}>
          <Animal animal={animal} size={120} label="Dein Tier" />
        </div>
      ) : null}
      {stars === undefined ? (
        <span className={styles.stars} aria-hidden="true">
          ★★★
        </span>
      ) : stars ? (
        <span
          className={styles.stars}
          role="img"
          aria-label={`${stars.value} von ${stars.max} Sternen`}
        >
          {"★".repeat(stars.value)}
          <span className={styles.starsOff}>
            {"★".repeat(Math.max(0, stars.max - stars.value))}
          </span>
        </span>
      ) : null}
      <h1 id="dictation-done" className={styles.doneTitle}>
        {done?.title ?? `Alle ${sentenceCount} ${PLURAL[unit]} geschafft`}
      </h1>
      <div className={styles.stats}>
        <Stat value={result.mistakes} label="Fehler" />
        <Stat value={result.hints} label="Spicker" />
        <Stat
          value={`+${result.points}`}
          label={done?.pointsLabel ?? "Streak-Punkte"}
        />
      </div>
      {words.length ? (
        <p className={styles.doneNote}>
          {words.join(" und ")} {words.length === 1 ? "liegt" : "liegen"} jetzt
          in deinem Wortspeicher.
        </p>
      ) : null}
      {done?.extras}
      {done?.finishHref ? (
        <Link
          className={cx(styles.primaryLink, styles.doneButton)}
          href={done.finishHref}
        >
          {done.finishLabel ?? "Zurück zum Lernraum"}
        </Link>
      ) : (
        <PrimaryButton className={styles.doneButton} onClick={onFinish}>
          {done?.finishLabel ?? "Zurück zum Lernraum"}
        </PrimaryButton>
      )}
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
