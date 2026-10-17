"use client";

import { useState } from "react";
import { CloudSlot } from "../../ui/cloud-slot";
import { Icon } from "../../ui/icons";
import {
  cx,
  GreenButton,
  PrimaryButton,
  SquareIconButton,
  ThemeSwitch,
} from "../parts/parts";
import styles from "./teacher-dictation-screen.module.css";
import { STEPS } from "./teacher-dictation/constants";
import { ImportStep } from "./teacher-dictation/import-step";
import { LiveStep } from "./teacher-dictation/live-step";
import { LobbyStep } from "./teacher-dictation/lobby-step";
import { QrOverlay } from "./teacher-dictation/qr-overlay";
import { ModeDetails, SettingsStep } from "./teacher-dictation/settings-step";
import type { TeacherDictationScreenProps } from "./teacher-dictation/types";

export { MODES } from "./teacher-dictation/constants";
export type * from "./teacher-dictation/types";

/** Laufdiktat für Lehrkräfte (Design 5c mobil, 5d Desktop). */
export function TeacherDictationScreen(props: TeacherDictationScreenProps) {
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
          label="Zurück zu Inhalte"
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
        {props.step === "import" ? <ImportStep {...props} /> : null}
        {props.step === "settings" ? <SettingsStep {...props} /> : null}
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

      {props.step === "settings" && props.optionsOpen ? (
        <>
          <button
            type="button"
            className={styles.backdrop}
            aria-label="Optionen schließen"
            tabIndex={-1}
            onClick={props.onCloseOptions}
          />
          <div
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-label="Optionen"
          >
            <span className={styles.grabber} />
            <div className={styles.sheetBody}>
              <button
                type="button"
                className={styles.sheetClose}
                aria-label="Schließen"
                onClick={props.onCloseOptions}
              >
                <Icon
                  name="close"
                  size={16}
                  strokeWidth={2.2}
                  strokeLinejoin="miter"
                />
              </button>
              <ModeDetails {...props} />
            </div>
            <PrimaryButton
              className={styles.sheetApply}
              onClick={props.onCloseOptions}
            >
              Übernehmen
            </PrimaryButton>
          </div>
        </>
      ) : null}
    </div>
  );
}
