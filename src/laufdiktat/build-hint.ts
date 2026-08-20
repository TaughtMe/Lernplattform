import { deterministicOrder } from "./seeded-shuffle.ts";

/**
 * Builds the hint for Freies Üben ("UEBUNG" mode).
 * fraction (0..1) = how much is already revealed.
 * Single word  -> individual letters are shown gradually, rest "_".
 * Sentence (spaces) -> whole words are shown gradually, rest masked.
 */
export function buildHint(target: string, fraction: number): string {
  const isSentence = target.trim().includes(" ");
  if (isSentence) {
    const tokens = target.split(/(\s+)/); // keep separators
    const wordPositions = tokens.map((t, i) => (t.trim() !== "" ? i : -1)).filter((i) => i >= 0);
    const revealCount = Math.ceil(wordPositions.length * fraction);
    const order = deterministicOrder(wordPositions.length, target);
    const revealed = new Set(order.slice(0, revealCount).map((k) => wordPositions[k]));
    return tokens.map((t, i) => (t.trim() === "" ? t : revealed.has(i) ? t : t.replace(/\S/g, "_"))).join("");
  }
  const chars = [...target];
  const letterIdx = chars.map((c, i) => ({ c, i })).filter((x) => x.c.trim() !== "").map((x) => x.i);
  const revealCount = Math.ceil(letterIdx.length * fraction);
  const order = deterministicOrder(letterIdx.length, target);
  const revealed = new Set(order.slice(0, revealCount).map((k) => letterIdx[k]));
  return chars.map((c, i) => (c.trim() === "" ? c : revealed.has(i) ? c : "_")).join(" ");
}
