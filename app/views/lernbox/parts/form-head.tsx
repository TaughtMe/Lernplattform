"use client";

import type { ReactNode } from "react";
import { Icon } from "../../../ui/icons";
import { ThemeSwitch } from "../../parts/parts";
import type { LernBoxScreenProps } from "./types";
import styles from "../lernbox-screen.module.css";

/** Kopf einer Lernform (Zuordnen, Test): Zurück, Titel, Unterzeile, Hell/Dunkel. */
export function FormHead({
  title,
  subtitle,
  ...props
}: LernBoxScreenProps & { title: string; subtitle: ReactNode }) {
  return (
    <header className={styles.studyHead}>
      <button
        type="button"
        className={styles.backSquare}
        aria-label="Runde beenden"
        title="Runde beenden"
        onClick={props.onEndSession}
      >
        <Icon name="back" size={20} strokeWidth={2.2} />
      </button>
      <span className={styles.studyTitles}>
        <h1 className={styles.studyTitle}>{title}</h1>
        <span className={styles.sheetSubtitle}>{subtitle}</span>
      </span>
      <ThemeSwitch theme={props.theme} onToggle={props.onToggleTheme} />
    </header>
  );
}

/** Fortschrittsbalken wie in der Lernrunde. */
export function FormProgress({ value }: { value: number }) {
  const percent = Math.round(value * 100);
  return (
    <div
      className={styles.progress}
      role="progressbar"
      aria-label="Fortschritt der Runde"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <span style={{ width: `${percent}%` }} />
    </div>
  );
}
