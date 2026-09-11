export type LessonKind = "drill" | "words" | "sentences" | "free-text";

export interface LessonDef {
  id: string;
  title: string;
  description: string;
  kind: LessonKind;
  /** Tasten, die in diesem Schritt erstmals eingeführt werden. */
  newKeys: string[];
  /** Exakter Tastenumfang dieser Übung; verhindert ungewollte ältere Finger. */
  practiceKeys?: string[];
  wordPool?: string[];
  introducesShift?: boolean;
  keyboard?: "main" | "numpad";
}

const HOME_CORE = ["a", "s", "d", "f", "j", "k", "l", "ö"];
const HOME_ROW = [...HOME_CORE, "g", "h", " "];
const HOME_LEFT = ["a", "s", "d", "f", "g", " "];
const HOME_RIGHT = ["h", "j", "k", "l", "ö", " "];
const UPPER_INDEX = ["r", "t", "z", "u"];
const UPPER_MIDDLE = ["e", "i"];
const UPPER_RING = ["w", "o"];
const UPPER_PINKY = ["q", "p", "ü"];
const UPPER_ROW = [
  ...UPPER_PINKY,
  ...UPPER_RING,
  ...UPPER_MIDDLE,
  ...UPPER_INDEX,
];
const LOWER_INDEX = ["v", "b", "n", "m"];
const LOWER_MIDDLE = ["c", ","];
const LOWER_RING = ["x", "."];
const LOWER_PINKY = ["y", "-"];
const LOWER_ROW = [
  ...LOWER_PINKY,
  ...LOWER_RING,
  ...LOWER_MIDDLE,
  ...LOWER_INDEX,
];

/**
 * Jeder neue Finger wird zunächst isoliert geübt. Erst in einer eigenen
 * Folgelelektion kommt er zu den vorherigen Fingern hinzu. Das Muster wird für
 * jede Tastenreihe wiederholt und durch Hand- sowie frühe Wortübungen ergänzt.
 */
