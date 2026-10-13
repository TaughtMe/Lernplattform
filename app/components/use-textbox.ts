"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TEXTBOX_TEXTS } from "../../src/domain/textbox-library";
import {
  summarizeTextboxProgress,
  type TextboxTextSummary,
} from "../../src/domain/textbox-progress";
import type { TextboxSession } from "../../src/domain/textbox-session";
import { createTextboxRepository } from "../../src/storage/personal-learning-events";

export type TextboxRepository = ReturnType<typeof createTextboxRepository>;
export type TextboxStatus = "loading" | "ready" | "unavailable";

/**
 * Lädt Bibliothek und gespeicherte Einheiten. Bestwert, letzter Wert und
 * Anzahl werden jedes Mal aus den abgeschlossenen Einheiten abgeleitet.
 */
export function useTextbox(injected?: TextboxRepository) {
  const repository = useMemo(
    () => injected ?? createTextboxRepository(),
    [injected],
  );
  const [status, setStatus] = useState<TextboxStatus>("loading");
  const [summaries, setSummaries] = useState<Map<string, TextboxTextSummary>>(
    () => new Map(),
  );
  const [open, setOpen] = useState<Map<string, TextboxSession>>(
    () => new Map(),
  );

  const refresh = useCallback(async () => {
    try {
      const [completed, openSessions] = await Promise.all([
        repository.listCompleted(),
        Promise.all(TEXTBOX_TEXTS.map((text) => repository.getOpen(text.id))),
      ]);
      setSummaries(summarizeTextboxProgress(completed));
      setOpen(
        new Map(
          openSessions.flatMap((session) =>
            session ? [[session.textId, session] as const] : [],
          ),
        ),
      );
      setStatus("ready");
    } catch {
      setStatus("unavailable");
    }
  }, [repository]);

  useEffect(() => {
    // Erstes Laden der lokalen Daten; setState folgt erst nach dem Lesen.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten aus IndexedDB laden
    void refresh();
  }, [refresh]);

  return {
    status,
    texts: TEXTBOX_TEXTS,
    summaries,
    open,
    refresh,
    saveRound: repository.saveRound,
    complete: repository.complete,
    discard: repository.discard,
  };
}
