"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Icon, type IconName } from "../../ui/icons";
import {
  Animal,
  Chip,
  cx,
  Eyebrow,
  GreenButton,
  PrimaryButton,
  SquareIconButton,
  ThemeSwitch,
  type Theme,
} from "../parts/parts";
import { MathEditor, type MathEditorProps } from "./math-editor";
import styles from "./teacher-dictation-screen.module.css";
import {
  VocabularyEditor,
  type VocabularyEditorProps,
} from "./vocabulary-editor";

export type TeacherStep = "import" | "settings" | "lobby" | "live";
export type ContentKind = "text" | "vocabulary" | "math";
export type SplitMode = "satz" | "zeile" | "wort";
export type DictationMode = "LAUFDIKTAT" | "UEBUNG" | "BATTLE" | "STATION";
export type DictationOption =
  "tts" | "shuffle" | "strict" | "taskHelp" | "stars" | "ink" | "flicker";

/** Verbindung eines Schülers: im Raum, übt allein weiter oder getrennt. */
export type ParticipantStatus = "online" | "practice" | "offline";

export type LiveStudent = {
  name: string;
  animal: string | null;
  status?: ParticipantStatus;
  progress: number;
  total: number;
  mistakes: number;
  /** Liegt bei der aktuellen Aufgabe mehrfach falsch: in der Liste hervorheben. */
  struggling?: boolean;
};
export type StationState = {
  number: number;
  state: "done" | "active" | "idle";
  label: string;
};

/**
 * Fristen des Raums (Entscheidung 52). Ohne Angabe zeigt die Ansicht genau die
 * Vorlage. Die Uhrzeiten kommen fertig formatiert, die Ansicht rechnet nicht.
 */
export type RoomTimes = {
  /** Beitritt mit Code und QR ist noch möglich. */
  joinOpen: boolean;
  /** Uhrzeit, bis der Code gilt, z. B. „14:35“. */
  joinUntil: string;
  /** Uhrzeit, zu der der Raum schließt. */
  closesAt: string;
  /** Der Raum schließt bald (ab 110 Minuten). */
  closingSoon: boolean;
  /** Der Raum ist geschlossen; die letzten Ergebnisse bleiben sichtbar. */
  closed: boolean;
};

export type TeacherDictationScreenProps = {
  /** Klasse, falls der Raum zu einer Klasse gehört. */
  className?: string;
  roomCode: string;
  theme: Theme;
  step: TeacherStep;
  content: {
    kind: ContentKind;
    text: string;
    split: SplitMode;
    sections: readonly string[];
  };
  mode: DictationMode;
  options: Record<DictationOption, boolean>;
  /** Optionale Klassenwahl; nur mit Klasse wirken Freigaben der Schreiberleichterung. */
  classChoice?: {
    options: ReadonlyArray<{ id: string; name: string }>;
    value: string;
    onChange: (id: string) => void;
  };
  stationCount: number;
  optionsOpen: boolean;
  /** QR-Code zum Raum; ohne Angabe erscheint ein Platzhalter. */
  qr?: ReactNode;
  /**
   * Großer QR-Code zum Beamen. Mit Angabe lässt sich der QR in der Lobby
   * vergrößern, und im Live-Schritt steht der Raumcode in der Fußzeile.
   */
  qrLarge?: ReactNode;
  /** Adresse, unter der Schüler den Code eingeben (z. B. lernraum.app). */
  joinHost: string;
  lobby: {
    /** Erwartete Teilnehmende; ohne Angabe nur die Zahl der Beigetretenen. */
    expected?: number;
    joined: ReadonlyArray<{
      name: string;
      animal: string | null;
      status?: ParticipantStatus;
    }>;
  };
  live: {
    active: number;
    finished: number;
    overall: number;
    students: readonly LiveStudent[];
    stations: readonly StationState[];
    /** `display` ersetzt den Text, z. B. für Formeln. */
    mistakes: ReadonlyArray<{
      word: string;
      count: number;
      display?: ReactNode;
    }>;
  };
  roomTimes?: RoomTimes;
  /**
   * Ablage im Schritt „Inhalt“ (optional, ohne Angabe zeigt die Ansicht genau
   * die Vorlage): Titelfeld, „Speichern“ und beim Bearbeiten „Aus der Ablage
   * löschen“ mit Bestätigung.
   */
  title?: string;
  titlePlaceholder?: string;
  libraryNotice?: string;
  onTitle?: (title: string) => void;
  onSave?: () => void;
  onDelete?: () => void;
  /** Beschriftung und Sperre des Weiter-Knopfs (z. B. „Öffnet …“). */
  nextLabel?: string;
  nextDisabled?: boolean;
  /** Schritte, die gerade nicht angesprungen werden können. */
  lockedSteps?: readonly TeacherStep[];
  /** Fehler oder Hinweis unter dem Inhalt. */
  notice?: string;
  /** Vokabelheft statt Textfeld, wenn Inhaltsart Vokabeln. */
  vocabulary?: VocabularyEditorProps;
  /** Aufgaben-Generator statt Textfeld, wenn Inhaltsart Mathe. */
  math?: MathEditorProps;
  onToggleTheme?: () => void;
  onLeave?: () => void;
  onStep?: (step: TeacherStep) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onMoveSection?: (from: number, to: number) => void;
  onKind?: (kind: ContentKind) => void;
  onText?: (text: string) => void;
  onSplit?: (split: SplitMode) => void;
  onEditSections?: () => void;
  onImportFile?: (file: File | undefined) => void;
  onMode?: (mode: DictationMode) => void;
  onToggleOption?: (option: DictationOption) => void;
  onStationCount?: (count: number) => void;
  onOpenOptions?: () => void;
  onCloseOptions?: () => void;
  onExportCsv?: () => void;
};

