import Link from "next/link";
import type { ReactNode } from "react";
import {
  BookOpenIcon,
  CameraIcon,
  HomeIcon,
  SlidersIcon,
  SparklesIcon,
  TrophyIcon,
} from "./ui-icons";
import { RoomCodeForm } from "./room-code-form";
import { StudentIdentitySummary } from "./student-identity-summary";
import { StudentNavLink } from "./student-nav-link";
import { StudentSidebarProgress } from "./student-sidebar-progress";
import { StudentSidebarToggle } from "./student-sidebar-toggle";

const coreNavigation = [
  {
    href: "/lernen",
    label: "Heute üben",
    shortLabel: "Heute",
    icon: HomeIcon,
  },
  {
    href: "/lernbox",
    label: "LernBox",
    shortLabel: "LernBox",
    icon: BookOpenIcon,
  },
  {
    href: "/lernen/material",
    label: "Üben",
    shortLabel: "Üben",
    icon: SparklesIcon,
  },
] as const;

const progressNavigation = [
  {
    href: "/lernen/fortschritt",
    label: "Mein Fortschritt",
    shortLabel: "Fortschritt",
    icon: TrophyIcon,
  },
] as const;

const mobileNavigation = [...coreNavigation, ...progressNavigation] as const;

function isActivePath(activePath: string | undefined, href: string) {
  if (!activePath) return false;
  if (href === "/lernen") return activePath === "/lernen";
  if (href === "/lernen/material") {
    return (
      activePath.startsWith("/lernen/material") ||
      activePath.startsWith("/frei")
    );
  }
  return activePath.startsWith(href);
}

function NavigationItems({
  activePath,
  items = coreNavigation,
}: {
  activePath?: string | undefined;
  items?: readonly (typeof mobileNavigation)[number][];
}) {
  return (
    <>
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActivePath(activePath, item.href);
        return (
          <StudentNavLink
            aria-current={active ? "page" : undefined}
            className={active ? "is-active" : undefined}
            href={item.href}
            key={item.href}
            title={item.label}
          >
            <Icon aria-hidden="true" />
            <span className="student-nav-link__label-full">{item.label}</span>
            {"shortLabel" in item ? (
              <span className="student-nav-link__label-short">
                {item.shortLabel}
              </span>
            ) : null}
          </StudentNavLink>
        );
      })}
    </>
  );
}

export function StudentMobileNavigation({
  activePath,
}: {
  activePath?: string | undefined;
}) {
  return (
    <nav
      className="student-dashboard__mobile-nav"
      aria-label="Lernraum-Bereiche"
    >
      <NavigationItems activePath={activePath} items={mobileNavigation} />
      <Link href="/raum" title="Raum beitreten" aria-label="Raum beitreten">
        <CameraIcon aria-hidden="true" />
        <span className="student-nav-link__label-full">Raum</span>
        <span className="student-nav-link__label-short">Raum</span>
      </Link>
    </nav>
  );
}

export function StudentHeader({
  activePath,
  showTeacherLink = false,
  summary,
}: {
  activePath?: string | undefined;
  showTeacherLink?: boolean;
  summary?: ReactNode;
}) {
  return (
    <>
      <aside
        className="student-shell__sidebar student-header"
        id="student-sidebar"
      >
        <div className="student-shell__brand-row">
          <Link className="brand" href="/" aria-label="Lernraum Startseite">
            <span className="brand__mark" aria-hidden="true">
              L
            </span>
            <span>Lernraum</span>
          </Link>
          <StudentSidebarToggle />
        </div>
        <div className="student-shell__identity">
          {summary ?? <StudentIdentitySummary />}
        </div>

        <nav className="student-shell__nav" aria-label="Lernraum-Bereiche">
          <NavigationItems activePath={activePath} />
        </nav>

        <div className="student-shell__room-action">
          <RoomCodeForm idPrefix="sidebar-join" mode="room" />
        </div>

        <StudentSidebarProgress active={activePath === "/lernen/fortschritt"} />

        <div className="student-shell__footer-nav">
          <StudentNavLink
            aria-current={
              activePath === "/lernen/einstellungen" ? "page" : undefined
            }
            className={
              activePath === "/lernen/einstellungen" ? "is-active" : undefined
            }
            href="/lernen/einstellungen"
            title="Einstellungen"
          >
            <SlidersIcon aria-hidden="true" />
            <span>Einstellungen</span>
          </StudentNavLink>
          {showTeacherLink ? (
            <Link className="student-header__teacher-link" href="/lehrer">
              Lehrerbereich
            </Link>
          ) : null}
        </div>
      </aside>

      <header className="student-shell__mobile-topbar student-header">
        <Link className="brand" href="/" aria-label="Lernraum Startseite">
          <span className="brand__mark" aria-hidden="true">
            L
          </span>
          <span>Lernraum</span>
        </Link>
        <StudentIdentitySummary />
      </header>
      <StudentMobileNavigation activePath={activePath} />
    </>
  );
}
