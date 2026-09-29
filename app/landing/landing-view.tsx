"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createLearnerProfile } from "../../src/domain/learner-profile";
import { learnerProfileRepository } from "../../src/storage/learner-profile";
import { PilotConnectionNotice } from "../components/pilot-connection-notice";
import { useHydrated } from "../components/use-hydrated";
import { AnimalImage } from "../ui/animal";
import { AnimalPicker } from "../ui/animal-picker";
import { RoomCodeEntry } from "../ui/room-code-entry";
import { Sheet } from "../ui/sheet";
import { useLearnerProfile } from "../ui/use-learner-profile";

/**
 * Startseite nach Design 2a: ein Tier, ein Code, sonst nichts.
 * Ist der persönliche Lernraum freigegeben, öffnet das Tier ihn; sonst
 * öffnet es die Tierwahl für das Laufdiktat.
 */
export function LandingView({
  learnerRoom,
  teacherOverview,
  roomServiceConfigured,
}: {
  learnerRoom: boolean;
  teacherOverview: boolean;
  roomServiceConfigured: boolean;
}) {
  const hydrated = useHydrated();
  const stored = useLearnerProfile();
  const [picker, setPicker] = useState(false);
  // Beim ersten Besuch wird ein zufälliges Tier gespeichert (Entscheidung 47).
  useEffect(() => {
    if (hydrated && !stored) learnerProfileRepository.ensure();
  }, [hydrated, stored]);
  const animal = stored?.animal ?? null;

  function choose(name: string) {
    learnerProfileRepository.save(
      createLearnerProfile(name, () => Math.random()),
    );
    setPicker(false);
  }

  const disc = (
    <span className="ui-landing__disc" aria-hidden="true">
      {animal ? (
        <AnimalImage
          animal={animal}
          size={210}
          className="ui-landing__animal"
        />
      ) : null}
    </span>
  );

  return (
    <main className="ui ui-on-dark ui-landing">
      <div className="ui-landing__inner">
        <header className="ui-between">
          <span className="ui-landing__brand">Lernraum</span>
          <Link
            href={teacherOverview ? "/lehrer" : "/lehrer/live"}
            className="ui-landing__pill"
          >
            Lehrerbereich
          </Link>
        </header>

        <section className="ui-landing__stage" aria-labelledby="landing-title">
          <h1 id="landing-title" className="ui-sr-only">
            Lernraum starten
          </h1>
          {learnerRoom ? (
            <Link
              href="/lernen"
              className="ui-landing__disc-link"
              aria-label={animal ? `Weiter als ${animal}` : "Lernraum öffnen"}
            >
              {disc}
            </Link>
          ) : (
            <button
              type="button"
              className="ui-landing__disc-link"
              aria-label={
                animal ? `Tier ändern, aktuell ${animal}` : "Tier wählen"
              }
              onClick={() => setPicker(true)}
            >
              {disc}
            </button>
          )}
          <p className="ui-landing__title">
            {animal ? `Weiter als ${animal}` : "Dein Tier"}
          </p>
          <p className="ui-muted">
            {learnerRoom
              ? "Tippen öffnet deinen Lernraum"
              : "Dein Tier begleitet dich im Laufdiktat"}
          </p>
          {learnerRoom ? (
            <button
              type="button"
              className="ui-btn ui-btn--link"
              onClick={() => setPicker(true)}
            >
              Tier ändern
            </button>
          ) : null}
        </section>

        <section className="ui-stack" aria-labelledby="room-title">
          <h2 id="room-title" className="ui-sr-only">
            Bereit für dein Laufdiktat?
          </h2>
          <RoomCodeEntry />
          <PilotConnectionNotice configured={roomServiceConfigured} />
          <p className="ui-center ui-small ui-muted">
            Ohne Konto · Tier änderst du jederzeit
          </p>
        </section>
      </div>

      <Sheet open={picker} title="Tier wählen" onClose={() => setPicker(false)}>
        <AnimalPicker value={animal} onChange={choose} />
      </Sheet>
    </main>
  );
}
