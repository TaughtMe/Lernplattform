"use client";

import { useState } from "react";
import { LEARNING_WORDS_PATH } from "../../src/domain/practice-bridge";
import {
  summarizeWordBox,
  summarizeWordStore,
} from "../../src/domain/word-store-progress";
import { LEARNING_WORD_STAGES } from "../../src/domain/learning-word";
import { ButtonLink, Notice } from "../ui/primitives";
import {
  WordWorksheetScreen,
  type WordWorksheetRow,
} from "../views/wortspeicher/worksheet-screen";
import { useWordStoreData } from "./use-word-store-data";
import type {
  LearningWordRepository,
  WordRoundRepository,
} from "./use-word-store";

/** Lädt die Runden und zeigt den Laufzettel des Wortspeichers. */
export function WordStoreWorksheet({
  repositories,
}: {
  repositories?: {
    progress?: LearningWordRepository;
    rounds?: WordRoundRepository;
  };
}) {
  const state = useWordStoreData(repositories);
  const [createdAt] = useState(() => new Date());

  if (state.status === "loading") {
    return <p role="status">Laufzettel wird erstellt …</p>;
  }
  if (state.status === "unavailable") {
    return (
      <Notice tone="bad" role="status">
        Der Laufzettel ist auf diesem Gerät gerade nicht verfügbar.
      </Notice>
    );
  }

  // Titel der Wortbox aus der jüngsten Runde (auch für gelöschte Wortboxen).
  const newestFirst = [...state.rounds].sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt),
  );
  const boxes = new Map<string, string>();
  for (const round of newestFirst) {
    if (!boxes.has(round.boxId)) boxes.set(round.boxId, round.boxTitle);
  }
  const rows: WordWorksheetRow[] = [...boxes].map(([boxId, title]) => {
    const summary = summarizeWordBox(boxId, state.rounds);
    return {
      boxId,
      title,
      bestByStage: Object.fromEntries(
        LEARNING_WORD_STAGES.map((stage) => [
          stage,
          summary[stage].bestPercent,
        ]),
      ) as WordWorksheetRow["bestByStage"],
      rounds: LEARNING_WORD_STAGES.reduce(
        (sum, stage) => sum + summary[stage].rounds,
        0,
      ),
      lastPracticedAt: newestFirst.find((round) => round.boxId === boxId)
        ?.completedAt,
    };
  });
  const stats = summarizeWordStore(state.progress, state.rounds);
  return (
    <>
      <WordWorksheetScreen
        rows={rows}
        stats={{
          trainedWords: stats.trainedWords,
          secureWords: stats.secureWords,
          repetitions: stats.repetitions,
          rounds: stats.rounds,
        }}
        createdAt={createdAt}
        onPrint={() => window.print()}
      />
      <div className="ui-print-hidden" style={{ padding: "0 16px 24px" }}>
        <ButtonLink variant="ghost" href={LEARNING_WORDS_PATH}>
          Zurück zum Wortspeicher
        </ButtonLink>
      </div>
    </>
  );
}
