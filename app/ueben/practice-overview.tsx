"use client";

import type { ReleaseAreaId } from "../../src/domain/release";
import { useRelease } from "../release/release-context";
import { useThemeToggle } from "../ui/theme";
import {
  PracticeScreen,
  type PracticeArea,
} from "../views/lernen/practice-screen";

/** Übungsbereiche mit Symbol und Farbe der Tastenwelt-Stationen. */
const AREAS: ReadonlyArray<PracticeArea & { area: ReleaseAreaId }> = [
  {
    area: "lernbox",
    href: "/lernbox",
    title: "LernBox",
    text: "Vokabeln in fünf Boxen – was sitzt, wandert weiter.",
    icon: "cards",
    tone: "#ffb3ad",
  },
  {
    area: "wortspeicher",
    href: "/frei/german/lernwoerter",
    title: "Wortspeicher",
    text: "Trainingswörter richtig schreiben, Sammlung für Sammlung.",
    icon: "pencil",
    tone: "#ffc58f",
  },
  {
    area: "tastenwelt",
    href: "/frei/typing",
    title: "Tastenwelt",
    text: "Zehn Stationen von der Grundstellung bis zum Abschreiben.",
    icon: "keyboard",
    tone: "#a8e2a0",
  },
  {
    area: "mathe",
    href: "/frei/mathematics",
    title: "Kopfrechnen",
    text: "Rechenaufgaben im eigenen Tempo, mit Lücken und Reihen.",
    icon: "math",
    tone: "#8fcdf5",
  },
  {
    area: "laufdiktat-frei",
    href: "/frei/german/laufdiktat",
    title: "Laufdiktat allein",
    text: "Sätze einprägen und aus dem Gedächtnis schreiben.",
    icon: "run",
    tone: "#cdb6f2",
  },
];

export function PracticeOverview() {
  const visibility = useRelease();
  const { theme, toggleTheme } = useThemeToggle();
  return (
    <PracticeScreen
      areas={AREAS.filter((area) => visibility[area.area])}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  );
}
