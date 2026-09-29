import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "../../ui/icons";
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
  children,
}: {
  items: readonly StudentNavItem[];
  profileHref: string;
  profileActive?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={styles.frame}>
      <div className={styles.layout}>
        <nav className={styles.nav} aria-label="Hauptnavigation">
          <Link href="/lernen" className={styles.brand} aria-label="Lernraum">
            L
          </Link>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={styles.item}
              aria-current={item.active ? "page" : undefined}
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
          >
            <Icon name="gear" size={20} />
          </Link>
        </nav>
        <main className={styles.main} id="inhalt">
          {children}
        </main>
      </div>
    </div>
  );
}
