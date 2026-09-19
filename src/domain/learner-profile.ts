import { z } from "zod";

export const ADJECTIVES = [
  "Schnell",
  "Flink",
  "Schlau",
  "Mutig",
  "Wild",
  "Kühn",
  "Listig",
  "Stark",
  "Frech",
];
export const ANIMALS: Array<{ name: string; g: "m" | "f" | "n" }> = [
  { name: "Koala", g: "m" },
  { name: "Fledermaus", g: "f" },
  { name: "Kamel", g: "n" },
  { name: "Igel", g: "m" },
  { name: "Capybara", g: "n" },
  { name: "Eichhörnchen", g: "n" },
  { name: "Elefant", g: "m" },
  { name: "Qualle", g: "f" },
  { name: "Tiefseefisch", g: "m" },
  { name: "Clownfisch", g: "m" },
  { name: "Schwein", g: "n" },
  { name: "Ente", g: "f" },
  { name: "Phönix", g: "m" },
  { name: "Kiwi", g: "m" },
  { name: "Roter Panda", g: "m" },
  { name: "Giraffe", g: "f" },
  { name: "Löwin", g: "f" },
  { name: "Einhorn", g: "n" },
  { name: "Orca", g: "m" },
  { name: "Schildkröte", g: "f" },
  { name: "Pfau", g: "m" },
  { name: "Affe", g: "m" },
  { name: "Gorilla", g: "m" },
  { name: "Fuchs", g: "m" },
  { name: "Katze", g: "f" },
  { name: "Sphynx-Katze", g: "f" },
  { name: "Lama", g: "n" },
  { name: "Yak", g: "n" },
  { name: "Kobra", g: "f" },
  { name: "Krokodil", g: "n" },
  { name: "Zebra", g: "n" },
  { name: "Flamingo", g: "m" },
  { name: "Oktopus", g: "m" },
  { name: "Chamäleon", g: "n" },
  { name: "Hirsch", g: "m" },
  { name: "Pelikan", g: "m" },
  { name: "Erdmännchen", g: "n" },
  { name: "Käfer", g: "m" },
  { name: "Heuschrecke", g: "f" },
  { name: "Schnabeltier", g: "n" },
  { name: "Mistkäfer", g: "m" },
  { name: "Krabbe", g: "f" },
  { name: "Mammut", g: "n" },
  { name: "Kaninchen", g: "n" },
  { name: "Truthahn", g: "m" },
  { name: "Gottesanbeterin", g: "f" },
  { name: "Esel", g: "m" },
  { name: "Robbe", g: "f" },
  { name: "Strauß", g: "m" },
  { name: "Taube", g: "f" },
  { name: "Gepard", g: "m" },
  { name: "Schmetterling", g: "m" },
  { name: "Libelle", g: "f" },
  { name: "Pudel", g: "m" },
  { name: "Bobtail", g: "m" },
  { name: "Mops", g: "m" },
  { name: "Schäferhund", g: "m" },
  { name: "Collie", g: "m" },
  { name: "Dackel", g: "m" },
  { name: "Perserkatze", g: "f" },
];

const FILENAME_OVERRIDES: Record<string, string> = {
  chamäleon: "chameleon",
  tiefseefisch: "anglerfisch",
  phönix: "phoenix",
  schäferhund: "deutscher_schaeferhund",
  "sphynx-katze": "sphynxkatze",
  hund: "dackel",
};

export function animalFileName(animal: string): string {
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

export const learnerProfileSchema = z
  .object({
    version: z.literal(1),
    animal: z
      .string()
      .refine((value) => ANIMALS.some((animal) => animal.name === value)),
    adjective: z.string().refine((value) => ADJECTIVES.includes(value)),
  })
  .strict();
export type LearnerProfile = z.infer<typeof learnerProfileSchema>;

export function createLearnerProfile(
  animalName?: string,
  random: () => number = Math.random,
): LearnerProfile {
  const animal =
    ANIMALS.find((animal) => animal.name === animalName) ??
    ANIMALS[
      Math.min(
        ANIMALS.length - 1,
        Math.max(0, Math.floor(random() * ANIMALS.length)),
      )
    ]!;
  const adjective =
    ADJECTIVES[
      Math.min(
        ADJECTIVES.length - 1,
        Math.max(0, Math.floor(random() * ADJECTIVES.length)),
      )
    ]!;
  return { version: 1, animal: animal.name, adjective };
}

export function learnerDisplayName(profile: LearnerProfile) {
  const animal = ANIMALS.find((animal) => animal.name === profile.animal)!;
  const ending = animal.g === "m" ? "er" : animal.g === "f" ? "e" : "es";
  return `${profile.adjective}${ending} ${animal.name}`;
}

/** Server-assigned numeric suffixes distinguish pupils without changing the animal. */
export function studentAnimalFileName(studentName: string): string {
  const name = studentName
    .trim()
    .replace(/\s+\d+$/, "")
    .toLocaleLowerCase("de-DE");
  const animal = ANIMALS.find(
    (animal) =>
      name === animal.name.toLocaleLowerCase("de-DE") ||
      name.endsWith(` ${animal.name.toLocaleLowerCase("de-DE")}`),
  );
  if (animal) return animalFileName(animal.name);
  return name === "hund" || name.endsWith(" hund") ? "dackel" : "koala";
}
