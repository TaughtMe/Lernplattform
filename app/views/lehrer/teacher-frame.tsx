"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { Icon, type IconName } from "../../ui/icons";
import { cx, ThemeSwitch, type Theme } from "../parts/parts";
import { ModalDialog } from "./modal-dialog";
import styles from "./teacher-frame.module.css";

export type TeacherClassItem = {
  id: string;
  name: string;
  /** Zweite Zeile, z. B. das Fach. */
  sub: string;
  /** Zahl rechts, z. B. die Schüler der Klasse bzw. die Inhalte. */
  count: number;
  href: string;
  active: boolean;
};

export type TeacherAreaItem = {
  id: string;
  label: string;
  icon: IconName;
  href: string;
  active: boolean;
};

export type TeacherProfile = {
  initials: string;
  name: string;
  /** Zweite Zeile, z. B. „Abmelden“ bzw. „Zur Startseite“. */
  sub: string;
  href: string;
};

export type TeacherFrameProps = {
  /** Zeile über dem Seitentitel, z. B. „Klasse 7b“. */
  eyebrow: string;
  /** Seitentitel, z. B. „Inhalte“. */
  title: string;
  theme: Theme;
  classes: readonly TeacherClassItem[];
  /** Eintrag „Nicht zugeordnet“; ohne Angabe steht er nicht in der Leiste. */
  unassigned?: TeacherClassItem;
  /** Bereiche der Vorlage (Inhalte, Räume, Auswertung). */
  areas: readonly TeacherAreaItem[];
  /** Zweite, kleinere Gruppe „Verwalten“; ohne Angabe fehlt sie. */
  manage?: readonly TeacherAreaItem[];
  /**
   * „Klasse anlegen“ in der Schublade (wie in der Vorlage). Mit `plusOnDesktop`
   * steht zusätzlich ein „+“ neben „Klassen“ in der Seitenleiste.
   */
  addClass?: { href: string; plusOnDesktop?: boolean };
  profile: TeacherProfile;
  /** Schublade (mobil) offen? */
  navOpen: boolean;
  onNavOpen?: () => void;
  onNavClose?: () => void;
  onToggleTheme?: () => void;
  children: ReactNode;
};

/**
 * Rahmen des Lehrerbereichs (Design 3c mobil, 3d Desktop): ab 900 px eine
 * Seitenleiste links, darunter eine Kopfzeile mit ausklappbarer Schublade.
 * Der Rahmen ist ein benannter Container, damit der Inhalt auf dieselbe
 * Breite reagiert (`@container lehrer-rahmen`).
 */
export function TeacherFrame(props: TeacherFrameProps) {
  const { onNavClose } = props;
  const root = useRef<HTMLDivElement>(null);

  // Wächst das Fenster über die Schwelle, braucht es keine Schublade mehr.
  useEffect(() => {
    const element = root.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width >= 900) onNavClose?.();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [onNavClose]);

  const activeClass =
    props.classes.find((item) => item.active) ?? props.unassigned;
  return (
    <div className={styles.frame} ref={root}>
      <div className={styles.layout}>
        <nav className={styles.sidebar} aria-label="Lehrerbereich">
          <NavContent {...props} variant="sidebar" />
        </nav>

        <div className={styles.column}>
          <header className={styles.bar}>
            <button
              type="button"
              className={styles.menuButton}
              aria-label="Klassen und Bereiche"
              aria-haspopup="dialog"
              aria-expanded={props.navOpen}
              onClick={props.onNavOpen}
            >
              <Icon name="menu" size={20} strokeWidth={2} />
            </button>
            <span className={styles.barTitles}>
              <span className={styles.barClass}>
                {activeClass?.name ?? props.eyebrow}
              </span>
              <h1 className={styles.barTitle}>{props.title}</h1>
            </span>
            <ThemeSwitch theme={props.theme} onToggle={props.onToggleTheme} />
          </header>

          <main className={styles.main} id="inhalt">
            <div className={styles.head}>
              <div>
                <p className={styles.eyebrow}>{props.eyebrow}</p>
                <h1 className={styles.title}>{props.title}</h1>
              </div>
              <ThemeSwitch theme={props.theme} onToggle={props.onToggleTheme} />
            </div>
            {props.children}
          </main>
        </div>
      </div>

      <ModalDialog
        open={props.navOpen}
        label="Klassen und Bereiche"
        className={styles.drawer}
        onClose={() => props.onNavClose?.()}
      >
        <nav className={styles.drawerInner} aria-label="Lehrerbereich">
          <div className={styles.drawerHead}>
            <span className={styles.brand}>Lernraum · Lehrer</span>
            <button
              type="button"
              className={styles.drawerClose}
              aria-label="Leiste schließen"
              onClick={props.onNavClose}
            >
              <Icon name="close" size={16} strokeWidth={2.2} />
            </button>
          </div>
          <NavContent {...props} variant="drawer" />
        </nav>
      </ModalDialog>
    </div>
  );
}

