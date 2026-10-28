import type { ReactNode } from "react";
import type { LearningBoxDeckState } from "../../../../src/domain/learning-box";
import { type Theme } from "../../parts/parts";

export type LbMode = "writing" | "oral";
export type LbDirection = "forward" | "reverse" | "mixed";
export type LbSortKey = "question" | "answer" | "deck" | "tag" | "box";

export type LbDeck = {
  id: string;
  title: string;
  folderId: string | null;
  total: number;
  /** Fällige Karten (schon einmal geübt). */
  due: number;
  /** Karten mit neuer, noch nie geübter Richtung. */
  fresh: number;
  /** Stand heute: fällig, neu oder erledigt (`learningBoxDeckStatus`). */
  state: LearningBoxDeckState;
  /** Karten je (wirksamer) Box 1–5. */
  boxes: readonly number[];
  /** Karten, die in mindestens einer Richtung lange nicht geübt sind. */
  longUnpracticed: number;
  /** z. B. „aus dem Laufdiktat“ oder „eigene“. */
  sourceLabel: string;
  /** Sprachen von Vorder- und Rückseite, z. B. „Deutsch“ und „Englisch“. */
  frontLabel: string;
  backLabel: string;
};
export type LbFolder = { id: string; title: string };
export type LbCard = {
  id: string;
  question: string;
  answer: string;
  tag: string | null;
  /** Wirksame Box (nach Schonfrist und Rückstufung), nicht die gespeicherte. */
  box: number;
  /** In mindestens einer Richtung ab 14 Tagen überfällig. */
  longUnpracticed: boolean;
  deckId: string;
  deckTitle: string;
};
export type LbLanguage = { locale: string; label: string };

export type LbFeedback = {
  correct: boolean;
  /** Frage, die gestellt wurde. */
  prompt: string;
  /** Richtige Antwort (Alternativen mit „ / “). */
  expected: string;
  /** Eingabe des Kindes. */
  given: string;
  boxFrom: number;
  boxTo: number;
  /** Übungsrunde ohne Verschieben: die Box bleibt, wie sie ist. */
  practice?: boolean;
  /** z. B. „kommt morgen wieder“. */
  nextLabel: string;
};

export type LbStudy = {
  title: string;
  /** Karten, die in der Runde noch fehlen. */
  remaining: number;
  modeLabel: string;
  directionLabel: string;
  /** Anteil der erledigten Karten, 0–1. */
  progress: number;
  eyebrow: string;
  box: number;
  question: string;
  mode: LbMode;
  answer: string;
  revealed: boolean;
  /** Lösung, die im mündlichen Modus nach „Antwort zeigen“ erscheint. */
  revealedAnswer: string;
  feedback: LbFeedback | null;
  done: { correct: number; wrong: number } | null;
  canSpeak: boolean;
};

export type LbEdit = {
  cards: readonly LbCard[];
  total: number;
  query: string;
  /** „all“ oder die Kennung eines Stapels. */
  filter: string;
  sortKey: LbSortKey | null;
  sortDir: 1 | -1;
};

export type LbSheet =
  | { kind: "manual" }
  | { kind: "import" }
  /** `initialCode`: aus Link oder Scan vorbefüllter Transfercode. */
  | { kind: "code"; initialCode?: string }
  | { kind: "deck" }
  /** `scope`: „heute“, „errors“, „box:<n>“ oder die Kennung eines Stapels. */
  | { kind: "start"; scope: string };

export type LbTransfer = {
  busy: boolean;
  error: string;
  success: { title: string; added: number; reused: number } | null;
};

export type LbCardInput = { question: string; answer: string; tag: string };

/** Eine geprüfte Zeile des Massenimports; `tag` fehlt, wenn keiner da ist. */
export type LbImportRow = { question: string; answer: string; tag?: string };
/** Vorschau-Ergebnis: Zeilen zum Speichern und Nummern übersprungener Zeilen. */
export type LbImportInput = {
  rows: readonly LbImportRow[];
  skipped: readonly number[];
};

export type LernBoxScreenProps = {
  theme: Theme;
  loading: boolean;
  notice: string;
  folders: readonly LbFolder[];
  decks: readonly LbDeck[];
  /** Offene Vokabeln der Tagesportion („Heute dran“). */
  dueTotal: number;
  /**
   * Stapel, aus denen „Heute dran“ kommt. Ohne Angabe zählen die Stapel mit
   * fälligen Karten.
   */
  todayDecks?: number;
  errorCount: number;
  languages: readonly LbLanguage[];
  /** Zuletzt gewählte Übungsart; Vorgabe im Start-Fenster. */
  mode: LbMode;
  direction: LbDirection;
  /** Richtungsnamen („Deutsch → Englisch“) für einen Start-Bereich. */
  directionLabelsFor: (scope: string) => { forward: string; reverse: string };
  /**
   * Start-Bereich, dessen Richtung je Vokabel aus der Tagesportion kommt; dort
   * entfällt die Richtungswahl im Start-Fenster.
   */
  planScope?: string;
  /** „Weitermachen“ für eine unterbrochene Runde (C-001); steht oben in der Übersicht. */
  resumeOffer?: ReactNode;
  main:
    | { kind: "home" }
    | { kind: "edit"; edit: LbEdit }
    | { kind: "study"; study: LbStudy };
  sheet: LbSheet | null;
  transfer: LbTransfer;
  onToggleTheme?: () => void;
  onOpenSheet?: (sheet: LbSheet) => void;
  onCloseSheet?: () => void;
  onStart?: (input: {
    scope: string;
    mode: LbMode;
    direction: LbDirection;
  }) => void;
  onEdit?: () => void;
  onBack?: () => void;
  // Vokabeln anlegen
  onCreateDeck?: (input: {
    title: string;
    folderId: string | null;
    frontLocale: string;
    backLocale: string;
  }) => Promise<string | null>;
  onAddCard?: (
    deckId: string,
    input: { question: string; answer: string },
  ) => Promise<"added" | "duplicate" | "error">;
  /** Speichert die in der Vorschau bestätigten Zeilen; liefert die Meldung. */
  onImportCards?: (deckId: string, input: LbImportInput) => Promise<string>;
  /** `tag`: eigener Tag für alle Vokabeln des Pakets, leer = ohne Tag. */
  onTransferCode?: (code: string, tag: string) => void;
  onTransferQr?: (value: string, tag: string) => void;
  /** Liest den Transfercode aus gescanntem Text (Link oder Code), sonst `null`. */
  onReadTransferCode?: (value: string) => string | null;
  // Vokabelliste
  onQuery?: (query: string) => void;
  onFilter?: (filter: string) => void;
  onSort?: (key: LbSortKey) => void;
  onSaveCard?: (id: string, input: LbCardInput, deckId: string) => void;
  onDeleteCards?: (ids: string[]) => void;
  // Stapel und Ordner verwalten
  onCreateFolder?: (title: string) => void;
  onDeleteFolder?: (id: string) => void;
  onMoveDeck?: (id: string, folderId: string | null) => void;
  onDeleteDeck?: (id: string) => void;
  onExport?: () => void;
  onImportBackup?: (file: File) => void;
  // Lernrunde
  onAnswer?: (value: string) => void;
  onCheck?: () => void;
  onReveal?: () => void;
  onAssess?: (correct: boolean) => void;
  onNext?: () => void;
  onSpeak?: (side: "question" | "answer") => void;
  onEndSession?: () => void;
};