export const TYPING_LESSONS: LessonDef[] = [
  {
    id: "grundstellung-zeigefinger",
    title: "Grundstellung: nur Zeigefinger",
    description: "F und J über ihre kleinen Orientierungshöcker finden.",
    kind: "drill",
    newKeys: ["f", "j"],
    practiceKeys: ["f", "j"],
  },
  {
    id: "grundstellung-mittelfinger",
    title: "Grundstellung: nur Mittelfinger",
    description: "D und K isoliert üben; die Zeigefinger machen Pause.",
    kind: "drill",
    newKeys: ["d", "k"],
    practiceKeys: ["d", "k"],
  },
  {
    id: "grundstellung-zeige-mittel",
    title: "Zeige- und Mittelfinger",
    description: "F, J, D und K erstmals miteinander verbinden.",
    kind: "drill",
    newKeys: [],
    practiceKeys: ["f", "j", "d", "k"],
  },
  {
    id: "grundstellung-ringfinger",
    title: "Grundstellung: nur Ringfinger",
    description: "S und L isoliert üben; die anderen Finger bleiben ruhig.",
    kind: "drill",
    newKeys: ["s", "l"],
    practiceKeys: ["s", "l"],
  },
  {
    id: "grundstellung-ring-mittel",
    title: "Ring- und Mittelfinger",
    description: "S und L zunächst nur mit D und K kombinieren.",
    kind: "drill",
    newKeys: [],
    practiceKeys: ["s", "l", "d", "k"],
  },
  {
    id: "grundstellung-drei-finger",
    title: "Drei Finger je Hand",
    description: "Ring-, Mittel- und Zeigefinger arbeiten jetzt zusammen.",
    kind: "drill",
    newKeys: [],
    practiceKeys: ["s", "l", "d", "k", "f", "j"],
  },
  {
    id: "grundstellung-kleine-finger",
    title: "Grundstellung: nur kleine Finger",
    description: "A und Ö isoliert am äußeren Rand der Grundstellung finden.",
    kind: "drill",
    newKeys: ["a", "ö"],
    practiceKeys: ["a", "ö"],
  },
  {
    id: "grundstellung-klein-ring",
    title: "Kleine Finger und Ringfinger",
    description: "A und Ö zunächst nur mit S und L verbinden.",
    kind: "drill",
    newKeys: [],
    practiceKeys: ["a", "ö", "s", "l"],
  },
  {
    id: "grundstellung-klein-ring-mittel",
    title: "Drei äußere Finger",
    description: "Kleine Finger, Ring- und Mittelfinger kombinieren.",
    kind: "drill",
    newKeys: [],
    practiceKeys: ["a", "ö", "s", "l", "d", "k"],
  },
  {
    id: "grundstellung-ohne-mitte",
    title: "Die ganze Grundstellung",
    description: "Alle vier Grundfinger jeder Hand zusammenführen.",
    kind: "drill",
    newKeys: [],
    practiceKeys: HOME_CORE,
  },
  {
    id: "grundstellung-leertaste",
    title: "Grundstellung mit Leertaste",
    description: "Die Grundstellung mit ruhigen Daumenanschlägen verbinden.",
    kind: "drill",
    newKeys: [" "],
    practiceKeys: [...HOME_CORE, " "],
  },
  {
    id: "grundstellung-mitte",
    title: "Nur G und H",
    description:
      "Beide Zeigefinger strecken sich isoliert eine Taste zur Mitte.",
    kind: "drill",
    newKeys: ["g", "h"],
    practiceKeys: ["g", "h"],
  },
  {
    id: "grundreihe-wiederholung",
    title: "Die vollständige Grundreihe",
    description: "G und H mit der sicheren Grundstellung verbinden.",
    kind: "drill",
    newKeys: [],
    practiceKeys: HOME_ROW,
  },
  {
    id: "erste-woerter-grundreihe",
    title: "Erste Wörter aus der Grundreihe",
    description:
      "Schon jetzt kurze echte Wörter statt reiner Buchstabengruppen.",
    kind: "words",
    newKeys: [],
    practiceKeys: HOME_ROW,
    wordPool: [
      "als",
      "das",
      "glas",
      "fall",
      "hals",
      "jagd",
      "lag",
      "sag",
      "aha",
    ],
  },

  {
    id: "oben-zeigefinger",
    title: "Obere Reihe: nur Zeigefinger",
    description: "R, T, Z und U isoliert mit den beiden Zeigefingern üben.",
    kind: "drill",
    newKeys: UPPER_INDEX,
    practiceKeys: UPPER_INDEX,
  },
  {
    id: "oben-mittelfinger",
    title: "Obere Reihe: nur Mittelfinger",
    description: "E und I isoliert; die Zeigefinger machen wieder Pause.",
    kind: "drill",
    newKeys: UPPER_MIDDLE,
    practiceKeys: UPPER_MIDDLE,
  },
  {
    id: "oben-zeige-mittel",
    title: "Oben: Zeige- und Mittelfinger",
    description: "E und I mit R, T, Z und U kombinieren.",
    kind: "drill",
    newKeys: [],
    practiceKeys: [...UPPER_INDEX, ...UPPER_MIDDLE],
  },
  {
    id: "oben-ringfinger",
    title: "Obere Reihe: nur Ringfinger",
    description: "W und O isoliert mit den Ringfingern finden.",
    kind: "drill",
    newKeys: UPPER_RING,
    practiceKeys: UPPER_RING,
  },
  {
    id: "oben-ring-mittel",
    title: "Oben: Ring- und Mittelfinger",
    description: "W und O zunächst nur mit E und I verbinden.",
    kind: "drill",
    newKeys: [],
    practiceKeys: [...UPPER_RING, ...UPPER_MIDDLE],
  },
  {
    id: "oben-drei-finger",
    title: "Oben: drei Finger je Hand",
    description: "Ring-, Mittel- und Zeigefinger der oberen Reihe kombinieren.",
    kind: "drill",
    newKeys: [],
    practiceKeys: [...UPPER_RING, ...UPPER_MIDDLE, ...UPPER_INDEX],
  },
  {
    id: "oben-kleine-finger",
    title: "Obere Reihe: nur kleine Finger",
    description: "Q, P und Ü isoliert am äußeren Rand kennenlernen.",
    kind: "drill",
    newKeys: UPPER_PINKY,
    practiceKeys: UPPER_PINKY,
  },
  {
    id: "oben-klein-ring",
    title: "Oben: kleine Finger und Ringfinger",
    description: "Q, P und Ü zunächst nur mit W und O verbinden.",
    kind: "drill",
    newKeys: [],
    practiceKeys: [...UPPER_PINKY, ...UPPER_RING],
  },
  {
    id: "oben-klein-ring-mittel",
    title: "Oben: drei äußere Finger",
    description: "Kleine Finger, Ring- und Mittelfinger kombinieren.",
    kind: "drill",
    newKeys: [],
    practiceKeys: [...UPPER_PINKY, ...UPPER_RING, ...UPPER_MIDDLE],
  },
  {
    id: "obere-reihe-isoliert",
    title: "Die ganze obere Reihe",
    description: "Alle Fingerwege der oberen Reihe zusammenführen.",
    kind: "drill",
    newKeys: [],
    practiceKeys: UPPER_ROW,
  },
  {
    id: "oben-linke-hand",
    title: "Obere Reihe: nur linke Hand",
    description: "Q W E R T mit der linken Grundstellung verbinden.",
    kind: "drill",
    newKeys: [],
    practiceKeys: [...HOME_LEFT, "q", "w", "e", "r", "t"],
  },
  {
    id: "oben-rechte-hand",
    title: "Obere Reihe: nur rechte Hand",
    description: "Z U I O P Ü mit der rechten Grundstellung verbinden.",
    kind: "drill",
    newKeys: [],
    practiceKeys: [...HOME_RIGHT, "z", "u", "i", "o", "p", "ü"],
  },
  {
    id: "obere-reihe-wiederholung",
    title: "Grundreihe und obere Reihe",
    description: "Beide Hände und beide bisher bekannten Reihen mischen.",
    kind: "drill",
    newKeys: [],
    practiceKeys: [...HOME_ROW, ...UPPER_ROW],
  },
  {
    id: "erste-woerter-obere-reihe",
    title: "Wörter mit der oberen Reihe",
    description: "Die neuen Wege direkt in kurzen Wörtern anwenden.",
    kind: "words",
    newKeys: [],
    practiceKeys: [...HOME_ROW, ...UPPER_ROW],
    wordPool: [
      "rad",
      "tag",
      "frage",
      "fahrt",
      "tee",
      "saft",
      "uhr",
      "tür",
      "wort",
      "radio",
      "haus",
      "ruhe",
    ],
  },

  {
    id: "unten-zeigefinger",
    title: "Untere Reihe: nur Zeigefinger",
    description: "V, B, N und M isoliert mit den Zeigefingern üben.",
    kind: "drill",
    newKeys: LOWER_INDEX,
    practiceKeys: LOWER_INDEX,
  },
  {
    id: "unten-mittelfinger",
    title: "Untere Reihe: nur Mittelfinger",
    description: "C und Komma isoliert; die Zeigefinger machen Pause.",
    kind: "drill",
    newKeys: LOWER_MIDDLE,
    practiceKeys: LOWER_MIDDLE,
  },
  {
    id: "unten-zeige-mittel",
    title: "Unten: Zeige- und Mittelfinger",
    description: "C und Komma mit V, B, N und M kombinieren.",
    kind: "drill",
    newKeys: [],
    practiceKeys: [...LOWER_INDEX, ...LOWER_MIDDLE],
  },
  {
    id: "unten-ringfinger",
    title: "Untere Reihe: nur Ringfinger",
    description: "X und Punkt isoliert mit den Ringfingern finden.",
    kind: "drill",
    newKeys: LOWER_RING,
    practiceKeys: LOWER_RING,
  },
  {
    id: "unten-ring-mittel",
    title: "Unten: Ring- und Mittelfinger",
    description: "X und Punkt zunächst nur mit C und Komma verbinden.",
    kind: "drill",
    newKeys: [],
    practiceKeys: [...LOWER_RING, ...LOWER_MIDDLE],
  },
  {
    id: "unten-drei-finger",
    title: "Unten: drei Finger je Hand",
    description:
      "Ring-, Mittel- und Zeigefinger der unteren Reihe kombinieren.",
    kind: "drill",
    newKeys: [],
    practiceKeys: [...LOWER_RING, ...LOWER_MIDDLE, ...LOWER_INDEX],
  },
  {
    id: "unten-kleine-finger",
    title: "Untere Reihe: nur kleine Finger",
    description: "Y und Bindestrich isoliert am äußeren Rand kennenlernen.",
    kind: "drill",
    newKeys: LOWER_PINKY,
    practiceKeys: LOWER_PINKY,
  },
  {
    id: "unten-klein-ring",
    title: "Unten: kleine Finger und Ringfinger",
    description: "Y und Bindestrich zunächst nur mit X und Punkt verbinden.",
    kind: "drill",
    newKeys: [],
    practiceKeys: [...LOWER_PINKY, ...LOWER_RING],
  },
  {
    id: "unten-klein-ring-mittel",
    title: "Unten: drei äußere Finger",
    description: "Kleine Finger, Ring- und Mittelfinger kombinieren.",
    kind: "drill",
    newKeys: [],
    practiceKeys: [...LOWER_PINKY, ...LOWER_RING, ...LOWER_MIDDLE],
  },
  {
    id: "untere-reihe-isoliert",
    title: "Die ganze untere Reihe",
    description: "Alle Fingerwege der unteren Reihe zusammenführen.",
    kind: "drill",
    newKeys: [],
    practiceKeys: LOWER_ROW,
  },
  {
    id: "unten-linke-hand",
    title: "Untere Reihe: nur linke Hand",
    description: "Y X C V B mit der linken Grundstellung verbinden.",
    kind: "drill",
    newKeys: [],
    practiceKeys: [...HOME_LEFT, "y", "x", "c", "v", "b"],
  },
  {
    id: "unten-rechte-hand",
    title: "Untere Reihe: nur rechte Hand",
    description:
      "N M, Punkt und Bindestrich mit der rechten Grundstellung verbinden.",
    kind: "drill",
    newKeys: [],
    practiceKeys: [...HOME_RIGHT, "n", "m", ",", ".", "-"],
  },
  {
    id: "alle-reihen-wiederholung",
    title: "Alle drei Buchstabenreihen",
    description: "Die vollständigen Buchstabenreihen miteinander verbinden.",
    kind: "drill",
    newKeys: [],
    practiceKeys: [...HOME_ROW, ...UPPER_ROW, ...LOWER_ROW],
  },
  {
    id: "erste-woerter-alle-reihen",
    title: "Wörter aus allen Reihen",
    description: "Jetzt steht das gesamte Alphabet für echte Wörter bereit.",
    kind: "words",
    newKeys: [],
    practiceKeys: [...HOME_ROW, ...UPPER_ROW, ...LOWER_ROW],
  },

  {
    id: "grossbuchstaben",
    title: "Großbuchstaben",
    description: "Die Umschalttaste drückt immer die gegenüberliegende Hand.",
    kind: "drill",
    newKeys: [],
    practiceKeys: [...HOME_ROW, ...UPPER_ROW, ...LOWER_ROW],
    introducesShift: true,
  },
  {
    id: "zahlen-links",
    title: "Zahlen: linke Hand",
    description: "1 bis 5 zunächst nur mit der linken Hand kennenlernen.",
    kind: "drill",
    newKeys: ["1", "2", "3", "4", "5"],
    practiceKeys: ["1", "2", "3", "4", "5"],
  },
  {
    id: "zahlen-rechts",
    title: "Zahlen: rechte Hand",
    description: "6 bis 0 anschließend nur mit der rechten Hand ergänzen.",
    kind: "drill",
    newKeys: ["6", "7", "8", "9", "0"],
    practiceKeys: ["6", "7", "8", "9", "0"],
  },
  {
    id: "zeichen-und-umlaute",
    title: "Zeichen und Umlaute",
    description: "ß, Ä und Bindestrich als letzte neue Tasten ergänzen.",
    kind: "drill",
    newKeys: ["ß", "ä", "-"],
    practiceKeys: ["ß", "ä", "-"],
  },
  {
    id: "alle-tasten-wiederholung",
    title: "Alle Tasten festigen",
    description: "Buchstaben, Zahlen und Zeichen gemeinsam wiederholen.",
    kind: "drill",
    newKeys: [],
  },
  {
    id: "woerter",
    title: "Wörter",
    description: "Bekannte Fingerwege zu längeren Wörtern verbinden.",
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
    practiceKeys: ["4", "5", "6"],
    keyboard: "numpad",
  },
  {
    id: "numpad-obere-reihe",
    title: "Numpad: 7, 8 und 9",
    description: "Die Grundstellung eine Reihe nach oben verschieben.",
    kind: "drill",
    newKeys: ["7", "8", "9"],
    practiceKeys: ["7", "8", "9"],
    keyboard: "numpad",
  },
  {
    id: "numpad-oben-mitte",
    title: "Numpad: oben und Mitte",
    description: "7 bis 9 mit der Grundstellung 4 bis 6 kombinieren.",
    kind: "drill",
    newKeys: [],
    practiceKeys: ["4", "5", "6", "7", "8", "9"],
    keyboard: "numpad",
  },
  {
    id: "numpad-untere-reihe",
    title: "Numpad: 1, 2 und 3",
    description: "Die Grundstellung eine Reihe nach unten verschieben.",
    kind: "drill",
    newKeys: ["1", "2", "3"],
    practiceKeys: ["1", "2", "3"],
    keyboard: "numpad",
  },
  {
    id: "numpad-ziffern",
    title: "Numpad: alle Ziffern",
    description: "Alle drei Zahlenreihen des Ziffernblocks verbinden.",
    kind: "drill",
    newKeys: [],
    practiceKeys: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
    keyboard: "numpad",
  },
  {
    id: "numpad-null-komma",
    title: "Numpad: 0 und Komma",
    description: "Null und Dezimalkomma ergänzen.",
    kind: "drill",
    newKeys: ["0", ","],
    practiceKeys: ["0", ","],
    keyboard: "numpad",
  },
  {
    id: "numpad-rechenzeichen",
    title: "Numpad: Rechenzeichen",
    description: "Plus, Minus, Mal und Geteilt als freiwillige Erweiterung.",
    kind: "drill",
    newKeys: ["+", "-", "*", "/"],
    practiceKeys: ["+", "-", "*", "/"],
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

export function isTypingLessonUnlocked(
  lessonId: string,
  completedLessonIds: ReadonlySet<string>,
): boolean {
  const index = TYPING_LESSONS.findIndex((lesson) => lesson.id === lessonId);
  if (index <= 0) return index === 0;
  return completedLessonIds.has(TYPING_LESSONS[index - 1]!.id);
}

export function isNumpadLessonUnlocked(
  lessonId: string,
  completedLessonIds: ReadonlySet<string>,
): boolean {
  const index = NUMPAD_LESSONS.findIndex((lesson) => lesson.id === lessonId);
  if (index <= 0) return index === 0;
  return completedLessonIds.has(NUMPAD_LESSONS[index - 1]!.id);
}
