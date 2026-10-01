import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "../../ui/icons";
import { cx } from "../parts/parts";
import styles from "./student-frame.module.css";

export type StudentNavItem = {
  href: string;
  label: string;
  icon: IconName;
  active: boolean;
};

/**
 * Rahmen des Schülerbereichs: Navigation (Seitenleiste bzw. Tab-Leiste)
 * und Inhaltsfläche. Welche Einträge sichtbar sind, entscheidet der Aufrufer.
 */
export function StudentFrame({
  items,
  profileHref,
  profileActive = false,
  hideNav = false,
  pending = false,
  onNavigate,
  footer,
  children,
}: {
  items: readonly StudentNavItem[];
  profileHref: string;
  profileActive?: boolean;
  /** Vollbild (z. B. laufende Runde): ohne Navigation. */
  hideNav?: boolean;
  /** Eine angetippte Seite lädt noch. */
  pending?: boolean;
  onNavigate?: (href: string) => void;
  /** Seitenfuß am Ende des Inhalts. */
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.frame}>
      <div className={styles.layout}>
        <nav
          className={styles.nav}
          aria-label="Hauptnavigation"
          hidden={hideNav}
        >
          {/* Das L führt zur Startseite (Raumcode, Lehrer-Login). */}
          <Link href="/" className={styles.brand} aria-label="Zur Startseite">
            L
          </Link>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={styles.item}
              aria-current={item.active ? "page" : undefined}
              onClick={(event) => {
                if (!event.metaKey && !event.ctrlKey && !event.shiftKey)
                  onNavigate?.(item.href);
              }}
            >
              <Icon name={item.icon} size={23} strokeLinejoin="miter" />
              {item.label}
            </Link>
          ))}
          <Link
            href={profileHref}
            className={styles.profile}
            aria-label="Profileinstellungen"
            aria-current={profileActive ? "page" : undefined}
            onClick={(event) => {
              if (!event.metaKey && !event.ctrlKey && !event.shiftKey)
                onNavigate?.(profileHref);
            }}
          >
            <Icon name="gear" size={20} />
            <span className={styles.profileLabel} aria-hidden="true">
              Profil
            </span>
          </Link>
        </nav>
        {pending ? (
          <span
            className={styles.loading}
            role="progressbar"
            aria-label="Seite wird geladen"
          />
        ) : null}
        <main className={cx(styles.main, hideNav && styles.bare)} id="inhalt">
          <div className={styles.content}>{children}</div>
          {footer}
        </main>
      </div>
    </div>
  );
}
