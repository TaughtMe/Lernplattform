"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { CloudSlot } from "../../../ui/cloud-slot";
import { Icon } from "../../../ui/icons";
import { ModalDialog } from "../../lehrer/modal-dialog";
import { cx, ThemeSwitch } from "../../parts/parts";
import styles from "../dictation-editor.module.css";
import { ContentStep } from "./content-step";
import { DEFAULT_EDITOR_MODES, KIND_LABELS } from "./editor-options";
import { ModeStep, OptionRows } from "./mode-step";
import type { TeacherDictationScreenProps, TeacherStep } from "./types";

const EDITOR_STEPS: ReadonlyArray<{ id: TeacherStep; tab: string }> = [
  { id: "import", tab: "Inhalt" },
  { id: "settings", tab: "Modus" },
  { id: "lobby", tab: "Lobby" },
  { id: "live", tab: "Live" },
];

/** Unter dieser Breite stehen die Optionen nicht neben den Modi (16a/16b). */
const COMPACT_BELOW = 900;

/**
 * Breite der Ansicht unter `COMPACT_BELOW`? Entscheidet nur, ob ein Modus
 * seine Einstellungen als Fenster öffnet; das Layout macht CSS allein.
 */
function useCompact(root: RefObject<HTMLElement | null>) {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const element = root.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setCompact(entry.contentRect.width < COMPACT_BELOW);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [root]);
  return compact;
}

/** Name des Inhalts in der Zeile über dem Titel. */
function contentName(props: TeacherDictationScreenProps) {
  return props.title?.trim() || "Neues Laufdiktat";
}

/**
 * Laufdiktat-Editor nach Lehrerbereich v2: Schritt 1 „Inhalt“ (14b) und
 * Schritt 2 „Modus“ (14c mit dem Ende aus 15b; Tablet 16a, Handy 16b).
 * Lobby und Live zeigt weiter `TeacherDictationScreen` nach 5c/5d.
 */
export function DictationEditor(props: TeacherDictationScreenProps) {
  const root = useRef<HTMLDivElement>(null);
  const compact = useCompact(root);
  const settings = props.step === "settings";
  const modes = props.modes ?? DEFAULT_EDITOR_MODES;
  const current = modes.find(({ id }) => id === props.mode) ?? modes[0]!;
  return (
    <div className={styles.screen} ref={root}>
      <EditorHeader {...props} />
      <div className={styles.body}>
        {settings ? (
          <ModeStep
            {...props}
            modes={modes}
            onChooseMode={(mode) => {
              props.onMode?.(mode);
              if (compact) props.onOpenOptions?.();
            }}
          />
        ) : (
          <ContentStep {...props} />
        )}
        {props.notice ? (
          <p className={styles.notice} role="alert">
            {props.notice}
          </p>
        ) : null}
      </div>
      {settings ? <ModeFooter {...props} /> : <ContentFooter {...props} />}
      <ModalDialog
        open={settings && compact && props.optionsOpen}
        label={`Einstellungen ${current.title}`}
        className={styles.popup}
        onClose={() => props.onCloseOptions?.()}
      >
        <div className={styles.popupInner}>
          <span className={styles.grabber} aria-hidden="true" />
          <div className={styles.popupHead}>
            <span className={styles.popupTitles}>
              <span className={styles.popupEyebrow}>
                Einstellungen
                <span className={styles.tabletOnly}> · {current.title}</span>
              </span>
              <span className={cx(styles.popupMode, styles.phoneOnly)}>
                {current.title}
              </span>
            </span>
            <button
              type="button"
              className={cx(styles.popupClose, styles.tabletOnly)}
              aria-label="Schließen"
              onClick={props.onCloseOptions}
            >
              ×
            </button>
            <button
              type="button"
              className={cx(styles.popupDone, styles.phoneOnly)}
              onClick={props.onCloseOptions}
            >
              Fertig
            </button>
          </div>
          <OptionRows {...props} variant="switch" />
        </div>
      </ModalDialog>
    </div>
  );
}

