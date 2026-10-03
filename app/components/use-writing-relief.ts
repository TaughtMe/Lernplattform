"use client";

import { useEffect, useMemo, useState } from "react";
import { isWritingReliefActive } from "../../src/domain/class-seal";
import { createStudentClassesRepository } from "../../src/storage/student-classes";

/**
 * Gilt für dieses Gerät in dieser Runde die Schreiberleichterung? Nur lokal
 * ausgewertet; nichts davon verlässt das Gerät. `undefined` heißt: noch nicht
 * geprüft (nur, wenn die Runde einen Klassenstempel trägt).
 */
export function useWritingRelief(classSeal: string | undefined) {
  const repository = useMemo(() => createStudentClassesRepository(), []);
  const [result, setResult] = useState<{ seal: string; active: boolean }>();
  useEffect(() => {
    if (!classSeal) return;
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
  }, [classSeal, repository]);
  if (!classSeal) return false;
  return result?.seal === classSeal ? result.active : undefined;
}
