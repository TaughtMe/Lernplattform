"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore, type MouseEvent } from "react";
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

export function LandingLearnerAction({
  variant = "path",
}: {
  variant?: "path" | "entry";
}) {
  const router = useRouter();
  const ready = useHydrated();
  const snapshot = useSyncExternalStore(
    learnerProfileRepository.subscribe,
    learnerProfileRepository.snapshot,
    () => null,
  );
  const profile = ready ? readProfile(snapshot) : null;

  function openLearnerRoom(event: MouseEvent<HTMLAnchorElement>) {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const startViewTransition = (
      document as Document & {
        startViewTransition?: (update: () => void) => unknown;
      }
    ).startViewTransition;
    if (!startViewTransition || reducedMotion) return;
    event.preventDefault();
    startViewTransition(() => router.push("/lernen"));
  }

  if (!profile?.animal) {
    return (
      <div
        className={`landing-path landing-path--feature landing-learner-action landing-learner-action--empty${variant === "entry" ? " landing-learner-action--entry" : ""}`}
        aria-label="Lernraum öffnen – noch kein Tier gewählt"
        role="group"
      >
        <span className="landing-learner-action__avatar" aria-hidden="true">
          ?
        </span>
        <div>
          <strong>
            {variant === "entry" ? "Dein Tierprofil" : "Dein Lernraum"}
          </strong>
          <span>
            {variant === "entry"
              ? "Wähle ein Tier, dann ist es bei jeder Lernrunde dabei."
              : "Dein Tier erscheint hier, sobald du es gewählt hast."}
          </span>
        </div>
        <Link className="button button--quiet" href="/lernen/einstellungen">
          Tier wählen
        </Link>
      </div>
    );
  }

  return (
    <Link
      className={`landing-path landing-path--feature landing-learner-action${variant === "entry" ? " landing-learner-action--entry" : ""}`}
      href="/lernen"
      aria-label={`Lernraum öffnen – Tier ${profile.animal}`}
      onClick={openLearnerRoom}
    >
      <span
        className="landing-learner-action__avatar"
        aria-hidden="true"
        style={{ viewTransitionName: "learner-profile" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- local animal illustration */}
        <img src={`/animals/${animalFileName(profile.animal)}.svg`} alt="" />
      </span>
      <div>
        <strong>Dein Tierprofil</strong>
        <span>
          {variant === "entry"
            ? "Direkt in deinen persönlichen Lernraum."
            : "Heute, LernBox und Fortschritt an einem ruhigen Ort."}
        </span>
      </div>
      <ArrowRightIcon aria-hidden="true" />
    </Link>
  );
}
