// Stable hash + deterministic "random" order: the same seed always produces
// the same order (no flicker on re-render, same order after a reload).

const fmix32 = (x: number): number => {
  x ^= x >>> 16;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return x >>> 0;
};

export function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function deterministicOrder(n: number, seed: string): number[] {
  const seedHash = hashStr(seed);
  return Array.from({ length: n }, (_, i) => i).sort(
    (a, b) => fmix32(seedHash ^ fmix32(a)) - fmix32(seedHash ^ fmix32(b)),
  );
}

/** Shuffles `items` deterministically based on `seed` (e.g. room+student+session). */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  const order = deterministicOrder(items.length, seed);
  return order.map((i) => items[i]);
}
