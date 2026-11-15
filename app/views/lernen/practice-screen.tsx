import Link from "next/link";
import type { CSSProperties } from "react";
import { Icon, type IconName } from "../../ui/icons";
import { HomeLink, ThemeSwitch, type Theme } from "../parts/parts";
import styles from "./practice-screen.module.css";

export type PracticeArea = {
  href: string;
  title: string;
  text: string;
  icon:
    | "lernbox"
    | "wortspeicher"
    | "tastenwelt"
    | "kopfrechnen"
    | "laufdiktat"
    | "textbox";
  /** Kachelfarbe (Farbwelt der Tastenwelt-Stationen). */
  tone: string;
};

/** Kleiner Weg unter den Kacheln (Startpunkt, Training, Mein Stand). */
export type PracticeShortcut = {
  href: string;
  title: string;
  text: string;
  icon: IconName;
};

/** Übersicht „Üben“: eine große Kachel je Übungsbereich. */
export function PracticeScreen({
  areas,
  shortcuts = [],
  theme,
  onToggleTheme,
}: {
  areas: readonly PracticeArea[];
  /** Optional; ohne Eintrag bleibt die Ansicht wie im Design 6c. */
  shortcuts?: readonly PracticeShortcut[];
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
                {/* eslint-disable-next-line @next/next/no-img-element -- lokales SVG, ohne Rasteroptimierung */}
                <img
                  src={`/illustrations/practice/${area.icon}.svg`}
                  width={64}
                  height={64}
                  alt=""
                />
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
      {shortcuts.length > 0 ? (
        <nav className={styles.more} aria-labelledby="practice-more">
          <h2 id="practice-more" className={styles.moreTitle}>
            Wo stehe ich?
          </h2>
          <ul className={styles.shortcuts}>
            {shortcuts.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={styles.shortcut}>
                  <span className={styles.shortcutIcon} aria-hidden="true">
                    <Icon name={item.icon} size={22} />
                  </span>
                  <span className={styles.shortcutText}>
                    <strong>{item.title}</strong>
                    <span>{item.text}</span>
                  </span>
                  <Icon name="arrow" size={16} strokeWidth={2.2} />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </section>
  );
}
