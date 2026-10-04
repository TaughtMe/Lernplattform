import type { CSSProperties } from "react";
import { Icon } from "../../ui/icons";
import { Animal, cx, type Theme } from "../parts/parts";
import { Keyboard } from "./keyboard";
import styles from "./map-screen.module.css";

export type MapMedal = "gold" | "silver" | "bronze";

export type MapLesson = {
  /** Kurzer Name, z. B. „Nur Zeigefinger“. */
  title: string;
  /** Neue Tasten der Lektion, z. B. „f und j“; ohne neue Tasten `null`. */
  keys: string | null;
  state: "done" | "current" | "open" | "locked";
  /** Medaille aus der besten Genauigkeit, nur bei geschafften Lektionen. */
  medal: MapMedal | null;
};

export type MapArea = { title: string; lessons: readonly MapLesson[] };

export type MapScreenProps = {
  animal: string | null;
  theme: Theme;
  areas: readonly MapArea[];
  today: { done: number; total: number; nextLabel: string | null };
  unsure: {
    keys: readonly string[];
    heat: Readonly<Record<string, number>>;
  };
  onToggleTheme?: () => void;
  /** Lektion nach laufender Nummer über alle Bereiche (ab 0). */
  onLesson?: (index: number) => void;
  onContinue?: () => void;
  onExtra?: () => void;
};

const MEDAL_LABEL: Record<MapMedal, string> = {
  gold: "Gold",
  silver: "Silber",
  bronze: "Bronze",
};

const WHITE = "#ffffff";
const SPARKLE =
  "polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%)";

function bar(
  left: number,
  top: number,
  width: number,
  height: number,
  turn: number,
): CSSProperties {
  return {
    left,
    top,
    width,
    height,
    borderRadius: 6,
    background: WHITE,
    transform: `rotate(${turn}deg)`,
  };
}
function spark(
  position: { left: number } | { right: number },
  top: number,
  size: number,
): CSSProperties {
  return {
    ...position,
    top,
    width: size,
    height: size,
    background: WHITE,
    clipPath: SPARKLE,
  };
}
function dot(right: number, top: number, size: number): CSSProperties {
  return {
    right,
    top,
    width: size,
    height: size,
    borderRadius: "50%",
    background: WHITE,
  };
}

/** Glanzpunkte der Vorlage (6c): fünf Muster, je Karte eines. */
const GLINTS: ReadonlyArray<readonly [CSSProperties, CSSProperties]> = [
  [bar(14, 12, 30, 8, -35), bar(12, 26, 12, 6, -35)],
  [spark({ right: 12 }, 10, 22), spark({ right: 34 }, 26, 11)],
  [
    {
      left: 10,
      top: 10,
      width: 40,
      height: 40,
      borderRadius: "50%",
      border: `5px solid ${WHITE}`,
      borderColor: `${WHITE} transparent transparent ${WHITE}`,
      transform: "rotate(-8deg)",
    },
    dot(14, 12, 9),
  ],
  [spark({ right: 10 }, 8, 16), bar(14, 14, 24, 6, -30)],
  [
    {
      ...dot(12, 12, 8),
      boxShadow: `12px 10px 0 -1px ${WHITE}, -2px 16px 0 -2px ${WHITE}`,
    },
    spark({ left: 12 }, 12, 16),
  ],
];

function Glint({ variant }: { variant: number }) {
  const [first, second] = GLINTS[variant % GLINTS.length] ?? GLINTS[0] ?? [];
  return (
    <>
      <span className={styles.glint} style={first} aria-hidden="true" />
      <span className={styles.glint} style={second} aria-hidden="true" />
    </>
  );
}

/** Leichte Schräglage je Karte, damit die Reihen nicht starr wirken. */
const TILT = [-2, 1.5, -1, 2, 0.5];

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

/** Übersicht der Tastenwelt: alle Stationen als Karten (Design 6c). */
export function MapScreen(props: MapScreenProps) {
  const { areas, today, unsure } = props;
  const lessons = areas.flatMap((area) =>
    area.lessons.map((lesson, lessonIndex) => ({
      lesson,
      area: areas.indexOf(area),
      lessonIndex,
    })),
  );
  const done = lessons.filter(({ lesson }) => lesson.state === "done").length;
  return (
    <div className={styles.screen} lang="de">
      <div className={styles.layout}>
        <section className={styles.main} aria-labelledby="tw-title">
          <header className={styles.head}>
            <span className={styles.titles}>
              <h1 id="tw-title" className={styles.title}>
                Tastenwelt
              </h1>
              <span className={styles.subtitle}>
                {areas.length} Bereiche von der Grundstellung bis zum freien
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

          <div className={styles.board}>
            <p className={styles.count}>
              {done} von {lessons.length} Stationen geschafft
            </p>
            <ol className={styles.cards}>
              {lessons.map(({ lesson, area }, index) => {
                const label = lesson.keys ?? lesson.title;
                return (
                  <li key={index} className={styles.cardItem}>
                    <button
                      type="button"
                      title={label}
                      className={cx(
                        styles.card,
                        styles[
                          lesson.medal ??
                            (lesson.state === "done" ? "gold" : lesson.state)
                        ],
                      )}
                      style={
                        {
                          "--tilt": `${TILT[(index * 3) % TILT.length]}deg`,
                        } as CSSProperties
                      }
                      disabled={lesson.state === "locked"}
                      aria-label={`Lektion ${index + 1}: ${lesson.title}${
                        lesson.keys ? ` (${lesson.keys})` : ""
                      }${
                        lesson.medal
                          ? `, geschafft mit ${MEDAL_LABEL[lesson.medal]}`
                          : lesson.state === "current"
                            ? ", hier geht es weiter"
                            : lesson.state === "locked"
                              ? ", noch gesperrt"
                              : ""
                      }`}
                      aria-current={
                        lesson.state === "current" ? "step" : undefined
                      }
                      onClick={() => props.onLesson?.(index)}
                    >
                      {lesson.medal ? (
                        <Glint variant={index * 7 + area * 3} />
                      ) : null}
                      <span
                        className={cx(
                          styles.cardMain,
                          label.length > 13
                            ? styles.cardLong
                            : label.length > 10
                              ? styles.cardMid
                              : null,
                        )}
                      >
                        {label}
                      </span>
                      <span className={styles.cardNumber} aria-hidden="true">
                        {index + 1}
                      </span>
                    </button>
                    {lesson.state === "current" && props.animal ? (
                      <Animal
                        animal={props.animal}
                        size={46}
                        fluid
                        className={styles.buddy}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ol>
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
              {Array.from({ length: 10 }, (_, index) => (
                <span
                  key={index}
                  className={cx(
                    index <
                      Math.round(
                        (today.done / Math.max(1, today.total)) * 10,
                      ) && styles.filled,
                  )}
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
