"use client";

import { useState } from "react";
import type { ChartPoint } from "../../../src/tastschreiben/progress-chart-data.ts";

const WIDTH = 280;
const HEIGHT = 120;
const PADDING = 24;

interface LineChartProps {
  points: ChartPoint[];
  color: string;
  unit: string;
  title: string;
}

function LineChart({ points, color, unit, title }: LineChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (points.length < 2) {
    return (
      <div className="progress-chart__panel">
        <h3 className="progress-chart__title">{title}</h3>
        <p className="progress-chart__empty">Noch nicht genug Übungsrunden für ein Diagramm.</p>
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;
  const innerWidth = WIDTH - PADDING * 2;
  const innerHeight = HEIGHT - PADDING * 2;

  function x(index: number): number {
    return PADDING + (index / (points.length - 1)) * innerWidth;
  }
  function y(value: number): number {
    return PADDING + innerHeight - ((value - minValue) / range) * innerHeight;
  }

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="progress-chart__panel">
      <h3 className="progress-chart__title">{title}</h3>
      <svg
        className="progress-chart__svg"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${title}: Verlauf über die letzten ${points.length} Übungsrunden, zuletzt ${last.value}${unit}`}
      >
        <line className="progress-chart__grid" x1={PADDING} y1={PADDING} x2={PADDING} y2={HEIGHT - PADDING} />
        <line className="progress-chart__grid" x1={PADDING} y1={HEIGHT - PADDING} x2={WIDTH - PADDING} y2={HEIGHT - PADDING} />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={x(points.length - 1)} cy={y(last.value)} r={5} fill={color} stroke="var(--surface)" strokeWidth={2} />
        <text x={x(points.length - 1)} y={y(last.value) - 10} textAnchor="end" className="progress-chart__value">
          {last.value}
          {unit}
        </text>
        {hovered && (
          <>
            <line
              className="progress-chart__crosshair"
              x1={x(hoverIndex!)}
              y1={PADDING}
              x2={x(hoverIndex!)}
              y2={HEIGHT - PADDING}
            />
            <circle cx={x(hoverIndex!)} cy={y(hovered.value)} r={5} fill={color} stroke="var(--surface)" strokeWidth={2} />
          </>
        )}
        {points.map((p, i) => (
          <rect
            key={i}
            x={x(i) - innerWidth / points.length / 2}
            y={PADDING}
            width={innerWidth / points.length}
            height={innerHeight}
            fill="transparent"
            onMouseEnter={() => setHoverIndex(i)}
            onMouseLeave={() => setHoverIndex(null)}
          />
        ))}
      </svg>
      {hovered && (
        <p className="progress-chart__tooltip">
          Runde {hoverIndex! + 1}: {hovered.value}
          {unit}
        </p>
      )}
    </div>
  );
}

interface ProgressChartProps {
  wpmPoints: ChartPoint[];
  accuracyPoints: ChartPoint[];
}

export function ProgressChart({ wpmPoints, accuracyPoints }: ProgressChartProps) {
  return (
    <div className="progress-chart">
      <LineChart points={wpmPoints} color="var(--teal-dark)" unit=" Wpm" title="Wörter/Minute" />
      <LineChart points={accuracyPoints} color="var(--coral-dark)" unit="%" title="Genauigkeit" />
    </div>
  );
}
