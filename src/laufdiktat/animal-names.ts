const ADJECTIVES = ["Schnell", "Flink", "Schlau", "Mutig", "Wild", "Kühn", "Listig", "Stark", "Frech"];

const ANIMALS: Array<{ name: string; g: "m" | "f" | "n" }> = [
  { name: "Koala", g: "m" }, { name: "Fledermaus", g: "f" }, { name: "Kamel", g: "n" },
  { name: "Igel", g: "m" }, { name: "Capybara", g: "n" }, { name: "Eichhörnchen", g: "n" },
  { name: "Elefant", g: "m" }, { name: "Qualle", g: "f" }, { name: "Clownfisch", g: "m" },
  { name: "Schwein", g: "n" }, { name: "Ente", g: "f" }, { name: "Kiwi", g: "m" },
  { name: "Roter Panda", g: "m" }, { name: "Giraffe", g: "f" }, { name: "Löwin", g: "f" },
  { name: "Einhorn", g: "n" }, { name: "Orca", g: "m" }, { name: "Schildkröte", g: "f" },
  { name: "Pfau", g: "m" }, { name: "Affe", g: "m" }, { name: "Gorilla", g: "m" },
  { name: "Fuchs", g: "m" }, { name: "Katze", g: "f" }, { name: "Sphynx-Katze", g: "f" },
  { name: "Lama", g: "n" }, { name: "Yak", g: "n" }, { name: "Kobra", g: "f" },
  { name: "Krokodil", g: "n" }, { name: "Zebra", g: "n" }, { name: "Flamingo", g: "m" },
  { name: "Oktopus", g: "m" }, { name: "Chamäleon", g: "n" }, { name: "Hirsch", g: "m" },
  { name: "Pelikan", g: "m" }, { name: "Erdmännchen", g: "n" }, { name: "Käfer", g: "m" },
  { name: "Heuschrecke", g: "f" }, { name: "Schnabeltier", g: "n" }, { name: "Krabbe", g: "f" },
  { name: "Mammut", g: "n" }, { name: "Kaninchen", g: "n" }, { name: "Truthahn", g: "m" },
  { name: "Gottesanbeterin", g: "f" }, { name: "Esel", g: "m" }, { name: "Robbe", g: "f" },
  { name: "Strauß", g: "m" }, { name: "Taube", g: "f" }, { name: "Gepard", g: "m" },
  { name: "Schmetterling", g: "m" }, { name: "Libelle", g: "f" }, { name: "Pudel", g: "m" },
  { name: "Bobtail", g: "m" }, { name: "Mops", g: "m" }, { name: "Dackel", g: "m" },
  { name: "Perserkatze", g: "f" },
];

const FILENAME_OVERRIDES: Record<string, string> = {
  "chamäleon": "chameleon",
  "phönix": "phoenix",
  "sphynx-katze": "sphynxkatze",
};

/** Converts an animal name to a valid /public/animals SVG file name. */
export function animalToFileName(animal: string): string {
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

/** Splits a generated student name ("Schnelles Nashorn") into adjective and animal. */
export function parseStudentName(name: string): { adjective: string; animal: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return { adjective: parts[0], animal: parts.slice(1).join(" ") };
  return { adjective: "", animal: name.trim() };
}

export function generateStudentName(random: () => number = Math.random): string {
  const baseAdj = ADJECTIVES[Math.floor(random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(random() * ANIMALS.length)];
  const ending = animal.g === "m" ? "er" : animal.g === "f" ? "e" : "es";
  return `${baseAdj}${ending} ${animal.name}`;
}
