import Link from "next/link";
import type { ReactNode } from "react";

const primaryNavigation = [
  { href: "/lernen", label: "Heute" },
  { href: "/lernen/material", label: "Material" },
  { href: "/frei/typing", label: "Tastschreiben" },
  { href: "/lernen/klasse", label: "Klasse" },
] as const;

export function StudentDashboardShell({
  activePath,
  children,
  summary,
}: {
  activePath: string;
  children: ReactNode;
  summary?: ReactNode;
}) {
  return (
    <main className="learning-room-shell student-dashboard">
      <header className="student-dashboard__topbar">
        <Link className="brand" href="/" aria-label="Lernraum Startseite">
          <span className="brand__mark" aria-hidden="true">
            L
          </span>
          <span>Lernraum</span>
        </Link>
        <nav aria-label="Bereiche im Lernraum">
          {primaryNavigation.map((item) => (
            <Link
              aria-current={activePath === item.href ? "page" : undefined}
              className={activePath === item.href ? "is-active" : undefined}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {summary ?? (
          <span className="student-dashboard__local">
            Lernstand bleibt lokal
          </span>
        )}
      </header>

      {children}

      <nav
        className="student-dashboard__mobile-nav"
        aria-label="Mobile Bereiche im Lernraum"
      >
        {primaryNavigation.map((item) => (
          <Link
            aria-current={activePath === item.href ? "page" : undefined}
            className={activePath === item.href ? "is-active" : undefined}
            href={item.href}
            key={item.href}
          >
            <span aria-hidden="true" />
            {item.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