function NavContent({
  variant,
  classes,
  unassigned,
  areas,
  manage,
  addClass,
  profile,
  onNavClose,
}: TeacherFrameProps & { variant: "sidebar" | "drawer" }) {
  const drawer = variant === "drawer";
  // In der Schublade schließt jede Navigation sie wieder.
  const close = () => {
    if (drawer) onNavClose?.();
  };
  return (
    <>
      {drawer ? null : <span className={styles.brand}>Lernraum · Lehrer</span>}
      <div className={styles.group}>
        <span className={styles.groupLabel}>
          Klassen
          {!drawer && addClass?.plusOnDesktop ? (
            <Link
              href={addClass.href}
              className={styles.plus}
              aria-label="Klasse anlegen"
            >
              <Icon name="plus" size={14} strokeWidth={2.2} />
            </Link>
          ) : null}
        </span>
        {[...classes, ...(unassigned ? [unassigned] : [])].map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cx(styles.classRow, item.active && styles.active)}
            aria-current={item.active ? "true" : undefined}
            onClick={close}
          >
            <span className={styles.classText}>
              <span className={styles.className}>{item.name}</span>
              <span className={styles.classSub}>{item.sub}</span>
            </span>
            <span className={styles.count}>{item.count}</span>
          </Link>
        ))}
        {drawer && addClass ? (
          <Link
            href={addClass.href}
            className={styles.addClass}
            onClick={close}
          >
            <Icon name="plus" size={16} strokeWidth={2.2} />
            Klasse anlegen
          </Link>
        ) : null}
      </div>

      <div className={styles.areas}>
        <span className={styles.areaLabel}>Bereich</span>
        {areas.map((item) => (
          <AreaLink key={item.id} item={item} onClick={close} />
        ))}
      </div>

      {manage && manage.length > 0 ? (
        <div className={styles.areas}>
          <span className={styles.areaLabel}>Verwalten</span>
          {manage.map((item) => (
            <AreaLink key={item.id} item={item} small onClick={close} />
          ))}
        </div>
      ) : null}

      <Link href={profile.href} className={styles.profile} onClick={close}>
        <span className={styles.avatar} aria-hidden="true">
          {profile.initials}
        </span>
        <span className={styles.profileText}>
          <span className={styles.profileName}>{profile.name}</span>
          <span className={styles.profileSub}>{profile.sub}</span>
        </span>
      </Link>
    </>
  );
}

function AreaLink({
  item,
  small = false,
  onClick,
}: {
  item: TeacherAreaItem;
  small?: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={item.href}
      className={cx(
        styles.area,
        small && styles.areaSmall,
        item.active && styles.areaActive,
      )}
      aria-current={item.active ? "page" : undefined}
      onClick={onClick}
    >
      <Icon name={item.icon} size={17} />
      {item.label}
    </Link>
  );
}