const STEPS: ReadonlyArray<{
  id: TeacherStep;
  tab: string;
  title: string;
  next: string;
}> = [
  {
    id: "import",
    tab: "Diktat",
    title: "Wortliste vorbereiten",
    next: "Weiter zu Modus",
  },
  {
    id: "settings",
    tab: "Modus",
    title: "Modus und Optionen",
    next: "Raum öffnen",
  },
  { id: "lobby", tab: "Lobby", title: "Lobby", next: "Sitzung starten" },
  { id: "live", tab: "Live", title: "Live-Sitzung", next: "Sitzung beenden" },
];

const KINDS: ReadonlyArray<[ContentKind, string]> = [
  ["text", "Text"],
  ["vocabulary", "Vokabeln"],
  ["math", "Mathe"],
];
const SPLITS: ReadonlyArray<[SplitMode, string]> = [
  ["satz", "Satz"],
  ["zeile", "Zeile"],
  ["wort", "Wort"],
];

export const MODES: ReadonlyArray<{
  id: DictationMode;
  title: string;
  sub: string;
  icon: IconName;
  flow: readonly string[];
}> = [
  {
    id: "LAUFDIKTAT",
    title: "Laufdiktat",
    sub: "Mit zwei Fingern einprägen, dann tippen",
    icon: "run",
    flow: ["Abschnitt einprägen", "Zum Schreibfeld wechseln", "Eingabe prüfen"],
  },
  {
    id: "UEBUNG",
    title: "Freie Übung",
    sub: "Vorlesen und gestufte Buchstaben-Hilfe",
    icon: "ear",
    flow: ["Wort anhören", "Wort eintippen", "Bei Fehler Buchstaben-Hilfe"],
  },
  {
    id: "BATTLE",
    title: "Battle",
    sub: "Gegeneinander tippen, mit Störangriffen",
    icon: "swords",
    flow: [
      "Beide starten gleichzeitig",
      "Abtippen, Angriffe einsetzen",
      "Wer zuerst fertig ist, gewinnt",
    ],
  },
  {
    id: "STATION",
    title: "Stationen",
    sub: "Ohne eigenes Gerät, an nummerierten Stationen",
    icon: "pin",
    flow: [
      "Zur Station laufen",
      "Abschnitt lesen und merken",
      "Am Gerät eintippen",
    ],
  },
];

