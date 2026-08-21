export type LessonKind = "drill" | "words" | "sentences" | "free-text";

export interface LessonDef {
  id: string;
  title: string;
  description: string;
  kind: LessonKind;
  /** Zeichen, die in dieser Lektion neu hinzukommen (leer bei reinen Kombi-/Shift-Lektionen). */
  newKeys: string[];
  /** Bei true wird bewusst mit Großschreibung (Shift) der schon bekannten Buchstaben geübt. */
  introducesShift?: boolean;
}

/**
 * Lehrplan: von der Grundstellung über jede Tastenreihe bis zu Großschreibung,
 * Zahlen, Satzzeichen, Wörtern, Sätzen und freiem Abschreibtext — nach "07 -
 * Adaptive Merkstrecke", Abschnitt "Tastschreibtraining als eigener Bereich".
 * Bis einschließlich "satzzeichen" ist jedes Zeichen der Tastatur genau einer
 * Lektion als "neu" zugeordnet (siehe Test), danach brauchen Wörter/Sätze/freier
 * Text keine Buchstabenbeschränkung mehr.
 */
export const LESSONS: LessonDef[] = [
  {
    id: "grundstellung-links",
    title: "Grundstellung: linke Hand",
    description: "Leg die linke Hand auf A S D F — der kleine Höcker auf der F-Taste hilft dir, sie ohne Hinsehen zu finden.",
    kind: "drill",
    newKeys: ["a", "s", "d", "f"],
  },
  {
    id: "grundstellung-rechts",
    title: "Grundstellung: rechte Hand",
    description: "Leg die rechte Hand auf J K L Ö — der Höcker auf der J-Taste ist das Gegenstück zu F.",
    kind: "drill",
    newKeys: ["j", "k", "l", "ö"],
  },
  {
    id: "grundreihe-kombiniert",
    title: "Grundreihe kombiniert",
    description: "Beide Hände zusammen, mit der Leertaste dazwischen — je ein Daumen bedient sie.",
    kind: "drill",
    newKeys: [" "],
  },
  {
    id: "zeigefinger-erweiterung",
    title: "Zeigefinger-Erweiterung: G und H",
    description: "Die Zeigefinger strecken sich von F und J je eine Taste zur Mitte — G und H.",
    kind: "drill",
    newKeys: ["g", "h"],
  },
  {
    id: "obere-reihe-links",
    title: "Obere Reihe: linke Hand",
    description: "Q W E R T — jeder Finger einen Schritt nach oben, T greift der Zeigefinger von F aus.",
    kind: "drill",
    newKeys: ["q", "w", "e", "r", "t"],
  },
  {
    id: "obere-reihe-rechts",
    title: "Obere Reihe: rechte Hand",
    description: "Z U I O P — Z greift der Zeigefinger von J aus, die anderen Finger je eine Taste nach oben.",
    kind: "drill",
    newKeys: ["z", "u", "i", "o", "p"],
  },
  {
    id: "ue-einfuehren",
    title: "Das Ü",
    description: "Der rechte kleine Finger streckt sich von Ö aus eine Taste weiter nach oben.",
    kind: "drill",
    newKeys: ["ü"],
  },
  {
    id: "untere-reihe-links",
    title: "Untere Reihe: linke Hand",
    description: "Y X C V B — ein Schritt nach unten. Y sitzt dort, wo bei englischen Tastaturen Z ist.",
    kind: "drill",
    newKeys: ["y", "x", "c", "v", "b"],
  },
  {
    id: "untere-reihe-rechts",
    title: "Untere Reihe: rechte Hand",
    description: "N M , . — Komma und Punkt tippt der Ring- und der kleine Finger, ohne hinzusehen.",
    kind: "drill",
    newKeys: ["n", "m", ",", "."],
  },
  {
    id: "grossbuchstaben",
    title: "Großbuchstaben",
    description: "Die Shift-Taste drückt immer die gegenüberliegende Hand — nie derselbe Finger, der auch den Buchstaben tippt.",
    kind: "drill",
    newKeys: [],
    introducesShift: true,
  },
  {
    id: "zahlenreihe",
    title: "Zahlenreihe",
    description: "1 bis 0 — jeder Finger bleibt in seiner Spalte, nur weiter oben.",
    kind: "drill",
    newKeys: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  },
  {
    id: "satzzeichen",
    title: "Satzzeichen & Umlaute",
    description: "ß, Ä und der Bindestrich — die letzten Tasten, die noch fehlen.",
    kind: "drill",
    newKeys: ["ß", "ä", "-"],
  },
  {
    id: "woerter",
    title: "Wörter",
    description: "Jetzt sind alle Tasten bekannt — ganze Wörter am Stück, ohne auf die Tastatur zu schauen.",
    kind: "words",
    newKeys: [],
  },
  {
    id: "saetze",
    title: "Sätze",
    description: "Kurze, vollständige Sätze mit Groß- und Kleinschreibung.",
    kind: "sentences",
    newKeys: [],
  },
  {
    id: "freier-text",
    title: "Freier Text",
    description: "Ein kurzer Absatz zum Abschreiben, wie ein echter Text.",
    kind: "free-text",
    newKeys: [],
  },
];

/** Alle Zeichen, die ab einschließlich dieser Lektion zur Verfügung stehen (diese + alle vorherigen). */
export function availableKeysThrough(lessonId: string): string[] {
  const seen = new Set<string>();
  for (const lesson of LESSONS) {
    for (const key of lesson.newKeys) seen.add(key);
    if (lesson.id === lessonId) break;
  }
  return Array.from(seen);
}

export function lessonById(lessonId: string): LessonDef | undefined {
  return LESSONS.find((l) => l.id === lessonId);
}

export function lessonIndex(lessonId: string): number {
  return LESSONS.findIndex((l) => l.id === lessonId);
}

/** Die erste Lektion ist immer offen; jede weitere erst, wenn die vorherige abgeschlossen ist. */
export function isLessonUnlocked(lessonId: string, completedLessonIds: ReadonlySet<string>): boolean {
  const idx = lessonIndex(lessonId);
  if (idx <= 0) return idx === 0;
  return completedLessonIds.has(LESSONS[idx - 1].id);
}
