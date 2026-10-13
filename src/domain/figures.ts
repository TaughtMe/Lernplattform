/**
 * Geheime Figuren (Coco Material, CC0 – siehe public/figuren/QUELLE.md).
 * Sie sind nur Bilder für das eigene Profil; Name und Raum-Identität
 * bleiben beim Tier. Freigeschaltet werden sie über eine Tipp-Folge im
 * Tier-Raster (Koala, Tiefseefisch, Löwin – je zweimal, in dieser Reihenfolge).
 * Das ist ein Versteck, keine Sicherheitsgrenze: die SVGs sind öffentlich.
 */
export const FIGURES: ReadonlyArray<{ id: string; name: string }> = [
  { id: "perlenohrring", name: "Mädchen mit dem Perlenohrring" },
  { id: "cervantes", name: "Cervantes" },
  { id: "demogorgon-1", name: "Demogorgon 1" },
  { id: "demogorgon-2", name: "Demogorgon 2" },
  { id: "don-quijote", name: "Don Quijote" },
  { id: "eleven", name: "Eleven" },
  { id: "hamlet", name: "Hamlet" },
  { id: "homer", name: "Homer" },
  { id: "kapitaen-hook", name: "Kapitän Hook" },
  { id: "caesar", name: "Julius Caesar" },
  { id: "mirabel", name: "Mirabel" },
  { id: "napoleon", name: "Napoleon" },
  { id: "nausicaa", name: "Nausicaä" },
  { id: "ohm-1", name: "Ohm 1" },
  { id: "ohm-2", name: "Ohm 2" },
  { id: "othello", name: "Othello" },
  { id: "oetzi", name: "Ötzi" },
  { id: "pharao-1", name: "Pharao 1" },
  { id: "pharao-2", name: "Pharao 2" },
  { id: "sancho-panza", name: "Sancho Panza" },
  { id: "sherlock-1", name: "Sherlock Holmes 1" },
  { id: "sherlock-2", name: "Sherlock Holmes 2" },
  { id: "heinrich-viii", name: "Heinrich VIII." },
  { id: "dracula-1", name: "Dracula 1" },
  { id: "dracula-2", name: "Dracula 2" },
  { id: "c3po", name: "C-3PO" },
  { id: "r2d2", name: "R2-D2" },
  { id: "batman", name: "Batman" },
  { id: "black-widow", name: "Black Widow" },
  { id: "catwoman", name: "Catwoman" },
  { id: "hulk", name: "Hulk" },
  { id: "spiderman-1", name: "Spider-Man 1" },
  { id: "spiderman-2", name: "Spider-Man 2" },
  { id: "superman", name: "Superman" },
  { id: "wonder-woman", name: "Wonder Woman" },
  { id: "frankenstein", name: "Frankenstein" },
  { id: "gladiator-1", name: "Gladiator 1" },
  { id: "gladiator-2", name: "Gladiator 2" },
  { id: "guy-fawkes", name: "Guy Fawkes" },
  { id: "harry", name: "Harry" },
  { id: "hermine", name: "Hermine" },
  { id: "ron", name: "Ron" },
  { id: "katniss", name: "Katniss" },
  { id: "hobbits", name: "Frodo und Sam" },
  { id: "mario", name: "Mario" },
  { id: "peter-pan", name: "Peter Pan" },
  { id: "koenigin", name: "Königin Elisabeth" },
  { id: "robinson", name: "Robinson Crusoe" },
  { id: "weihnachtsmann", name: "Weihnachtsmann" },
  { id: "shakespeare", name: "Shakespeare" },
  { id: "wonka", name: "Willy Wonka" },
  { id: "yoda-baby", name: "Yoda Baby" },
  { id: "yoda-1", name: "Yoda 1" },
  { id: "yoda-2", name: "Yoda 2" },
];

export const FIGURE_IDS = FIGURES.map((figure) => figure.id) as [
  string,
  ...string[],
];

export const UNLOCK_SEQUENCE: readonly string[] = [
  "Koala",
  "Koala",
  "Tiefseefisch",
  "Tiefseefisch",
  "Löwin",
  "Löwin",
];

/**
 * Schaltet den Fortschritt der Tipp-Folge weiter. Ein falsches Tier setzt
 * zurück; ist es das erste Tier der Folge, zählt es als neuer Anfang.
 */
export function advanceUnlock(progress: number, tapped: string): number {
  if (UNLOCK_SEQUENCE[progress] === tapped) return progress + 1;
  return UNLOCK_SEQUENCE[0] === tapped ? 1 : 0;
}

export function isUnlockComplete(progress: number): boolean {
  return progress >= UNLOCK_SEQUENCE.length;
}

export function figureName(id: string | null | undefined): string | null {
  return FIGURES.find((figure) => figure.id === id)?.name ?? null;
}
