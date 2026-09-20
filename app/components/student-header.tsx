import Link from "next/link";
import type { ReactNode } from "react";
import { LearnerProfileMenu } from "./learner-profile-menu";
import { StudentIdentitySummary } from "./student-identity-summary";

const primaryNavigation = [
  { href: "/lernen", label: "Heute üben" },
  { href: "/lernen/material", label: "Frei üben" },
  { href: "/lernen/fortschritt", label: "Mein Fortschritt" },
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

export function StudentMobileNavigation({
  activePath,
}: {
  activePath: string | undefined;
}) {
  return (
    <nav
      className="student-dashboard__mobile-nav"
      aria-label="Mobile Bereiche im Lernraum"
    >
      {primaryNavigation.map((item) => (
        <Link
          aria-current={
            isActivePath(activePath, item.href) ? "page" : undefined
          }
          className={
            isActivePath(activePath, item.href) ? "is-active" : undefined
          }
          href={item.href}
          key={item.href}
        >
          <span aria-hidden="true" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function StudentHeader({
  activePath,
  showTeacherLink = false,
  summary,
}: {
  activePath?: string;
  showTeacherLink?: boolean;
  summary?: ReactNode;
}) {
  return (
    <>
      <header className="student-dashboard__topbar student-header">
        <Link className="brand" href="/" aria-label="Lernraum Startseite">
          <span className="brand__mark" aria-hidden="true">
            L
          </span>
          <span>Lernraum</span>
        </Link>
        <nav aria-label="Bereiche im Lernraum">
          {primaryNavigation.map((item) => {
            const active = isActivePath(activePath, item.href);
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={active ? "is-active" : undefined}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="student-header__account">
          {summary ?? <StudentIdentitySummary />}
          <LearnerProfileMenu embedded />
          {showTeacherLink ? (
            <Link className="student-header__teacher-link" href="/lehrer">
              Lehrerbereich
            </Link>
          ) : null}
        </div>
      </header>
      <StudentMobileNavigation activePath={activePath} />
    </>
  );
}
