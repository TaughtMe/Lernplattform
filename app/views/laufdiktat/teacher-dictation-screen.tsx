"use client";

import { useState } from "react";
import { CloudSlot } from "../../ui/cloud-slot";
import { Icon } from "../../ui/icons";
import { cx, GreenButton, SquareIconButton, ThemeSwitch } from "../parts/parts";
import styles from "./teacher-dictation-screen.module.css";
import { STEPS } from "./teacher-dictation/constants";
import { DictationEditor } from "./teacher-dictation/editor";
import { LiveStep } from "./teacher-dictation/live-step";
import { LobbyStep } from "./teacher-dictation/lobby-step";
import { QrOverlay } from "./teacher-dictation/qr-overlay";
import type { TeacherDictationScreenProps } from "./teacher-dictation/types";

export { MODES } from "./teacher-dictation/constants";
export { dictationOptionList } from "./teacher-dictation/editor-options";
export { ModeFooterPreview } from "./teacher-dictation/editor";
export type * from "./teacher-dictation/types";

/**
 * Laufdiktat für Lehrkräfte. Inhalt und Modus zeigt der Editor nach
 * Lehrerbereich v2 (14b/14c, 16a/16b), Lobby und Live die Ansicht nach
 * Design 5c (mobil) und 5d (Desktop).
 */
export function TeacherDictationScreen(props: TeacherDictationScreenProps) {
  if (props.step === "import" || props.step === "settings") {
    return <DictationEditor {...props} />;
  }
  return <RoomScreen {...props} />;
}

/** Lobby und Live (Design 5c/5d). */
function RoomScreen(props: TeacherDictationScreenProps) {
  const [qrOpen, setQrOpen] = useState(false);
  const joinOpen = props.roomTimes?.joinOpen ?? true;
  const showQr =
    props.qrLarge && props.roomCode && joinOpen ? () => setQrOpen(true) : null;
  const index = STEPS.findIndex((step) => step.id === props.step);
  const current = STEPS[index] ?? STEPS[0]!;
  const stepLabel = `Schritt ${index + 1} von ${STEPS.length}`;
  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <SquareIconButton
          label="Zurück zu Start"
          icon="back"
          onClick={props.onLeave}
        />
        <span className={styles.titles}>
          <span className={styles.stepLabel}>
            <span className={styles.narrowOnly}>{stepLabel} · Laufdiktat</span>
            <span className={styles.wideOnly}>
              {props.className ? `Klasse ${props.className} · ` : ""}
              Laufdiktat · {stepLabel}
            </span>
          </span>
          <h1 className={styles.stepTitle}>{current.title}</h1>
        </span>
        <nav className={styles.steps} aria-label="Schritte">
          {STEPS.map((step, stepIndex) => (
            <button
              key={step.id}
              type="button"
              className={cx(styles.step, stepIndex < index && styles.done)}
              aria-current={stepIndex === index ? "step" : undefined}
              disabled={props.lockedSteps?.includes(step.id)}
              onClick={() => props.onStep?.(step.id)}
            >
              <span className={styles.stepDot}>{stepIndex + 1}</span>
              <span className={styles.stepText}>{step.tab}</span>
            </button>
          ))}
        </nav>
        <CloudSlot />
        <ThemeSwitch theme={props.theme} onToggle={props.onToggleTheme} />
      </header>

      <div className={styles.body}>
        {props.step === "lobby" ? (
          <LobbyStep {...props} onShowQr={showQr} />
        ) : null}
        {props.step === "live" ? <LiveStep {...props} /> : null}
        {props.notice ? (
          <p className={styles.notice} role="alert">
            {props.notice}
          </p>
        ) : null}
      </div>

      <footer className={styles.footer}>
        {index > 0 && !props.roomTimes?.closed ? (
          <button
            type="button"
            className={styles.previous}
            aria-label="Zurück"
            onClick={
              props.onPrevious ?? (() => props.onStep?.(STEPS[index - 1]!.id))
            }
          >
            <Icon
              name="back"
              size={18}
              strokeWidth={2.2}
              strokeLinejoin="miter"
            />
            <span className={styles.wideOnly}>Zurück</span>
          </button>
        ) : null}
        {props.step === "live" && showQr ? (
          <button
            type="button"
            className={styles.footerCode}
            aria-label={
              props.roomTimes
                ? `Raumcode ${props.roomCode} und QR-Code zeigen, Code gilt bis ${props.roomTimes.joinUntil}`
                : `Raumcode ${props.roomCode} und QR-Code zeigen`
            }
            onClick={showQr}
          >
            <Icon name="qr" size={18} />
            <span className={styles.footerCodeLabel}>Raum</span>
            <span className={styles.footerCodeValue}>{props.roomCode}</span>
            {props.roomTimes ? (
              <span className={styles.footerCodeUntil}>
                gilt bis {props.roomTimes.joinUntil}
              </span>
            ) : null}
          </button>
        ) : props.step === "live" && props.roomTimes && !joinOpen ? (
          <span className={styles.footerClosed}>Beitritt geschlossen</span>
        ) : (
          <span className={styles.footerNote}>
            Alles wird automatisch unter „Abgelegt“ gespeichert.
          </span>
        )}
        <GreenButton
          className={styles.next}
          disabled={props.nextDisabled}
          onClick={
            props.onNext ??
            (() => props.onStep?.(STEPS[Math.min(index + 1, 3)]!.id))
          }
        >
          {props.nextLabel ?? current.next}
        </GreenButton>
      </footer>

      {qrOpen && props.qrLarge && showQr ? (
        <QrOverlay
          roomCode={props.roomCode}
          joinHost={props.joinHost}
          joined={props.lobby.joined.length}
          qr={props.qrLarge}
          onClose={() => setQrOpen(false)}
        />
      ) : null}
    </div>
  );
}
