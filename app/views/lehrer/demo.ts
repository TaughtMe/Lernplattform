import type { LibraryItem } from "./content-library-screen";
import type { TeacherClassItem } from "./teacher-frame";

/** Beispieldaten der Vorlage (3c/3d) für Katalog und Designvergleich. */
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

export const DEMO_ITEMS: readonly LibraryItem[] = [
  {
    id: "present-perfect",
    title: "Present Perfect · Unit 3",
    kind: "vocabulary",
    meta: "42 Vokabeln · Englisch",
    date: "14.09.",
    ran: "14.09.",
  },
  {
    id: "sonnenaufgang",
    title: "Der Sonnenaufgang (Lesetext)",
    kind: "text",
    meta: "6 Abschnitte · 38 Wörter",
    date: "09.09.",
    ran: "09.09.",
  },
  {
    id: "division",
    title: "Halbschriftliche Division",
    kind: "math",
    meta: "30 Aufgaben · Generator",
    date: "02.09.",
    ran: "02.09.",
  },
  {
    id: "irregular-verbs",
    title: "Irregular verbs · Grundstock",
    kind: "vocabulary",
    meta: "86 Vokabeln · Englisch",
    date: "28.08.",
    ran: "28.08.",
  },
];

export const DEMO_COUNT = "14 Inhalte";
export const DEMO_FOOTNOTE =
  "Tippen öffnet die Einstellungen als Overlay — Modus, Hilfen, Start. Die Liste bleibt darunter stehen.";
