"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ClassEnrollment } from "../../src/domain/class-enrollment";
import {
  createHouseLetterCode,
  DAILY_POINT_LIMIT,
  houseById,
  houseContribution,
  HOUSES,
  isoWeek,
  perHead,
  type HouseContribution,
  type HouseId,
} from "../../src/domain/houses";
import {
  readHouseState,
  subscribeHouse,
  writeHouseState,
  DEFAULT_HOUSE_STATE,
} from "../../src/storage/house";
import { createPersonalLearningEventRepository } from "../../src/storage/personal-learning-events";
import { createStudentClassesRepository } from "../../src/storage/student-classes";
import { StudentDashboardShell } from "../components/student-dashboard-shell";
import { Icon } from "../ui/icons";
import { Button, Card, ProgressBar } from "../ui/primitives";
import { Sheet } from "../ui/sheet";
import { Towers, type TowerData } from "./towers";

/**
 * Beispielstand der anderen Häuser. Schülergeräte haben bewusst keinen
 * Rückkanal (Air-Gap, Entscheidungsprotokoll Nr. 5); der echte Wochenstand
 * steht in der Beamer-Ansicht der Lehrkraft.
 */
const SAMPLE: Record<
  HouseId,
  { pts: number; active: number; members: number }
> = {
  phoenix: { pts: 3420, active: 7, members: 8 },
  orca: { pts: 3180, active: 8, members: 8 },
  chameleon: { pts: 2890, active: 6, members: 7 },
  einhorn: { pts: 3050, active: 7, members: 8 },
};

export function useIsDark(): boolean {
  return useSyncExternalStore(
    (listener) => {
      const observer = new MutationObserver(listener);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });
      return () => observer.disconnect();
    },
    () => document.documentElement.dataset["theme"] === "dark",
    () => false,
  );
}

function useHouseState() {
  return useSyncExternalStore(
    subscribeHouse,
    readHouseState,
    () => DEFAULT_HOUSE_STATE,
  );
}

const EMPTY_CONTRIBUTION: HouseContribution = {
  week: "",
  weekPoints: 0,
  todayPoints: 0,
  rounds: 0,
  correct: 0,
  activeDays: 0,
};

const SHARE_LABELS = {
  points: "Hauspunkte",
  rounds: "Lernrunden",
  correct: "Richtige Antworten",
} as const;

