import type { ReactNode } from "react";
import type { MathEditorProps } from "../math-editor";
import type { VocabularyEditorProps } from "../vocabulary-editor";
import type { VocabularyPickerProps } from "../vocabulary-picker";
import type { Theme } from "../../parts/parts";

export type TeacherStep = "import" | "settings" | "lobby" | "live";
export type ContentKind = "text" | "vocabulary" | "math";
export type SplitMode = "satz" | "zeile" | "wort";
/** „Zeilen“: an jeder Zeile teilen oder nur an Leerzeilen. */
export type LineMode = "each" | "blank";
/** Feineinstellung der Zerlegung: Satzzeichen, eigenes Zeichen, Zeilenmodus. */
export type SplitOptions = {
  /** Aktive Satzzeichen („.“, „!“, „?“, „,“); mindestens eins. */
  marks: readonly string[];
  /** Eigenes Trennzeichen, höchstens drei Zeichen; leer = keins. */
  custom: string;
  lineMode: LineMode;
};
export type DictationMode = "LAUFDIKTAT" | "UEBUNG" | "BATTLE" | "STATION";
export type DictationOption =
  | "tts"
  | "shuffle"
  | "strict"
  | "taskHelp"
  | "stars"
  | "tempo"
  | "ink"
  | "flicker";

/** Ein Modus als Auswahlkarte im Schritt „Modus“ (Design 14c/16a/16b). */
export type EditorMode = { id: DictationMode; title: string; text: string };
/** Eine Option des Raums mit Beschriftung und Hinweis. */
export type EditorOption = { id: DictationOption; label: string; hint: string };

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
  /** Fehlerwörter dieses Tiers, häufigste zuerst. `display` ersetzt den Text, z. B. für Formeln. */
  wordErrors?: ReadonlyArray<LiveWordError>;
};
export type LiveWordError = {
  word: string;
  count: number;
  display?: ReactNode;
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
    /** Ohne Angabe fehlen die Zusatzzeilen unter „Teilen nach“. */
    splitOptions?: SplitOptions;
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
  /** Titel des Inhalts (Schritt „Inhalt“, Zeile über dem Titel in „Modus“). */
  title?: string;
  titlePlaceholder?: string;
  libraryNotice?: string;
  /** Der Heftinhalt stammt aus dem Auswahldialog und wird neu abgelegt. */
  quizFromLibrary?: boolean;
  onTitle?: (title: string) => void;
  /** Legt unter „Klasse“ eine neue Klasse an (Name) und wählt sie aus. */
  onCreateClass?: (name: string) => Promise<void> | void;
  /** „Aus der Ablage löschen“ mit Bestätigung, nur beim abgelegten Inhalt. */
  onDelete?: () => void;
  /** Beschriftung und Sperre des Weiter-Knopfs (z. B. „Öffnet …“). */
  nextLabel?: string;
  nextDisabled?: boolean;
  /** Schritte, die gerade nicht angesprungen werden können. */
  lockedSteps?: readonly TeacherStep[];
  /**
   * Schritte „Inhalt“ und „Modus“ (Design 14b/14c): Modi als Karten. Ohne
   * Angabe die Kurztexte der Ansicht; die Seite gibt die echten Modi mit.
   */
  modes?: readonly EditorMode[];
  /** Beschriftung der Optionen; ohne Angabe die echten Optionen des Modus. */
  optionList?: readonly EditorOption[];
  /** Der Inhalt liegt schon in der Ablage (Zeile über dem Titel nennt ihn). */
  stored?: boolean;
  /**
   * „Speichern“ am Ende von Schritt 2 (Design 15b): legt Inhalt, Modus und
   * Optionen als vorbereitetes Laufdiktat ab.
   */
  onSavePrepared?: () => void;
  /** Fehler oder Hinweis unter dem Inhalt. */
  notice?: string;
  /**
   * Text-Laufdiktat: Wörter in den Wortspeicher der Kinder. Ohne Angabe (Bereich
   * „Wortspeicher“ nicht sichtbar) erscheint die Einstellung nicht.
   */
  wordStore?: {
    value: "none" | "errors" | "all";
    onChange: (value: "none" | "errors" | "all") => void;
  };
  /** Vokabelheft statt Textfeld, wenn Inhaltsart Vokabeln. */
  vocabulary?: VocabularyEditorProps;
  /** Auswahldialog „Aus meinen Vokabeln wählen“ (nur mit Vokabelheft). */
  vocabularyPicker?: VocabularyPickerProps;
  /** Aufgaben-Generator statt Textfeld, wenn Inhaltsart Mathe. */
  math?: MathEditorProps;
  onToggleTheme?: () => void;
  onLeave?: () => void;
  onStep?: (step: TeacherStep) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onMoveSection?: (from: number, to: number) => void;
  onText?: (text: string) => void;
  onSplit?: (split: SplitMode) => void;
  onSplitOptions?: (patch: Partial<SplitOptions>) => void;
  onImportFile?: (file: File | undefined) => void;
  onMode?: (mode: DictationMode) => void;
  onToggleOption?: (option: DictationOption) => void;
  onStationCount?: (count: number) => void;
  onOpenOptions?: () => void;
  onCloseOptions?: () => void;
  onExportCsv?: () => void;
};
