import type { ReleaseAreaId } from "../../../src/domain/release";
import type { IconName } from "../icons";

export type TeacherArea =
  | "content"
  | "live"
  | "classes"
  | "material"
  | "assignments"
  | "houses"
  | "settings";

export type TeacherNavEntry = {
  area: TeacherArea;
  href: string;
  label: string;
  icon: IconName;
  release: ReleaseAreaId;
  /** „Bereich“ (Vorlage) oder die kleinere Gruppe „Verwalten“. */
  group: "area" | "manage";
};

/**
 * Navigation des Lehrerbereichs. „Auswertung“ steht nicht darin, bis es
 * dafür einen Entwurf gibt. Bereiche ohne Vorlage stehen unter „Verwalten“.
 */
export const TEACHER_NAV: readonly TeacherNavEntry[] = [
  {
    area: "content",
    href: "/lehrer",
    label: "Inhalte",
    icon: "content",
    release: "lehrer",
    group: "area",
  },
  {
    area: "live",
    href: "/lehrer/live",
    label: "Räume",
    icon: "room",
    release: "lehrer-live",
    group: "area",
  },
  {
    area: "classes",
    href: "/lehrer/klassen",
    label: "Klassen",
    icon: "badge",
    release: "lehrer",
    group: "manage",
  },
  {
    area: "material",
    href: "/lehrer/material",
    label: "Freigabe an Schüler",
    icon: "upload",
    release: "lehrer",
    group: "manage",
  },
  {
    area: "assignments",
    href: "/lehrer/aufgaben",
    label: "Aufgaben",
    icon: "list",
    release: "lehrer-aufgaben",
    group: "manage",
  },
  {
    area: "houses",
    href: "/lehrer/haeuser",
    label: "Häuser",
    icon: "house",
    release: "motivation",
    group: "manage",
  },
  {
    area: "settings",
    href: "/lehrer/einstellungen",
    label: "Einstellungen",
    icon: "gear",
    release: "lehrer",
    group: "manage",
  },
];

/** Bereich zur Adresse: der längste passende Navigationseintrag. */
export function teacherAreaOf(pathname: string): TeacherArea {
  let best: TeacherNavEntry | undefined;
  for (const item of TEACHER_NAV) {
    const hit = pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (hit && (!best || item.href.length > best.href.length)) best = item;
  }
  return best?.area ?? "content";
}

/** Seitentitel des Bereichs. */
export function teacherAreaTitle(area: TeacherArea): string {
  return TEACHER_NAV.find((item) => item.area === area)?.label ?? "Inhalte";
}

/** Initialen für den Kreis unten in der Leiste („Anna Beispiel“ → „AB“). */
export function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "L";
  const first = [...(parts[0] ?? "")][0] ?? "";
  const last = parts.length > 1 ? ([...(parts.at(-1) ?? "")][0] ?? "") : "";
  return `${first}${last}`.toLocaleUpperCase("de");
}
