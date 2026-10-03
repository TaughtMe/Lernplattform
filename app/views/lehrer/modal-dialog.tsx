"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Modaler Dialog auf Basis von `<dialog>`: Fokusfalle, Escape und Inertheit
 * des Hintergrunds liefert der Browser. Geöffnet wird nur über `open`;
 * Escape, Klick auf den Hintergrund und das Schließen von außen rufen
 * `onClose`. Der Aufrufer entscheidet, ob er danach `open` zurücknimmt.
 *
 * Der Inhalt gehört in `children` und bringt seinen Innenabstand selbst mit,
 * damit ein Klick auf den Rand des Dialogs vom Hintergrund unterscheidbar ist.
 */
export function ModalDialog({
  open,
  label,
  className,
  onClose,
  children,
}: {
  open: boolean;
  label: string;
  className: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  // Klick auf den Hintergrund (::backdrop) trifft das Dialog-Element selbst.
  // Per Tastatur schließt Escape (siehe `onCancel`), daher kein Tastatur-Gegenstück.
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const onClick = (event: MouseEvent) => {
      if (event.target === element) closeRef.current();
    };
    element.addEventListener("click", onClick);
    return () => element.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      // Ältere Umgebungen (z. B. Testumgebung) kennen showModal nicht.
      if (typeof element.showModal === "function") element.showModal();
      else element.setAttribute("open", "");
      // Der Fokus beginnt am Dialog selbst; ein erster Knopf bekäme sonst
      // schon beim Öffnen einen Fokusrahmen. Tab führt zum ersten Bedienelement.
      element.focus();
    }
    if (!open && element.open) {
      if (typeof element.close === "function") element.close();
      else element.removeAttribute("open");
    }
  }, [open]);

  return (
    <dialog
      ref={dialog}
      className={className}
      aria-label={label}
      tabIndex={-1}
      onCancel={(event) => {
        // Escape: der Aufrufer schließt, nicht der Browser.
        event.preventDefault();
        onClose();
      }}
    >
      {open ? children : null}
    </dialog>
  );
}
