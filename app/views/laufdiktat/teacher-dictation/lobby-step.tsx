"use client";

import { Icon } from "../../../ui/icons";
import { Animal, cx } from "../../parts/parts";
import { StatusChip } from "./live-step";
import styles from "../teacher-dictation-screen.module.css";
import type { TeacherDictationScreenProps } from "./types";
import { MODES } from "./constants";

function RoomCard({
  roomCode,
  qr,
  joinHost,
  roomTimes,
  onShowQr,
}: TeacherDictationScreenProps & { onShowQr?: (() => void) | null }) {
  if (roomTimes && !roomTimes.joinOpen)
    return (
      <div className={cx(styles.roomCard, styles.roomCardClosed)}>
        <span className={styles.roomClosedTitle}>Beitritt geschlossen</span>
        <span className={styles.roomHint}>
          Der Code galt bis {roomTimes.joinUntil}. Wer schon im Raum ist, kann
          weiterüben.
        </span>
      </div>
    );
  return (
    <div className={styles.roomCard}>
      {onShowQr ? (
        <button
          type="button"
          className={cx(styles.qr, styles.qrButton)}
          aria-label="QR-Code vergrößern"
          title="QR-Code vergrößern"
          onClick={onShowQr}
        >
          {qr}
          <span className={styles.zoomHint} aria-hidden="true">
            <Icon name="plus" size={16} strokeWidth={2.6} />
          </span>
        </button>
      ) : (
        <div className={styles.qr}>{qr}</div>
      )}
      <div className={styles.roomCode}>
        <span className={styles.roomCodeLabel}>Raumcode</span>
        <span
          className={styles.codeTiles}
          role="img"
          aria-label={`Raumcode ${roomCode}`}
        >
          {[...roomCode].map((char, charIndex) => (
            <span key={charIndex} aria-hidden="true">
              {char}
            </span>
          ))}
        </span>
        <span className={styles.roomHint}>
          {joinHost} · Code eingeben oder scannen
        </span>
        {roomTimes ? (
          <span className={styles.roomHint}>
            Code gilt bis {roomTimes.joinUntil}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function LobbyStep(
  props: TeacherDictationScreenProps & { onShowQr?: (() => void) | null },
) {
  const { lobby, mode, onOpenOptions } = props;
  const current = MODES.find((entry) => entry.id === mode) ?? MODES[0]!;
  return (
    <div className={cx(styles.stage, styles.lobby)}>
      <div className={styles.column}>
        <RoomCard {...props} />
        <span className={styles.lobbyNote}>
          {current.title} · Schüler sehen gleich die Lobby, ab „Sitzung
          starten&quot; den ersten Abschnitt.
        </span>
      </div>
      <div className={styles.column}>
        <div className={styles.between}>
          <span className={styles.label}>
            Beigetreten · {lobby.joined.length}
            {lobby.expected ? ` von ${lobby.expected}` : ""}
          </span>
          <button
            type="button"
            className={cx(styles.linkButton, styles.narrowOnly)}
            onClick={onOpenOptions}
          >
            {current.title} · Optionen
          </button>
          <span className={styles.waiting}>
            <span className={styles.dot} />
            wartet
          </span>
        </div>
        <ul className={styles.joined}>
          {lobby.joined.map((student) => (
            <li
              key={student.name}
              className={cx(
                styles.joinedCard,
                student.status === "offline" && styles.away,
              )}
            >
              <span className={styles.avatar}>
                {student.animal ? (
                  <Animal animal={student.animal} size={26} />
                ) : null}
              </span>
              <span className={styles.name}>{student.name}</span>
              <StatusChip status={student.status} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
