import { useEffect, useRef, useState } from "react";
import { parseStageParam } from "../../src/domain/exercise-card";
import type { LearningWordStage } from "../../src/domain/learning-word";

/**
 * Stufe einer Übungskarte (`?stufe=`, L25-4) im Startblatt der Wortbox.
 *
 * Sobald das Startblatt offen ist, wählt `onStage` die Stufe der Karte vor.
 * Ist sie nicht wählbar (`blocked` nennt den Grund), bleibt die bisherige
 * Vorauswahl und `hint` erklärt es. Es wird nichts gespeichert; das Kind
 * startet selbst (Entscheidung 86). Solange die Stimmen noch laden
 * (`waiting`), wartet die Vorauswahl.
 */
export function useCardStage({
  search,
  sheetId,
  blocked,
  waiting,
  onStage,
}: {
  /** Adressparameter der Seite. */
  search: Pick<URLSearchParams, "get">;
  sheetId: string | undefined;
  blocked: (stage: LearningWordStage) => string | undefined;
  waiting: (stage: LearningWordStage) => boolean;
  onStage: (stage: LearningWordStage) => void;
}) {
  const [wanted] = useState(() => parseStageParam(search.get("stufe")));
  const [shown, setShown] = useState<{ text: string; sheetId: string }>();
  const done = useRef(false);
  const latest = useRef({ blocked, waiting, onStage });
  useEffect(() => {
    latest.current = { blocked, waiting, onStage };
  });
  const stillWaiting =
    wanted !== undefined && sheetId !== undefined && waiting(wanted);
  useEffect(() => {
    if (wanted === undefined || !sheetId || stillWaiting || done.current) {
      return;
    }
    done.current = true;
    const reason = latest.current.blocked(wanted);
    if (reason) {
      setShown({
        sheetId,
        text: `Stufe ${wanted} deiner Übungskarte geht hier gerade nicht. ${reason}`,
      });
    } else latest.current.onStage(wanted);
  }, [wanted, sheetId, stillWaiting]);
  return { hint: shown?.sheetId === sheetId ? shown?.text : undefined };
}
