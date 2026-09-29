"use client";

import { QRCodeCanvas } from "qrcode.react";
import { useState } from "react";
import { aggregateWordErrors } from "../../../src/integrations/laufdiktat/teacher-results";
import type { LiveRoomStudent } from "../../../src/integrations/laufdiktat/room-api";
import { AnimalImage } from "../../ui/animal";
import { Icon } from "../../ui/icons";
import { Button, Card, EmptyState, ProgressBar } from "../../ui/primitives";
import { Sheet } from "../../ui/sheet";
import type { TeacherLiveModel } from "./use-teacher-live-room";

function joinUrlFor(code: string) {
  return typeof window === "undefined"
    ? ""
    : `${window.location.origin}/raum?code=${code}`;
}

function progressOf(student: LiveRoomStudent | undefined, words: number) {
  if (student?.finished) return 100;
  return Math.min(
    100,
    Math.round(((student?.currentIndex ?? 0) / Math.max(1, words)) * 100),
  );
}

/** Raumcode als große Ziffernkacheln für den Beamer. */
function CodeTiles({ code }: { code: string }) {
  return (
    <output className="ui-live__code" aria-label="Raumcode">
      {code.split("").map((digit, index) => (
        <span key={index}>{digit}</span>
      ))}
    </output>
  );
}

