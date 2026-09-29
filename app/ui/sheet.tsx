"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./icons";

/**
 * Unteres Blatt (mobil) bzw. zentrierter Dialog (Desktop), Design 5c/7a.
 * Nutzt das native <dialog>: Fokusfalle, Escape und Hintergrund-Sperre
 * kommen vom Browser.
 */
export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    if (!open && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }, [open]);

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- Klick auf den Hintergrund ist nur eine Maus-Abkürzung; Tastatur nutzt Escape und den Schließen-Knopf
    <dialog
      ref={ref}
      className="ui ui-sheet"
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <span className="ui-sheet__grip" aria-hidden="true" />
      <div className="ui-stack">
        <div className="ui-between">
          <h2 className="ui-h-section">{title}</h2>
          <button
            type="button"
            className="ui-icon-btn"
            aria-label="Schließen"
            onClick={onClose}
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
