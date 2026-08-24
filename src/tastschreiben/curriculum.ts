export type LessonKind = "drill" | "words" | "sentences" | "free-text";

export interface LessonDef {
  id: string;
  title: string;
  description: string;
  kind: LessonKind;
  newKeys: string[];
  introducesShift?: boolean;
}

/** Ruhiger Lernweg: erst Genauigkeit und sichere Fingerwege, dann längere Texte. */
export const TYPING_LESSONS: LessonDef[] = [
  {
    id: "grundstellung-links",
    title: "Grundstellung: linke Hand",
    description: "A S D F sicher finden, ohne auf die Tastatur zu schauen.",
    kind: "drill",
    newKeys: ["a", "s", "d", "f"],
  },
  {
    id: "grundstellung-rechts",
    title: "Grundstellung: rechte Hand",
    description:
      "J K L Ö sicher finden; der Höcker auf J hilft bei der Orientierung.",
    kind: "drill",
    newKeys: ["j", "k", "l", "ö"],
  },
  {
    id: "grundreihe",
    title: "Die ganze Grundreihe",
    description: "Beide Hände arbeiten zusammen, G und H ergänzen die Mitte.",
    kind: "drill",
    newKeys: ["g", "h", " "],
  },
  {
    id: "obere-reihe",
    title: "Die obere Reihe",
    description: "Q W E R T und Z U I O P Ü aus der Grundstellung erreichen.",
    kind: "drill",
    newKeys: ["q", "w", "e", "r", "t", "z", "u", "i", "o", "p", "ü"],
  },
  {
    id: "untere-reihe",
    title: "Die untere Reihe",
    description: "Y X C V B und N M sowie Punkt und Komma ergänzen.",
    kind: "drill",
    newKeys: ["y", "x", "c", "v", "b", "n", "m", ",", "."],
  },
  {
    id: "grossbuchstaben",
    title: "Großbuchstaben",
    description: "Die Umschalttaste drückt immer die jeweils andere Hand.",
    kind: "drill",
    newKeys: [],
    introducesShift: true,
  },
  {
    id: "zahlen-und-zeichen",
    title: "Zahlen und Satzzeichen",
    description:
      "Die Zahlenreihe, ß, Ä und Bindestrich in ruhigem Tempo ergänzen.",
    kind: "drill",
    newKeys: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "ß", "ä", "-"],
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

export function availableKeysThrough(lessonId: string): string[] {
  const keys = new Set<string>();
  for (const lesson of TYPING_LESSONS) {
    lesson.newKeys.forEach((key) => keys.add(key));
    if (lesson.id === lessonId) break;
  }
  return [...keys];
}

export function isTypingLessonUnlocked(
  lessonId: string,
  completedLessonIds: ReadonlySet<string>,
): boolean {
  const index = TYPING_LESSONS.findIndex((lesson) => lesson.id === lessonId);
  if (index <= 0) return index === 0;
  return completedLessonIds.has(TYPING_LESSONS[index - 1]!.id);
}
