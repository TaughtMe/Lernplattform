"use client";

import type { CSSProperties } from "react";
import { summarizeLiveProjection } from "../../../../src/domain/live-projection";
import { Animal, cx, Eyebrow } from "../../parts/parts";
import styles from "../teacher-dictation-screen.module.css";
import type {
  LiveWordError,
  ParticipantStatus,
  TeacherDictationScreenProps,
} from "./types";

export function LiveStep({
  roomCode,
  mode,
  live,
  roomTimes,
  projection,
  qrLarge,
  onExportCsv,
}: TeacherDictationScreenProps) {
  const maxMistakes = Math.max(1, ...live.mistakes.map((entry) => entry.count));
  return (
    <div className={cx(styles.stage, styles.live)}>
      <span className={styles.liveBadge}>
        <span className={styles.dot} />
        Live · Raum {roomCode}
      </span>
      {roomTimes?.closed ? (
        <p className={styles.roomNote} role="status">
          <strong>Raum geschlossen.</strong> Die letzten Ergebnisse bleiben
          hier, bis du einen neuen Raum öffnest. Die CSV-Datei entsteht erst,
          wenn du „Ergebnisse als CSV herunterladen“ wählst, und liegt danach im
          Download-Ordner dieses Geräts.
        </p>
      ) : roomTimes?.closingSoon ? (
        <p className={styles.roomNote} role="status">
          <strong>Raum schließt um {roomTimes.closesAt}.</strong> Ergebnisse
          jetzt als CSV sichern.
        </p>
      ) : null}
      {projection ? (
        <button
          type="button"
          className={styles.projectionToggle}
          aria-pressed={projection.active}
          onClick={() => projection.onChange(!projection.active)}
        >
          Für die Tafel
        </button>
      ) : null}
      {projection?.active ? (
        <ProjectionPanel
          roomCode={roomCode}
          qr={roomTimes && !roomTimes.joinOpen ? null : qrLarge}
          summary={summarizeLiveProjection(live)}
        />
      ) : (
        <>
          <div className={styles.stats}>
            <LiveStat label="Aktiv" value={live.active} dot="var(--gold)" />
            <LiveStat label="Fertig" value={live.finished} dot="var(--green)" />
            <LiveStat
              label="Gesamt"
              value={`${live.overall} %`}
              dot="var(--ink3)"
            />
          </div>
          <div className={styles.liveGrid}>
            <div className={styles.liveStudents}>
              <div className={cx(styles.between, styles.studentsHead)}>
                <span className={styles.label}>Schüler</span>
                <button
                  type="button"
                  className={styles.csv}
                  onClick={onExportCsv}
                >
                  Ergebnisse als CSV herunterladen
                </button>
              </div>
              {mode === "STATION" ? (
                <ul className={styles.stations}>
                  {live.stations.map((station) => (
                    <li
                      key={station.number}
                      className={cx(
                        styles.station,
                        station.state === "done" && styles.stationDone,
                        station.state === "active" && styles.stationActive,
                      )}
                    >
                      <span className={styles.stationNumber}>
                        {station.number}
                      </span>
                      <span className={styles.stationState}>
                        {station.label}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className={styles.students}>
                  {live.students.map((student) => (
                    <li
                      key={student.name}
                      className={cx(
                        styles.student,
                        student.status === "offline" && styles.away,
                        student.struggling && styles.struggling,
                      )}
                    >
                      <span className={styles.studentHead}>
                        {student.animal ? (
                          <Animal animal={student.animal} size={26} />
                        ) : null}
                        <span className={styles.studentName}>
                          {student.name}
                        </span>
                        <StatusChip status={student.status} />
                        {student.struggling ? (
                          <span className={styles.needsHelp}>
                            Braucht Hilfe
                          </span>
                        ) : null}
                      </span>
                      <span className={styles.studentMeta}>
                        {student.progress >= student.total ? (
                          <span className={styles.finished}>Fertig</span>
                        ) : (
                          <span className={styles.track}>
                            <span
                              style={{
                                width: `${Math.round((student.progress / student.total) * 100)}%`,
                              }}
                            />
                          </span>
                        )}
                        {student.mistakes ? (
                          <span className={styles.errors}>
                            {`${student.mistakes}✕`}
                          </span>
                        ) : null}
                        <span className={styles.count}>
                          {`${student.progress}/${student.total}`}
                        </span>
                      </span>
                      {student.wordErrors?.length ? (
                        <WordErrors
                          name={student.name}
                          entries={student.wordErrors}
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                className={cx(styles.csv, styles.csvNarrow)}
                onClick={onExportCsv}
              >
                Ergebnisse als CSV herunterladen
              </button>
            </div>
            <section className={styles.mistakes} aria-label="Häufigste Fehler">
              <Eyebrow>Häufigste Fehler</Eyebrow>
              {live.mistakes.map((entry) => (
                <div key={entry.word} className={styles.mistake}>
                  <span className={styles.mistakeWord}>
                    {entry.display ?? entry.word}
                  </span>
                  <span className={styles.mistakeBar}>
                    <span
                      style={{
                        width: `${Math.round((entry.count / maxMistakes) * 100)}%`,
                      }}
                    />
                  </span>
                  <span className={styles.mistakeCount}>{entry.count}</span>
                </div>
              ))}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Ansicht für die Tafel: Raumcode, QR und Gesamtfortschritt. Sie zeigt weder
 * Namen noch Fehlerzahlen, Fehlerwörter oder „Braucht Hilfe“.
 */
function ProjectionPanel({
  roomCode,
  qr,
  summary,
}: {
  roomCode: string;
  qr: TeacherDictationScreenProps["qrLarge"];
  summary: ReturnType<typeof summarizeLiveProjection>;
}) {
  return (
    <section className={styles.projection} aria-label="Ansicht für die Tafel">
      {qr && roomCode ? <div className={styles.projectionQr}>{qr}</div> : null}
      {roomCode ? (
        <span
          className={cx(styles.codeTiles, styles.codeTilesLarge)}
          role="img"
          aria-label={`Raumcode ${roomCode}`}
        >
          {[...roomCode].map((char, charIndex) => (
            <span key={charIndex} aria-hidden="true">
              {char}
            </span>
          ))}
        </span>
      ) : null}
      <p className={styles.projectionLabel}>{summary.label}</p>
      <span
        className={styles.projectionTrack}
        role="progressbar"
        aria-label="Gesamtfortschritt"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={summary.overall}
      >
        <span style={{ width: `${summary.overall}%` }} />
      </span>
    </section>
  );
}

/** Wie viele Fehlerwörter je Tier ausgeschrieben werden; der Rest bleibt in der Zahl. */
const WORD_ERRORS_SHOWN = 10;

/**
 * Fehlerwörter eines Tiers als aufklappbare Liste. Anzahl und Wort stehen als
 * Text da (kein Farbsignal); `details` bringt Tastatur und Screenreader mit.
 */
function WordErrors({
  name,
  entries,
}: {
  name: string;
  entries: ReadonlyArray<LiveWordError>;
}) {
  const shown = entries.slice(0, WORD_ERRORS_SHOWN);
  const hidden = entries.length - shown.length;
  return (
    <details className={styles.wordErrors}>
      <summary
        className={styles.wordErrorsSummary}
        aria-label={`Fehlerwörter von ${name} (${entries.length})`}
      >
        {`Fehlerwörter (${entries.length})`}
      </summary>
      <ul
        className={styles.wordErrorsList}
        aria-label={`Fehlerwörter von ${name}`}
      >
        {shown.map((entry) => (
          <li key={entry.word} className={styles.wordError}>
            <span className={styles.wordErrorWord}>
              {entry.display ?? entry.word}
            </span>
            <span className={styles.wordErrorCount}>
              <span aria-hidden="true">{`${entry.count}×`}</span>
              <span className={styles.srOnly}>
                {entry.count === 1 ? "1 Fehler" : `${entry.count} Fehler`}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {hidden > 0 ? (
        <p className={styles.wordErrorsMore}>
          {hidden === 1
            ? "und 1 weiteres Wort"
            : `und ${hidden} weitere Wörter`}
        </p>
      ) : null}
    </details>
  );
}

function LiveStat({
  label,
  value,
  dot,
}: {
  label: string;
  value: number | string;
  dot: string;
}) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>
        <span
          className={styles.dot}
          style={{ "--dot": dot } as CSSProperties}
        />
        {label}
      </span>
      <p className={styles.statValue}>{value}</p>
    </div>
  );
}

/** Nur Abweichungen zeigen: im Raum ist der Normalfall. */
export function StatusChip({
  status,
}: {
  status: ParticipantStatus | undefined;
}) {
  if (status === "practice")
    return (
      <span className={cx(styles.status, styles.practice)}>übt weiter</span>
    );
  if (status === "offline")
    return <span className={cx(styles.status, styles.offline)}>getrennt</span>;
  return null;
}
