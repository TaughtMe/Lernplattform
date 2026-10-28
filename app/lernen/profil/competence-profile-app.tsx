"use client";

import { useEffect, useMemo, useState } from "react";
import type { CompetenceProfile } from "../../../src/domain/competence-profile";
import { createCompetenceProfileRepository } from "../../../src/storage/competence-profile";
import { profileGroups } from "../../views/diagnostik/profile-copy";
import { ProfileScreen } from "../../views/diagnostik/profile-screen";

type Load = () => Promise<CompetenceProfile>;

/**
 * Container für „Mein Lernstand“: lädt den Lernstand einmal und zeigt das
 * Profil. Gespeichert wird nichts. `load` ist für Tests einspeisbar.
 */
export function CompetenceProfileApp({ load }: { load?: Load | undefined }) {
  const loadProfile = useMemo<Load>(
    () => load ?? (() => createCompetenceProfileRepository().load()),
    [load],
  );
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error" }
    | { status: "ready"; profile: CompetenceProfile }
  >({ status: "loading" });

  useEffect(() => {
    let active = true;
    loadProfile()
      .then((profile) => {
        if (active) setState({ status: "ready", profile });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [loadProfile]);

  return (
    <ProfileScreen
      status={state.status}
      groups={
        state.status === "ready" ? profileGroups(state.profile.entries) : []
      }
    />
  );
}
