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
import { QrIcon } from "../components/ui-icons";
import { Towers, type TowerData } from "./towers";
import "./house-ui.css";

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

  const shareLabels = {
    points: "Hauspunkte",
    rounds: "Lernrunden",
    correct: "Richtige Antworten",
  } as const;

  return (
    <StudentDashboardShell activePath="/haus">
      <div className="lr-house">
        <div className="lr-between" style={{ alignItems: "flex-end" }}>
          <div className="lr-stack" style={{ gap: 4 }}>
            <h1 className="lr-h1">Mein Haus</h1>
            <span className="lr-small lr-muted">
              {enrollment ? `${enrollment.className} · ` : ""}Woche{" "}
              {week.slice(-2)} · gezählt wird pro aktivem Mitglied
            </span>
          </div>
        </div>

        {!mine ? (
          <section className="lr-card lr-stack" aria-labelledby="house-choose">
            <h2
              id="house-choose"
              className="lr-fun"
              style={{ margin: 0, fontSize: 18 }}
            >
              Wähle dein Haus
            </h2>
            <p className="lr-small lr-muted" style={{ margin: 0 }}>
              Deine Lehrkraft sagt dir, zu welchem Haus du gehörst.
            </p>
            <div className="lr-select">
              {HOUSES.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  aria-pressed={false}
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
          </section>
        ) : null}

        <div className="lr-house-grid">
          <section
            className="lr-card lr-stack"
            style={{ borderRadius: 26 }}
            aria-label="Alle Häuser"
          >
            <div className="lr-between">
              <span className="lr-fun" style={{ fontSize: 17 }}>
                Alle Häuser
              </span>
              <span className="lr-tiny lr-muted">
                1 Stock = 50 Punkte pro Kopf
              </span>
            </div>
            <Towers
              houses={towers}
              mine={mine?.id ?? null}
              dark={dark}
              size="m"
              height={330}
            />
            <p
              className="lr-tiny lr-muted"
              style={{ margin: 0, fontWeight: 500 }}
            >
              Beispielstand. Den echten Wochenstand zeigt deine Lehrkraft am
              Beamer.
            </p>
          </section>

          <div className="lr-stack" style={{ gap: 14 }}>
            {mine ? (
              <div
                className="lr-hero"
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
                  className="lr-bob"
                />
                <span className="lr-stack lr-grow" style={{ gap: 3 }}>
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      letterSpacing: ".1em",
                      textTransform: "uppercase",
                      opacity: 0.75,
                    }}
                  >
                    Dein Haus
                  </span>
                  <span className="lr-fun" style={{ fontSize: 25 }}>
                    {mine.name}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      writeHouseState((prev) => ({ ...prev, house: null }))
                    }
                    style={{
                      alignSelf: "flex-start",
                      padding: 0,
                      border: 0,
                      background: "none",
                      color: "inherit",
                      font: "inherit",
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: "underline",
                      opacity: 0.8,
                      cursor: "pointer",
                    }}
                  >
                    Haus ändern
                  </button>
                </span>
                <span
                  className="lr-stack"
                  style={{ alignItems: "flex-end", gap: 2 }}
                >
                  <span
                    className="lr-fun"
                    style={{ fontSize: 30, fontWeight: 700 }}
                  >
                    {contribution.weekPoints}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.8 }}>
                    Punkte diese Woche
                  </span>
                </span>
              </div>
            ) : null}
            <div className="lr-card lr-stack" style={{ gap: 8 }}>
              <div className="lr-between">
                <span className="lr-fun" style={{ fontSize: 16 }}>
                  Dein Beitrag heute
                </span>
                <span
                  className="lr-fun"
                  style={{ fontSize: 16, color: "var(--accent)" }}
                >
                  {contribution.todayPoints} / {DAILY_POINT_LIMIT}
                </span>
              </div>
              <span className="lr-bar" style={{ height: 10 }}>
                <span
                  style={{
                    width: `${(contribution.todayPoints / DAILY_POINT_LIMIT) * 100}%`,
                  }}
                />
              </span>
              <span className="lr-small lr-muted">
                {contribution.todayPoints >= DAILY_POINT_LIMIT
                  ? "Tageslimit erreicht – morgen geht es weiter."
                  : `Noch ${DAILY_POINT_LIMIT - contribution.todayPoints} Punkte bis zum Tageslimit.`}{" "}
                Punkte gibt es für jede geübte Aufgabe, keine Minuspunkte.
              </span>
            </div>
          </div>
        </div>

        <section aria-label="Missionen" className="lr-missions">
          {missions.map((m) => {
            const done = m.n >= m.of;
            return (
              <div key={m.t} className="lr-card lr-stack" style={{ gap: 10 }}>
                <div className="lr-between">
                  <span
                    className="lr-fun"
                    style={{
                      display: "grid",
                      placeItems: "center",
                      minWidth: 38,
                      height: 30,
                      padding: "0 6px",
                      borderRadius: 10,
                      fontSize: done ? 16 : 12,
                      ...(done
                        ? {
                            background: "var(--green)",
                            color: "var(--green-ink)",
                          }
                        : {
                            background: "var(--accent-bg)",
                            color: "var(--accent)",
                          }),
                    }}
                  >
                    {done
                      ? "✓"
                      : `${Math.round((Math.min(m.n, m.of) / m.of) * 100)}%`}
                  </span>
                  <span className="lr-fun lr-muted" style={{ fontSize: 15 }}>
                    {Math.min(m.n, m.of)} / {m.of}
                  </span>
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 700 }}>{m.t}</span>
                <span
                  className={`lr-bar ${done ? "lr-bar--green" : ""}`}
                  style={{ height: 7, marginTop: "auto" }}
                >
                  <span
                    style={{ width: `${Math.min(100, (m.n / m.of) * 100)}%` }}
                  />
                </span>
              </div>
            );
          })}
        </section>

        {enrollments && enrollments.length > 1 ? (
          <label className="lr-row lr-small">
            Klasse für den Brief
            <select
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
          <button
            type="button"
            className="lr-btn lr-btn--dark"
            onClick={openLetter}
            disabled={!mine}
          >
            <QrIcon aria-hidden="true" />
            Leistungsbrief an Lehrkraft
          </button>
        ) : (
          <p className="lr-card lr-small" style={{ margin: 0 }}>
            Für den Leistungsbrief musst du in einer Klasse eingeschrieben sein.{" "}
            <Link
              href="/lernen/klasse"
              style={{ color: "var(--accent)", fontWeight: 700 }}
            >
              Klasse beitreten
            </Link>
          </p>
        )}

        {qrOpen ? (
          <>
            <button
              type="button"
              className="lr-scrim"
              aria-label="Schließen"
              onClick={() => setQrOpen(false)}
            />
            <div
              className="lr-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="letter-title"
            >
              <span className="lr-sheet__grip" />
              <div className="lr-between" style={{ alignSelf: "stretch" }}>
                <span
                  id="letter-title"
                  className="lr-fun"
                  style={{ fontSize: 20 }}
                >
                  Leistungsbrief
                </span>
                <button
                  type="button"
                  className="lr-btn lr-btn--soft"
                  style={{ minHeight: 40 }}
                  onClick={() => setQrOpen(false)}
                >
                  Schließen
                </button>
              </div>
              <div
                className="lr-row"
                style={{ flexWrap: "wrap", alignSelf: "stretch", gap: 6 }}
              >
                {(Object.keys(shareLabels) as (keyof typeof shareLabels)[]).map(
                  (k) => (
                    <button
                      key={k}
                      type="button"
                      className="lr-chip"
                      aria-pressed={state.share[k]}
                      onClick={() =>
                        writeHouseState((prev) => ({
                          ...prev,
                          sequence: prev.sequence + 1,
                          share: { ...prev.share, [k]: !prev.share[k] },
                        }))
                      }
                    >
                      {shareLabels[k]}
                    </button>
                  ),
                )}
              </div>
              {error ? (
                <p role="alert">{error}</p>
              ) : code ? (
                <div className="lr-qr">
                  <QRCodeSVG
                    value={code}
                    size={240}
                    level="M"
                    title="QR-Code mit deinem Leistungsbrief"
                  />
                </div>
              ) : (
                <p className="lr-small lr-muted">Brief wird erstellt …</p>
              )}
              <span
                className="lr-small lr-muted"
                style={{ textAlign: "center" }}
              >
                Halte den Code vor das Lehrergerät. Er bleibt sichtbar, bis du
                ihn schließt. Die Bestätigung siehst du dort. Übertragen werden
                nur die markierten Werte, Stand {Math.max(1, state.sequence)}.
              </span>
            </div>
          </>
        ) : null}
      </div>
    </StudentDashboardShell>
  );
}