function EditorHeader(props: TeacherDictationScreenProps) {
  const index = props.step === "settings" ? 1 : 0;
  const forClass = props.className ? `Klasse ${props.className} · ` : "";
  const eyebrow =
    index === 0
      ? `${forClass}${props.stored ? contentName(props) : "Neues Laufdiktat"} · ${KIND_LABELS[props.content.kind]}`
      : `${forClass}${contentName(props)}`;
  return (
    <header className={styles.header}>
      <button
        type="button"
        className={styles.back}
        aria-label={index === 0 ? "Zurück zu Start" : "Zurück"}
        onClick={index === 0 ? props.onLeave : props.onPrevious}
      >
        <Icon name="back" size={18} strokeWidth={2.2} strokeLinejoin="miter" />
      </button>
      <span className={styles.titles}>
        <span className={styles.eyebrow}>
          <span className={styles.notPhone}>{eyebrow}</span>
          <span className={styles.phoneOnly}>
            Schritt {index + 1} von {EDITOR_STEPS.length} · {contentName(props)}
          </span>
        </span>
        <h1 className={styles.title}>
          {index === 0 ? "Inhalt eingeben" : "Modus wählen"}
        </h1>
      </span>
      <nav className={styles.steps} aria-label="Schritte">
        {EDITOR_STEPS.map((step, stepIndex) => (
          <span key={step.id} className={styles.stepItem}>
            {stepIndex > 0 ? (
              <span className={styles.stepLine} aria-hidden="true" />
            ) : null}
            <button
              type="button"
              className={cx(styles.step, stepIndex < index && styles.done)}
              aria-current={stepIndex === index ? "step" : undefined}
              aria-label={`${stepIndex + 1} ${step.tab}`}
              disabled={props.lockedSteps?.includes(step.id)}
              onClick={() => props.onStep?.(step.id)}
            >
              <span className={styles.stepDot} aria-hidden="true">
                {stepIndex < index ? "✓" : stepIndex + 1}
              </span>
              <span className={styles.stepText} aria-hidden="true">
                {step.tab}
              </span>
            </button>
          </span>
        ))}
      </nav>
      {props.onToggleTheme ? (
        <span className={styles.headerTools}>
          <CloudSlot />
          <ThemeSwitch theme={props.theme} onToggle={props.onToggleTheme} />
        </span>
      ) : null}
    </header>
  );
}

function ContentFooter(props: TeacherDictationScreenProps) {
  return (
    <footer className={cx(styles.footer, styles.contentFooter)}>
      <span className={styles.footerNote} role="status">
        {props.libraryNotice || "Wird automatisch in der Ablage gespeichert."}
      </span>
      <button
        type="button"
        className={styles.next}
        disabled={props.nextDisabled}
        onClick={props.onNext}
      >
        {props.nextLabel ?? "Weiter zu Modus"}
        <Icon name="forward" size={16} strokeWidth={2.4} />
      </button>
    </footer>
  );
}

/** Diskette der Vorlage für „Speichern“. */
function SaveIcon() {
  return (
    <svg
      className={styles.saveIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 4.5h11l3 3v12H5z" />
      <path d="M8 4.5v5h7v-5M8 19.5v-6h8v6" />
    </svg>
  );
}

/**
 * Ende von Schritt 2 (Design 15b): „Speichern“ legt das Laufdiktat
 * vorbereitet ab, „Raum jetzt öffnen“ führt in die Lobby.
 */
function ModeFooter(
  props: TeacherDictationScreenProps & { className?: string },
) {
  return (
    <footer className={cx(styles.footer, styles.modeFooter, props.className)}>
      {props.onSavePrepared ? (
        <button
          type="button"
          className={styles.save}
          aria-label="Speichern"
          onClick={props.onSavePrepared}
        >
          <SaveIcon />
          <span className={styles.notPhone}>Speichern</span>
        </button>
      ) : null}
      <span className={styles.footerNote} role="status">
        {props.libraryNotice ?? ""}
      </span>
      <button
        type="button"
        className={styles.open}
        disabled={props.nextDisabled}
        onClick={props.onNext}
      >
        <Icon name="play" className={styles.playIcon} />
        {props.nextLabel ?? (
          <span>
            Raum <span className={styles.notPhone}>jetzt</span> öffnen
          </span>
        )}
      </button>
    </footer>
  );
}

/** Nur das Ende von Schritt 2, wie die Vorlage es als 15b zeigt (Katalog). */
export function ModeFooterPreview(props: TeacherDictationScreenProps) {
  return (
    <div className={styles.screen}>
      <ModeFooter {...props} className={styles.bare} />
    </div>
  );
}
