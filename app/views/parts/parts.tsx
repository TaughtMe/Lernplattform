/*
 * Bausteine der Design-Screens. Reine Darstellung: Zustand und Aktionen
 * kommen immer über Props.
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { animalFileName } from "../../../src/domain/learner-profile";
import { Icon, type IconName } from "../../ui/icons";
import styles from "./parts.module.css";

export type Theme = "light" | "dark";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

/** Eckiger Symbolknopf (40 px), z. B. Zurück oder Vorlesen. */
export function SquareIconButton({
  label,
  icon,
  iconSize = 18,
  strokeWidth = 2.2,
  roundJoins = false,
  className,
  ...rest
}: {
  label: string;
  icon: IconName;
  iconSize?: number;
  strokeWidth?: number;
  /** Runde Linienecken; die Pfeile der Vorlage haben spitze Ecken. */
  roundJoins?: boolean;
} & ButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cx(styles.squareButton, className)}
      {...rest}
    >
      <Icon
        name={icon}
        size={iconSize}
        strokeWidth={strokeWidth}
        strokeLinejoin={roundJoins ? "round" : "miter"}
      />
    </button>
  );
}

/** Runder Umschalter Hell/Dunkel (38 px): Mond im hellen, Sonne im dunklen Modus. */
export function ThemeSwitch({
  theme,
  onToggle,
}: {
  theme: Theme;
  onToggle?: (() => void) | undefined;
}) {
  return (
    <button
      type="button"
      aria-label="Hell oder dunkel"
      className={styles.roundButton}
      onClick={onToggle}
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} size={19} />
    </button>
  );
}

export function PrimaryButton({ className, ...rest }: ButtonProps) {
  return (
    <button type="button" className={cx(styles.primary, className)} {...rest} />
  );
}

export function GreenButton({ className, ...rest }: ButtonProps) {
  return (
    <button type="button" className={cx(styles.green, className)} {...rest} />
  );
}

/** Auswahlchip; `pressed` markiert die aktive Wahl. */
export function Chip({
  pressed,
  className,
  ...rest
}: { pressed: boolean } & ButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cx(styles.chip, className)}
      {...rest}
    />
  );
}

export function Pill({ children }: { children: ReactNode }) {
  return <span className={styles.pill}>{children}</span>;
}

export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={cx(styles.eyebrow, className)}>{children}</span>;
}

/** Tierbild aus public/animals; ohne `label` rein schmückend. */
export function Animal({
  animal,
  size,
  label,
  className,
}: {
  animal: string;
  size: number;
  label?: string | undefined;
  className?: string | undefined;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Tier-SVG in fester Größe, keine Bildoptimierung nötig
    <img
      src={`/animals/${animalFileName(animal)}.svg`}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      className={cx(styles.animal, className)}
    />
  );
}
