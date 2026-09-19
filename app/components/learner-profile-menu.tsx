"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import {
  ANIMALS,
  animalFileName,
  createLearnerProfile,
  learnerDisplayName,
  learnerProfileSchema,
} from "../../src/domain/learner-profile";
import { learnerProfileRepository } from "../../src/storage/learner-profile";
import { CloseIcon } from "./ui-icons";
import { useHydrated } from "./use-hydrated";

export function LearnerProfileMenu() {
  const ready = useHydrated();
  const snapshot = useSyncExternalStore(
    learnerProfileRepository.subscribe,
    learnerProfileRepository.snapshot,
    () => null,
  );
  const profile = snapshot
    ? learnerProfileSchema.parse(JSON.parse(snapshot))
    : null;
  const dialog = useRef<HTMLDialogElement>(null);
  const [selection, setSelection] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function save() {
    const next = profile
      ? { ...profile, animal: selection }
      : createLearnerProfile(selection);
    try {
      learnerProfileRepository.save(next);
      setError("");
      dialog.current?.close();
      setNotice("Dein Tier ist gespeichert.");
    } catch {
      setError(
        "Dein Tier konnte nicht gespeichert werden. Bitte versuche es erneut.",
      );
    }
  }

  return (
    <div className="learner-profile">
      <button
        className="learner-profile__trigger"
        type="button"
        disabled={!ready}
        aria-label="Dein Profil öffnen"
        aria-haspopup="dialog"
        onClick={() => {
          setSelection(profile?.animal ?? "");
          setError("");
          setNotice("");
          dialog.current?.showModal();
        }}
      >
        {profile ? (
          // eslint-disable-next-line @next/next/no-img-element -- existing local SVG illustration
          <img src={`/animals/${animalFileName(profile.animal)}.svg`} alt="" />
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
          </svg>
        )}
      </button>
      <span className="sr-only" role="status">
        {notice}
      </span>
      <dialog
        ref={dialog}
        className="learner-profile__dialog"
        aria-labelledby="learner-profile-title"
        aria-describedby="learner-profile-description"
      >
        <div className="learner-profile__header">
          <h2 id="learner-profile-title">Dein Profil</h2>
          <button
            type="button"
            className="learner-profile__close"
            aria-label="Profil schließen"
            onClick={() => dialog.current?.close()}
          >
            <CloseIcon aria-hidden="true" />
          </button>
        </div>
        <p id="learner-profile-description">
          Wähle dein Tier für das nächste Laufdiktat. Ohne Auswahl bekommst du
          ein zufälliges Tier.
        </p>
        {profile ? (
          <p>
            Dein Name: <strong>{learnerDisplayName(profile)}</strong>
          </p>
        ) : null}
        <div
          className="learner-profile__animals"
          role="group"
          aria-label="Tier auswählen"
        >
          {ANIMALS.map((animal) => (
            <button
              key={animal.name}
              type="button"
              aria-pressed={selection === animal.name}
              onClick={() => {
                setSelection(animal.name);
                setError("");
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- original local animal SVG */}
              <img
                src={`/animals/${animalFileName(animal.name)}.svg`}
                alt=""
                loading="lazy"
              />
              <span>{animal.name}</span>
            </button>
          ))}
        </div>
        <div className="learner-profile__footer">
          {error ? <p role="alert">{error}</p> : null}
          <p>
            Nur auf diesem Gerät gespeichert. Ein laufender Raum behält dein
            bisheriges Tier.
          </p>
          <button
            type="button"
            className="button button--primary"
            disabled={!selection}
            onClick={save}
          >
            Tier speichern
          </button>
        </div>
      </dialog>
    </div>
  );
}
