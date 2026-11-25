"use client";

import { useEffect, useMemo, useState } from "react";
import type { CompetenceProfile } from "../../src/domain/competence-profile";
import {
  mathProgressRows,
  type MathProgressRow,
} from "../../src/domain/math-progress";
import { createCompetenceProfileRepository } from "../../src/storage/competence-profile";
import { MathProgressView } from "../views/fortschritt/math-progress-view";
import { useAreaVisible } from "../release/release-context";

type Load = () => Promise<CompetenceProfile>;

const MATH_PATH = "/frei/mathematics";

/** Container „Kopfrechnen“ auf der Fortschrittsseite; nur sichtbar, wenn Mathe freigegeben ist. */
export function MathProgressSection({ load }: { load?: Load | undefined }) {
  const visible = useAreaVisible("mathe");
  const loadProfile = useMemo<Load>(
    () => load ?? (() => createCompetenceProfileRepository().load()),
    [load],
  );
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error" }
    | { status: "ready"; rows: MathProgressRow[] }
  >({ status: "loading" });

  useEffect(() => {
    let active = true;
    loadProfile()
      .then((profile) => {
        if (active) {
          setState({
            status: "ready",
            rows: mathProgressRows(profile.entries),
          });
        }
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [loadProfile]);

  if (!visible) return null;
  return (
    <MathProgressView
      status={state.status}
      rows={state.status === "ready" ? state.rows : []}
      practicePath={MATH_PATH}
    />
  );
}
