/**
 * Beispieldaten aus der Design-Vorlage (Turn 5). Grundlage für den Katalog
 * unter /entwicklung/screens und den Designvergleich.
 */
import type { StudentDictationScreenProps } from "./student-dictation-screen";
import type { TeacherDictationScreenProps } from "./teacher-dictation-screen";

export const DEMO_SENTENCES = [
  "Der Hund bellt laut im Hof.",
  "Die Katze schläft auf dem Sofa.",
  "Am Abend gehen wir in den Wald.",
  "Dort finden wir einen Korb voller Pilze.",
  "Mein Vater trägt ihn nach Hause.",
  "Wir kochen daraus eine Suppe.",
] as const;

export const DEMO_STUDENT: StudentDictationScreenProps = {
  roomCode: "4K2P",
  animal: "Fuchs",
  className: "7b",
  theme: "light",
  phase: "station",
  sentenceIndex: 0,
  sentenceCount: DEMO_SENTENCES.length,
  sentence: DEMO_SENTENCES[0],
  hintsUsed: 0,
  typed: "",
  station: { count: 20, selected: null },
  battle: { charge: 70, shieldActive: false },
  result: { mistakes: 2, hints: 1, points: 12, savedWords: ["Hund", "Hof"] },
};

const DEMO_STUDENTS = [
  { name: "Schlauer Fuchs", animal: "Fuchs", progress: 5, mistakes: 0 },
  { name: "Ruhiges Capybara", animal: "Capybara", progress: 8, mistakes: 1 },
  { name: "Flinker Igel", animal: "Igel", progress: 3, mistakes: 0 },
  { name: "Müder Koala", animal: "Koala", progress: 8, mistakes: 2 },
  { name: "Lustiges Lama", animal: "Lama", progress: 6, mistakes: 0 },
  { name: "Wilder Orca", animal: "Orca", progress: 2, mistakes: 0 },
  { name: "Bunter Pfau", animal: "Pfau", progress: 8, mistakes: 0 },
  { name: "Leise Katze", animal: "Katze", progress: 4, mistakes: 1 },
].map((student) => ({ ...student, total: 8 }));

export const DEMO_TEACHER: TeacherDictationScreenProps = {
  className: "7b",
  roomCode: "4K2P",
  theme: "light",
  step: "import",
  content: {
    kind: "text",
    text: DEMO_SENTENCES.join(" "),
    split: "satz",
    sections: DEMO_SENTENCES,
  },
  mode: "LAUFDIKTAT",
  options: {
    tts: true,
    shuffle: true,
    strict: true,
    stars: true,
    ink: true,
    flicker: true,
  },
  stationCount: 6,
  optionsOpen: false,
  lobby: {
    expected: 24,
    joined: DEMO_STUDENTS.slice(0, 6).map(({ name, animal }) => ({
      name,
      animal,
    })),
  },
  live: {
    active: 6,
    finished: 2,
    overall: 69,
    students: DEMO_STUDENTS,
    stations: [1, 2, 3, 4, 5, 6].map((number) => ({
      number,
      state: number < 3 ? "done" : number < 6 ? "active" : "idle",
      label:
        number < 3 ? "Fertig" : number < 6 ? `Wort ${number + 1}/8` : "Inaktiv",
    })),
    mistakes: [
      { word: "Hund", count: 4 },
      { word: "Pilze", count: 3 },
      { word: "Korb", count: 2 },
    ],
  },
};
