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
}: {
  label: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="ui-seg" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
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
