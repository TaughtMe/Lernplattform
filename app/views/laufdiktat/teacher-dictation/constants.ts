import type { IconName } from "../../../ui/icons";
import type { DictationMode, LineMode, SplitMode, TeacherStep } from "./types";

export const STEPS: ReadonlyArray<{
  id: TeacherStep;
  tab: string;
  title: string;
  next: string;
}> = [
  {
    id: "import",
    tab: "Diktat",
    title: "Wortliste vorbereiten",
    next: "Weiter zu Modus",
  },
  {
    id: "settings",
    tab: "Modus",
    title: "Modus und Optionen",
    next: "Raum öffnen",
  },
  { id: "lobby", tab: "Lobby", title: "Lobby", next: "Sitzung starten" },
  { id: "live", tab: "Live", title: "Live-Sitzung", next: "Sitzung beenden" },
];

export const SPLITS: ReadonlyArray<[SplitMode, string]> = [
  ["satz", "Sätzen"],
  ["zeile", "Zeilen"],
  ["wort", "Wörtern"],
];

/** Satzzeichen, an denen „Sätzen“ teilt; Name für Screenreader, Zeichen sichtbar. */
export const SPLIT_MARKS: ReadonlyArray<[string, string]> = [
  [".", "Punkt"],
  ["!", "Ausrufezeichen"],
  ["?", "Fragezeichen"],
  [",", "Komma"],
];

/** Längstes eigenes Trennzeichen. */
export const MAX_CUSTOM_SPLIT = 3;

export const LINE_MODES: ReadonlyArray<[LineMode, string]> = [
  ["each", "Jede Zeile"],
  ["blank", "Nur Leerzeilen"],
];

export const MODES: ReadonlyArray<{
  id: DictationMode;
  title: string;
  sub: string;
  icon: IconName;
  flow: readonly string[];
}> = [
  {
    id: "LAUFDIKTAT",
    title: "Laufdiktat",
    sub: "Mit zwei Fingern einprägen, dann tippen",
    icon: "run",
    flow: ["Abschnitt einprägen", "Zum Schreibfeld wechseln", "Eingabe prüfen"],
  },
  {
    id: "UEBUNG",
    title: "Freie Übung",
    sub: "Vorlesen und gestufte Buchstaben-Hilfe",
    icon: "ear",
    flow: ["Wort anhören", "Wort eintippen", "Bei Fehler Buchstaben-Hilfe"],
  },
  {
    id: "BATTLE",
    title: "Battle",
    sub: "Gegeneinander tippen, mit Störangriffen",
    icon: "swords",
    flow: [
      "Beide starten gleichzeitig",
      "Abtippen, Angriffe einsetzen",
      "Wer zuerst fertig ist, gewinnt",
    ],
  },
  {
    id: "STATION",
    title: "Stationen",
    sub: "Ohne eigenes Gerät, an nummerierten Stationen",
    icon: "pin",
    flow: [
      "Zur Station laufen",
      "Abschnitt lesen und merken",
      "Am Gerät eintippen",
    ],
  },
];
