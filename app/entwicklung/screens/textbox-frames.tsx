import type { ReactNode } from "react";
import { Icon, type IconName } from "../../ui/icons";
import { cx } from "../../views/parts/parts";
import styles from "./textbox-frames.module.css";

const TABS: readonly { label: string; icon: IconName }[] = [
  { label: "Lernen", icon: "learn" },
  { label: "Raum", icon: "room" },
  { label: "Duell", icon: "duel" },
  { label: "Haus", icon: "house" },
];

/** Inhaltsfläche des Schülerbereichs ohne Navigation (Container `student-main`). */
export function TextboxMain({ children }: { children: ReactNode }) {
  return <div className={styles.main}>{children}</div>;
}

/** Handyfläche aus 9c: scrollender Inhalt über der Tab-Leiste. */
export function TextboxPhone({ children }: { children: ReactNode }) {
  return (
    <div className={styles.phone}>
      <div className={styles.scroll}>{children}</div>
      <div className={styles.tabs} aria-hidden="true">
        {TABS.map((tab, index) => (
          <span
            key={tab.label}
            className={cx(styles.tab, index === 0 && styles.tabActive)}
          >
            <Icon name={tab.icon} size={22} />
            {tab.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Desktop mit Seitenleiste aus Turn 9 (9d). */
export function TextboxDesktop({ children }: { children: ReactNode }) {
  return (
    <div className={styles.desktop}>
      <div className={styles.rail} aria-hidden="true">
        <span className={styles.logo}>L</span>
        {TABS.map((tab, index) => (
          <span
            key={tab.label}
            className={cx(styles.railItem, index === 0 && styles.railActive)}
          >
            <Icon name={tab.icon} size={23} />
            {tab.label}
          </span>
        ))}
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  );
}

/** Handy ohne Navigation (9f); der Inhalt scrollt, die Aktionsleiste klebt unten. */
export function TextboxPhoneRun({ children }: { children: ReactNode }) {
  return <div className={styles.phoneRun}>{children}</div>;
}
