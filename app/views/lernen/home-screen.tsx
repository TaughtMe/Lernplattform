import Link from "next/link";
import { Icon } from "../../ui/icons";
import { Animal, cx, HomeLink, ThemeSwitch, type Theme } from "../parts/parts";
import styles from "./home-screen.module.css";

export type WeekDay = {
  short: string;
  label: string;
  state: "active" | "missed" | "upcoming";
  today: boolean;
};

export type HomeScreenProps = {
  /** Kopfzeile, z. B. „Klasse 7b“ oder „Lernraum“. */
  title: string;
  animal: string | null;
  theme: Theme;
  /** Heute erledigte Aufgaben und Tagesziel für den Ring. */
  done: number;
  target: number;
  continueHref: string;
  week: readonly WeekDay[];
  due: { done: number; total: number };
  difficult: ReadonlyArray<{ label: string; detail: string }>;
  practiceHref: string | null;
  /** Nur mit freigegebener Motivation (Entscheidung 47). */
  streakDays?: number | undefined;
  badges?: { count: number; hint: string } | undefined;
  duelHref?: string | undefined;
  onToggleTheme?: () => void;
};

const RING = { size: 290, radius: 132, stroke: 11 };

/** Lernen-Startseite (Design 3b/2b mobil, 3a breit). */
export function HomeScreen(props: HomeScreenProps) {
  const { done, target, due, difficult, week } = props;
  const length = 2 * Math.PI * RING.radius;
  // Ohne fällige Aufgaben ist der Tag erledigt (Ring voll, wenn geübt wurde).
  const ratio = target > 0 ? Math.min(1, done / target) : done > 0 ? 1 : 0;
  const open = Math.max(0, due.total - due.done);
  const activeDays = week.filter((day) => day.state === "active").length;
  return (
    <div className={styles.screen}>
      <div className={styles.layout}>
        <section className={styles.main} aria-labelledby="home-title">
          <header className={styles.head}>
            <div className={styles.headStart}>
              <HomeLink />
              <h1 id="home-title" className={styles.title}>
                {props.title}
              </h1>
            </div>
            <ThemeSwitch theme={props.theme} onToggle={props.onToggleTheme} />
          </header>
          <div className={styles.stage}>
            <div className={styles.ringWrap}>
              <svg
                className={styles.ring}
                width={RING.size}
                height={RING.size}
                viewBox={`0 0 ${RING.size} ${RING.size}`}
                aria-hidden="true"
              >
                <circle
                  cx={RING.size / 2}
                  cy={RING.size / 2}
                  r={RING.radius}
                  fill="none"
                  stroke="var(--ring)"
                  strokeWidth={RING.stroke}
                />
                <circle
                  cx={RING.size / 2}
                  cy={RING.size / 2}
                  r={RING.radius}
                  fill="none"
                  stroke="var(--gold)"
                  strokeWidth={RING.stroke}
                  strokeLinecap="round"
                  strokeDasharray={`${length} ${length}`}
                  strokeDashoffset={length * (1 - ratio)}
                  transform={`rotate(-90 ${RING.size / 2} ${RING.size / 2})`}
                />
              </svg>
              <Link
                href={props.continueHref}
                className={styles.disc}
                aria-label="Weiterlernen"
              >
                {props.animal ? (
                  <Animal
                    animal={props.animal}
                    size={194}
                    fluid
                    className={styles.animal}
                  />
                ) : null}
              </Link>
              {props.streakDays ? (
                <span className={styles.streak}>
                  <Icon name="bolt" size={14} />
                  {props.streakDays} {props.streakDays === 1 ? "Tag" : "Tage"}
                </span>
              ) : null}
            </div>
            <div className={styles.name}>
              <p className={styles.animalName}>
                {props.animal ?? "Dein Lernraum"}
              </p>
              <p className={styles.today}>
                {target === 0
                  ? done > 0
                    ? "Alles Fällige erledigt – alles Weitere ist ein Extra"
                    : "Heute ist nichts fällig – frei üben"
                  : done >= target
                    ? "Tagesziel geschafft – alles Weitere ist ein Extra"
                    : `${done} von ${target} Aufgaben heute`}
              </p>
            </div>
            <div className={styles.actions}>
              <Link href={props.continueHref} className={styles.continue}>
                <Icon name="arrow" size={20} strokeWidth={2} />
                Weiterlernen
              </Link>
              {props.duelHref ? (
                <Link href={props.duelHref} className={styles.duel}>
                  <Icon name="duel" size={20} />
                  Duell
                </Link>
              ) : null}
            </div>
            <div className={styles.cards}>
              <div className={styles.card}>
                <p className={styles.cardValue}>{open}</p>
                <p className={styles.cardLabel}>heute fällig</p>
              </div>
              <div className={styles.card}>
                <p className={styles.cardValue}>{difficult.length}</p>
                <p className={styles.cardLabel}>schwierige Wörter</p>
              </div>
            </div>
          </div>
        </section>

        <aside className={styles.side} aria-label="Fortschritt">
          <section className={styles.panel} aria-labelledby="home-week">
            <div className={styles.panelHead}>
              <h2 id="home-week" className={styles.panelTitle}>
                Diese Woche
              </h2>
              <span className={styles.panelMeta}>{activeDays} von 7 Tagen</span>
            </div>
            <ol className={styles.week}>
              {week.map((day) => (
                <li
                  key={day.short}
                  className={cx(
                    styles.day,
                    day.state === "active" && styles.active,
                    day.state === "upcoming" && styles.upcoming,
                    day.today && styles.today,
                  )}
                  aria-label={`${day.label}: ${
                    day.state === "active"
                      ? "geübt"
                      : day.state === "upcoming"
                        ? "kommt noch"
                        : "nicht geübt"
                  }`}
                >
                  {day.short}
                </li>
              ))}
            </ol>
          </section>

          <section className={styles.panel} aria-labelledby="home-due">
            <div className={styles.panelHead}>
              <h2 id="home-due" className={styles.panelTitle}>
                Heute fällig
              </h2>
              <span className={styles.panelCount}>
                {due.done} / {due.total}
              </span>
            </div>
            <div className={styles.bar} aria-hidden="true">
              <span
                style={{
                  width: `${due.total ? Math.round((due.done / due.total) * 100) : 0}%`,
                }}
              />
            </div>
            <p className={styles.hint}>
              {open
                ? `Noch ${open} ${open === 1 ? "Aufgabe" : "Aufgaben"}, dann ist der Tag voll.`
                : "Für heute ist alles geschafft."}
            </p>
          </section>

          {difficult.length ? (
            <section className={styles.panel} aria-labelledby="home-hard">
              <h2 id="home-hard" className={styles.panelTitle}>
                Schwierige Wörter
              </h2>
              <ul className={styles.words}>
                {difficult.map((word) => (
                  <li key={word.label} className={styles.word}>
                    <span className={styles.wordLabel}>{word.label}</span>
                    <span className={styles.wordMeta}>{word.detail}</span>
                  </li>
                ))}
              </ul>
              {props.practiceHref ? (
                <Link href={props.practiceHref} className={styles.practice}>
                  Nur diese üben
                </Link>
              ) : null}
            </section>
          ) : null}

          {props.badges ? (
            <section className={cx(styles.panel, styles.badges)}>
              <span>
                <h2 className={styles.panelTitle}>Abzeichen</h2>
                <span className={styles.panelMeta}>{props.badges.hint}</span>
              </span>
              <span className={styles.badgeCount}>{props.badges.count}</span>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
