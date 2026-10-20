import type {
  StartKind,
  StartOtherRow,
  StartRow,
  StartSource,
} from "./start-screen";
import type { TeacherAreaItem, TeacherClassItem } from "./teacher-frame";

/**
 * Beispieldaten der Vorlage „Lehrerbereich v2“ (15a, 15c, 15d) für Katalog
 * und Designvergleich.
 */
export const START_DEMO_CLASSES: readonly TeacherClassItem[] = [
  {
    id: "7b",
    name: "Klasse 7b",
    sub: "Deutsch · 2026/27",
    count: 24,
    href: "#7b",
    active: true,
  },
  {
    id: "8a",
    name: "Klasse 8a",
    sub: "Englisch · 2026/27",
    count: 27,
    href: "#8a",
    active: false,
  },
  {
    id: "5c",
    name: "Klasse 5c",
    sub: "Mathe · 2026/27",
    count: 22,
    href: "#5c",
    active: false,
  },
];

export const START_DEMO_AREAS: readonly TeacherAreaItem[] = [
  { id: "content", label: "Start", icon: "home", href: "#", active: true },
];

export const START_DEMO_MANAGE: readonly TeacherAreaItem[] = [
  ["classes", "Klassen", "badge"],
  ["material", "Freigabe an Schüler", "upload"],
  ["assignments", "Aufgaben", "list"],
  ["houses", "Häuser", "house"],
  ["settings", "Einstellungen", "gear"],
].map(([id, label, icon]) => ({
  id: id!,
  label: label!,
  icon: icon as TeacherAreaItem["icon"],
  href: "#",
  active: false,
}));

const chips = (...labels: string[]) =>
  labels.map((label) => ({ label, own: label === "7b" }));

const row = (
  id: string,
  kind: StartKind,
  title: string,
  meta: string,
  classes: string[],
): StartRow => ({
  id,
  kind,
  title,
  meta,
  classes: chips(...classes),
  shared: classes.length > 1,
});

export const START_DEMO_PREPARED: readonly StartRow[] = [
  row(
    "p1",
    "text",
    "Doppelkonsonanten",
    "Laufdiktat · 6 Stationen · Vorlesen an",
    ["7b"],
  ),
  row("p2", "vocabulary", "Englisch Unit 4", "Battle · Tinte und Schild", [
    "7b",
    "8a",
  ]),
  row("p3", "math", "Einmaleins 8 und 9", "Freies Üben · mit Lücken", ["7b"]),
  row("p4", "text", "Herbst im Wald", "Stationen · 5 Stationen", ["7b", "5c"]),
  row("p5", "vocabulary", "Englisch Unit 5", "Laufdiktat · Vorlesen an", [
    "7b",
    "8a",
  ]),
  row("p6", "text", "Das große Rennen", "Freies Üben · Sterne an", ["7b"]),
];

/** Das Archiv der Vorlage zählt 12 Einträge; die ersten vier sind benannt. */
export const START_DEMO_ARCHIVED: readonly StartRow[] = [
  row("a1", "text", "Der Hund im Hof", "Laufdiktat · durchgeführt 14.10.", [
    "7b",
  ]),
  row("a2", "vocabulary", "Englisch Unit 3", "Battle · durchgeführt 10.10.", [
    "7b",
    "8a",
  ]),
  row("a3", "math", "Einmaleins 6 und 7", "Freies Üben · durchgeführt 08.10.", [
    "7b",
  ]),
  row("a4", "math", "Plus bis 100", "Stationen · durchgeführt 26.09.", ["7b"]),
  row("a5", "text", "Im Zoo", "Laufdiktat · durchgeführt 24.09.", ["7b"]),
  row("a6", "vocabulary", "Englisch Unit 2", "Battle · durchgeführt 22.09.", [
    "7b",
    "8a",
  ]),
  row("a7", "math", "Minus bis 100", "Laufdiktat · durchgeführt 19.09.", [
    "7b",
  ]),
  row("a8", "text", "Am Strand", "Stationen · durchgeführt 17.09.", ["7b"]),
  row("a9", "text", "Wörter mit ie", "Laufdiktat · durchgeführt 15.09.", [
    "7b",
  ]),
  row(
    "a10",
    "vocabulary",
    "Englisch Unit 1",
    "Laufdiktat · durchgeführt 12.09.",
    ["7b", "8a"],
  ),
  row(
    "a11",
    "math",
    "Einmaleins 2 bis 5",
    "Freies Üben · durchgeführt 10.09.",
    ["7b"],
  ),
  row("a12", "text", "Ferienerlebnis", "Laufdiktat · durchgeführt 08.09.", [
    "7b",
  ]),
];

export const START_DEMO_SOURCES: readonly StartSource[] = [
  { id: "ohne", label: "Nicht zugeordnet", count: 5 },
  { id: "8a", label: "Klasse 8a", count: 2 },
  { id: "5c", label: "Klasse 5c", count: 2 },
];

const other = (
  id: string,
  kind: StartKind,
  title: string,
  meta: string,
): StartOtherRow => ({ id, kind, title, meta, added: false });

export const START_DEMO_OTHER: Record<string, readonly StartOtherRow[]> = {
  ohne: [
    other(
      "n1",
      "vocabulary",
      "Französisch Farben",
      "18 Vokabeln · noch nie durchgeführt",
    ),
    other(
      "n2",
      "text",
      "Wortarten erkennen",
      "7 Abschnitte · noch nie durchgeführt",
    ),
    other("n3", "math", "Brüche kürzen", "20 Aufgaben · noch nie durchgeführt"),
    other(
      "n4",
      "text",
      "Satzzeichen setzen",
      "6 Abschnitte · noch nie durchgeführt",
    ),
    other(
      "n5",
      "vocabulary",
      "Spanisch Zahlen",
      "20 Vokabeln · noch nie durchgeführt",
    ),
  ],
  "8a": [
    other(
      "e1",
      "vocabulary",
      "Englisch Unit 2",
      "36 Vokabeln · durchgeführt 02.10.",
    ),
    other("e2", "text", "Simple Past Geschichte", "5 Abschnitte · vorbereitet"),
  ],
  "5c": [
    other("c1", "math", "Plus bis 20", "24 Aufgaben · durchgeführt 30.09."),
    other("c2", "text", "Tiere im Zoo", "6 Abschnitte · vorbereitet"),
  ],
};
