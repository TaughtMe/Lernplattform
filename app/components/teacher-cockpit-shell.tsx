import Link from "next/link";
import type { ReactNode } from "react";
import {
  BookOpenIcon,
  HomeIcon,
  LiveLessonIcon,
  PencilIcon,
  SlidersIcon,
  UploadIcon,
} from "./ui-icons";

export type TeacherArea =
  "overview" | "live" | "classes" | "material" | "assignments" | "settings";

const navigation: readonly {
  area: TeacherArea;
  href: string;
  label: string;
  icon: typeof LiveLessonIcon;
}[] = [
  {
    area: "overview",
    href: "/lehrer",
    label: "Übersicht",
    icon: HomeIcon,
  },
  {
    area: "classes",
    href: "/lehrer/klassen",
    label: "Klassen",
    icon: BookOpenIcon,
  },
  {
    area: "material",
    href: "/lehrer/material",
    label: "Material",
    icon: UploadIcon,
  },
  {
    area: "assignments",
    href: "/lehrer/aufgaben",
    label: "Aufgaben",
    icon: PencilIcon,
  },
  {
    area: "live",
    href: "/lehrer/live",
    label: "Laufdiktat",
    icon: LiveLessonIcon,
  },
  {
    area: "settings",
    href: "/lehrer/einstellungen",
    label: "Einstellungen",
    icon: SlidersIcon,
  },
] as const;

const navigationGroups = [
  {
    label: "Unterricht",
    items: navigation.filter(
      (item) =>
        item.area === "overview" ||
        item.area === "classes" ||
        item.area === "material" ||
        item.area === "assignments" ||
        item.area === "live",
    ),
  },
  {
    label: "System",
    items: navigation.filter((item) => item.area === "settings"),
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
          {navigationGroups.map((group) => (
            <div className="teacher-cockpit__nav-group" key={group.label}>
              <span className="teacher-cockpit__nav-label">{group.label}</span>
              {group.items.map((item) => {
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
            </div>
          ))}
        </nav>
      </aside>

      <div className="teacher-cockpit__content">
        <header
          className="teacher-cockpit__topbar"
          style={{ paddingRight: "clamp(74px, 8vw, 116px)" }}
        >
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
