export type LessonKind = "drill" | "words" | "sentences" | "free-text";

export interface LessonDef {
  id: string;
  title: string;
  description: string;
  kind: LessonKind;
  newKeys: string[];
  introducesShift?: boolean;
  keyboard?: "main" | "numpad";
}

/**
 * Kleinschrittiger Lernweg: zuerst jeweils ein Fingerpaar, danach kurze
 * Erweiterungen und Wiederholungen. So startet niemand mit einer ganzen Hand.
 */
export const TYPING_LESSONS: LessonDef[] = [
  {
    id: "grundstellung-zeigefinger",
    title: "Grundstellung: Zeigefinger",
    description: "F und J über ihre kleinen Orientierungshöcker finden.",
    kind: "drill",
    newKeys: ["f", "j"],
  },
  {
    id: "grundstellung-mittelfinger",
    title: "Grundstellung: Mittelfinger",
    description: "D und K liegen direkt neben den Zeigefingertasten.",
    kind: "drill",
    newKeys: ["d", "k"],
  },
  {
    id: "grundstellung-ringfinger",
    title: "Grundstellung: Ringfinger",
    description: "S und L ergänzen die beiden Ringfinger.",
    kind: "drill",
    newKeys: ["s", "l"],
  },
  {
    id: "grundstellung-kleine-finger",
    title: "Grundstellung: kleine Finger",
    description: "A und Ö bilden den äußeren Rand der Grundstellung.",
    kind: "drill",
    newKeys: ["a", "ö"],
  },
  {
    id: "grundstellung-leertaste",
    title: "Grundstellung mit Leertaste",
    description: "Die acht Grundtasten verbinden und mit dem Daumen trennen.",
    kind: "drill",
    newKeys: [" "],
  },
  {
    id: "grundstellung-mitte",
    title: "Die Mitte: G und H",
    description: "Beide Zeigefinger strecken sich je eine Taste zur Mitte.",
    kind: "drill",
    newKeys: ["g", "h"],
  },
  {
    id: "grundreihe-wiederholung",
    title: "Grundreihe festigen",
    description: "Alle Tasten der Grundreihe ruhig miteinander verbinden.",
    kind: "drill",
    newKeys: [],
  },
  {
    id: "oben-links-aussen",
    title: "Oben links: Q W E",
    description: "Die drei äußeren Finger der linken Hand gehen nach oben.",
    kind: "drill",
    newKeys: ["q", "w", "e"],
  },
  {
    id: "oben-links-innen",
    title: "Oben links: R T",
    description: "Der linke Zeigefinger übernimmt R und T.",
    kind: "drill",
    newKeys: ["r", "t"],
  },
  {
    id: "oben-rechts-innen",
    title: "Oben rechts: Z U",
    description: "Der rechte Zeigefinger übernimmt Z und U.",
    kind: "drill",
    newKeys: ["z", "u"],
  },
  {
    id: "oben-rechts-aussen",
    title: "Oben rechts: I O P",
    description: "Mittel-, Ring- und kleiner Finger gehen nach oben.",
    kind: "drill",
    newKeys: ["i", "o", "p"],
  },
  {
    id: "ue-einfuehren",
    title: "Das Ü",
    description:
      "Der rechte kleine Finger reicht eine Taste weiter nach außen.",
    kind: "drill",
    newKeys: ["ü"],
  },
  {
    id: "obere-reihe-wiederholung",
    title: "Obere Reihe festigen",
    description: "Grundreihe und obere Reihe miteinander verbinden.",
    kind: "drill",
    newKeys: [],
  },
  {
    id: "unten-links-aussen",
    title: "Unten links: Y X",
    description: "Kleiner Finger und Ringfinger gehen nach unten.",
    kind: "drill",
    newKeys: ["y", "x"],
  },
  {
    id: "unten-links-innen",
    title: "Unten links: C V B",
    description: "Mittelfinger und Zeigefinger ergänzen C, V und B.",
    kind: "drill",
    newKeys: ["c", "v", "b"],
  },
  {
    id: "unten-rechts-innen",
    title: "Unten rechts: N M",
    description: "Der rechte Zeigefinger übernimmt N und M.",
    kind: "drill",
    newKeys: ["n", "m"],
  },
  {
    id: "unten-rechts-aussen",
    title: "Komma und Punkt",
    description: "Mittel- und Ringfinger ergänzen die häufigsten Satzzeichen.",
    kind: "drill",
    newKeys: [",", "."],
  },
  {
    id: "untere-reihe-wiederholung",
    title: "Untere Reihe festigen",
    description: "Alle drei Buchstabenreihen ruhig mischen.",
    kind: "drill",
    newKeys: [],
  },
  {
    id: "grossbuchstaben",
    title: "Großbuchstaben",
    description: "Die Umschalttaste drückt immer die gegenüberliegende Hand.",
    kind: "drill",
    newKeys: [],
    introducesShift: true,
  },
  {
    id: "zahlen-links",
    title: "Zahlen: 1 bis 5",
    description: "Die linke Hälfte der Zahlenreihe kennenlernen.",
    kind: "drill",
    newKeys: ["1", "2", "3", "4", "5"],
  },
  {
    id: "zahlen-rechts",
    title: "Zahlen: 6 bis 0",
    description: "Die rechte Hälfte der Zahlenreihe ergänzen.",
    kind: "drill",
    newKeys: ["6", "7", "8", "9", "0"],
  },
  {
    id: "zeichen-und-umlaute",
    title: "Zeichen und Umlaute",
    description: "ß, Ä und Bindestrich als letzte neue Tasten ergänzen.",
    kind: "drill",
    newKeys: ["ß", "ä", "-"],
  },
  {
    id: "alle-tasten-wiederholung",
    title: "Alle Tasten festigen",
    description: "Die ganze Tastatur vor den ersten Wörtern wiederholen.",
    kind: "drill",
    newKeys: [],
  },
  {
    id: "woerter",
    title: "Wörter",
    description: "Bekannte Fingerwege zu ganzen Wörtern verbinden.",
    kind: "words",
    newKeys: [],
  },
  {
    id: "saetze",
    title: "Sätze",
    description: "Kurze Sätze genau und flüssig abschreiben.",
    kind: "sentences",
    newKeys: [],
  },
  {
    id: "freier-text",
    title: "Zusammenhängender Text",
    description: "Einen kurzen Absatz mit sicherem Rhythmus abschreiben.",
    kind: "free-text",
    newKeys: [],
  },
];

