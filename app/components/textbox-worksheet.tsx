"use client";

import { useState } from "react";
import { TEXTBOX_TEXTS } from "../../src/domain/textbox-library";
import { TEXTBOX_PATH } from "../../src/domain/practice-bridge";
import { summarizeTextboxProgress } from "../../src/domain/textbox-progress";
import {
  TEXTBOX_DIFFICULTY_LABELS,
  TEXTBOX_PHENOMENON_LABELS,
} from "../../src/domain/textbox-text";
import { ButtonLink, Notice } from "../ui/primitives";
import {
  WorksheetScreen,
  type WorksheetRow,
} from "../views/textbox/worksheet-screen";
import { useCompletedTextboxSessions } from "./use-textbox-sessions";
import type { TextboxRepository } from "./use-textbox";

/** Lädt die abgeschlossenen Einheiten und zeigt den Laufzettel. */
export function TextboxWorksheet({
  repository,
}: {
  repository?: TextboxRepository;
}) {
  const state = useCompletedTextboxSessions(repository);
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
  const summaries = summarizeTextboxProgress(state.sessions);
  const rows: WorksheetRow[] = TEXTBOX_TEXTS.flatMap((text) => {
    const summary = summaries.get(text.id);
    if (!summary) return [];
    return [
      {
        textId: text.id,
        title: text.title,
        difficulty: TEXTBOX_DIFFICULTY_LABELS[text.difficulty],
        phenomena: text.phenomena
          .map((value) => TEXTBOX_PHENOMENON_LABELS[value])
          .join(", "),
        lastPracticedAt: summary.lastPracticedAt,
        sessions: summary.sessions,
        bestPercent: summary.bestPercent,
      },
    ];
  });
  return (
    <>
      <WorksheetScreen
        rows={rows}
        createdAt={createdAt}
        onPrint={() => window.print()}
      />
      <div className="ui-print-hidden" style={{ padding: "0 16px 24px" }}>
        <ButtonLink variant="ghost" href={TEXTBOX_PATH}>
          Zurück zur Textbox
        </ButtonLink>
      </div>
    </>
  );
}
