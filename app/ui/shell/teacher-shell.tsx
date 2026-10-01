"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ReleaseAreaId } from "../../../src/domain/release";
import { useRelease } from "../../release/release-context";
import { Icon, type IconName } from "../icons";
import { SiteFooter } from "../site-footer";
import { ThemeToggle } from "../theme-toggle";
import { TeacherClassList } from "./teacher-classes";

export type TeacherArea =
  | "overview"
  | "live"
  | "classes"
  | "material"
  | "assignments"
  | "houses"
  | "settings";

const NAV: readonly {
  area: TeacherArea;
  href: string;
  label: string;
  icon: IconName;
  release: ReleaseAreaId;
}[] = [
  {
    area: "overview",
    href: "/lehrer",
    label: "Übersicht",
    icon: "chart",
    release: "lehrer",
  },
  {
    area: "live",
    href: "/lehrer/live",
    label: "Laufdiktat",
    icon: "run",
    release: "lehrer-live",
  },
  {
    area: "classes",
    href: "/lehrer/klassen",
    label: "Klassen",
    icon: "room",
    release: "lehrer",
  },
  {
    area: "material",
    href: "/lehrer/material",
    label: "Inhalte",
    icon: "content",
    release: "lehrer",
  },
  {
    area: "assignments",
    href: "/lehrer/aufgaben",
    label: "Aufgaben",
    icon: "list",
    release: "lehrer-aufgaben",
  },
  {
    area: "houses",
    href: "/lehrer/haeuser",
    label: "Häuser",
    icon: "house",
    release: "motivation",
  },
  {
    area: "settings",
    href: "/lehrer/einstellungen",
    label: "Einstellungen",
    icon: "gear",
    release: "lehrer",
  },
];

function NavLinks({
  active,
  onNavigate,
}: {
  active: TeacherArea;
  onNavigate?: () => void;
}) {
  const visibility = useRelease();
  return (
    <>
      {NAV.filter((item) => visibility[item.release]).map((item) => (
        <Link
          key={item.area}
          href={item.href}
          className="ui-teacher__link"
          aria-current={item.area === active ? "page" : undefined}
          {...(onNavigate ? { onClick: onNavigate } : {})}
        >
          <Icon name={item.icon} size={18} />
          {item.label}
        </Link>
      ))}
    </>
  );
}

/** Bereich zur Adresse: der längste passende Navigationseintrag. */
export function teacherAreaOf(pathname: string): TeacherArea {
  let best: (typeof NAV)[number] | undefined;
  for (const item of NAV) {
    const hit = pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (hit && (!best || item.href.length > best.href.length)) best = item;
  }
  return best?.area ?? "overview";
}

/**
 * Lehrerrahmen nach Design 2c/3c/3d: dunkle Seitenleiste, mobil als
 * Schublade. Sitzt im Root-Layout (`AreaFrame`) und bleibt beim
 * Seitenwechsel stehen. Das Laufdiktat füllt den Bereich neben der Leiste
 * und bringt Kopf, Hell/Dunkel und Fuß selbst mit.
 */
export function TeacherShell({
  pathname,
  children,
}: {
  pathname: string;
  children: ReactNode;
}) {
  const active = teacherAreaOf(pathname);
  const fill = active === "live";
  const [menuOpen, setMenuOpen] = useState(false);
  const visibility = useRelease();
  const drawer = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = drawer.current;
    if (!dialog) return;
    if (menuOpen && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    if (!menuOpen && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }, [menuOpen]);

  const brand = (
    <Link href="/" className="ui-teacher__brand">
      <span className="ui-shell__logo" aria-hidden="true">
        L
      </span>
      <span>
        <strong>Lernraum</strong>
        <small>Lehrkraft</small>
      </span>
    </Link>
  );

  return (
    <div className="ui ui-teacher">
      <aside className="ui-teacher__side ui-on-dark" aria-label="Lehrerbereich">
        {brand}
        {visibility.lehrer ? <TeacherClassList /> : null}
        <nav className="ui-teacher__nav" aria-label="Lehrerbereiche">
          <span className="ui-teacher__label">Bereich</span>
          <NavLinks active={active} />
        </nav>
        <div className="ui-teacher__foot">
          <Link href="/" className="ui-teacher__link">
            <Icon name="back" size={18} />
            Zur Startseite
          </Link>
        </div>
      </aside>

      <div className={`ui-teacher__body${fill ? " is-fill" : ""}`}>
        <header className="ui-teacher__top">
          <button
            type="button"
            className="ui-icon-btn ui-icon-btn--square"
            aria-label="Menü öffnen"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Icon name="menu" size={20} />
          </button>
          <strong className="ui-grow">Lehrerbereich</strong>
          {fill ? null : <ThemeToggle />}
        </header>
        {fill ? null : (
          <div className="ui-teacher__theme">
            <ThemeToggle />
          </div>
        )}
        <main className="ui-teacher__main">{children}</main>
        {fill ? null : <SiteFooter compact />}
      </div>

      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- Klick auf den Hintergrund ist nur eine Maus-Abkürzung; Tastatur nutzt Escape und den Schließen-Knopf */}
      <dialog
        ref={drawer}
        className="ui ui-teacher__drawer ui-on-dark"
        aria-label="Lehrerbereiche"
        onCancel={(event) => {
          event.preventDefault();
          setMenuOpen(false);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setMenuOpen(false);
        }}
      >
        <div className="ui-between">
          {brand}
          <button
            type="button"
            className="ui-icon-btn"
            aria-label="Menü schließen"
            onClick={() => setMenuOpen(false)}
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        {visibility.lehrer ? (
          <TeacherClassList onNavigate={() => setMenuOpen(false)} />
        ) : null}
        <nav className="ui-teacher__nav" aria-label="Lehrerbereiche mobil">
          <NavLinks active={active} onNavigate={() => setMenuOpen(false)} />
        </nav>
      </dialog>
    </div>
  );
}
