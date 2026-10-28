"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "../../ui/primitives";

/** Text unter der Frage; eine Übung ohne Zwischenstand sagt, was stattdessen passiert. */
const NOTE_RESUMABLE =
  "Deine Antworten bis hier sind gespeichert. Du kannst später weitermachen.";
const NOTE_RESTART = "Die Übung fängt dann wieder von vorn an.";

/**
 * Rückfrage beim Verlassen einer laufenden Runde (Befund C-001). Der Standard
 * ist „Weiterüben“: Der Fokus beginnt dort, Escape und ein Klick auf den
 * Hintergrund bleiben in der Runde. Die Ansicht kennt weder Navigation noch
 * Speicher; den Fokus zurück an die Stelle davor setzt der Aufrufer.
 *
 * Nutzt das native `<dialog>` (Fokusfalle und Inertheit des Hintergrunds
 * liefert der Browser). Die Rolle `alertdialog` sagt, dass eine Antwort nötig ist.
 */
export function RoundLeaveDialog({
  open,
  resumable = true,
  onStay,
  onLeave,
}: {
  open: boolean;
  /** Die Übung hält einen Zwischenstand; sonst fängt sie beim nächsten Mal neu an. */
  resumable?: boolean;
  /** „Weiterüben“, Escape und Klick auf den Hintergrund. */
  onStay: () => void;
  /** „Beenden“. */
  onLeave: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const noteId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      // Ältere Umgebungen (z. B. Testumgebung) kennen showModal nicht.
      if (typeof element.showModal === "function") element.showModal();
      else element.setAttribute("open", "");
      // Der Standard „Weiterüben“ steht an erster Stelle.
      element.querySelector("button")?.focus();
    }
    if (!open && element.open) {
      if (typeof element.close === "function") element.close();
      else element.removeAttribute("open");
    }
  }, [open]);

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- Klick auf den Hintergrund ist nur eine Maus-Abkürzung; Tastatur nutzt Escape und „Weiterüben“
    <dialog
      ref={dialog}
      className="ui ui-sheet"
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={noteId}
      onCancel={(event) => {
        // Escape: Der Aufrufer schließt, nicht der Browser.
        event.preventDefault();
        onStay();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onStay();
      }}
    >
      {open ? (
        <div className="ui-stack">
          <h2 id={titleId} className="ui-h-section">
            Runde wirklich beenden?
          </h2>
          <p id={noteId} className="ui-small">
            {resumable ? NOTE_RESUMABLE : NOTE_RESTART}
          </p>
          <div className="ui-grid2">
            <Button variant="green" onClick={onStay}>
              Weiterüben
            </Button>
            <Button variant="ghost" onClick={onLeave}>
              Beenden
            </Button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
