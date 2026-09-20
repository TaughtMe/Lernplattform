"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { ClassEnrollment } from "../../src/domain/class-enrollment";
import {
  animalFileName,
  learnerDisplayName,
  learnerProfileSchema,
} from "../../src/domain/learner-profile";
import { learnerProfileRepository } from "../../src/storage/learner-profile";
import { createStudentClassesRepository } from "../../src/storage/student-classes";
import { useHydrated } from "./use-hydrated";

export function StudentIdentitySummary() {
  const ready = useHydrated();
  const repository = useMemo(() => createStudentClassesRepository(), []);
  const profileSnapshot = useSyncExternalStore(
    learnerProfileRepository.subscribe,
    learnerProfileRepository.snapshot,
    () => null,
  );
  const profile =
    ready && profileSnapshot
      ? learnerProfileSchema.safeParse(JSON.parse(profileSnapshot)).data
      : null;
  const [membership, setMembership] = useState<ClassEnrollment>();

  const refresh = useCallback(() => {
    void repository.list().then(([current]) => setMembership(current));
  }, [repository]);

  useEffect(() => {
    const timer = window.setTimeout(refresh, 0);
    window.addEventListener("student-classes-changed", refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("student-classes-changed", refresh);
    };
  }, [refresh]);

  const profileName = profile?.animal
    ? learnerDisplayName(profile)
    : "Noch kein Tier";
  return (
    <div className="student-dashboard__identity">
      <Link
        className="student-dashboard__identity-link"
        href="/lernen/einstellungen"
        aria-label={
          profile?.animal
            ? `Einstellungen öffnen. Tier ${profile.animal}`
            : "Einstellungen öffnen. Noch kein Tier gewählt"
        }
      >
        <span className="student-dashboard__profile-avatar" aria-hidden="true">
          {profile?.animal ? (
            // eslint-disable-next-line @next/next/no-img-element -- small local animal illustration in the shared shell
            <img
              src={`/animals/${animalFileName(profile.animal)}.svg`}
              alt=""
            />
          ) : (
            <span>?</span>
          )}
        </span>
        <span className="student-dashboard__profile-copy">
          <span className="student-dashboard__profile-name">{profileName}</span>
          <span className="student-dashboard__profile-class">
            {membership
              ? `${membership.className} · ${membership.displayName}`
              : "Keine Klasse · lokal lernen"}
          </span>
        </span>
      </Link>
    </div>
  );
}
