"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BrandLogo } from "../../ui/brand";
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
  /** Ziel des Namens (die Einstellungen); ohne Angabe ist er nur Text. */
  href?: string;
  /** Ziel der zweiten Zeile; ohne Angabe ist sie nur Text. */
  subHref?: string;
};

/**
 * Wie die Inhaltsfläche aufgebaut ist:
 * - `titled`: Seitentitel mit Klasse darüber (Vorlage 3c/3d)
 * - `plain`: Seiten in alter Oberfläche; eigener Titel im Inhalt, nur Hell/Dunkel oben
 * - `page`: Seiten nach Lehrerbereich v2 (15a, 17a–c); Kopf, Titel und
 *   Innenabstand bringt die Seite selbst mit, Hell/Dunkel steht in der Leiste
 * - `fill`: der Inhalt füllt die Fläche und bringt Kopf und Hell/Dunkel selbst mit
 */
export type TeacherFrameLayout = "titled" | "plain" | "page" | "fill";

export type TeacherFrameProps = {
  /** Zeile über dem Seitentitel, z. B. „Klasse 7b“. */
  eyebrow: string;
  /** Seitentitel, z. B. „Inhalte“. */
  title: string;
  theme: Theme;
  classes: readonly TeacherClassItem[];
  /** Eintrag „Nicht zugeordnet“; ohne Angabe steht er nicht in der Leiste. */
  unassigned?: TeacherClassItem;
  /**
   * Einträge über den Klassen (v2: nur „Start“). Mit `areasLabel` stehen sie
   * wie in 3c/3d als Gruppe „Bereich“ unter den Klassen.
   */
  areas: readonly TeacherAreaItem[];
  /** Überschrift der Bereiche (3c/3d: „Bereich“); ohne Angabe Leiste nach v2. */
  areasLabel?: string | undefined;
  /** Zweite, kleinere Gruppe „Verwalten“; ohne Angabe fehlt sie. */
  manage?: readonly TeacherAreaItem[];
  /**
   * Leiste nach v2: „Verwalten“ beim Laden aufgeklappt? Standard: wenn einer
   * ihrer Einträge aktiv ist.
   */
  manageOpen?: boolean;
  /** Rechts in der Kopfzeile (mobil), z. B. „Raum läuft“. */
  barExtra?: ReactNode;
  /**
   * „Klasse anlegen“ in der Schublade (wie in der Vorlage). Mit `plusOnDesktop`
   * steht zusätzlich ein „+“ neben „Klassen“ in der Seitenleiste.
   */
  addClass?: { href: string; plusOnDesktop?: boolean };
  profile: TeacherProfile;
  /** Standard: `titled`. */
  layout?: TeacherFrameLayout;
  /** Seitenfuß am Ende der Inhaltsfläche. */
  footer?: ReactNode;
  /** Schublade (mobil) offen? */
  navOpen: boolean;
  onNavOpen?: () => void;
  onNavClose?: () => void;
  onToggleTheme?: () => void;
  /** Cloud-Symbol (nur bei aktivem Abgleich); steht neben Hell/Dunkel. */
  cloud?: ReactNode;
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

  const layout = props.layout ?? "titled";
  const activeClass =
    props.classes.find((item) => item.active) ?? props.unassigned;
  return (
    <div
      className={cx(styles.frame, props.areasLabel === undefined && styles.v2)}
      ref={root}
    >
      <div className={cx(styles.layout, layout !== "titled" && styles[layout])}>
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
              {layout === "titled" ? (
                <h1 className={styles.barTitle}>{props.title}</h1>
              ) : (
                <span className={styles.barTitle}>{props.title}</span>
              )}
            </span>
            {props.barExtra}
            {layout === "fill" ? null : (
              <span className={styles.barActions}>
                {props.cloud}
                <ThemeSwitch
                  theme={props.theme}
                  onToggle={props.onToggleTheme}
                />
              </span>
            )}
          </header>

          <main className={styles.main} id="inhalt">
            {layout === "fill" || layout === "page" ? null : (
              <div className={styles.head}>
                {layout === "titled" ? (
                  <div>
                    <p className={styles.eyebrow}>{props.eyebrow}</p>
                    <h1 className={styles.title}>{props.title}</h1>
                  </div>
                ) : null}
                <span className={styles.headTheme}>
                  {props.cloud}
                  <ThemeSwitch
                    theme={props.theme}
                    onToggle={props.onToggleTheme}
                  />
                </span>
              </div>
            )}
            {props.children}
          </main>
          {props.footer}
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
            <span className={styles.brand}>
              <BrandLogo height={30} onDark label="Lernraum" />
              <span>· Lehrer</span>
            </span>
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

function NavContent(
  props: TeacherFrameProps & { variant: "sidebar" | "drawer" },
) {
  const {
    variant,
    classes,
    unassigned,
    areas,
    areasLabel,
    manage,
    addClass,
    profile,
    onNavClose,
  } = props;
  const drawer = variant === "drawer";
  const v2 = areasLabel === undefined;
  const [classesOpen, setClassesOpen] = useState(true);
  const [manageOpen, setManageOpen] = useState(
    props.manageOpen ?? (manage ?? []).some((item) => item.active),
  );
  // In der Schublade schließt jede Navigation sie wieder.
  const close = () => {
    if (drawer) onNavClose?.();
  };
  const allClasses = [...classes, ...(unassigned ? [unassigned] : [])];
  // Zugeklappt bleibt die gewählte Klasse sichtbar (Vorlage 17a–c).
  const shownClasses =
    !v2 || classesOpen ? allClasses : allClasses.filter((item) => item.active);
  const plus =
    !drawer && addClass?.plusOnDesktop ? (
      <Link
        href={addClass.href}
        className={styles.plus}
        aria-label="Klasse anlegen"
      >
        <Icon name="plus" size={14} strokeWidth={2.2} />
      </Link>
    ) : null;
  const areaLinks = areas.map((item) => (
    <AreaLink key={item.id} item={item} top={v2} onClick={close} />
  ));
  return (
    <>
      {drawer ? null : (
        <span className={styles.brand}>
          <BrandLogo height={30} onDark label="Lernraum" />
          <span>· Lehrer</span>
        </span>
      )}
      {v2 ? areaLinks : null}
      <div className={styles.group}>
        {v2 ? (
          <span className={styles.groupLabel}>
            <button
              type="button"
              className={styles.groupToggle}
              aria-expanded={classesOpen}
              onClick={() => setClassesOpen((open) => !open)}
            >
              <Chevron open={classesOpen} />
              Klassen
            </button>
            {plus}
          </span>
        ) : (
          <span className={styles.groupLabel}>
            Klassen
            {plus}
          </span>
        )}
        {shownClasses.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cx(styles.classRow, item.active && styles.active)}
            aria-current={item.active ? "true" : undefined}
            onClick={close}
          >
            <span className={styles.classText}>
              <span className={styles.className}>{item.name}</span>
              {v2 && !classesOpen ? null : (
                <span className={styles.classSub}>{item.sub}</span>
              )}
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

      {v2 ? null : (
        <div className={styles.areas}>
          <span className={styles.areaLabel}>{areasLabel}</span>
          {areaLinks}
        </div>
      )}

      {manage && manage.length > 0 ? (
        <div className={styles.areas}>
          {v2 ? (
            <span className={styles.groupLabel}>
              <button
                type="button"
                className={styles.groupToggle}
                aria-expanded={manageOpen}
                onClick={() => setManageOpen((open) => !open)}
              >
                <Chevron open={manageOpen} />
                Verwalten
              </button>
            </span>
          ) : (
            <span className={styles.areaLabel}>Verwalten</span>
          )}
          {!v2 || manageOpen
            ? manage.map((item) => (
                <AreaLink
                  key={item.id}
                  item={item}
                  small
                  plain={v2}
                  onClick={close}
                />
              ))
            : null}
        </div>
      ) : null}

      <div className={styles.profile}>
        <span className={styles.avatar} aria-hidden="true">
          {profile.initials}
        </span>
        <span className={styles.profileText}>
          {profile.href ? (
            <Link
              href={profile.href}
              className={styles.profileName}
              onClick={close}
            >
              {profile.name}
            </Link>
          ) : (
            <span className={styles.profileName}>{profile.name}</span>
          )}
          {profile.subHref ? (
            <Link
              href={profile.subHref}
              className={styles.profileSub}
              onClick={close}
            >
              {profile.sub}
            </Link>
          ) : (
            <span className={styles.profileSub}>{profile.sub}</span>
          )}
        </span>
        {!drawer && props.layout === "page" ? (
          <span className={styles.profileActions}>
            {props.cloud}
            <ThemeSwitch theme={props.theme} onToggle={props.onToggleTheme} />
          </span>
        ) : null}
      </div>
    </>
  );
}

/** Pfeil vor „Klassen“ und „Verwalten“ (▸, aufgeklappt nach unten). */
function Chevron({ open }: { open: boolean }) {
  return (
    <span
      className={cx(styles.chevron, open && styles.chevronOpen)}
      aria-hidden="true"
    >
      ▸
    </span>
  );
}

function AreaLink({
  item,
  small = false,
  top = false,
  plain = false,
  onClick,
}: {
  item: TeacherAreaItem;
  small?: boolean;
  /** Eintrag über den Klassen (v2: „Start“). */
  top?: boolean;
  /** Ohne Symbol (v2: Einträge unter „Verwalten“). */
  plain?: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={item.href}
      className={cx(
        styles.area,
        small && styles.areaSmall,
        top && styles.areaTop,
        item.active && styles.areaActive,
      )}
      aria-current={item.active ? "page" : undefined}
      onClick={onClick}
    >
      {plain ? null : <Icon name={item.icon} size={17} />}
      {item.label}
    </Link>
  );
}
