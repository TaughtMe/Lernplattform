export interface TypedChar {
  char: string;
  correct: boolean;
}

/**
 * Colors only what the student has already typed, character by character
 * against the target — never the untyped remainder, which would leak the
 * answer while writing from memory.
 */
export function karaokeHighlight(target: string, typed: string): TypedChar[] {
  return Array.from(typed).map((char, i) => ({
    char,
    correct: i < target.length && char === target[i],
  }));
}
