export type LessonKind = "drill" | "words" | "sentences" | "free-text";

export interface LessonDef {
  id: string;
  title: string;
  description: string;
  kind: LessonKind;
  /** Zeichen, die in dieser Lektion neu hinzukommen (leer bei reinen Kombi-/Shift-/Wiederholungs-Lektionen). */
  newKeys: string[];
  /** Bei true wird bewusst mit Großschreibung (Shift) der schon bekannten Buchstaben geübt. */
  introducesShift?: boolean;
  /** Nur für kind "words"/"sentences": wählt die einfachere oder anspruchsvollere Liste. Ohne Angabe: "easy". */
  difficulty?: "easy" | "hard";
}

/**
 * Lehrplan: von der Grundstellung finger- statt handweise über jede
 * Tastenreihe bis zu Großschreibung, Zahlen, Satzzeichen, Wörtern, Sätzen und
 * freiem Abschreibtext — nach "07 - Adaptive Merkstrecke", Abschnitt
 * "Tastschreibtraining als eigener Bereich". Jedes Fingerpaar bekommt eine
 * eigene, kleine Lektion (näher an typischen Tipptrainern wie TypingClub als
 * "eine ganze Hand auf einmal"), dazu eine Wiederholungslektion nach jeder
 * Tastenreihe. Bis einschließlich "satzzeichen" ist jedes Zeichen der
 * Tastatur genau einer Lektion als "neu" zugeordnet (siehe Test), danach
 * brauchen Wörter/Sätze/freier Text keine Buchstabenbeschränkung mehr.
 */