/** Schritt 3: Projektion mit Code und QR, beigetretene Geräte. */
export function LobbyStep({ t }: { t: TeacherLiveModel }) {
  const [largeQr, setLargeQr] = useState(false);
  const room = t.room;
  if (!room) return null;
  const joinUrl = joinUrlFor(room.code);
  const connected = t.connectedNames;
  return (
    <div className="ui-live__room">
      <section
        className="ui-card ui-card--dark ui-card--pad ui-stack ui-on-dark ui-live__projection"
        aria-label="Projektion"
      >
        <div className="ui-between">
          <span className="ui-eyebrow">Projektion</span>
          <span className="ui-pill ui-pill--dark">{t.activeMode.title}</span>
        </div>
        <p className="ui-small ui-center ui-muted">
          Raumcode auf der Startseite eingeben oder QR-Code scannen
        </p>
        <CodeTiles code={room.code} />
        {joinUrl ? (
          <button
            type="button"
            className="ui-live__qr"
            aria-label="QR-Code groß anzeigen"
            onClick={() => setLargeQr(true)}
          >
            <QRCodeCanvas
              value={joinUrl}
              size={200}
              level="H"
              marginSize={2}
              role="img"
              aria-label={`QR-Code zum Raum ${room.code}`}
            />
          </button>
        ) : null}
        <p className="ui-tiny ui-center ui-muted">
          Zum Vergrößern antippen, dann auf Beamer oder Tafel zeigen.
        </p>
      </section>

      <Card look="pop" className="ui-stack" aria-labelledby="joined-title">
        <div className="ui-between">
          <h2 id="joined-title" className="ui-h-section">
            Beigetreten
          </h2>
          <span className="ui-pill ui-pill--good">
            {connected.length} verbunden
          </span>
        </div>
        {t.participants.length ? (
          <ul className="ui-live__devices">
            {t.participants.map((participant) => {
              const online = connected.includes(participant.studentName);
              const label = t.labelFor(participant.studentName);
              return (
                <li
                  key={participant.studentName}
                  className={online ? "" : "is-offline"}
                >
                  <AnimalImage
                    animal={t.animalFor(participant.studentName)}
                    size={34}
                  />
                  <span className="ui-grow ui-truncate">{label}</span>
                  {online ? (
                    <span className="ui-pill ui-pill--good">
                      <Icon name="check" size={12} /> da
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="ui-icon-btn"
                      aria-label={`${label} entfernen`}
                      onClick={() =>
                        void t.removeParticipant(participant.studentName)
                      }
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="Warte auf Verbindung …">
            Sobald mindestens ein Gerät verbunden ist, kannst du starten.
          </EmptyState>
        )}
      </Card>

      <Sheet
        open={largeQr}
        title={`Raum ${room.code}`}
        onClose={() => setLargeQr(false)}
      >
        <div className="ui-live__qr ui-live__qr--large">
          <QRCodeCanvas
            value={joinUrl}
            size={420}
            level="H"
            marginSize={2}
            role="img"
            aria-label={`QR-Code zum Raum ${room.code}`}
          />
        </div>
      </Sheet>
    </div>
  );
}

/** Schritt 4: Fortschritt aller Geräte, häufigste Fehler, CSV-Export. */
export function LiveStep({ t }: { t: TeacherLiveModel }) {
  const words = t.words.length;
  const stationMode = t.gameMode === "STATION";
  const students = t.students;
  const connected = t.connectedNames;
  const tracked = stationMode
    ? students.filter((student) => student.stationNumber !== null)
    : connected.map((name) =>
        students.find((student) => student.studentName === name),
      );
  const finished = students.filter((student) => student.finished).length;
  const overall = tracked.length
    ? Math.round(
        tracked.reduce((sum, student) => sum + progressOf(student, words), 0) /
          tracked.length,
      )
    : 0;
  const errors = aggregateWordErrors(students).slice(0, 10);
  const rows = Array.from(
    {
      length: stationMode
        ? t.stationCount
        : Math.max(connected.length, students.length),
    },
    (_, index) => {
      const name = stationMode ? undefined : connected[index];
      const student = stationMode
        ? students.find((item) => item.stationNumber === index + 1)
        : students.find((item) => item.studentName === name);
      if (!name && !student) return null;
      const label = stationMode
        ? `Schüler Nr. ${index + 1}`
        : t.labelFor(name ?? student?.studentName);
      return {
        key: stationMode
          ? label
          : (name ?? student?.studentName ?? String(index)),
        label,
        student,
      };
    },
  ).filter((row) => row !== null);

  return (
    <div className="ui-stack">
      <div className="ui-grid3">
        <Stat
          label="Aktiv"
          value={Math.max(
            0,
            (stationMode ? tracked.length : connected.length) - finished,
          )}
        />
        <Stat label="Fertig" value={finished} />
        <Stat label="Gesamtfortschritt" value={`${overall} %`} />
      </div>
      <div className="ui-live__columns ui-live__columns--wide-left">
        <Card look="pop" className="ui-stack" aria-labelledby="progress-title">
          <div className="ui-between ui-wrap">
            <h2 id="progress-title" className="ui-h-section">
              {stationMode ? "Stationen" : "Schüler"}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={t.exportCsv}
              disabled={!students.length}
            >
              <Icon name="download" size={16} />
              Ergebnisse exportieren (CSV)
            </Button>
          </div>
          {rows.length ? (
            <ul className="ui-live__progress">
              {rows.map(({ key, label, student }) => {
                const value = progressOf(student, words);
                return (
                  <li key={key}>
                    <span className="ui-between">
                      <span className="ui-row">
                        {!stationMode ? (
                          <AnimalImage animal={t.animalFor(key)} size={30} />
                        ) : null}
                        <strong>{label}</strong>
                      </span>
                      <span className="ui-small ui-muted">
                        {student?.finished ? "Fertig" : `${value} %`}
                        {t.showStars && student?.finished ? (
                          <span className="ui-live__stars" aria-label="Sterne">
                            {" "}
                            {"★".repeat(
                              Math.max(
                                1,
                                5 -
                                  Math.ceil(
                                    student.errors / Math.max(1, words),
                                  ),
                              ),
                            )}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <ProgressBar
                      value={value}
                      max={100}
                      label={`Fortschritt ${label}`}
                      {...(student?.finished ? { tone: "green" as const } : {})}
                    />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="ui-small ui-muted">Noch keine Fortschrittsdaten.</p>
          )}
        </Card>
        <Card look="soft" className="ui-stack" aria-labelledby="errors-title">
          <h2 id="errors-title" className="ui-h-section">
            Häufigste Fehler
          </h2>
          {errors.length ? (
            <ol className="ui-list ui-live__errors">
              {errors.map(([word, count]) => (
                <li key={word}>
                  <span className="ui-grow">{word}</span>
                  <span className="ui-pill ui-pill--bad">{count}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="ui-small ui-muted">Noch keine Ergebnisse.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div
      className="ui-card ui-card--pad ui-stack"
      style={{ ["--gap" as string]: "2px" }}
    >
      <span className="ui-label">{label}</span>
      <span className="ui-big-num">{value}</span>
    </div>
  );
}
