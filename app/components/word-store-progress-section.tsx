"use client";

import { LEARNING_WORD_STAGES } from "../../src/domain/learning-word";
import {
  LEARNING_WORDS_PATH,
  buildLearningWordsLink,
} from "../../src/domain/practice-bridge";
import {
  summarizeWordStore,
  type WordRoundRecord,
} from "../../src/domain/word-store-progress";
import { useAreaVisible } from "../release/release-context";
import { LineChart } from "../ui/charts";
import { ButtonLink, EmptyState, Notice, ProgressBar } from "../ui/primitives";
import { STAGE_COPY } from "../views/wortspeicher/stage-copy";
import { useWordStoreData } from "./use-word-store-data";
import type {
  LearningWordRepository,
  WordRoundRepository,
} from "./use-word-store";

export const WORD_STORE_WORKSHEET_PATH = `${LEARNING_WORDS_PATH}/laufzettel`;

const dateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" });

function roundPoints(rounds: readonly WordRoundRecord[]) {
  return [...rounds]
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt))
    .map((round, index) => ({
      label: String(index + 1),
      value: round.percent,
      detail: `${round.boxTitle}, Stufe ${round.stage}, ${dateFormat.format(new Date(round.completedAt))}`,
    }));
}

/** Abschnitt „Wortspeicher“ auf der Fortschrittsseite; nur sichtbar, wenn der Bereich freigegeben ist. */
export function WordStoreProgressSection({
  repositories,
}: {
  repositories?: {
    progress?: LearningWordRepository;
    rounds?: WordRoundRepository;
  };
}) {
  const visible = useAreaVisible("wortspeicher");
  const state = useWordStoreData(repositories);
  if (!visible) return null;

  const body = (() => {
    if (state.status === "loading") {
      return (
        <p className="ui-small ui-muted" role="status">
          Wortspeicher wird geladen …
        </p>
      );
    }
    if (state.status === "unavailable") {
      return (
        <Notice tone="bad" role="status">
          Der Wortspeicher ist auf diesem Gerät gerade nicht verfügbar.
        </Notice>
      );
    }
    if (state.progress.length === 0 && state.rounds.length === 0) {
      return (
        <EmptyState title="Noch keine Wörter geübt">
          Sobald du eine Runde im Wortspeicher gespielt hast, siehst du hier
          deine Entwicklung.
          <div style={{ marginTop: 12 }}>
            <ButtonLink href={LEARNING_WORDS_PATH}>Zum Wortspeicher</ButtonLink>
          </div>
        </EmptyState>
      );
    }
    const summary = summarizeWordStore(state.progress, state.rounds);
    const maxInStage = Math.max(1, ...Object.values(summary.byStage));
    const errorLink = buildLearningWordsLink(
      summary.mostErrors.map((entry) => entry.word),
      "fehler",
    );
    return (
      <div className="ui-stack">
        <div className="ui-stats">
          <div>
            <strong>{summary.trainedWords}</strong>
            Trainierte Wörter
          </div>
          <div>
            <strong>{summary.secureWords}</strong>
            Sichere Wörter
          </div>
          <div>
            <strong>{summary.repetitions}</strong>
            Wiederholungen
          </div>
          <div>
            <strong>{summary.rounds}</strong>
            Abgeschlossene Runden
          </div>
        </div>

        <h3 className="ui-label">Wörter nach Merkstufe</h3>
        <ul className="ui-stack" aria-label="Wörter nach Merkstufe">
          {LEARNING_WORD_STAGES.map((stage) => (
            <li key={stage}>
              <span className="ui-small">
                Stufe {stage} · {STAGE_COPY[stage].title}:{" "}
                {summary.byStage[stage]}
              </span>
              <ProgressBar
                value={summary.byStage[stage]}
                max={maxInStage}
                label={`Merkstufe ${stage}: ${summary.byStage[stage]} Wörter`}
              />
            </li>
          ))}
        </ul>

        <LineChart
          points={roundPoints(state.rounds)}
          title="Dein Ergebnis in allen Runden"
          yLabel="Auf Anhieb richtig"
          xLabel="Runde"
        />

        {summary.mostErrors.length > 0 ? (
          <>
            <h3 className="ui-label">Wörter mit den meisten Fehlern</h3>
            <ul
              className="ui-stack"
              aria-label="Wörter mit den meisten Fehlern"
            >
              {summary.mostErrors.map((entry) => (
                <li key={entry.word} className="ui-small">
                  {entry.word}: {entry.incorrectAttempts}{" "}
                  {entry.incorrectAttempts === 1 ? "Fehler" : "Fehler"}
                </li>
              ))}
            </ul>
            {errorLink ? (
              <div>
                <ButtonLink variant="soft" href={errorLink}>
                  Diese Wörter üben
                </ButtonLink>
              </div>
            ) : null}
          </>
        ) : null}

        <div>
          <ButtonLink variant="ghost" href={WORD_STORE_WORKSHEET_PATH}>
            Laufzettel ansehen und drucken
          </ButtonLink>
        </div>
      </div>
    );
  })();

  return (
    <section className="ui-stack" aria-labelledby="wortspeicher-progress-title">
      <h2 id="wortspeicher-progress-title" className="ui-h-section">
        Wortspeicher
      </h2>
      {body}
    </section>
  );
}
