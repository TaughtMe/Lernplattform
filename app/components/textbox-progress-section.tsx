"use client";

import {
  phenomenonErrorStats,
  summarizeTextboxOverall,
} from "../../src/domain/textbox-progress";
import {
  buildCollectionLink,
  TEXTBOX_PATH,
  TEXTBOX_WORKSHEET_PATH,
} from "../../src/domain/practice-bridge";
import { TEXTBOX_TEXTS } from "../../src/domain/textbox-library";
import {
  PHENOMENON_TO_COLLECTION,
  TEXTBOX_DIFFICULTY_LABELS,
  TEXTBOX_PHENOMENON_LABELS,
  type TextboxPhenomenon,
} from "../../src/domain/textbox-text";
import { useAreaVisible } from "../release/release-context";
import { LineChart } from "../ui/charts";
import { ButtonLink, EmptyState, Notice, ProgressBar } from "../ui/primitives";
import { useCompletedTextboxSessions } from "./use-textbox-sessions";
import type { TextboxRepository } from "./use-textbox";

const dateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" });

/** Abschnitt „Textbox“ auf der Fortschrittsseite; nur sichtbar, wenn der Bereich freigegeben ist. */
export function TextboxProgressSection({
  repository,
}: {
  repository?: TextboxRepository;
}) {
  const visible = useAreaVisible("textbox");
  const state = useCompletedTextboxSessions(repository);
  if (!visible) return null;

  const body = (() => {
    if (state.status === "loading") {
      return (
        <p className="ui-small ui-muted" role="status">
          Textbox-Übungen werden geladen …
        </p>
      );
    }
    if (state.status === "unavailable") {
      return (
        <Notice tone="bad" role="status">
          Die Textbox-Übungen sind auf diesem Gerät gerade nicht verfügbar.
        </Notice>
      );
    }
    if (state.sessions.length === 0) {
      return (
        <EmptyState title="Noch keine Textbox-Übung abgeschlossen">
          Sobald du einen Text in allen vier Durchgängen geschafft hast, siehst
          du hier deine Entwicklung.
          <div style={{ marginTop: 12 }}>
            <ButtonLink href={TEXTBOX_PATH}>Zur Textbox</ButtonLink>
          </div>
        </EmptyState>
      );
    }
    const texts = [...TEXTBOX_TEXTS];
    const overall = summarizeTextboxOverall(state.sessions, texts);
    const titles = new Map(texts.map((text) => [text.id, text.title]));
    const chronological = state.sessions
      .filter((session) => session.finalPercent !== undefined)
      .sort((a, b) => (a.completedAt ?? "").localeCompare(b.completedAt ?? ""));
    const points = chronological.map((session, index) => ({
      label: String(index + 1),
      value: session.finalPercent ?? 0,
      detail: `${titles.get(session.textId) ?? session.textId}, ${dateFormat.format(new Date(session.completedAt ?? 0))}`,
    }));
    const phenomena = (
      Object.entries(overall.byPhenomenon) as [TextboxPhenomenon, number][]
    ).sort((a, b) => b[1] - a[1]);
    const errors = phenomenonErrorStats(state.sessions, texts)
      .filter((entry) => entry.errors > 0)
      .slice(0, 3);
    return (
      <div className="ui-stack">
        <div className="ui-stats">
          <div>
            <strong>{overall.completedTexts}</strong>
            Geübte Texte
          </div>
          <div>
            <strong>{overall.sessions}</strong>
            Abgeschlossene Übungen
          </div>
        </div>

        <LineChart
          points={points}
          title="Dein Ergebnis in Durchgang 4, alle Übungen"
          yLabel="Richtig geschrieben"
          xLabel="Übung"
        />

        <h3 className="ui-label">Nach Schwierigkeit</h3>
        <ul className="ui-stack" aria-label="Übungen nach Schwierigkeit">
          {(
            Object.keys(overall.byDifficulty) as Array<
              keyof typeof overall.byDifficulty
            >
          ).map((difficulty) => (
            <li key={difficulty}>
              <span className="ui-small">
                {TEXTBOX_DIFFICULTY_LABELS[difficulty]}:{" "}
                {overall.byDifficulty[difficulty]}
              </span>
              <ProgressBar
                value={overall.byDifficulty[difficulty]}
                max={overall.sessions}
                label={`${TEXTBOX_DIFFICULTY_LABELS[difficulty]}: ${overall.byDifficulty[difficulty]} von ${overall.sessions} Übungen`}
              />
            </li>
          ))}
        </ul>

        <h3 className="ui-label">Nach Schwerpunkt</h3>
        <ul className="ui-stack" aria-label="Übungen nach Schwerpunkt">
          {phenomena.map(([phenomenon, count]) => (
            <li key={phenomenon}>
              <span className="ui-small">
                {TEXTBOX_PHENOMENON_LABELS[phenomenon]}: {count}
              </span>
              <ProgressBar
                value={count}
                max={overall.sessions}
                label={`${TEXTBOX_PHENOMENON_LABELS[phenomenon]}: ${count} von ${overall.sessions} Übungen`}
              />
            </li>
          ))}
        </ul>

        {errors.length > 0 ? (
          <>
            <h3 className="ui-label">Hier lohnt sich mehr Übung</h3>
            <ul
              className="ui-stack"
              aria-label="Schwerpunkte mit den meisten Fehlern"
            >
              {errors.map((entry) => {
                const collection = PHENOMENON_TO_COLLECTION[entry.phenomenon];
                return (
                  <li key={entry.phenomenon} className="ui-between ui-wrap">
                    <span className="ui-small">
                      {TEXTBOX_PHENOMENON_LABELS[entry.phenomenon]}:{" "}
                      {entry.errors} von {entry.words} Wörtern
                    </span>
                    {collection ? (
                      <ButtonLink
                        size="sm"
                        variant="soft"
                        href={buildCollectionLink(collection)}
                        aria-label={`${TEXTBOX_PHENOMENON_LABELS[entry.phenomenon]} im Wortspeicher üben`}
                      >
                        Im Wortspeicher üben
                      </ButtonLink>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}

        <div>
          <ButtonLink variant="ghost" href={TEXTBOX_WORKSHEET_PATH}>
            Laufzettel ansehen und drucken
          </ButtonLink>
        </div>
      </div>
    );
  })();

  return (
    <section className="ui-stack" aria-labelledby="textbox-progress-title">
      <h2 id="textbox-progress-title" className="ui-h-section">
        Textbox
      </h2>
      {body}
    </section>
  );
}
