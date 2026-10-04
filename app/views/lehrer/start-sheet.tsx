"use client";

import { Icon } from "../../ui/icons";
import { cx } from "../parts/parts";
import { ModalDialog } from "./modal-dialog";
import styles from "./start-sheet.module.css";

export type StartMode = {
  id: string;
  title: string;
  sub: string;
};

export type StartSheetProps = {
  open: boolean;
  /** Titel des Inhalts, der geöffnet wird. */
  title: string;
  /** Zeile unter dem Titel: wozu der Inhalt gehört, z. B. „Zugeordnet zu 7b, 9a“. */
  classLabel: string;
  /** Beschriftung des Knopfs dahinter, z. B. „ändern“ oder „zuordnen“. */
  classAction: string;
  /**
   * Klasse, für die der Raum startet (z. B. „Klasse 7b“); `null` startet ohne
   * Klasse, also ohne Schreiberleichterung. Wird immer deutlich gezeigt.
   */
  roomFor: string | null;
  modes: readonly StartMode[];
  mode: string;
  /** Der Raumcode erscheint erst in der Lobby; diese Zeile erklärt es. */
  note: string;
  /** Es läuft schon ein Raum: statt des Starts steht ein Weg dorthin. */
  roomOpen?: { href: string };
  busy?: boolean;
  onClose?: () => void;
  onMode?: (id: string) => void;
  onClasses?: () => void;
  onStart?: () => void;
  onAllOptions?: () => void;
};

/**
 * Start-Overlay (Design 3c „Raum öffnen“): mobil ein Blatt von unten, ab
 * 900 px Rahmenbreite ein Dialog in der Mitte. Zeigt die vier echten Modi
 * des Laufdiktats (bewusste Abweichung von den drei Modi der Vorlage).
 */
export function StartSheet(props: StartSheetProps) {
  const current = props.modes.find((mode) => mode.id === props.mode);
  return (
    <ModalDialog
      open={props.open}
      label="Raum öffnen"
      className={styles.sheet}
      onClose={() => props.onClose?.()}
    >
      <div className={styles.inner}>
        <div className={styles.head}>
          <span className={styles.titles}>
            <span className={styles.title}>Raum öffnen</span>
            <span className={styles.subtitle}>{props.title}</span>
            <button
              type="button"
              className={styles.classLine}
              onClick={props.onClasses}
            >
              <span>
                {props.classLabel} ·{" "}
                <span className={styles.link}>{props.classAction}</span>
              </span>
            </button>
          </span>
          <button
            type="button"
            className={styles.close}
            aria-label="Schließen"
            onClick={props.onClose}
          >
            <Icon name="close" size={16} strokeWidth={2.2} />
          </button>
        </div>

        <p
          className={cx(
            styles.roomFor,
            props.roomFor === null && styles.roomForNone,
          )}
        >
          {props.roomFor === null ? (
            <>
              <strong>Raum ohne Klasse</strong> (keine Schreiberleichterung)
            </>
          ) : (
            <>
              <strong>Raum für {props.roomFor}</strong>
            </>
          )}
        </p>

        {props.roomOpen ? (
          <div className={styles.openRoom} role="status">
            <span className={styles.openRoomTitle}>
              Es ist schon ein Raum offen
            </span>
            <a className={styles.start} href={props.roomOpen.href}>
              Zum offenen Raum
            </a>
          </div>
        ) : (
          <>
            <div className={styles.group}>
              <span className={styles.label} id="start-modus">
                Modus
              </span>
              <div
                className={styles.modes}
                role="group"
                aria-labelledby="start-modus"
              >
                {props.modes.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    className={cx(
                      styles.mode,
                      mode.id === props.mode && styles.modeOn,
                    )}
                    aria-pressed={mode.id === props.mode}
                    onClick={() => props.onMode?.(mode.id)}
                  >
                    <span className={styles.modeTitle}>{mode.title}</span>
                    <span className={styles.modeSub}>{mode.sub}</span>
                  </button>
                ))}
              </div>
            </div>
            <p className={styles.note}>{props.note}</p>
            <button
              type="button"
              className={styles.start}
              disabled={props.busy}
              onClick={props.onStart}
            >
              Jetzt starten · {current?.title ?? ""}
            </button>
            <button
              type="button"
              className={styles.options}
              onClick={props.onAllOptions}
            >
              Alle Optionen
            </button>
          </>
        )}
      </div>
    </ModalDialog>
  );
}
