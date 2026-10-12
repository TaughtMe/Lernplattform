import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { Icon } from "../../ui/icons";
import { cx } from "../parts/parts";
import styles from "./run-layout.module.css";

export const TEXTBOX_STEPS = ["Merken", "Schreiben", "Kontrolle"] as const;

/** Die drei Schritte eines Durchgangs; erledigte Schritte sind grün. */
export function StepList({ active }: { active: 0 | 1 | 2 }) {
  return (
    <ol className={styles.steps} aria-label="Ablauf eines Durchgangs">
      {TEXTBOX_STEPS.map((step, index) => (
        <li
          key={step}
          className={cx(
            styles.step,
            index === active && styles.stepOn,
            index < active && styles.stepDone,
          )}
          aria-current={index === active ? "step" : undefined}
        >
          {index + 1}. {step}
        </li>
      ))}
    </ol>
  );
}

export type RunLayoutProps = {
  /** „heft“: Heft mit Linien (9d/9f); „vollbild“: ruhiger Vollbildmodus (9e). */
  layout: "heft" | "vollbild";
  round: 1 | 2 | 3 | 4;
  /** Merken, Schreiben, Kontrolle. */
  step: 0 | 1 | 2;
  textTitle: string;
  /** „Leicht · Doppelkonsonanten“ */
  textMeta: string;
  /** Zurück zur Auswahl. */
  onBack: () => void;
  /** Nur Desktop: zwischen Heft und Vollbild wechseln. */
  onToggleLayout?: (() => void) | undefined;
  /** Timer bzw. Ergebnis. */
  status?: ReactNode;
  hint: ReactNode;
  /** Das Papier. */
  children: ReactNode;
  /** Links in der Aktionsleiste, z. B. „0 von 11 Lücken ausgefüllt“. */
  footerStart?: ReactNode;
  actions: ReactNode;
};

/**
 * Gemeinsamer Rahmen der vier Schritte: Kopf mit Zurück-Knopf, Titel und
 * Schritten, Statuszeile, Hinweis, Papier und Aktionsleiste. Mobil (unter
 * 900 px) klebt die Aktionsleiste unten, ab 900 px steht sie unter dem Papier.
 */
export function RunLayout({
  layout,
  round,
  step,
  textTitle,
  textMeta,
  onBack,
  status,
  hint,
  children,
  footerStart,
  actions,
}: RunLayoutProps) {
  return (
    <section
      className={cx(styles.run, layout === "vollbild" && styles.vollbild)}
      data-layout={layout}
      aria-labelledby="textbox-title"
    >
      <header className={styles.head}>
        <button
          type="button"
          className={styles.back}
          aria-label="Zurück zur Auswahl"
          onClick={onBack}
        >
          <Icon name="back" size={18} strokeWidth={2} />
          <span className={styles.backLabel} aria-hidden="true">
            Auswahl
          </span>
        </button>
        <div className={styles.titles}>
          <h1
            id="textbox-title"
            className={styles.title}
            tabIndex={-1}
            aria-label={`Durchgang ${round} von 4: ${TEXTBOX_STEPS[step]}`}
          >
            Durchgang {round} von 4
            <span className={styles.stepName}>: {TEXTBOX_STEPS[step]}</span>
          </h1>
          <p className={styles.sub}>
            {textTitle}
            <span className={styles.subMeta}> · {textMeta}</span>
          </p>
        </div>
        <StepList active={step} />
      </header>
      <div className={styles.body}>
        {status}
        <p className={styles.hint}>{hint}</p>
        {children}
      </div>
      <div className={styles.actionBar}>
        {footerStart ? (
          <p className={styles.footerStart}>{footerStart}</p>
        ) : null}
        <div className={styles.actions}>{actions}</div>
      </div>
    </section>
  );
}

/** Knopf der Aktionsleiste: primär (Hauptschritt) oder sekundär (Wiederholen). */
export function RunButton({
  variant = "primary",
  className,
  ref,
  ...rest
}: {
  variant?: "primary" | "secondary";
  ref?: Ref<HTMLButtonElement>;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      ref={ref}
      type="button"
      className={cx(
        styles.button,
        variant === "primary" ? styles.primary : styles.secondary,
        className,
      )}
      {...rest}
    />
  );
}

/** Fortschrittsbalken der Merkzeit (Beschriftung für Screenreader). */
export function TimerBar({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label: string;
}) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      className={styles.bar}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
    >
      <span className={styles.barFill} style={{ width: `${percent}%` }} />
    </div>
  );
}

function clock(seconds: number) {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

/** Statuszeile der Merkphase: Zeit und Balken. */
export function MemorizeStatus({
  secondsLeft,
  totalSeconds,
}: {
  secondsLeft: number;
  totalSeconds: number;
}) {
  return (
    <div className={styles.timer}>
      <p className={styles.timerText} role="timer">
        <span className={styles.timerLong}>Merkzeit: noch </span>
        <span className={styles.timerShort}>Noch </span>
        {clock(secondsLeft)}
      </p>
      <TimerBar
        value={secondsLeft}
        max={totalSeconds}
        label="Verbleibende Merkzeit"
      />
    </div>
  );
}

/** Statuszeile der Kontrolle: „6 von 11“, Bezeichnung, Balken und Prozent. */
export function ScoreStatus({
  correct,
  total,
  percent,
  unit,
  extra,
}: {
  correct: number;
  total: number;
  percent: number;
  /** „Lücken“ oder „Wörtern“. */
  unit: string;
  extra: number;
}) {
  return (
    <div className={styles.score}>
      <p className={styles.scoreText}>
        <span className={styles.scoreCount}>
          {correct} von {total}
        </span>{" "}
        <span>
          {unit} richtig geschrieben
          {extra > 0 ? `, ${extra} zusätzlich geschrieben` : ""}
        </span>
      </p>
      <span className={styles.scoreBar} aria-hidden="true">
        <span className={styles.bar} style={{ display: "block" }}>
          <span
            className={cx(styles.barFill, styles.barGood)}
            style={{ width: `${percent}%` }}
          />
        </span>
      </span>
      <span className={styles.scorePercent}>{percent} %</span>
    </div>
  );
}
