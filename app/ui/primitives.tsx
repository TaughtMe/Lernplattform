/**
 * Grundbausteine des Gestaltungssystems „Lernraum UI“.
 * Reine Darstellung: keine Fachlogik, kein Speicherzugriff.
 */
import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  ComponentProps,
  HTMLAttributes,
  ReactNode,
} from "react";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export type ButtonVariant =
  "primary" | "dark" | "green" | "gold" | "ghost" | "soft" | "bad" | "link";

type ButtonLook = {
  variant?: ButtonVariant | undefined;
  size?: "sm" | "md" | "lg" | undefined;
  block?: boolean | undefined;
};

function buttonClass({ variant = "primary", size = "md", block }: ButtonLook) {
  return cx(
    "ui-btn",
    `ui-btn--${variant}`,
    size !== "md" && `ui-btn--${size}`,
    block && "ui-btn--block",
  );
}

export function Button({
  variant,
  size,
  block,
  className,
  type = "button",
  ...rest
}: ButtonLook & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cx(buttonClass({ variant, size, block }), className)}
      {...rest}
    />
  );
}

export function ButtonLink({
  variant,
  size,
  block,
  className,
  href,
  ...rest
}: ButtonLook & ComponentProps<typeof Link>) {
  return (
    <Link
      href={href}
      className={cx(buttonClass({ variant, size, block }), className)}
      {...rest}
    />
  );
}

export function IconButton({
  label,
  tone,
  square,
  className,
  children,
  type = "button",
  ...rest
}: {
  label: string;
  tone?: "green";
  square?: boolean;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        "ui-icon-btn",
        square && "ui-icon-btn--square",
        tone && `ui-icon-btn--${tone}`,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Card({
  look = "plain",
  pad = true,
  raised,
  className,
  ...rest
}: {
  look?: "plain" | "pop" | "soft" | "dark";
  pad?: boolean;
  raised?: boolean;
} & HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cx(
        "ui-card",
        look !== "plain" && `ui-card--${look}`,
        pad && "ui-card--pad",
        raised && "ui-card--raised",
        className,
      )}
      {...rest}
    />
  );
}

export function Pill({
  tone,
  className,
  ...rest
}: {
  tone?: "accent" | "good" | "bad" | "dark";
} & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cx("ui-pill", tone && `ui-pill--${tone}`, className)}
      {...rest}
    />
  );
}

/** Fortschrittsbalken; `label` wird für Screenreader ausgegeben. */
export function ProgressBar({
  value,
  max,
  label,
  tone,
}: {
  value: number;
  max: number;
  label: string;
  tone?: "green" | "bad";
}) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      className={cx("ui-bar", tone && `ui-bar--${tone}`)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
    >
      <span style={{ width: `${percent}%` }} />
    </div>
  );
}

/** Kreisförmiger Fortschritt, z. B. als Ring um das Tier (Design 2b/3a). */
export function ProgressRing({
  value,
  max,
  size,
  stroke = 9,
}: {
  value: number;
  max: number;
  size: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const length = 2 * Math.PI * radius;
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--ring)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--gold)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${length * ratio} ${length}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

export type SegmentOption<T extends string> = { value: T; label: ReactNode };

/** Segmentschalter (Design: Schreiben/Mündlich, DE → EN …). */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean | undefined;
}) {
  return (
    <div className="ui-seg" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Schalterzeile; bleibt semantisch eine Checkbox. */
export function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string | undefined;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean | undefined;
}) {
  return (
    <label className="ui-toggle-row ui-toggle">
      <span className="ui-stack" style={{ ["--gap" as string]: "1px" }}>
        <span className="ui-toggle__label">{label}</span>
        {hint ? <span className="ui-tiny ui-muted">{hint}</span> : null}
      </span>
      <input
        type="checkbox"
        className="ui-toggle__input"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="ui-switch" aria-hidden="true" />
    </label>
  );
}

/** Zahlenfeld mit Minus/Plus, begrenzt auf [min, max]. */
export function NumberStepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const clamp = (next: number) => Math.min(max, Math.max(min, next));
  return (
    <div className="ui-stepper" role="group" aria-label={label}>
      <button
        type="button"
        aria-label={`${label} verringern`}
        disabled={value <= min}
        onClick={() => onChange(clamp(value - 1))}
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        aria-label={label}
        min={min}
        max={max}
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(clamp(next));
        }}
      />
      <button
        type="button"
        aria-label={`${label} erhöhen`}
        disabled={value >= max}
        onClick={() => onChange(clamp(value + 1))}
      >
        +
      </button>
    </div>
  );
}

/** Seitenkopf: kleine Überschrift, Titel und optionaler Einleitungstext. */
export function PageHeader({
  eyebrow,
  title,
  id,
  children,
}: {
  eyebrow?: string | undefined;
  title: ReactNode;
  id?: string | undefined;
  children?: ReactNode;
}) {
  return (
    <div className="ui-stack ui-page-head">
      {eyebrow ? <p className="ui-eyebrow">{eyebrow}</p> : null}
      <h1 id={id} className="ui-h-page">
        {title}
      </h1>
      {children ? <p className="ui-small ui-muted">{children}</p> : null}
    </div>
  );
}

export function Notice({
  tone,
  className,
  ...rest
}: {
  tone?: "bad" | "good";
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx("ui-notice", tone && `ui-notice--${tone}`, className)}
      {...rest}
    />
  );
}

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="ui-empty">
      <p className="ui-h-section">{title}</p>
      {children ? <div className="ui-small">{children}</div> : null}
    </div>
  );
}
