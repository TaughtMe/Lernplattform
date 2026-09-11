import Link from "next/link";
import type { ReactNode } from "react";
import { HomeIcon, LiveLessonIcon } from "./ui-icons";

export type TeacherArea =
  "overview" | "live" | "classes" | "material" | "assignments" | "settings";

const navigation: readonly {
  area: TeacherArea;
  href: string;
  label: string;
  icon: typeof LiveLessonIcon;
}[] = [
  {
    area: "live",
    href: "/lehrer/live",
    label: "Laufdiktat",
    icon: LiveLessonIcon,
  },
] as const;

export function TeacherCockpitShell({
  active,
  children,
}: {
  active: TeacherArea;
  children: ReactNode;
}) {
  return (
    <main className="teacher-shell teacher-cockpit">
      <aside className="teacher-cockpit__sidebar">
        <Link className="teacher-cockpit__brand" href="/">
          <span className="brand__mark" aria-hidden="true">
            L
          </span>
          <span>
            <strong>Lernraum</strong>
            <small>Lehrkraft</small>
          </span>
        </Link>

        <nav aria-label="Lehrerbereiche">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                className={item.area === active ? "is-active" : undefined}
                href={item.href}
                key={item.area}
                aria-current={item.area === active ? "page" : undefined}
              >
                <Icon aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="teacher-cockpit__device">
          <strong>Lokaler Arbeitsplatz</strong>
          <small>Begleiteter Pilot</small>
          <span className="teacher-cockpit__live-note">
            <i aria-hidden="true" /> Live-Räume werden automatisch gelöscht
          </span>
        </div>
      </aside>

      <div className="teacher-cockpit__content">
        <header className="teacher-cockpit__topbar">
          <div>
            <span className="teacher-cockpit__mobile-mark" aria-hidden="true">
              L
            </span>
            <strong>Lehrer-Cockpit</strong>
          </div>
          <Link href="/" aria-label="Zur Schülerstartseite">
            <HomeIcon aria-hidden="true" />
            <span>Zur Schülerstartseite</span>
          </Link>
        </header>

        <div className="teacher-cockpit__page">{children}</div>

        <nav
          className="teacher-cockpit__mobile-nav"
          aria-label="Mobile Lehrerbereiche"
        >
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                className={item.area === active ? "is-active" : undefined}
                href={item.href}
                key={item.area}
                aria-current={item.area === active ? "page" : undefined}
              >
                <Icon aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </main>
  );
}
