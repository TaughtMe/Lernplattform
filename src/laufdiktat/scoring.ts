/** Stars (1-5), mainly from the error rate. All correct = 5 stars. */
export function computeStars(errors: number, wordCount: number): number {
  if (wordCount <= 0 || errors <= 0) return 5;
  const rate = errors / wordCount;
  if (rate <= 0.15) return 4;
  if (rate <= 0.35) return 3;
  if (rate <= 0.6) return 2;
  return 1;
}
