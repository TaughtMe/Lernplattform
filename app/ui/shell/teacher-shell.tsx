"use client";

import { useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  resolveClassSelection,
  UNASSIGNED,
} from "../../../src/domain/teacher-content-summary";
import { TeacherFrame } from "../../views/lehrer/teacher-frame";
import type {
  TeacherAreaItem,
  TeacherClassItem,
} from "../../views/lehrer/teacher-frame";
import { useRelease } from "../../release/release-context";
import { SiteFooter } from "../site-footer";
import { useThemeToggle } from "../theme";
import {
  initialsOf,
  TEACHER_NAV,
  teacherAreaOf,
  teacherAreaTitle,
  type TeacherNavEntry,
} from "./teacher-nav";
import { useTeacherNavData } from "./use-teacher-nav-data";

export { teacherAreaOf, type TeacherArea } from "./teacher-nav";

/** Adresse der Inhalte einer Klasse bzw. von „Nicht zugeordnet“. */
export function teacherClassHref(selection: string) {
  return `/lehrer?klasse=${encodeURIComponent(selection)}`;
}

/**
 * Lehrerrahmen nach Design 3c/3d. Sitzt im Root-Layout (`AreaFrame`) und
 * bleibt beim Seitenwechsel stehen. Der Rahmen liefert nur Daten (Klassen,
 * Bereiche nach Freigabe, Profil); gezeichnet wird die Ansicht `TeacherFrame`.
 * Das Laufdiktat füllt die Fläche und bringt Kopf, Hell/Dunkel und Fuß mit.
 */
export function TeacherShell({
  pathname,
  children,
}: {
  pathname: string;
  children: ReactNode;
}) {
  const area = teacherAreaOf(pathname);
  const visibility = useRelease();
  const { theme, toggleTheme } = useThemeToggle();
  const data = useTeacherNavData();
  const [navOpen, setNavOpen] = useState(false);
  // Nur auf Lehrerseiten ist die Adresse gemeint; dort steht `?klasse=`.
  const requested = useSearchParams().get("klasse");

  const classIds = (data.classes ?? []).map(({ id }) => id);
  const selection = resolveClassSelection({
    requested,
    lastClassId: data.lastClassId,
    classIds,
  });

  const classes: TeacherClassItem[] = (data.classes ?? []).map((course) => ({
    id: course.id,
    name: course.name,
    sub: course.schoolYear,
    count: course.members,
    href: teacherClassHref(course.id),
    active: course.id === selection,
  }));
  // Nur mit Inhalten ohne Klasse, oder wenn die Wahl bewusst darauf steht.
  const unassigned: TeacherClassItem | undefined =
    data.classes !== null && data.unassignedCount > 0
      ? {
          id: UNASSIGNED,
          name: "Nicht zugeordnet",
          sub: "Ohne Klasse",
          count: data.unassignedCount,
          href: teacherClassHref(UNASSIGNED),
          active: selection === UNASSIGNED,
        }
      : undefined;

  const activeClass = classes.find((item) => item.active) ?? unassigned;
  const item = (entry: TeacherNavEntry): TeacherAreaItem => ({
    id: entry.area,
    label: entry.label,
    icon: entry.icon,
    // Die Verwaltung der Klasse öffnet gleich mit der gewählten Klasse.
    href:
      entry.area === "classes" && selection !== UNASSIGNED && classIds.length
        ? `${entry.href}?klasse=${encodeURIComponent(selection)}`
        : entry.href,
    active: entry.area === area,
  });
  const visible = TEACHER_NAV.filter((entry) => visibility[entry.release]);
  const fill = area === "live";

  return (
    <div style={{ height: "100dvh" }}>
      <TeacherFrame
        layout={fill ? "fill" : "plain"}
        eyebrow={activeClass?.name ?? "Lehrerbereich"}
        title={teacherAreaTitle(area)}
        theme={theme}
        classes={visibility.lehrer ? classes : []}
        {...(visibility.lehrer && unassigned ? { unassigned } : {})}
        areas={visible.filter((entry) => entry.group === "area").map(item)}
        manage={visible.filter((entry) => entry.group === "manage").map(item)}
        {...(visibility.lehrer
          ? { addClass: { href: "/lehrer/klassen", plusOnDesktop: true } }
          : {})}
        profile={{
          initials: initialsOf(data.profileName),
          name: data.profileName || "Lehrkraft",
          sub: "Zur Startseite",
          href: "/lehrer/einstellungen",
          subHref: "/",
        }}
        navOpen={navOpen}
        onNavOpen={() => setNavOpen(true)}
        onNavClose={() => setNavOpen(false)}
        onToggleTheme={toggleTheme}
        footer={fill ? null : <SiteFooter compact />}
      >
        {/* Ältere Seiten brauchen die Grundlage `.ui` (Schrift, Abstände). */}
        {fill ? children : <div className="ui">{children}</div>}
      </TeacherFrame>
    </div>
  );
}
