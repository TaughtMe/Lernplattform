/** Tier-Avatare aus dem Laufdiktat (public/animals/*.svg). Kein Personenbezug, nur Anzeige. */
export const ANIMALS = {
  affe: "Affe", anglerfisch: "Anglerfisch", bobtail: "Bobtail", capybara: "Capybara", chameleon: "Chamäleon",
  clownfisch: "Clownfisch", collie: "Collie", dackel: "Dackel", deutscher_schaeferhund: "Schäferhund",
  eichhoernchen: "Eichhörnchen", einhorn: "Einhorn", elefant: "Elefant", ente: "Ente", erdmaennchen: "Erdmännchen",
  esel: "Esel", flamingo: "Flamingo", fledermaus: "Fledermaus", fuchs: "Fuchs", gepard: "Gepard", giraffe: "Giraffe",
  gorilla: "Gorilla", gottesanbeterin: "Gottesanbeterin", heuschrecke: "Heuschrecke", hirsch: "Hirsch", igel: "Igel",
  kaefer: "Käfer", kamel: "Kamel", kaninchen: "Kaninchen", katze: "Katze", kiwi: "Kiwi", koala: "Koala", kobra: "Kobra",
  krabbe: "Krabbe", krokodil: "Krokodil", lama: "Lama", libelle: "Libelle", loewin: "Löwin", mammut: "Mammut",
  mistkaefer: "Mistkäfer", mops: "Mops", oktopus: "Oktopus", orca: "Orca", pelikan: "Pelikan", perserkatze: "Perserkatze",
  pfau: "Pfau", phoenix: "Phönix", pudel: "Pudel", qualle: "Qualle", robbe: "Robbe", roter_panda: "Roter Panda",
  schildkroete: "Schildkröte", schmetterling: "Schmetterling", schnabeltier: "Schnabeltier", schwein: "Schwein",
  sphynxkatze: "Sphynxkatze", strauss: "Strauß", taube: "Taube", truthahn: "Truthahn", yak: "Yak", zebra: "Zebra",
} as const;

export type AnimalId = keyof typeof ANIMALS;

export const DEFAULT_ANIMAL: AnimalId = "fuchs";

export function isAnimalId(value: unknown): value is AnimalId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(ANIMALS, value);
}

export function animalName(id: string): string {
  return isAnimalId(id) ? ANIMALS[id] : ANIMALS[DEFAULT_ANIMAL];
}

export function animalSrc(id: string): string {
  return `/animals/${isAnimalId(id) ? id : DEFAULT_ANIMAL}.svg`;
}
