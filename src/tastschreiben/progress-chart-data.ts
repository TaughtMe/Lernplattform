export interface ChartPoint {
  index: number;
  value: number;
  occurredAt: string;
}

export interface AttemptLike {
  occurredAt: string;
  wpm: number;
  accuracy: number;
}

/** Die letzten `maxPoints` Einträge (chronologisch, älteste zuerst) einer Kennzahl — Grundlage für die kleinen Fortschritts-Diagramme. */
export function recentMetricPoints(history: AttemptLike[], metric: "wpm" | "accuracy", maxPoints: number = 20): ChartPoint[] {
  return history.slice(-maxPoints).map((h, i) => ({ index: i, value: h[metric], occurredAt: h.occurredAt }));
}
