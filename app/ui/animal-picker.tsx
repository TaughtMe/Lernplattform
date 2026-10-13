"use client";

import { useState } from "react";
import {
  FIGURES,
  advanceUnlock,
  isUnlockComplete,
} from "../../src/domain/figures";
import { ANIMALS } from "../../src/domain/learner-profile";
import { AnimalImage } from "./animal";

/**
 * Auswahl der 60 Tiere als Raster (Profil, Landing). Mit `figuresUnlocked`
 * erscheinen darunter die geheimen Figuren; die Tipp-Folge dafür steht in
 * src/domain/figures.ts und wird hier bewusst nicht erklärt.
 */
export function AnimalPicker({
  value,
  onChange,
  figure = null,
  figuresUnlocked = false,
  onFigureChange,
  onUnlock,
}: {
  value: string | null;
  onChange: (animal: string) => void;
  figure?: string | null;
  figuresUnlocked?: boolean;
  onFigureChange?: (figure: string) => void;
  onUnlock?: () => void;
}) {
  const [progress, setProgress] = useState(0);

  function chooseAnimal(name: string) {
    onChange(name);
    if (figuresUnlocked || !onUnlock) return;
    const next = advanceUnlock(progress, name);
    if (isUnlockComplete(next)) {
      setProgress(0);
      onUnlock();
    } else {
      setProgress(next);
    }
  }

  return (
    <>
      <div className="ui-picker" role="group" aria-label="Tier auswählen">
        {ANIMALS.map((animal) => (
          <button
            key={animal.name}
            type="button"
            aria-pressed={!figure && animal.name === value}
            aria-label={animal.name}
            title={animal.name}
            onClick={() => chooseAnimal(animal.name)}
          >
            <AnimalImage animal={animal.name} size={44} />
          </button>
        ))}
      </div>
      {figuresUnlocked && onFigureChange ? (
        <div className="ui-picker" role="group" aria-label="Figur auswählen">
          {FIGURES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === figure}
              aria-label={item.name}
              title={item.name}
              onClick={() => onFigureChange(item.id)}
            >
              <AnimalImage animal={`figur:${item.id}`} size={44} />
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
