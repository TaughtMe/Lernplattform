"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "../../../ui/icons";
import { cx } from "../../parts/parts";
import styles from "../teacher-dictation-screen.module.css";

/** Vollbild zum Beamen: großer QR in der Mitte, Code und Zahl darunter. */
export function QrOverlay({
  roomCode,
  joinHost,
  joined,
  qr,
  onClose,
}: {
  roomCode: string;
  joinHost: string;
  joined: number;
  qr: ReactNode;
  onClose: () => void;
}) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus();
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className={styles.qrOverlay}
      role="dialog"
      aria-modal="true"
      aria-label={`QR-Code zum Raum ${roomCode}`}
    >
      <button
        ref={close}
        type="button"
        className={styles.qrClose}
        aria-label="QR-Code schließen"
        onClick={onClose}
      >
        <Icon name="close" size={20} strokeWidth={2.2} />
      </button>
      <div className={styles.qrLarge}>{qr}</div>
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
      <span className={styles.qrMeta}>
        {joinHost} · {joined === 1 ? "1 Schüler" : `${joined} Schüler`}{" "}
        beigetreten
      </span>
    </div>
  );
}
