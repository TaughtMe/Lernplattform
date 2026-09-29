"use client";

import { ANIMALS } from "../../src/domain/learner-profile";
import { AnimalImage } from "./animal";

/** Auswahl der 60 Tiere als Raster (Profil, Landing). */
export function AnimalPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (animal: string) => void;
}) {
  return (
    <div className="ui-picker" role="group" aria-label="Tier auswählen">
      {ANIMALS.map((animal) => (
        <button
          key={animal.name}
          type="button"
          aria-pressed={animal.name === value}
          aria-label={animal.name}
          title={animal.name}
          onClick={() => onChange(animal.name)}
        >
          <AnimalImage animal={animal.name} size={44} />
        </button>
      ))}
    </div>
  );
}
