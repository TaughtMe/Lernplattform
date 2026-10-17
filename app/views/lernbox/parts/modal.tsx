"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "../../../ui/icons";
import styles from "../lernbox-screen.module.css";

export function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: (() => void) | undefined;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    return () => {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    };
  }, []);
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- Klick auf den Hintergrund ist nur eine Maus-Abkürzung; Tastatur nutzt Escape und den Schließen-Knopf
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose?.();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className={styles.sheet}>
        <div className={styles.sheetHead}>
          <span className={styles.sheetTitles}>
            <h2 id={titleId} className={styles.sheetTitle}>
              {title}
            </h2>
            {subtitle ? (
              <span className={styles.sheetSubtitle}>{subtitle}</span>
            ) : null}
          </span>
          <button
            type="button"
            className={styles.sheetClose}
            aria-label="Schließen"
            onClick={onClose}
          >
            <Icon name="close" size={18} strokeWidth={2.2} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
