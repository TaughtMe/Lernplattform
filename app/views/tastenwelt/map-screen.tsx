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
const MEDAL_STARS: Record<MapMedal, number> = { gold: 3, silver: 2, bronze: 1 };

const SPARKLE =
  "M15 3 L17.5 12.5 L27 15 L17.5 17.5 L15 27 L12.5 17.5 L3 15 L12.5 12.5 Z";

/** Glanz-Muster je Ecke; vier Varianten wechseln von Karte zu Karte. */
function Gloss({ variant }: { variant: number }) {
  const left =
    variant === 0 ? (
      <path
        d="M5 22 L22 8"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
    ) : variant === 1 ? (
      <path
        d="M5 27 A18 18 0 0 1 24 5"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    ) : variant === 2 ? (
      <path
        d={SPARKLE}
        fill="currentColor"
        transform="translate(3 3) scale(0.8)"
      />
    ) : null;
  const right =
    variant === 1 ? (
      <circle cx="22" cy="8" r="3.5" fill="currentColor" />
    ) : variant === 2 ? (
      <>
        <circle cx="18" cy="7" r="3" fill="currentColor" />
        <circle cx="25" cy="15" r="2.2" fill="currentColor" />
      </>
    ) : variant === 3 ? (
      <>
        <path
          d={SPARKLE}
          fill="currentColor"
          transform="translate(6 0) scale(0.8)"
        />
        <path
          d={SPARKLE}
          fill="currentColor"
          transform="translate(0 15) scale(0.45)"
        />
      </>
    ) : (
      <path
        d={SPARKLE}
        fill="currentColor"
        transform="translate(9 1) scale(0.6)"
      />
    );
  return (
    <>
      {left ? (
        <svg
          className={cx(styles.gloss, styles.glossLeft)}
          viewBox="0 0 30 30"
          fill="none"
          aria-hidden="true"
        >
          {left}
        </svg>
      ) : null}
      <svg
        className={cx(styles.gloss, styles.glossRight)}
        viewBox="0 0 30 30"
        fill="none"
        aria-hidden="true"
      >
        {right}
      </svg>
    </>
  );
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

/** Übersicht der Tastenwelt: alle Lektionen als Karten, nach Bereichen. */
export function MapScreen(props: MapScreenProps) {
  const { areas, today, unsure } = props;
  const lessons = areas.flatMap((area) => area.lessons);
  const done = lessons.filter((lesson) => lesson.state === "done").length;
  // Laufende Nummer der ersten Lektion je Bereich.
  const offsets = areas.map((_, areaIndex) =>
    areas
      .slice(0, areaIndex)
      .reduce((sum, area) => sum + area.lessons.length, 0),
  );
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
            <div className={styles.boardHead}>
              <p className={styles.count}>
                {done} von {lessons.length} Lektionen geschafft
              </p>
              <p className={styles.legend}>
                {(
                  [
                    ["bronze", "Bronze ab 90 %"],
                    ["silver", "Silber ab 94 %"],
                    ["gold", "Gold ab 97 %"],
                  ] as const
                ).map(([medal, label]) => (
                  <span key={medal} className={styles.legendItem}>
                    <span className={cx(styles.legendDot, styles[medal])} />
                    {label}
                  </span>
                ))}
              </p>
            </div>
            {areas.map((area, areaIndex) => (
              <section
                key={area.title}
                className={styles.area}
                aria-label={area.title}
              >
                <h2 className={styles.areaTitle}>{area.title}</h2>
                <ol className={styles.cards}>
                  {area.lessons.map((lesson, lessonIndex) => {
                    const index = (offsets[areaIndex] ?? 0) + lessonIndex;
                    const main = lesson.keys ?? lesson.title;
                    return (
                      <li key={index} className={styles.cardItem}>
                        <button
                          type="button"
                          className={cx(
                            styles.card,
                            styles[
                              lesson.medal ??
                                (lesson.state === "done"
                                  ? "gold"
                                  : lesson.state)
                            ],
                          )}
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
                          {lesson.state === "locked" ? null : (
                            <Gloss variant={index % 4} />
                          )}
                          <span className={styles.cardText}>
                            <span
                              className={cx(
                                styles.cardMain,
                                lesson.keys && styles.cardKeys,
                              )}
                            >
                              {main}
                            </span>
                            {lesson.keys ? (
                              <span className={styles.cardSub}>
                                {lesson.title}
                              </span>
                            ) : null}
                          </span>
                          <span className={styles.cardFoot}>
                            <span className={styles.cardNumber}>
                              {index + 1}
                            </span>
                            {lesson.medal ? (
                              <span className={styles.medal} aria-hidden="true">
                                {"★".repeat(MEDAL_STARS[lesson.medal])}
                              </span>
                            ) : null}
                          </span>
                        </button>
                        {lesson.state === "current" && props.animal ? (
                          <Animal
                            animal={props.animal}
                            size={52}
                            fluid
                            className={styles.buddy}
                          />
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
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