/** Mein Haus (Design 7a/7b): Türme, Tagesbeitrag, Missionen, signierter QR-Leistungsbrief. */
export function HouseApp() {
  const dark = useIsDark();
  const state = useHouseState();
  const [enrollments, setEnrollments] = useState<ClassEnrollment[] | null>(
    null,
  );
  const [contribution, setContribution] =
    useState<HouseContribution>(EMPTY_CONTRIBUTION);
  const [membershipId, setMembershipId] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    createStudentClassesRepository()
      .list()
      .then((list) => {
        if (!cancelled) setEnrollments(list);
      })
      .catch(() => {
        if (!cancelled) setEnrollments([]);
      });
    createPersonalLearningEventRepository()
      .list()
      .then((events) => {
        if (!cancelled) setContribution(houseContribution(events, new Date()));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const enrollment =
    enrollments?.find((e) => e.membershipId === membershipId) ??
    enrollments?.[0] ??
    null;
  const mine = state.house ? houseById(state.house) : null;
  const week = isoWeek(new Date());

  // Signierten Brief erzeugen, sobald er geöffnet ist (neu bei jeder Änderung der Freigaben).
  useEffect(() => {
    if (!qrOpen || !enrollment || !state.house) return;
    let cancelled = false;
    createHouseLetterCode(
      {
        version: 1,
        kind: "house",
        classId: enrollment.classId,
        membershipId: enrollment.membershipId,
        house: state.house,
        week,
        sequence: Math.max(1, state.sequence),
        ...(state.share.points ? { points: contribution.weekPoints } : {}),
        ...(state.share.rounds ? { rounds: contribution.rounds } : {}),
        ...(state.share.correct ? { correct: contribution.correct } : {}),
      },
      enrollment.enrollmentToken,
    )
      .then((value) => {
        if (!cancelled) {
          setCode(value);
          setError("");
        }
      })
      .catch(() => {
        if (!cancelled)
          setError("Der Leistungsbrief konnte nicht erstellt werden.");
      });
    return () => {
      cancelled = true;
    };
  }, [qrOpen, enrollment, state, contribution, week]);

  const towers: TowerData[] = useMemo(
    () =>
      HOUSES.map((h) => {
        const s = SAMPLE[h.id];
        const pts = s.pts + (mine?.id === h.id ? contribution.weekPoints : 0);
        return {
          id: h.id,
          name: h.name,
          hue: h.hue,
          animal: h.animal,
          perHead: perHead(pts, s.active),
          active: `${s.active}/${s.members} aktiv`,
        };
      }),
    [mine, contribution.weekPoints],
  );

  const missions = [
    { t: "An fünf Tagen lernen", n: contribution.activeDays, of: 5 },
    { t: "50 richtige Antworten", n: contribution.correct, of: 50 },
    { t: "10 Lernrunden abschließen", n: contribution.rounds, of: 10 },
    {
      t: "Tagesziel erreichen",
      n: contribution.todayPoints,
      of: DAILY_POINT_LIMIT,
    },
  ];

  const openLetter = () => {
    writeHouseState((prev) => ({ ...prev, sequence: prev.sequence + 1 }));
    setQrOpen(true);
  };

  return (
    <StudentDashboardShell activePath="/haus">
      <div className="ui-page ui-house ui-dots">
        <div className="ui-stack" style={{ ["--gap" as string]: "4px" }}>
          <h1 className="ui-h-fun">Mein Haus</h1>
          <p className="ui-small ui-muted">
            {enrollment ? `${enrollment.className} · ` : ""}Woche{" "}
            {week.slice(-2)} · gezählt wird pro aktivem Mitglied
          </p>
        </div>

        {!mine ? (
          <Card look="pop" className="ui-stack" aria-labelledby="house-choose">
            <h2 id="house-choose" className="ui-h-section">
              Wähle dein Haus
            </h2>
            <p className="ui-small ui-muted">
              Deine Lehrkraft sagt dir, zu welchem Haus du gehörst.
            </p>
            <div className="ui-house__choose">
              {HOUSES.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  className="ui-select-card ui-house__option"
                  onClick={() =>
                    writeHouseState((prev) => ({ ...prev, house: h.id }))
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- festes Haus-Tier */}
                  <img src={`/animals/${h.animal}.svg`} alt="" />
                  {h.name}
                </button>
              ))}
            </div>
          </Card>
        ) : null}

        <div className="ui-house__grid">
          <Card look="pop" className="ui-stack" aria-labelledby="all-houses">
            <div className="ui-between">
              <h2 id="all-houses" className="ui-h-section">
                Alle Häuser
              </h2>
              <span className="ui-tiny ui-muted">
                diese Woche · 1 Stock = 50 pro Kopf
              </span>
            </div>
            <Towers
              houses={towers}
              mine={mine?.id ?? null}
              dark={dark}
              size="m"
              height={330}
            />
            <p className="ui-tiny ui-muted">
              Beispielstand. Den echten Wochenstand zeigt deine Lehrkraft am
              Beamer.
            </p>
          </Card>

          <div className="ui-stack">
            {mine ? (
              <div
                className="ui-house__hero"
                style={
                  dark
                    ? {
                        background: `oklch(0.4 0.09 ${mine.hue})`,
                        color: "#fff",
                        boxShadow: `0 5px 0 oklch(0.28 0.07 ${mine.hue})`,
                      }
                    : {
                        background: `oklch(0.84 0.11 ${mine.hue})`,
                        color: "#211f1b",
                        boxShadow: `0 5px 0 oklch(0.58 0.14 ${mine.hue})`,
                      }
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- festes Haus-Tier */}
                <img
                  src={`/animals/${mine.animal}.svg`}
                  alt=""
                  width={64}
                  height={64}
                  className="ui-bob"
                />
                <span className="ui-stack ui-grow ui-house__hero-text">
                  <span className="ui-house__hero-eyebrow">Dein Haus</span>
                  <span className="ui-fun ui-house__hero-name">
                    {mine.name}
                  </span>
                  <button
                    type="button"
                    className="ui-house__change"
                    onClick={() =>
                      writeHouseState((prev) => ({ ...prev, house: null }))
                    }
                  >
                    Haus ändern
                  </button>
                </span>
                <span className="ui-house__hero-points">
                  <span className="ui-fun">{contribution.weekPoints}</span>
                  <span>Punkte diese Woche</span>
                </span>
              </div>
            ) : null}
            <Card look="pop" className="ui-stack" aria-labelledby="today">
              <div className="ui-between">
                <h2 id="today" className="ui-h-section">
                  Dein Beitrag heute
                </h2>
                <span className="ui-fun ui-house__today">
                  {contribution.todayPoints} / {DAILY_POINT_LIMIT}
                </span>
              </div>
              <ProgressBar
                value={contribution.todayPoints}
                max={DAILY_POINT_LIMIT}
                label="Beitrag heute"
              />
              <p className="ui-small ui-muted">
                {contribution.todayPoints >= DAILY_POINT_LIMIT
                  ? "Tageslimit erreicht – morgen geht es weiter."
                  : `Noch ${DAILY_POINT_LIMIT - contribution.todayPoints} Punkte bis zum Tageslimit.`}{" "}
                Punkte gibt es für jede geübte Aufgabe, keine Minuspunkte.
              </p>
            </Card>
          </div>
        </div>

        <section className="ui-stack" aria-labelledby="missions">
          <h2 id="missions" className="ui-h-section">
            Hausmissionen
          </h2>
          <div className="ui-house__missions">
            {missions.map((m) => {
              const done = m.n >= m.of;
              const shown = Math.min(m.n, m.of);
              return (
                <div
                  key={m.t}
                  className="ui-card ui-card--pop ui-house__mission"
                >
                  <span
                    className={`ui-fun ui-house__badge${done ? " is-done" : ""}`}
                    aria-hidden="true"
                  >
                    {done ? (
                      <Icon name="check" size={18} />
                    ) : (
                      `${Math.round((shown / m.of) * 100)}%`
                    )}
                  </span>
                  <span className="ui-stack ui-grow">
                    <span className="ui-between">
                      <strong>{m.t}</strong>
                      <span className="ui-fun ui-muted">
                        {shown} / {m.of}
                      </span>
                    </span>
                    <ProgressBar
                      value={m.n}
                      max={m.of}
                      label={m.t}
                      {...(done ? { tone: "green" as const } : {})}
                    />
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {enrollments && enrollments.length > 1 ? (
          <label className="ui-stack ui-label">
            Klasse für den Brief
            <select
              className="ui-input"
              value={enrollment?.membershipId ?? ""}
              onChange={(e) => setMembershipId(e.target.value)}
            >
              {enrollments.map((e) => (
                <option key={e.membershipId} value={e.membershipId}>
                  {e.className}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {enrollment ? (
          <Button
            variant="dark"
            size="lg"
            block
            className="ui-house__letter"
            onClick={openLetter}
            disabled={!mine}
          >
            <Icon name="qr" size={20} />
            Leistungsbrief an Lehrkraft
          </Button>
        ) : (
          <p className="ui-notice">
            Für den Leistungsbrief musst du in einer Klasse eingeschrieben sein.{" "}
            <Link className="ui-house__link" href="/lernen/klasse">
              Klasse beitreten
            </Link>
          </p>
        )}

        <Sheet
          open={qrOpen}
          title="Leistungsbrief"
          onClose={() => setQrOpen(false)}
        >
          <div
            className="ui-row ui-wrap"
            role="group"
            aria-label="Diese Werte übertragen"
            style={{ ["--gap" as string]: "6px" }}
          >
            {(Object.keys(SHARE_LABELS) as (keyof typeof SHARE_LABELS)[]).map(
              (k) => (
                <button
                  key={k}
                  type="button"
                  className="ui-chip"
                  aria-pressed={state.share[k]}
                  onClick={() =>
                    writeHouseState((prev) => ({
                      ...prev,
                      sequence: prev.sequence + 1,
                      share: { ...prev.share, [k]: !prev.share[k] },
                    }))
                  }
                >
                  {SHARE_LABELS[k]}
                </button>
              ),
            )}
          </div>
          {error ? (
            <p className="ui-notice ui-notice--bad" role="alert">
              {error}
            </p>
          ) : code ? (
            <div className="ui-house__qr">
              <QRCodeSVG
                value={code}
                size={240}
                level="M"
                title="QR-Code mit deinem Leistungsbrief"
              />
            </div>
          ) : (
            <p className="ui-small ui-muted">Brief wird erstellt …</p>
          )}
          <p className="ui-small ui-muted ui-center">
            Halte den Code vor das Lehrergerät. Er bleibt sichtbar, bis du ihn
            schließt. Die Bestätigung siehst du dort. Übertragen werden nur die
            markierten Werte, Stand {Math.max(1, state.sequence)}.
          </p>
        </Sheet>
      </div>
    </StudentDashboardShell>
  );
}
