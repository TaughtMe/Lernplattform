import type { CSSProperties } from "react";
import { Icon } from "../../ui/icons";
import { Animal, cx, type Theme } from "../parts/parts";
import { Keyboard } from "./keyboard";
import styles from "./map-screen.module.css";

export type MapStation = {
  title: string;
  state: "done" | "current" | "locked";
  /** 0–3 Sterne aus der besten Genauigkeit. */
  stars: number;
};

export type MapScreenProps = {
  animal: string | null;
  theme: Theme;
  stations: readonly MapStation[];
  today: { done: number; total: number; nextLabel: string | null };
  unsure: {
    keys: readonly string[];
    heat: Readonly<Record<string, number>>;
  };
  onToggleTheme?: () => void;
  onStation?: (index: number) => void;
  onContinue?: () => void;
  onExtra?: () => void;
};

/** Stützpunkte des Pfads im Koordinatenraum 670 × 540 (Design 6c). */
const POINTS: ReadonlyArray<readonly [number, number]> = [
  [70, 92],
  [230, 66],
  [395, 100],
  [570, 78],
  [600, 262],
  [425, 290],
  [245, 252],
  [88, 420],
  [310, 462],
  [560, 440],
];
const HUES = [25, 60, 95, 140, 185, 245, 295, 345, 25, 60];

/** Glatter Pfad (Catmull-Rom) von Station `from` bis `to`. */
function pathBetween(from: number, to: number) {
  const pts = POINTS.slice(0, Math.max(1, Math.min(POINTS.length, to + 1)));
  let d = `M${pts[from]![0]} ${pts[from]![1]}`;
  for (let i = from; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${
      p2[0] - (p3[0] - p1[0]) / 6
    } ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

function listKeys(keys: readonly string[]) {
  const shown = keys.map((key) =>
    key === " "
      ? "Leertaste"
      : key.toLocaleUpperCase("de-DE") === "SS"
        ? key
        : key.toLocaleUpperCase("de-DE"),
  );
  if (shown.length <= 1) return shown.join("");
  return `${shown.slice(0, -1).join(", ")} und ${shown.at(-1)}`;
}

/** Lernweg der Tastenwelt (Design 6c). */
export function MapScreen(props: MapScreenProps) {
  const { stations, today, unsure } = props;
  const current = stations.findIndex((station) => station.state === "current");
  const reached = current < 0 ? stations.length - 1 : current;
  const onPath = stations.length <= POINTS.length;
  return (
    <div className={styles.screen}>
      <div className={styles.layout}>
        <section className={styles.main} aria-labelledby="tw-title">
          <header className={styles.head}>
            <span className={styles.titles}>
              <h1 id="tw-title" className={styles.title}>
                Tastenwelt
              </h1>
              <span className={styles.subtitle}>
                {stations.length} Stationen von der Grundstellung bis zum freien
                Abschreiben
              </span>
            </span>
            <button
              type="button"
              className={styles.raised}
              aria-label="Hell oder dunkel"
              onClick={props.onToggleTheme}
            >
              <Icon name={props.theme === "dark" ? "sun" : "moon"} size={19} />
            </button>
          </header>

          <div className={styles.map}>
            <div className={styles.canvas}>
              {onPath ? (
                <svg
                  className={styles.path}
                  viewBox="0 0 670 540"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d={pathBetween(reached, stations.length - 1)}
                    stroke="var(--line2)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray="2 14"
                  />
                  <path
                    d={pathBetween(0, reached)}
                    stroke="var(--gold)"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                </svg>
              ) : null}
              <ol className={styles.stations} aria-label="Lernweg">
                {stations.map((station, index) => {
                  const point = POINTS[index] ?? POINTS.at(-1)!;
                  return (
                    <li
                      key={station.title}
                      className={cx(styles.station, styles[station.state])}
                      style={
                        {
                          "--x": `${(point[0] / 670) * 100}%`,
                          "--y": `${(point[1] / 540) * 100}%`,
                          "--hue": HUES[index % HUES.length],
                        } as CSSProperties
                      }
                    >
                      {station.state === "current" && props.animal ? (
                        <Animal
                          animal={props.animal}
                          size={70}
                          fluid
                          className={styles.buddy}
                        />
                      ) : null}
                      <button
                        type="button"
                        className={styles.node}
                        disabled={station.state === "locked"}
                        aria-label={`Station ${index + 1}: ${station.title}${
                          station.state === "done"
                            ? `, ${station.stars} von 3 Sternen`
                            : station.state === "locked"
                              ? ", noch gesperrt"
                              : ", aktuelle Station"
                        }`}
                        onClick={() => props.onStation?.(index)}
                      >
                        {index + 1}
                      </button>
                      <span className={styles.label}>{station.title}</span>
                      {station.state === "done" ? (
                        <span className={styles.stars} aria-hidden="true">
                          {"★".repeat(station.stars)}
                          {"☆".repeat(3 - station.stars)}
                        </span>
                      ) : null}
                      {station.state === "current" ? (
                        <button
                          type="button"
                          className={styles.go}
                          onClick={() => props.onStation?.(index)}
                        >
                          Weiter üben
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </section>

        <aside className={styles.side} aria-label="Heute und unsichere Tasten">
          <section className={styles.today} aria-labelledby="tw-today">
            <div className={styles.todayHead}>
              <h2 id="tw-today" className={styles.eyebrow}>
                Heute
              </h2>
            </div>
            <span className={styles.todayValue}>
              {today.done} von {today.total} Lektionen
            </span>
            <div className={styles.segments} aria-hidden="true">
              {stations.map((station, index) => (
                <span
                  key={index}
                  className={cx(station.state === "done" && styles.filled)}
                />
              ))}
            </div>
            {today.nextLabel ? (
              <button
                type="button"
                className={styles.continue}
                onClick={props.onContinue}
              >
                {today.nextLabel}
              </button>
            ) : null}
          </section>

          <section className={styles.unsure} aria-labelledby="tw-unsure">
            <h2 id="tw-unsure" className={styles.unsureTitle}>
              Unsichere Tasten
            </h2>
            <Keyboard size="small" heat={unsure.heat} />
            <p className={styles.unsureText}>
              {unsure.keys.length
                ? `${listKeys(unsure.keys)} gingen zuletzt am häufigsten daneben. Sie kommen im Tasten-Extra öfter vor.`
                : "Noch keine Auffälligkeiten. Nach den ersten Runden erscheinen hier die Tasten, die öfter danebengehen."}
            </p>
            {unsure.keys.length && props.onExtra ? (
              <button
                type="button"
                className={styles.extra}
                onClick={props.onExtra}
              >
                Tasten-Extra
              </button>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  );
}