function optionList(mode: DictationMode, kind: ContentKind) {
  const station = mode === "STATION";
  return [
    {
      id: "tts",
      label: "Vorlesen erlauben",
      hint: "Zählt als Spicker",
      show: true,
    },
    {
      id: "shuffle",
      label: station
        ? "Reihenfolge je Schülernummer mischen"
        : "Reihenfolge pro Schüler mischen",
      hint: "",
      show: true,
    },
    {
      id: "strict",
      label: "Nur getippte Eingaben",
      hint: "Verhindert Einfügen und Autokorrektur",
      show: !station,
    },
    {
      id: "taskHelp",
      label: "Aufgabe nach Fehlern zeigen",
      hint: "Mathe: nach 2 Fehlern steht die Aufgabe wieder im Antwortfeld",
      show: !station && kind === "math",
    },
    { id: "stars", label: "Sterne anzeigen", hint: "", show: !station },
    { id: "ink", label: "Tinten-Angriff", hint: "", show: mode === "BATTLE" },
    {
      id: "flicker",
      label: "Flimmer-Angriff",
      hint: "",
      show: mode === "BATTLE",
    },
  ].filter((option) => option.show) as Array<{
    id: DictationOption;
    label: string;
    hint: string;
  }>;
}

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

const PLACEHOLDERS: Record<ContentKind, string> = {
  text: "Text einfügen oder tippen. Er wird automatisch in Abschnitte geteilt.",
  vocabulary: "Eine Vokabel pro Zeile: Wort ; Übersetzung",
  math: "Eine Aufgabe pro Zeile, z. B. 7 + 5",
};

function KindChips({ content, onKind }: TeacherDictationScreenProps) {
  return (
    <div className={styles.chips} role="group" aria-label="Inhaltsart">
      {KINDS.map(([kind, label]) => (
        <Chip
          key={kind}
          pressed={content.kind === kind}
          onClick={() => onKind?.(kind)}
        >
          {label}
        </Chip>
      ))}
    </div>
  );
}

/** Titel, „Speichern“ und Mülleimer (nur mit den Ablage-Props). */
function LibraryBar(props: TeacherDictationScreenProps) {
  const [confirming, setConfirming] = useState(false);
  if (!props.onTitle && !props.onSave) return null;
  return (
    <div className={styles.libraryBar}>
      <label className={styles.libraryTitle}>
        <span className={styles.label}>Titel</span>
        <input
          type="text"
          className={styles.libraryInput}
          value={props.title ?? ""}
          maxLength={300}
          placeholder={
            props.titlePlaceholder ?? "Wird aus dem Text vorgeschlagen"
          }
          onChange={(event) => props.onTitle?.(event.target.value)}
        />
      </label>
      {props.onSave ? (
        <button
          type="button"
          className={styles.libraryButton}
          onClick={props.onSave}
        >
          Speichern
        </button>
      ) : null}
      {props.onDelete && !confirming ? (
        <button
          type="button"
          className={cx(styles.libraryButton, styles.libraryIcon)}
          aria-label="Aus der Ablage löschen"
          title="Löschen"
          onClick={() => setConfirming(true)}
        >
          <Icon name="trash" size={18} />
        </button>
      ) : null}
      {props.onDelete && confirming ? (
        <span
          className={styles.libraryConfirm}
          role="group"
          aria-label="Löschen bestätigen"
        >
          <span>Wirklich aus der Ablage löschen?</span>
          <button
            type="button"
            className={cx(styles.libraryButton, styles.libraryDanger)}
            onClick={() => {
              setConfirming(false);
              props.onDelete?.();
            }}
          >
            Ja, löschen
          </button>
          <button
            type="button"
            className={styles.libraryButton}
            onClick={() => setConfirming(false)}
          >
            Abbrechen
          </button>
        </span>
      ) : null}
      {props.libraryNotice ? (
        <p className={styles.libraryNotice} role="status">
          {props.libraryNotice}
        </p>
      ) : null}
    </div>
  );
}

