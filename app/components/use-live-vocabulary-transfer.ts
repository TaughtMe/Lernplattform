"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { PlacementRules } from "../../src/domain/live-vocabulary-placement";
import type { LiveSession } from "../../src/integrations/laufdiktat/live-session";
import { runLiveVocabularyTransfer } from "../../src/integrations/laufdiktat/live-transfer";
import type { LiveTransferTrace } from "../../src/integrations/laufdiktat/vocabulary-transfer";
import { createLearningBoxRepository } from "../../src/storage/personal-learning-events";

/** Gemeinsamer Baustein für reguläres und vorzeitiges Ende einer Runde. */
export function useLiveVocabularyTransfer() {
  const repository = useMemo(() => createLearningBoxRepository(), []);
  const [state, setState] = useState<{
    status: "idle" | "success" | "error";
    notice: string;
  }>({ status: "idle", notice: "" });
  const startedFor = useRef("");

  const transfer = useCallback(
    (
      session: LiveSession,
      trace: LiveTransferTrace,
      rules?: PlacementRules,
    ) => {
      if (startedFor.current === session.sessionId) return;
      startedFor.current = session.sessionId;
      void runLiveVocabularyTransfer(repository, session, trace, rules).then(
        (result) => {
          if (result.status !== "none") setState(result);
        },
      );
    },
    [repository],
  );

  return { ...state, transfer };
}
