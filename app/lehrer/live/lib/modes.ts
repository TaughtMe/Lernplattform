import type {
  TeacherContentMode,
  TeacherGameMode,
} from "../../../../src/integrations/laufdiktat/teacher-session";

export const LABELS: Record<TeacherContentMode, string> = {
  text: "Text",
  vocabulary: "Vokabeln",
  math: "Kopfrechnen",
};
export const CONTENT_MODES: TeacherContentMode[] = [
  "text",
  "math",
  "vocabulary",
];
export const ALL_MODES: Array<{
  id: TeacherGameMode;
  title: string;
  text: string;
  short: string;
  steps: readonly [string, string, string];
}> = [
  {
    id: "LAUFDIKTAT",
    title: "Laufdiktat",
    text: "Abschnitt ansehen, verdecken, aus dem Gedächtnis schreiben und prüfen.",
    short: "2-Finger-Touch zum Einprägen, dann tippen.",
    steps: [
      "Abschnitt einprägen",
      "Zum Schreibfeld wechseln",
      "Eingabe prüfen & bewerten",
    ],
  },
  {
    id: "UEBUNG",
    title: "Freies Üben",
    text: "Einprägen, schreiben und mit optionalen Hilfen verbessern.",
    short: "Vorlesen und gestufte Buchstaben-Hilfe.",
    steps: ["Wort anhören", "Wort eintippen", "Buchstaben-Hilfe nutzen"],
  },
  {
    id: "BATTLE",
    title: "Battle",
    text: "Gleichzeitig üben und durch Lernfortschritt Angriffe aufladen.",
    short: "Gegeneinander, mit Störangriffen.",
    steps: [
      "Gemeinsam starten",
      "Aufgaben lösen & Angriffe laden",
      "Runde vollständig abschließen",
    ],
  },
  {
    id: "STATION",
    title: "Stationen",
    text: "Geteilte Stationsgeräte: Nummer wählen, merken und auf Papier schreiben.",
    short: "Ohne eigenes Gerät, an nummerierten Stationen.",
    steps: [
      "Station auswählen",
      "Abschnitt lesen & merken",
      "Auf Papier schreiben",
    ],
  },
];
export const MODES = ALL_MODES;

export const DEFAULT_SOURCES: Record<TeacherContentMode, string> = {
  text: "",
  vocabulary: "",
  math: "",
};