function ImportStep(props: TeacherDictationScreenProps) {
  const {
    content,
    onText,
    onSplit,
    onEditSections,
    onImportFile,
    onMoveSection,
  } = props;
  const count = content.sections.length;
  const [dragged, setDragged] = useState<number | null>(null);
  const sortable = Boolean(onMoveSection) && content.kind === "text";
  if (content.kind === "vocabulary" && props.vocabulary) {
    return (
      <div className={styles.editorStage}>
        <KindChips {...props} />
        <LibraryBar {...props} />
        <VocabularyEditor {...props.vocabulary} />
      </div>
    );
  }
  if (content.kind === "math" && props.math) {
    return (
      <div className={styles.editorStage}>
        <KindChips {...props} />
        <LibraryBar {...props} />
        <MathEditor {...props.math} />
      </div>
    );
  }
  return (
    <div className={styles.stage}>
      <div className={styles.column}>
        <KindChips {...props} />
        <LibraryBar {...props} />
        <textarea
          className={styles.source}
          aria-label={KINDS.find(([kind]) => kind === content.kind)?.[1]}
          placeholder={PLACEHOLDERS[content.kind]}
          value={content.text}
          onChange={(event) => onText?.(event.target.value)}
        />
        <div className={styles.splitRow}>
          {content.kind === "text" ? (
            <div className={styles.split} role="group" aria-label="Teilen nach">
              <span className={styles.label} aria-hidden="true">
                Teilen nach
              </span>
              {SPLITS.map(([split, label]) => (
                <Chip
                  key={split}
                  pressed={content.split === split}
                  onClick={() => onSplit?.(split)}
                >
                  {label}
                </Chip>
              ))}
            </div>
          ) : (
            <span />
          )}
          {onImportFile ? (
            <label className={styles.fileButton}>
              Datei importieren
              <input
                type="file"
                accept=".txt,.csv,.tsv,text/plain,text/csv"
                className={styles.fileInput}
                onChange={(event) => {
                  onImportFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          ) : null}
        </div>
      </div>
      <div className={styles.column}>
        <div className={styles.between}>
          <span className={styles.label}>
            <span className={styles.narrowOnly}>
              {count} Abschnitte{sortable ? " · ziehen zum Sortieren" : ""}
            </span>
            <span className={styles.wideOnly}>
              {count} Abschnitte · so sehen es die Schüler
            </span>
          </span>
          {onEditSections ? (
            <button
              type="button"
              className={cx(styles.linkButton, styles.narrowOnly)}
              onClick={onEditSections}
            >
              Bearbeiten
            </button>
          ) : null}
          {sortable ? (
            <span className={cx(styles.muted, styles.wideOnly)}>
              ziehen zum Sortieren
            </span>
          ) : null}
        </div>
        {count ? (
          <ol className={styles.sections}>
            {content.sections.map((section, sectionIndex) => (
              <li
                key={`${sectionIndex}-${section}`}
                className={cx(
                  styles.section,
                  dragged === sectionIndex && styles.dragging,
                )}
                draggable={sortable}
                onDragStart={() => setDragged(sectionIndex)}
                onDragEnd={() => setDragged(null)}
                onDragOver={(event) => {
                  if (dragged !== null) event.preventDefault();
                }}
                onDrop={() => {
                  if (dragged !== null && dragged !== sectionIndex) {
                    onMoveSection?.(dragged, sectionIndex);
                  }
                  setDragged(null);
                }}
              >
                <span className={styles.sectionNumber}>{sectionIndex + 1}</span>
                <span className={styles.sectionText}>{section}</span>
                {sortable ? (
                  <span className={styles.handle} aria-hidden="true">
                    ⋮⋮
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </div>
  );
}

function ModeButtons({
  mode,
  onMode,
  onOpenOptions,
}: TeacherDictationScreenProps) {
  return (
    <div className={styles.modeList}>
      {MODES.map((entry) => (
        <button
          key={entry.id}
          type="button"
          className={styles.mode}
          aria-pressed={entry.id === mode}
          onClick={() => {
            onMode?.(entry.id);
            onOpenOptions?.();
          }}
        >
          <span className={styles.modeIcon}>
            <Icon name={entry.icon} size={22} />
          </span>
          <span className={styles.modeText}>
            <span className={styles.modeTitle}>{entry.title}</span>
            <span className={styles.modeSub}>{entry.sub}</span>
          </span>
          <span className={styles.radio}>
            <Icon name="check" size={13} strokeWidth={3.4} />
          </span>
        </button>
      ))}
    </div>
  );
}

function ModeDetails({
  mode,
  content,
  options,
  classChoice,
  stationCount,
  onToggleOption,
  onStationCount,
}: TeacherDictationScreenProps) {
  const current = MODES.find((entry) => entry.id === mode) ?? MODES[0]!;
  return (
    <div className={styles.details}>
      <div className={styles.detailsHead}>
        <span className={styles.detailsTitle}>{current.title}</span>
        <span className={styles.detailsSub}>{current.sub}</span>
      </div>
      <div className={styles.flow}>
        <Eyebrow>Ablauf</Eyebrow>
        <ol className={styles.flow}>
          {current.flow.map((text, flowIndex) => (
            <li key={text} className={styles.flowStep}>
              <span className={styles.flowNumber}>{flowIndex + 1}</span>
              {text}
            </li>
          ))}
        </ol>
      </div>
      <div className={styles.divider} />
      <div className={styles.options}>
        <Eyebrow>Optionen</Eyebrow>
        {mode === "STATION" ? (
          <div className={styles.stationCount}>
            Anzahl Stationen
            <span className={styles.stepper}>
              <button
                type="button"
                aria-label="Weniger"
                onClick={() => onStationCount?.(stationCount - 1)}
              >
                −
              </button>
              <output>{stationCount}</output>
              <button
                type="button"
                aria-label="Mehr"
                onClick={() => onStationCount?.(stationCount + 1)}
              >
                +
              </button>
            </span>
          </div>
        ) : null}
        {optionList(mode, content.kind).map((option) => (
          <button
            key={option.id}
            type="button"
            className={styles.option}
            aria-pressed={options[option.id]}
            onClick={() => onToggleOption?.(option.id)}
          >
            <span className={styles.checkbox}>
              <Icon name="check" size={13} strokeWidth={3.4} />
            </span>
            <span className={styles.optionText}>
              <span className={styles.optionLabel}>{option.label}</span>
              {option.hint ? (
                <span className={styles.optionHint}>{option.hint}</span>
              ) : null}
            </span>
          </button>
        ))}
        {classChoice && classChoice.options.length > 0 ? (
          <label className={styles.classPick}>
            <span className={styles.optionLabel}>Klasse (optional)</span>
            <select
              className={styles.classSelect}
              value={classChoice.value}
              onChange={(event) => classChoice.onChange(event.target.value)}
            >
              <option value="">Keine Klasse</option>
              {classChoice.options.map(({ id, name }) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
            <span className={styles.optionHint}>
              Nur in Runden für diese Klasse wirkt die Schreiberleichterung.
            </span>
          </label>
        ) : null}
      </div>
    </div>
  );
}

function SettingsStep(props: TeacherDictationScreenProps) {
  return (
    <div className={cx(styles.stage, styles.settings)}>
      <div className={styles.column}>
        <span className={cx(styles.label, styles.narrowOnly)}>
          Modus antippen · Optionen öffnen sich darüber
        </span>
        <Eyebrow className={styles.wideOnly}>Spielmodus wählen</Eyebrow>
        <ModeButtons {...props} />
      </div>
      <section className={styles.settingsPanel} aria-label="Optionen">
        <ModeDetails {...props} />
      </section>
    </div>
  );
}

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

function LobbyStep(
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

function LiveStep({
  roomCode,
  mode,
  live,
  roomTimes,
  onExportCsv,
}: TeacherDictationScreenProps) {
  const maxMistakes = Math.max(1, ...live.mistakes.map((entry) => entry.count));
  return (
    <div className={cx(styles.stage, styles.live)}>
      <span className={styles.liveBadge}>
        <span className={styles.dot} />
        Live · Raum {roomCode}
      </span>
      {roomTimes?.closed ? (
        <p className={styles.roomNote} role="status">
          <strong>Raum geschlossen.</strong> Die letzten Ergebnisse bleiben
          hier, bis du einen neuen Raum öffnest.
        </p>
      ) : roomTimes?.closingSoon ? (
        <p className={styles.roomNote} role="status">
          <strong>Raum schließt um {roomTimes.closesAt}.</strong> Ergebnisse
          jetzt als CSV sichern.
        </p>
      ) : null}
      <div className={styles.stats}>
        <LiveStat label="Aktiv" value={live.active} dot="var(--gold)" />
        <LiveStat label="Fertig" value={live.finished} dot="var(--green)" />
        <LiveStat
          label="Gesamt"
          value={`${live.overall} %`}
          dot="var(--ink3)"
        />
      </div>
      <div className={styles.liveGrid}>
        <div className={styles.liveStudents}>
          <div className={cx(styles.between, styles.studentsHead)}>
            <span className={styles.label}>Schüler</span>
            <button type="button" className={styles.csv} onClick={onExportCsv}>
              Ergebnisse als CSV
            </button>
          </div>
          {mode === "STATION" ? (
            <ul className={styles.stations}>
              {live.stations.map((station) => (
                <li
                  key={station.number}
                  className={cx(
                    styles.station,
                    station.state === "done" && styles.stationDone,
                    station.state === "active" && styles.stationActive,
                  )}
                >
                  <span className={styles.stationNumber}>{station.number}</span>
                  <span className={styles.stationState}>{station.label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <ul className={styles.students}>
              {live.students.map((student) => (
                <li
                  key={student.name}
                  className={cx(
                    styles.student,
                    student.status === "offline" && styles.away,
                    student.struggling && styles.struggling,
                  )}
                >
                  <span className={styles.studentHead}>
                    {student.animal ? (
                      <Animal animal={student.animal} size={26} />
                    ) : null}
                    <span className={styles.studentName}>{student.name}</span>
                    <StatusChip status={student.status} />
                    {student.struggling ? (
                      <span className={styles.needsHelp}>Braucht Hilfe</span>
                    ) : null}
                  </span>
                  <span className={styles.studentMeta}>
                    {student.progress >= student.total ? (
                      <span className={styles.finished}>Fertig</span>
                    ) : (
                      <span className={styles.track}>
                        <span
                          style={{
                            width: `${Math.round((student.progress / student.total) * 100)}%`,
                          }}
                        />
                      </span>
                    )}
                    {student.mistakes ? (
                      <span className={styles.errors}>
                        {`${student.mistakes}✕`}
                      </span>
                    ) : null}
                    <span className={styles.count}>
                      {`${student.progress}/${student.total}`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className={cx(styles.csv, styles.csvNarrow)}
            onClick={onExportCsv}
          >
            Ergebnisse als CSV
          </button>
        </div>
        <section className={styles.mistakes} aria-label="Häufigste Fehler">
          <Eyebrow>Häufigste Fehler</Eyebrow>
          {live.mistakes.map((entry) => (
            <div key={entry.word} className={styles.mistake}>
              <span className={styles.mistakeWord}>
                {entry.display ?? entry.word}
              </span>
              <span className={styles.mistakeBar}>
                <span
                  style={{
                    width: `${Math.round((entry.count / maxMistakes) * 100)}%`,
                  }}
                />
              </span>
              <span className={styles.mistakeCount}>{entry.count}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function LiveStat({
  label,
  value,
  dot,
}: {
  label: string;
  value: number | string;
  dot: string;
}) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>
        <span
          className={styles.dot}
          style={{ "--dot": dot } as CSSProperties}
        />
        {label}
      </span>
      <p className={styles.statValue}>{value}</p>
    </div>
  );
}

/** Vollbild zum Beamen: großer QR in der Mitte, Code und Zahl darunter. */
function QrOverlay({
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

/** Nur Abweichungen zeigen: im Raum ist der Normalfall. */
function StatusChip({ status }: { status: ParticipantStatus | undefined }) {
  if (status === "practice")
    return (
      <span className={cx(styles.status, styles.practice)}>übt weiter</span>
    );
  if (status === "offline")
    return <span className={cx(styles.status, styles.offline)}>getrennt</span>;
  return null;
}
