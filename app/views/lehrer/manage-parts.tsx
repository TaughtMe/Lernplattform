import type { ReactNode } from "react";
import { cx } from "../parts/parts";
import styles from "./manage.module.css";

export { styles as manageStyles };

/**
 * Seite unter „Verwalten“ nach Lehrerbereich v2 (17a–c): Kopf mit
 * „Verwalten“, Titel und Hinweis, rechts optional eine Aktion. Der Rahmen
 * zeichnet im Layout `page` keinen eigenen Kopf.
 */
export function ManagePage({
  title,
  lead,
  action,
  titleId,
  className,
  children,
}: {
  title: string;
  lead: ReactNode;
  action?: ReactNode;
  /** Id der Überschrift, z. B. für `aria-labelledby`. */
  titleId?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cx(styles.page, className)}>
      <div className={styles.head}>
        <div className={styles.headText}>
          <span className={styles.eyebrow}>Verwalten</span>
          <h1 className={styles.title} id={titleId}>
            {title}
          </h1>
          <p className={styles.lead}>{lead}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/** Schalter wie in der Vorlage; die Rolle `switch` trägt das Element darum. */
export function SwitchTrack({ on }: { on: boolean }) {
  return (
    <span
      className={cx(styles.switch, on && styles.switchOn)}
      aria-hidden="true"
    >
      <span className={styles.knob} />
    </span>
  );
}

const PATHS = {
  check: <path d="M5 12.5 10 17.5 19 7" />,
  warn: (
    <>
      <path d="M12 4 21 19.5H3z" />
      <path d="M12 10v4.5M12 17.2v.1" />
    </>
  ),
  cloud: (
    <path d="M7 18.5h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7 9.5a4.5 4.5 0 0 0 0 9z" />
  ),
  pencil: <path d="M4 20h4l10.5-10.5-4-4L4 16z" />,
  download: <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" />,
  upload: <path d="M12 20V9M7 13.5l5-5 5 5M5 4h14" />,
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  trash: (
    <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5M10 11v5M14 11v5" />
  ),
  print: <path d="M7 9V4h10v5M7 17H4.5v-8h15v8H17M7 14h10v6H7z" />,
  expand: <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />,
} as const;

export type ManageIconName = keyof typeof PATHS;

/** Symbole der Vorlage 17a–c mit ihren genauen Pfaden. */
export function ManageIcon({
  name,
  size = 16,
  strokeWidth = 2,
  className,
}: {
  name: ManageIconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}
