"use client";

import { useEffect, useMemo, useState } from "react";
import type { TextboxSession } from "../../src/domain/textbox-session";
import { createTextboxRepository } from "../../src/storage/personal-learning-events";
import type { TextboxRepository } from "./use-textbox";

export type CompletedSessionsState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "ready"; sessions: TextboxSession[] };

/** Lädt alle abgeschlossenen Textbox-Einheiten dieses Geräts (nur lesen). */
export function useCompletedTextboxSessions(
  injected?: TextboxRepository,
): CompletedSessionsState {
  const repository = useMemo(
    () => injected ?? createTextboxRepository(),
    [injected],
  );
  const [state, setState] = useState<CompletedSessionsState>({
    status: "loading",
  });

  useEffect(() => {
    let active = true;
    repository
      .listCompleted()
      .then((sessions) => {
        if (active) setState({ status: "ready", sessions });
      })
      .catch(() => {
        if (active) setState({ status: "unavailable" });
      });
    return () => {
      active = false;
    };
  }, [repository]);

  return state;
}
