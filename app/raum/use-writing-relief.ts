"use client";

import { useEffect, useMemo, useState } from "react";
import { useAreaVisible } from "../release/release-context";
import { isWritingReliefActive } from "../../src/domain/class-seal";
import { createStudentClassesRepository } from "../../src/storage/student-classes";

/**
 * Gilt für dieses Gerät in dieser Runde die Schreiberleichterung? Nur lokal
 * ausgewertet; nichts davon verlässt das Gerät. `undefined` heißt: noch nicht
 * geprüft (nur, wenn die Runde einen Klassenstempel trägt).
 *
 * Pausiert (Bereich `schreiberleichterung` nicht sichtbar, Entscheidung 79):
 * immer `false`, es wird nicht einmal gelesen. Gespeicherte Freigaben bleiben
 * unberührt und gelten wieder, sobald der Bereich eingeschaltet wird.
 */
export function useWritingRelief(classSeal: string | undefined) {
  const enabled = useAreaVisible("schreiberleichterung");
  const repository = useMemo(() => createStudentClassesRepository(), []);
  const [result, setResult] = useState<{ seal: string; active: boolean }>();
  useEffect(() => {
    if (!enabled || !classSeal) return;
    let current = true;
    void repository
      .list()
      .then((memberships) => isWritingReliefActive(memberships, classSeal))
      .catch(() => false)
      .then((active) => {
        if (current) setResult({ seal: classSeal, active });
      });
    return () => {
      current = false;
    };
  }, [classSeal, enabled, repository]);
  if (!enabled || !classSeal) return false;
  return result?.seal === classSeal ? result.active : undefined;
}
