"use client";

import { useCallback, useRef, useState } from "react";
import type { LiveSession } from "../../src/integrations/laufdiktat/live-session";
import type { LiveTransferTrace } from "../../src/integrations/laufdiktat/vocabulary-transfer";
import {
  runLiveWordStoreTransfer,
  type WordStoreTransferResult,
} from "../../src/integrations/laufdiktat/word-store-transfer";
import { createWordBoxRepository } from "../../src/storage/personal-learning-events";

/**
 * Übernahme der Wörter in den Wortspeicher am Ende einer Runde (reguläres und
 * vorzeitiges Ende), höchstens einmal pro Runde und Gerät.
 */
export function useLiveWordStoreTransfer() {
  const [result, setResult] = useState<WordStoreTransferResult>({
    status: "none",
  });
  const startedFor = useRef("");

  const transfer = useCallback(
    (session: LiveSession, trace: LiveTransferTrace) => {
      // Ohne Übernahme (Standard, Stationsmodus) wird nichts angelegt.
      if (session.wordStoreTransfer === "none" || session.stationMode) return;
      if (startedFor.current === session.sessionId) return;
      startedFor.current = session.sessionId;
      void runLiveWordStoreTransfer(
        createWordBoxRepository(),
        session,
        trace,
      ).then((next) => {
        if (next.status !== "none") setResult(next);
      });
    },
    [],
  );

  return { result, transfer };
}
