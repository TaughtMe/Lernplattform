// Rules from Laufdiktat 6c2ade4: speed is display-only, never learning progress.
export function speedPoints(length: number, durationMs: number) {
  return durationMs > 0 && length > 0
    ? Math.max(0, Math.round((length / (durationMs / 1000)) * 100))
    : 0;
}

export function battleChargeGain(
  roster: Record<string, number>,
  name: string,
  index: number,
) {
  const others = Object.entries(roster).filter(([other]) => other !== name);
  const total = others.length + 1;
  return total > 1 &&
    others.filter(([, position]) => position > index).length >= total / 2
    ? 34
    : 25;
}
