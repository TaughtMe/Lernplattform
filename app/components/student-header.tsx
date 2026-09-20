import Link from "next/link";
import type { ReactNode } from "react";
import {
  BookOpenIcon,
  HomeIcon,
  SlidersIcon,
  SparklesIcon,
  TrophyIcon,
} from "./ui-icons";
import { StudentIdentitySummary } from "./student-identity-summary";
import { StudentNavLink } from "./student-nav-link";

const studentNavigation = [
  { href: "/lernen", label: "Heute", shortLabel: "Heute", icon: HomeIcon },
  {
    href: "/lernbox",
    label: "LernBox",
    shortLabel: "LernBox",
    icon: BookOpenIcon,
  },
  {
    href: "/lernen/material",
    label: "Lernwerkstatt",
    shortLabel: "Werkstatt",
    icon: SparklesIcon,
  },
  {
    href: "/lernen/fortschritt",
    label: "Mein Fortschritt",
    shortLabel: "Fortschritt",
    icon: TrophyIcon,
  },
] as const;

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

function NavigationItems({ activePath }: { activePath?: string | undefined }) {
  return (
    <>
      {studentNavigation.map((item) => {
        const Icon = item.icon;
        const active = isActivePath(activePath, item.href);
        return (
          <StudentNavLink
            aria-current={active ? "page" : undefined}
            className={active ? "is-active" : undefined}
            href={item.href}
            key={item.href}
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
      <NavigationItems activePath={activePath} />
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
      <aside className="student-shell__sidebar student-header">
        <Link className="brand" href="/" aria-label="Lernraum Startseite">
          <span className="brand__mark" aria-hidden="true">
            L
          </span>
          <span>Lernraum</span>
        </Link>
        <div className="student-shell__identity">
          {summary ?? <StudentIdentitySummary />}
        </div>

        <nav className="student-shell__nav" aria-label="Lernraum-Bereiche">
          <NavigationItems activePath={activePath} />
        </nav>

        <div className="student-shell__room-action">
          <Link className="student-shell__room-link" href="/#raumcode">
            Raum beitreten
          </Link>
        </div>

        <div className="student-shell__footer-nav">
          <StudentNavLink
            aria-current={
              activePath === "/lernen/einstellungen" ? "page" : undefined
            }
            className={
              activePath === "/lernen/einstellungen" ? "is-active" : undefined
            }
            href="/lernen/einstellungen"
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
