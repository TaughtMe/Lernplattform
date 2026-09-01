"use client";

import { useMemo, useState } from "react";

const FALLBACK_ANIMAL = "koala";

const FILENAME_OVERRIDES: Record<string, string> = {
  chamäleon: "chameleon",
  tiefseefisch: "anglerfisch",
  phönix: "phoenix",
  schäferhund: "deutscher_schaeferhund",
  "sphynx-katze": "sphynxkatze",
  hund: "dackel",
};

function toFileName(animal: string): string {
  const lower = animal.toLowerCase().trim();
  if (FILENAME_OVERRIDES[lower]) return FILENAME_OVERRIDES[lower];
  return lower
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/\s+/g, "_")
    .replace(/-/g, "");
}

function parseStudentName(name: string): { adjective: string; animal: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return { adjective: parts[0]!, animal: parts.slice(1).join(" ") };
  }
  return { adjective: "", animal: name.trim() };
}

type AnimalAvatarProps = {
  studentName: string;
  className?: string;
};

export function AnimalAvatar({ studentName, className = "" }: AnimalAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const svgPath = useMemo(() => {
    const { animal } = parseStudentName(studentName);
    const fileName = toFileName(animal);
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
