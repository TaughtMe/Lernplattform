"use client";

import { studentAnimalFileName } from "../../src/domain/learner-profile";
import { useMemo, useState } from "react";

const FALLBACK_ANIMAL = "koala";

type AnimalAvatarProps = {
  studentName: string;
  className?: string;
};

export function AnimalAvatar({
  studentName,
  className = "",
}: AnimalAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const svgPath = useMemo(() => {
    const fileName = studentAnimalFileName(studentName);
    return `/animals/${fileName}.svg`;
  }, [studentName]);

  const src =
    failedSrc === svgPath ? `/animals/${FALLBACK_ANIMAL}.svg` : svgPath;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- one of 60 dynamic per-name SVGs, not a fixed asset next/image can optimize
    <img
      src={src}
      onError={() => setFailedSrc(svgPath)}
      className={`animal-avatar ${className}`}
      alt={studentName}
    />
  );
}
