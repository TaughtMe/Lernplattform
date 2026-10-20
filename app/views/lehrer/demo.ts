import type { TeacherClassItem } from "./teacher-frame";

/** Beispielklassen der Vorlage 3c/3d (Tests des Rahmens). */
export const DEMO_CLASSES: readonly TeacherClassItem[] = [
  {
    id: "7b",
    name: "Klasse 7b",
    sub: "Englisch",
    count: 24,
    href: "#7b",
    active: true,
  },
  {
    id: "9a",
    name: "Klasse 9a",
    sub: "Französisch",
    count: 21,
    href: "#9a",
    active: false,
  },
  {
    id: "6c",
    name: "Klasse 6c",
    sub: "Deutsch",
    count: 26,
    href: "#6c",
    active: false,
  },
];
