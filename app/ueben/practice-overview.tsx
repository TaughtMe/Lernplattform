"use client";

import type { ReleaseAreaId } from "../../src/domain/release";
import { useRelease } from "../release/release-context";
import { useThemeToggle } from "../ui/theme";
import {
  PracticeScreen,
  type PracticeArea,
  type PracticeShortcut,
} from "../views/lernen/practice-screen";

/** Übungsbereiche mit Symbol und Farbe der Tastenwelt-Stationen. */
const AREAS: ReadonlyArray<PracticeArea & { area: ReleaseAreaId }> = [
  {
    area: "lernbox",
    href: "/lernbox",
    title: "LernBox",
    text: "Vokabeln in fünf Boxen – was sitzt, wandert weiter.",
    icon: "lernbox",
    tone: "#ffb3ad",
  },
  {
    area: "wortspeicher",
    href: "/frei/german/lernwoerter",
    title: "Wortspeicher",
    text: "Wörter in Wortboxen sammeln und in sechs Stufen sicher schreiben.",
    icon: "wortspeicher",
    tone: "#ffc58f",
  },
  {
    area: "tastenwelt",
    href: "/frei/typing",
    title: "Tastenwelt",
    text: "Zehn Stationen von der Grundstellung bis zum Abschreiben.",
    icon: "tastenwelt",
    tone: "#a8e2a0",
  },
  {
    area: "mathe",
    href: "/frei/mathematics",
    title: "Kopfrechnen",
    text: "Rechenaufgaben im eigenen Tempo, mit Lücken und Reihen.",
    icon: "kopfrechnen",
    tone: "#8fcdf5",
  },
  {
    area: "laufdiktat-frei",
    href: "/frei/german/laufdiktat",
    title: "Laufdiktat allein",
    text: "Sätze einprägen und aus dem Gedächtnis schreiben.",
    icon: "laufdiktat",
    tone: "#cdb6f2",
  },
  {
    area: "textbox",
    href: "/frei/german/textbox",
    title: "Textbox",
    text: "Texte einprägen und Schritt für Schritt aus dem Gedächtnis schreiben.",
    icon: "textbox",
    tone: "#f2d58a",
  },
];

/**
 * Wege zu Startpunkt, Training und „Mein Stand“ (Freigabe `diagnostik`,
 * Entscheidung 59; Vision, Nachtrag 1, Nr. 3). Der Name „Mein Stand“ ersetzt
 * „Kompetenzprofil“ in der Oberfläche (E30-7).
 */
export const DIAGNOSTIC_SHORTCUTS: readonly PracticeShortcut[] = [
  {
    href: "/lernen/startpunkt",
    title: "Startpunkt",
    text: "Ein paar kurze Aufgaben zeigen, wo du anfangen kannst.",
    icon: "pin",
  },
  {
    href: "/lernen/training",
    title: "Training",
    text: "10 oder 20 Minuten üben, was heute dran ist.",
    icon: "run",
  },
  {
    href: "/lernen/profil",
    title: "Mein Stand",
    text: "Sieh dir an, was du schon gut kannst.",
    icon: "chart",
  },
];

export function PracticeOverview() {
  const visibility = useRelease();
  const { theme, toggleTheme } = useThemeToggle();
  return (
    <PracticeScreen
      areas={AREAS.filter((area) => visibility[area.area])}
      shortcuts={visibility.diagnostik ? DIAGNOSTIC_SHORTCUTS : []}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  );
}
