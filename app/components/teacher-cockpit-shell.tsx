import Link from "next/link";
import type { ReactNode } from "react";

export type TeacherArea =
  "overview" | "live" | "classes" | "material" | "assignments" | "settings";

const navigation: readonly {
  area: TeacherArea;
  href: string;
  label: string;
}[] = [
  { area: "overview", href: "/lehrer", label: "Übersicht" },
  { area: "live", href: "/lehrer/live", label: "Live-Unterricht" },
  { area: "classes", href: "/lehrer/klassen", label: "Klassen" },
  { area: "material", href: "/lehrer/material", label: "Material" },
  { area: "assignments", href: "/lehrer/aufgaben", label: "Aufgaben" },
  { area: "settings", href: "/lehrer/einstellungen", label: "Einstellungen" },
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
          {navigation.map((item) => (
            <Link
              className={item.area === active ? "is-active" : undefined}
              href={item.href}
              key={item.area}
              aria-current={item.area === active ? "page" : undefined}
            >
              <span aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="teacher-cockpit__device">
          <strong>Lokaler Arbeitsplatz</strong>
          <small>Offline nutzbar</small>
          <span>● Daten bleiben auf diesem Gerät</span>
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
          <Link href="/lernen">Zum persönlichen Lernraum</Link>
        </header>

        <div className="teacher-cockpit__page">{children}</div>

        <nav
          className="teacher-cockpit__mobile-nav"
          aria-label="Mobile Lehrerbereiche"
        >
          {navigation.map((item) => (
            <Link
              className={item.area === active ? "is-active" : undefined}
              href={item.href}
              key={item.area}
              aria-current={item.area === active ? "page" : undefined}
            >
              <span aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
