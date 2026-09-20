"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  animalFileName,
  learnerProfileSchema,
} from "../../src/domain/learner-profile";
import { learnerProfileRepository } from "../../src/storage/learner-profile";
import { ArrowRightIcon } from "./ui-icons";
import { useHydrated } from "./use-hydrated";

function readProfile(snapshot: string | null) {
  if (!snapshot) return null;
  try {
    const parsed = learnerProfileSchema.safeParse(JSON.parse(snapshot));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function LandingLearnerAction() {
  const ready = useHydrated();
  const snapshot = useSyncExternalStore(
    learnerProfileRepository.subscribe,
    learnerProfileRepository.snapshot,
    () => null,
  );
  const profile = ready ? readProfile(snapshot) : null;

  if (!profile?.animal) {
    return (
      <div
        className="landing-path landing-path--feature landing-learner-action landing-learner-action--empty"
        aria-label="Lernraum öffnen – noch kein Tier gewählt"
        role="group"
      >
        <span className="landing-learner-action__avatar" aria-hidden="true">
          ?
        </span>
        <div>
          <strong>Dein Lernraum</strong>
          <span>Dein Tier erscheint hier, sobald du es gewählt hast.</span>
        </div>
        <Link className="button button--quiet" href="/lernen/einstellungen">
          Tier wählen
        </Link>
      </div>
    );
  }

  return (
    <Link
      className="landing-path landing-path--feature landing-learner-action"
      href="/lernen"
      aria-label={`Lernraum öffnen – Tier ${profile.animal}`}
    >
      <span className="landing-learner-action__avatar" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element -- local animal illustration */}
        <img src={`/animals/${animalFileName(profile.animal)}.svg`} alt="" />
      </span>
      <div>
        <strong>Lernraum öffnen</strong>
        <span>Heute, LernBox und Fortschritt an einem ruhigen Ort.</span>
      </div>
      <ArrowRightIcon aria-hidden="true" />
    </Link>
  );
}
