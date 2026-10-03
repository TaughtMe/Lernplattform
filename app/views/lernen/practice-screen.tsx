import Link from "next/link";
import type { CSSProperties } from "react";
import { Icon, type IconName } from "../../ui/icons";
import { HomeLink, ThemeSwitch, type Theme } from "../parts/parts";
import styles from "./practice-screen.module.css";

export type PracticeArea = {
  href: string;
  title: string;
  text: string;
  icon: IconName;
  /** Kachelfarbe (Farbwelt der Tastenwelt-Stationen). */
  tone: string;
};

/** Übersicht „Üben“: eine große Kachel je Übungsbereich. */
export function PracticeScreen({
  areas,
  theme,
  onToggleTheme,
}: {
  areas: readonly PracticeArea[];
  theme: Theme;
  onToggleTheme?: () => void;
}) {
  return (
    <section className={styles.screen} aria-labelledby="practice-title">
      <header className={styles.head}>
        <div className={styles.headStart}>
          <HomeLink />
          <div>
            <h1 id="practice-title" className={styles.title}>
              Üben
            </h1>
            <p className={styles.subtitle}>
              Such dir aus, was du heute trainieren möchtest
            </p>
          </div>
        </div>
        <ThemeSwitch theme={theme} onToggle={onToggleTheme} />
      </header>
      <ul className={styles.tiles}>
        {areas.map((area) => (
          <li key={area.href}>
            <Link
              href={area.href}
              className={styles.tile}
              style={{ "--tone": area.tone } as CSSProperties}
            >
              <span className={styles.symbol} aria-hidden="true">
                <Icon name={area.icon} size={32} strokeWidth={2} />
              </span>
              <h2 className={styles.tileTitle}>{area.title}</h2>
              <p className={styles.tileText}>{area.text}</p>
              <span className={styles.go}>
                Öffnen
                <Icon name="arrow" size={16} strokeWidth={2.2} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