/** Freiwilliger Zusatzpfad; er sperrt keine Lektion des Hauptkurses. */
export const NUMPAD_LESSONS: LessonDef[] = [
  {
    id: "numpad-grundstellung",
    title: "Numpad: Grundstellung",
    description: "4, 5 und 6 mit Zeige-, Mittel- und Ringfinger finden.",
    kind: "drill",
    newKeys: ["4", "5", "6"],
    keyboard: "numpad",
  },
  {
    id: "numpad-obere-reihe",
    title: "Numpad: 7, 8 und 9",
    description: "Die Grundstellung eine Reihe nach oben verschieben.",
    kind: "drill",
    newKeys: ["7", "8", "9"],
    keyboard: "numpad",
  },
  {
    id: "numpad-untere-reihe",
    title: "Numpad: 1, 2 und 3",
    description: "Die Grundstellung eine Reihe nach unten verschieben.",
    kind: "drill",
    newKeys: ["1", "2", "3"],
    keyboard: "numpad",
  },
  {
    id: "numpad-null-komma",
    title: "Numpad: 0 und Komma",
    description:
      "Null und Dezimalkomma mit dem Daumen und kleinen Finger ergänzen.",
    kind: "drill",
    newKeys: ["0", ","],
    keyboard: "numpad",
  },
  {
    id: "numpad-rechenzeichen",
    title: "Numpad: Rechenzeichen",
    description: "Plus, Minus, Mal und Geteilt als freiwillige Erweiterung.",
    kind: "drill",
    newKeys: ["+", "-", "*", "/"],
    keyboard: "numpad",
  },
];

function keysThrough(lessons: readonly LessonDef[], lessonId: string) {
  const keys = new Set<string>();
  for (const lesson of lessons) {
    lesson.newKeys.forEach((key) => keys.add(key));
    if (lesson.id === lessonId) break;
  }
  return [...keys];
}

export function availableKeysThrough(lessonId: string): string[] {
  const lessons = NUMPAD_LESSONS.some((lesson) => lesson.id === lessonId)
    ? NUMPAD_LESSONS
    : TYPING_LESSONS;
  return keysThrough(lessons, lessonId);
}

export function isNumpadLessonUnlocked(
  lessonId: string,
  completedLessonIds: ReadonlySet<string>,
): boolean {
  const index = NUMPAD_LESSONS.findIndex((lesson) => lesson.id === lessonId);
  if (index <= 0) return index === 0;
  return completedLessonIds.has(NUMPAD_LESSONS[index - 1]!.id);
}

export function isTypingLessonUnlocked(
  lessonId: string,
  completedLessonIds: ReadonlySet<string>,
): boolean {
  const index = TYPING_LESSONS.findIndex((lesson) => lesson.id === lessonId);
  if (index <= 0) return index === 0;
  return completedLessonIds.has(TYPING_LESSONS[index - 1]!.id);
}
