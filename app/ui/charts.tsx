/**
 * Diagramme als eigenes SVG, ohne Bibliothek. Reine Darstellung: Werte von
 * 0 bis 100 (Prozent), Farben nur über Tokens. Beide Diagramme haben eine
 * Wertetabelle als Alternative und eine zusammenfassende Beschriftung.
 */
import { EmptyState } from "./primitives";
import styles from "./charts.module.css";

export type ChartPoint = {
  /** Kurze Beschriftung der X-Achse, z. B. „1“. */
  label: string;
  /** Wert in Prozent, 0 bis 100. */
  value: number;
  /** Zusatz für die Wertetabelle, z. B. das Datum. */
  detail?: string | undefined;
};

type ChartProps = {
  points: readonly ChartPoint[];
  title: string;
  yLabel: string;
  xLabel: string;
};

const WIDTH = 360;
const HEIGHT = 250;
const LEFT = 56;
const RIGHT = 14;
const TOP = 16;
const BOTTOM = 52;
const PLOT_W = WIDTH - LEFT - RIGHT;
const PLOT_H = HEIGHT - TOP - BOTTOM;
const GRID = [0, 25, 50, 75, 100] as const;
/** Bis zu dieser Zahl an Punkten steht der Wert an jedem Punkt. */
const MAX_LABELLED = 8;

const clamp = (value: number) => Math.min(100, Math.max(0, value));
const y = (value: number) => TOP + PLOT_H * (1 - clamp(value) / 100);

/** Kurzbeschreibung der Entwicklung, auch für Screenreader. */
export function describeSeries(
  title: string,
  points: readonly ChartPoint[],
): string {
  if (points.length === 0) return `${title}: keine Werte.`;
  const values = points.map((point) => point.value);
  const best = Math.max(...values);
  const first = values[0]!;
  const last = values[values.length - 1]!;
  if (points.length === 1) return `${title}: ein Wert, ${first} Prozent.`;
  const trend =
    last > first ? "gestiegen" : last < first ? "gesunken" : "gleich geblieben";
  return `${title}: ${points.length} Werte, von ${first} Prozent auf ${last} Prozent ${trend}, Bestwert ${best} Prozent.`;
}

function Frame({
  points,
  title,
  yLabel,
  xLabel,
  children,
  xAt,
}: ChartProps & {
  children: React.ReactNode;
  xAt: (index: number) => number;
}) {
  // Bei vielen Punkten nur jede n-te X-Beschriftung zeigen.
  const step = Math.max(1, Math.ceil(points.length / 8));
  return (
    <svg
      className={styles.svg}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={describeSeries(title, points)}
    >
      {GRID.map((tick) => (
        <g key={tick}>
          <line
            className={tick === 0 ? styles.axis : styles.grid}
            x1={LEFT}
            x2={WIDTH - RIGHT}
            y1={y(tick)}
            y2={y(tick)}
          />
          <text
            className={styles.tick}
            x={LEFT - 6}
            y={y(tick) + 4}
            textAnchor="end"
          >
            {tick} %
          </text>
        </g>
      ))}
      {points.map((point, index) =>
        index % step === 0 ? (
          <text
            key={index}
            className={styles.tick}
            x={xAt(index)}
            y={HEIGHT - BOTTOM + 16}
            textAnchor="middle"
          >
            {point.label}
          </text>
        ) : null,
      )}
      <text
        className={styles.axisTitle}
        x={LEFT + PLOT_W / 2}
        y={HEIGHT - 8}
        textAnchor="middle"
      >
        {xLabel}
      </text>
      <text
        className={styles.axisTitle}
        transform={`translate(11 ${TOP + PLOT_H / 2}) rotate(-90)`}
        textAnchor="middle"
      >
        {yLabel}
      </text>
      {children}
    </svg>
  );
}

function ValueTable({ points, title, xLabel, yLabel }: ChartProps) {
  const hasDetail = points.some((point) => point.detail);
  return (
    <details className={styles.details}>
      <summary>Wertetabelle anzeigen</summary>
      <table className={styles.table}>
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">{xLabel}</th>
            {hasDetail ? <th scope="col">Datum</th> : null}
            <th scope="col">{yLabel}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point, index) => (
            <tr key={index}>
              <th scope="row">{point.label}</th>
              {hasDetail ? <td>{point.detail ?? ""}</td> : null}
              <td>{point.value} %</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

function Chart(props: ChartProps & { kind: "line" | "bar" }) {
  const { points, title, kind } = props;
  if (points.length === 0) {
    return (
      <EmptyState title="Noch keine Werte">
        Sobald du eine Übung abgeschlossen hast, erscheint hier dein Diagramm.
      </EmptyState>
    );
  }
  const labelled = points.length <= MAX_LABELLED;
  const band = PLOT_W / points.length;
  const xAt = (index: number) =>
    kind === "bar" || points.length === 1
      ? LEFT + band * (index + 0.5)
      : LEFT + (PLOT_W * index) / (points.length - 1);
  const path = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${xAt(index)} ${y(point.value)}`,
    )
    .join(" ");
  const barWidth = Math.min(36, band * 0.6);
  return (
    <figure className={styles.figure}>
      <p className={styles.title}>{title}</p>
      <Frame {...props} xAt={xAt}>
        {kind === "line" ? (
          <>
            {points.length > 1 ? (
              <path className={styles.line} d={path} />
            ) : null}
            {points.map((point, index) => (
              <g key={index}>
                <circle
                  className={styles.dot}
                  cx={xAt(index)}
                  cy={y(point.value)}
                  r={5}
                >
                  <title>{`${props.xLabel} ${point.label}: ${point.value} %`}</title>
                </circle>
                {labelled ? (
                  <text
                    className={styles.value}
                    x={xAt(index)}
                    y={y(point.value) - 10}
                    textAnchor="middle"
                  >
                    {point.value} %
                  </text>
                ) : null}
              </g>
            ))}
          </>
        ) : (
          points.map((point, index) => {
            const height = Math.max(0, y(0) - y(point.value));
            const radius = Math.min(4, barWidth / 2, height);
            const x = xAt(index) - barWidth / 2;
            const top = y(point.value);
            return (
              <g key={index}>
                <path
                  className={styles.bar}
                  d={
                    height === 0
                      ? ""
                      : `M${x} ${y(0)} V${top + radius} Q${x} ${top} ${x + radius} ${top} H${x + barWidth - radius} Q${x + barWidth} ${top} ${x + barWidth} ${top + radius} V${y(0)} Z`
                  }
                >
                  <title>{`${props.xLabel} ${point.label}: ${point.value} %`}</title>
                </path>
                {labelled ? (
                  <text
                    className={styles.value}
                    x={xAt(index)}
                    y={top - 6}
                    textAnchor="middle"
                  >
                    {point.value} %
                  </text>
                ) : null}
              </g>
            );
          })
        )}
      </Frame>
      <ValueTable {...props} />
    </figure>
  );
}

export function LineChart(props: ChartProps) {
  return <Chart {...props} kind="line" />;
}

export function BarChart(props: ChartProps) {
  return <Chart {...props} kind="bar" />;
}
