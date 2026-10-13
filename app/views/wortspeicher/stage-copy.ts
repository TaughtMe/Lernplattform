import type { LearningWordStage } from "../../../src/domain/learning-word";

/** Titel und Kurzbeschreibung der sechs Merkstufen (Plan 2.3). */
export const STAGE_COPY: Record<
  LearningWordStage,
  { title: string; detail: string }
> = {
  1: { title: "Abschreiben", detail: "Das vollständige Wort bleibt sichtbar." },
  2: { title: "Wenige Lücken", detail: "Ein Teil der Buchstaben fehlt." },
  3: {
    title: "Viele Lücken",
    detail: "Du rekonstruierst fast das ganze Wort.",
  },
  4: {
    title: "Ansehen & verdecken",
    detail: "Danach hilft nur noch die Wortlänge.",
  },
  5: {
    title: "Wörter merken",
    detail: "Mehrere Wörter, Reihenfolge ist egal.",
  },
  6: {
    title: "Hören und schreiben",
    detail: "Du hörst das Wort und schreibst es auf.",
  },
};

export const ROUND_SIZES = [5, 10, 20, "all"] as const;
export type RoundSize = (typeof ROUND_SIZES)[number];
export const BLOCK_SIZES = [1, 2, 3, 5] as const;