export const LESSONS: LessonDef[] = [
  {
    id: "grundstellung-zeigefinger",
    title: "Grundstellung: Zeigefinger",
    description: "F und J — die beiden Tasten mit dem kleinen Höcker. Beide Zeigefinger finden sie ohne hinzusehen.",
    kind: "drill",
    newKeys: ["f", "j"],
  },
  {
    id: "grundstellung-mittelfinger",
    title: "Grundstellung: Mittelfinger",
    description: "D und K — je eine Taste links und rechts von den Zeigefingertasten.",
    kind: "drill",
    newKeys: ["d", "k"],
  },
  {
    id: "grundstellung-ringfinger",
    title: "Grundstellung: Ringfinger",
    description: "S und L — noch eine Taste weiter außen.",
    kind: "drill",
    newKeys: ["s", "l"],
  },
  {
    id: "grundstellung-kleinfinger",
    title: "Grundstellung: kleiner Finger",
    description: "A und Ö — die äußersten Tasten der Grundreihe.",
    kind: "drill",
    newKeys: ["a", "ö"],
  },
  {
    id: "grundreihe-leertaste",
    title: "Grundreihe mit Leertaste",
    description: "Alle acht Grundreihen-Tasten zusammen, mit der Leertaste dazwischen — je ein Daumen bedient sie.",
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
    id: "grundreihe-wiederholung",
    title: "Grundreihe: Wiederholung",
    description: "Alle zehn Grundreihen-Tasten gemischt — bevor es mit der oberen Reihe weitergeht.",
    kind: "drill",
    newKeys: [],
  },
  {
    id: "obere-reihe-links-1",
    title: "Obere Reihe: Q W E",
    description: "Kleiner, Ring- und Mittelfinger der linken Hand je eine Taste nach oben.",
    kind: "drill",
    newKeys: ["q", "w", "e"],
  },
  {
    id: "obere-reihe-links-2",
    title: "Obere Reihe: R T",
    description: "Der linke Zeigefinger deckt zwei Tasten ab — R und T.",
    kind: "drill",
    newKeys: ["r", "t"],
  },
  {
    id: "obere-reihe-rechts-1",
    title: "Obere Reihe: Z U",
    description: "Der rechte Zeigefinger deckt ebenfalls zwei Tasten ab — Z und U.",
    kind: "drill",
    newKeys: ["z", "u"],
  },
  {
    id: "obere-reihe-rechts-2",
    title: "Obere Reihe: I O P",
    description: "Mittel-, Ring- und kleiner Finger der rechten Hand je eine Taste nach oben.",
    kind: "drill",
    newKeys: ["i", "o", "p"],
  },
  {
    id: "ue-einfuehren",
    title: "Das Ü",
    description: "Der rechte kleine Finger streckt sich von Ö aus eine Taste weiter nach oben.",
    kind: "drill",
    newKeys: ["ü"],
  },
  {
    id: "obere-reihe-wiederholung",
    title: "Obere Reihe: Wiederholung",
    description: "Grundreihe und obere Reihe gemischt.",
    kind: "drill",
    newKeys: [],
  },
  {
    id: "untere-reihe-links-1",
    title: "Untere Reihe: Y X",
    description: "Kleiner und Ringfinger der linken Hand einen Schritt nach unten. Y sitzt dort, wo bei englischen Tastaturen Z ist.",
    kind: "drill",
    newKeys: ["y", "x"],
  },
  {
    id: "untere-reihe-links-2",
    title: "Untere Reihe: C V B",
    description: "Mittelfinger und Zeigefinger — der Zeigefinger deckt wieder zwei Tasten ab.",
    kind: "drill",
    newKeys: ["c", "v", "b"],
  },
  {
    id: "untere-reihe-rechts-1",
    title: "Untere Reihe: N M",
    description: "Der rechte Zeigefinger, wieder zwei Tasten.",
    kind: "drill",
    newKeys: ["n", "m"],
  },
  {
    id: "untere-reihe-rechts-2",
    title: "Untere Reihe: Komma und Punkt",
    description: "Komma und Punkt tippt der Ring- und der kleine Finger, ohne hinzusehen.",
    kind: "drill",
    newKeys: [",", "."],
  },
  {
    id: "untere-reihe-wiederholung",
    title: "Untere Reihe: Wiederholung",
    description: "Alle drei Buchstabenreihen gemischt.",
    kind: "drill",
    newKeys: [],
  },
  {
    id: "grossbuchstaben-einfuehren",
    title: "Großbuchstaben",
    description: "Die Shift-Taste drückt immer die gegenüberliegende Hand — nie derselbe Finger, der auch den Buchstaben tippt.",
    kind: "drill",
    newKeys: [],
    introducesShift: true,
  },
  {
    id: "grossbuchstaben-wiederholung",
    title: "Großbuchstaben: Wiederholung",
    description: "Noch mehr Groß- und Kleinschreibung im Wechsel, bis die Shift-Hand automatisch mitgeht.",
    kind: "drill",
    newKeys: [],
    introducesShift: true,
  },
  {
    id: "zahlenreihe-links",
    title: "Zahlenreihe: 1 bis 5",
    description: "Die linke Hand, jeder Finger bleibt in seiner Spalte, nur weiter oben.",
    kind: "drill",
    newKeys: ["1", "2", "3", "4", "5"],
  },
  {
    id: "zahlenreihe-rechts",
    title: "Zahlenreihe: 6 bis 0",
    description: "Die rechte Hand vervollständigt die Zahlenreihe.",
    kind: "drill",
    newKeys: ["6", "7", "8", "9", "0"],
  },
  {
    id: "satzzeichen",
    title: "Satzzeichen & Umlaute",
    description: "ß, Ä und der Bindestrich — die letzten Tasten, die noch fehlen.",
    kind: "drill",
    newKeys: ["ß", "ä", "-"],
  },
  {
    id: "alle-tasten-wiederholung",
    title: "Alle Tasten: Wiederholung",
    description: "Die ganze Tastatur gemischt — die letzte Übung, bevor es mit echten Wörtern weitergeht.",
    kind: "drill",
    newKeys: [],
  },
  {
    id: "woerter-kurz",
    title: "Wörter: kurz",
    description: "Jetzt sind alle Tasten bekannt — kurze, alltägliche Wörter am Stück, ohne auf die Tastatur zu schauen.",
    kind: "words",
    newKeys: [],
    difficulty: "easy",
  },
  {
    id: "woerter-lang",
    title: "Wörter: länger",
    description: "Längere Wörter mit mehr Buchstaben pro Anschlagfolge.",
    kind: "words",
    newKeys: [],
    difficulty: "hard",
  },
  {
    id: "saetze-einfach",
    title: "Sätze: einfach",
    description: "Kurze, vollständige Sätze mit Groß- und Kleinschreibung.",
    kind: "sentences",
    newKeys: [],
    difficulty: "easy",
  },
  {
    id: "saetze-anspruchsvoll",
    title: "Sätze: anspruchsvoll",
    description: "Längere Sätze mit mehr Satzzeichen und verschachtelten Nebensätzen.",
    kind: "sentences",
    newKeys: [],
    difficulty: "hard",
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
