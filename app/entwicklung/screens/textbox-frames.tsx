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
