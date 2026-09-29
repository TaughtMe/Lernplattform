"use client";

import { useState } from "react";
import { animalFileName } from "../../src/domain/learner-profile";

const FALLBACK = "/animals/koala.svg";

/**
 * Tierbild aus public/animals. `animal` ist der Tiername aus dem Profil
 * (z. B. „Fuchs“); ohne Tier erscheint der Koala als neutrale Figur.
 */
export function AnimalImage({
  animal,
  size,
  label,
  className = "",
}: {
  animal: string | null;
  size: number;
  /** Alternativtext; leer lassen, wenn das Tier nur schmückt. */
  label?: string;
  className?: string;
}) {
  const src = `/animals/${animalFileName(animal)}.svg`;
  const [failed, setFailed] = useState<string | null>(null);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- eines von 60 Tier-SVGs, kein fester Bildbestand für next/image
    <img
      src={failed === src ? FALLBACK : src}
      width={size}
      height={size}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      className={`ui-animal ${className}`}
      onError={() => setFailed(src)}
    />
  );
}
