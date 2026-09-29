"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ReleaseAreaId } from "../../../src/domain/release";
import { useRelease } from "../../release/release-context";
import { Icon, type IconName } from "../icons";
import { ThemeButton } from "../theme-button";
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
    release: "lehrer",
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

/** Lehrerrahmen nach Design 2c/3c/3d: dunkle Seitenleiste, mobil als Schublade. */
export function TeacherShell({
  active,
  children,
}: {
  active: TeacherArea;
  children: ReactNode;
}) {
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
    <div className="ui ui-teacher teacher-shell teacher-cockpit">
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
          <ThemeButton className="ui-shell__rail-theme" />
        </div>
      </aside>

      <div className="ui-teacher__body">
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
          <ThemeButton />
        </header>
        <main className="ui-teacher__main">
          <div className="teacher-cockpit__page ui-legacy">{children}</div>
        </main>
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
