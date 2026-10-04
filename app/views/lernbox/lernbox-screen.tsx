"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Icon } from "../../ui/icons";
import { QrCodeScanner } from "../../ui/qr-scanner";
import { cx, ThemeSwitch, type Theme } from "../parts/parts";
import styles from "./lernbox-screen.module.css";

export type LbMode = "writing" | "oral";
export type LbDirection = "forward" | "reverse" | "mixed";
export type LbSortKey = "question" | "answer" | "deck" | "tag" | "box";

export type LbDeck = {
  id: string;
  title: string;
  folderId: string | null;
  total: number;
  due: number;
  /** Karten je Box 1–5. */
  boxes: readonly number[];
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
  box: number;
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
  | { kind: "code" }
  /** `scope`: „due“, „errors“ oder die Kennung eines Stapels. */
  | { kind: "start"; scope: string };

export type LbTransfer = {
  busy: boolean;
  error: string;
  success: { title: string; added: number; reused: number } | null;
};

export type LbCardInput = { question: string; answer: string; tag: string };

export type LernBoxScreenProps = {
  theme: Theme;
  loading: boolean;
  notice: string;
  folders: readonly LbFolder[];
  decks: readonly LbDeck[];
  dueTotal: number;
  errorCount: number;
  languages: readonly LbLanguage[];
  /** Zuletzt gewählte Übungsart; Vorgabe im Start-Fenster. */
  mode: LbMode;
  direction: LbDirection;
  /** Richtungsnamen („Deutsch → Englisch“) für einen Start-Bereich. */
  directionLabelsFor: (scope: string) => { forward: string; reverse: string };
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
  onImportCards?: (deckId: string, text: string) => Promise<string>;
  onTransferCode?: (code: string) => void;
  onTransferQr?: (value: string) => void;
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

const BOX_COLORS = ["#c7674a", "#d98a3d", "#e0a83a", "#7a9e5a", "#2f6b4f"];

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

/** LernBox nach Design 8a/8b (Übersicht, Bearbeiten), 4c/4g–4j (Runde). */
export function LernBoxScreen(props: LernBoxScreenProps) {
  const { main } = props;
  return (
    <div className={styles.screen}>
      {main.kind === "study" ? (
        <Study {...props} study={main.study} />
      ) : main.kind === "edit" ? (
        <Edit {...props} edit={main.edit} />
      ) : (
        <Home {...props} />
      )}
      {props.sheet ? <Sheets {...props} sheet={props.sheet} /> : null}
    </div>
  );
}

/* ================= Übersicht (8a / 8b) ================= */

function Home(props: LernBoxScreenProps) {
  const { decks } = props;
  const total = decks.reduce((sum, deck) => sum + deck.total, 0);
  const dueDecks = decks.filter((deck) => deck.due > 0).length;
  const loose = decks.filter((deck) => !deck.folderId);
  const start = (scope: string) =>
    props.onOpenSheet?.({ kind: "start", scope });
  return (
    <div className={styles.home}>
      <header className={styles.homeHead}>
        <h1 className={styles.homeTitle}>LernBox</h1>
        <Segment />
        <span className={styles.spacer} />
        <EditButton onClick={props.onEdit} />
        <PlusMenu {...props} />
      </header>

      {props.notice ? (
        <p className={styles.notice} role="status">
          {props.notice}
        </p>
      ) : null}

      <div className={styles.overview}>
        <section className={styles.hero} aria-label="Heute dran">
          <span className={styles.heroLabel}>Heute dran</span>
          <span className={styles.heroCount}>
            <strong>{props.dueTotal}</strong>
            <span>
              {props.dueTotal === 0
                ? "Heute ist alles geschafft"
                : `${props.dueTotal === 1 ? "Vokabel" : "Vokabeln"} aus ${plural(dueDecks, "Stapel", "Stapeln")}`}
            </span>
          </span>
          <div className={styles.heroActions}>
            <button
              type="button"
              className={styles.heroStart}
              disabled={props.dueTotal === 0}
              onClick={() => start("due")}
            >
              Jetzt üben
            </button>
            <button
              type="button"
              className={cx(styles.heroErrors, styles.wideOnly)}
              disabled={props.errorCount === 0}
              onClick={() => start("errors")}
            >
              Meine Fehler
              <span className={styles.errorPill}>{props.errorCount}</span>
            </button>
          </div>
        </section>
        <section
          className={cx(styles.chart, styles.wideOnly)}
          aria-label="Verteilung auf die Boxen"
        >
          <span className={styles.chartHead}>
            <strong>Wo liegen meine Vokabeln?</strong>
            <span className={styles.muted}>{total} insgesamt</span>
          </span>
          <BoxChart decks={decks} />
        </section>
      </div>

      <section className={styles.stacks} aria-labelledby="lb-stacks">
        <span className={styles.stacksHead}>
          <h2 id="lb-stacks" className={styles.stacksTitle}>
            Meine Stapel
          </h2>
          <span className={cx(styles.muted, styles.narrowOnly)}>
            {plural(total, "Vokabel", "Vokabeln")}
          </span>
        </span>
        {props.loading ? (
          <p className={styles.muted}>LernBox wird geladen …</p>
        ) : decks.length === 0 ? (
          <p className={styles.empty}>
            Noch keine Stapel. Tippe auf das Plus und trage deine erste Vokabel
            ein.
          </p>
        ) : (
          <>
            {loose.length ? <DeckGrid decks={loose} onStart={start} /> : null}
            {props.folders.map((folder) => {
              const inside = decks.filter(
                (deck) => deck.folderId === folder.id,
              );
              return inside.length ? (
                <div key={folder.id} className={styles.folder}>
                  <h3 className={styles.folderTitle}>{folder.title}</h3>
                  <DeckGrid decks={inside} onStart={start} />
                </div>
              ) : null;
            })}
          </>
        )}
      </section>

      <button
        type="button"
        className={cx(styles.errorRow, styles.narrowOnly)}
        disabled={props.errorCount === 0}
        onClick={() => start("errors")}
      >
        <span>Meine Fehler üben</span>
        <span className={styles.errorPill}>{props.errorCount}</span>
      </button>
    </div>
  );
}

function Segment() {
  return (
    <div className={styles.segment} role="group" aria-label="Bereich">
      <span className={styles.segmentOn} aria-current="page">
        Vokabeln
      </span>
      <Link href="/frei/german/lernwoerter" className={styles.segmentOff}>
        Wortspeicher
      </Link>
    </div>
  );
}

function EditButton({ onClick }: { onClick: (() => void) | undefined }) {
  return (
    <button
      type="button"
      className={styles.editButton}
      aria-label="Bearbeiten"
      onClick={onClick}
    >
      <Icon name="pencil" size={18} strokeWidth={2.2} />
      <span className={styles.wideOnly}>Bearbeiten</span>
    </button>
  );
}

function PlusMenu(props: LernBoxScreenProps) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  const items: ReadonlyArray<{
    sheet: LbSheet;
    title: string;
    text: string;
    icon: ReactNode;
  }> = [
    {
      sheet: { kind: "manual" },
      title: "Selbst eintragen",
      text: "Wort und Übersetzung tippen",
      icon: <Icon name="pencil" size={20} strokeWidth={2.2} />,
    },
    {
      sheet: { kind: "import" },
      title: "Viele einfügen",
      text: "Liste einfügen oder Datei wählen",
      icon: <Icon name="upload" size={20} strokeWidth={2.2} />,
    },
    {
      sheet: { kind: "code" },
      title: "Code eingeben",
      text: "Stapel von deiner Lehrkraft holen",
      icon: <CodeIcon />,
    },
  ];
  return (
    <div className={styles.plusWrap} ref={box}>
      <button
        type="button"
        className={styles.plus}
        aria-label="Vokabeln hinzufügen"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Hinzufügen"
        onClick={() => setOpen(!open)}
      >
        <Icon name="plus" size={24} strokeWidth={2.4} />
      </button>
      {open ? (
        <div className={styles.menu} role="menu" aria-label="Hinzufügen">
          {items.map((item) => (
            <button
              key={item.sheet.kind}
              type="button"
              role="menuitem"
              className={styles.menuItem}
              onClick={() => {
                setOpen(false);
                props.onOpenSheet?.(item.sheet);
              }}
            >
              <span className={styles.menuIcon}>{item.icon}</span>
              <span className={styles.menuText}>
                <strong>{item.title}</strong>
                <span>{item.text}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CodeIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="6" width="18" height="12" rx="3" />
      <path d="M7.5 12h.01M12 12h.01M16.5 12h.01" />
    </svg>
  );
}

function BoxChart({ decks }: { decks: readonly LbDeck[] }) {
  const totals = [0, 1, 2, 3, 4].map((index) =>
    decks.reduce((sum, deck) => sum + (deck.boxes[index] ?? 0), 0),
  );
  const max = Math.max(1, ...totals);
  return (
    <ul className={styles.bars}>
      {totals.map((count, index) => (
        <li key={index} className={styles.barItem}>
          <span className={styles.barCount}>{count}</span>
          <span
            className={styles.bar}
            aria-hidden="true"
            style={
              {
                height: `${Math.round(18 + (92 * count) / max)}px`,
                background: BOX_COLORS[index],
              } as CSSProperties
            }
          />
          <span className={styles.barLabel}>Box {index + 1}</span>
        </li>
      ))}
    </ul>
  );
}

function BoxBar({ boxes }: { boxes: readonly number[] }) {
  return (
    <span
      className={styles.boxBar}
      role="img"
      aria-label={`Boxverteilung: ${boxes.map((count, index) => `Box ${index + 1}: ${count}`).join(", ")}`}
    >
      {boxes.map((count, index) =>
        count > 0 ? (
          <span
            key={index}
            style={
              {
                flexGrow: count,
                background: BOX_COLORS[index],
              } as CSSProperties
            }
          />
        ) : null,
      )}
    </span>
  );
}

function DeckGrid({
  decks,
  onStart,
}: {
  decks: readonly LbDeck[];
  onStart: (scope: string) => void;
}) {
  return (
    <ul className={styles.deckGrid}>
      {decks.map((deck) => (
        <li key={deck.id}>
          <button
            type="button"
            className={styles.deckCard}
            onClick={() => onStart(deck.id)}
          >
            <span className={styles.deckHead}>
              <span className={styles.deckTitles}>
                <strong>{deck.title}</strong>
                <span className={styles.deckMeta}>
                  {plural(deck.total, "Vokabel", "Vokabeln")}
                  <span className={styles.wideOnly}> · {deck.sourceLabel}</span>
                </span>
              </span>
              {deck.total === 0 ? null : deck.due > 0 ? (
                <span className={styles.duePill}>{deck.due} heute</span>
              ) : (
                <span className={styles.donePill}>erledigt</span>
              )}
            </span>
            <BoxBar boxes={deck.boxes} />
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ================= Fenster (Plus, Start) ================= */

function Sheets(props: LernBoxScreenProps & { sheet: LbSheet }) {
  const { sheet } = props;
  if (sheet.kind === "start")
    return <StartSheet {...props} scope={sheet.scope} />;
  if (sheet.kind === "code") return <CodeSheet {...props} />;
  if (sheet.kind === "import") return <ImportSheet {...props} />;
  return <ManualSheet {...props} />;
}

function Modal({
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

function StartSheet(props: LernBoxScreenProps & { scope: string }) {
  const { scope } = props;
  const [mode, setMode] = useState<LbMode>(props.mode);
  const [direction, setDirection] = useState<LbDirection>(props.direction);
  const labels = props.directionLabelsFor(scope);
  const deck = props.decks.find((entry) => entry.id === scope);
  const dueDecks = props.decks.filter((entry) => entry.due > 0).length;
  const title =
    scope === "due"
      ? "Heute dran"
      : scope === "errors"
        ? "Meine Fehler"
        : (deck?.title ?? "Stapel");
  const subtitle =
    scope === "due"
      ? `${plural(props.dueTotal, "Vokabel", "Vokabeln")} aus ${dueDecks === props.decks.length ? "allen Stapeln" : plural(dueDecks, "Stapel", "Stapeln")}`
      : scope === "errors"
        ? `${plural(props.errorCount, "Vokabel", "Vokabeln")} zum Wiederholen`
        : deck
          ? plural(deck.due || deck.total, "Vokabel", "Vokabeln")
          : "";
  return (
    <Modal title={title} subtitle={subtitle} onClose={props.onCloseSheet}>
      <div className={styles.field}>
        <span className={styles.fieldLabel} id="lb-mode-label">
          Wie willst du üben?
        </span>
        <div
          className={styles.segmentSheet}
          role="group"
          aria-labelledby="lb-mode-label"
        >
          {(
            [
              ["writing", "Schreiben"],
              ["oral", "Mündlich"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={mode === value ? styles.segOn : styles.segOff}
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.field}>
        <span className={styles.fieldLabel} id="lb-direction-label">
          Richtung
        </span>
        <div
          className={styles.segmentSheet}
          role="group"
          aria-labelledby="lb-direction-label"
        >
          {(
            [
              ["forward", labels.forward],
              ["reverse", labels.reverse],
              ["mixed", "Gemischt"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={direction === value ? styles.segOn : styles.segOff}
              aria-pressed={direction === value}
              onClick={() => setDirection(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        className={styles.cta}
        onClick={() => props.onStart?.({ scope, mode, direction })}
      >
        Los geht&apos;s
      </button>
    </Modal>
  );
}

function DeckChips({
  decks,
  value,
  onChange,
  onNew,
}: {
  decks: readonly LbDeck[];
  value: string;
  onChange: (id: string) => void;
  onNew?: () => void;
}) {
  return (
    <div className={styles.chips} role="group" aria-label="In Stapel">
      {decks.map((deck) => (
        <button
          key={deck.id}
          type="button"
          className={cx(styles.chip, deck.id === value && styles.chipOn)}
          aria-pressed={deck.id === value}
          onClick={() => onChange(deck.id)}
        >
          {deck.title.split(" · ")[0]}
        </button>
      ))}
      {onNew ? (
        <button
          type="button"
          className={cx(styles.chip, styles.chipNew)}
          onClick={onNew}
        >
          + Neuer Stapel
        </button>
      ) : null}
    </div>
  );
}

function NewDeck({
  screen,
  onCreated,
  onCancel,
}: {
  screen: LernBoxScreenProps;
  onCreated: (id: string) => void;
  onCancel?: (() => void) | undefined;
}) {
  const [title, setTitle] = useState("");
  const [folderId, setFolderId] = useState("");
  const [front, setFront] = useState(screen.languages[0]?.locale ?? "de-DE");
  const [back, setBack] = useState(screen.languages[1]?.locale ?? "en-GB");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    const id = await screen.onCreateDeck?.({
      title: title.trim(),
      folderId: folderId || null,
      frontLocale: front,
      backLocale: back,
    });
    setBusy(false);
    if (id) {
      setTitle("");
      onCreated(id);
    }
  }
  return (
    <form className={styles.newDeck} onSubmit={(event) => void submit(event)}>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Name des neuen Stapels</span>
        <input
          className={styles.input}
          placeholder="z. B. Unit 3"
          maxLength={80}
          autoComplete="off"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <div className={styles.twoCols}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Vorderseite</span>
          <select
            className={styles.select}
            value={front}
            onChange={(event) => setFront(event.target.value)}
          >
            {screen.languages.map((language) => (
              <option key={language.locale} value={language.locale}>
                {language.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Rückseite</span>
          <select
            className={styles.select}
            value={back}
            onChange={(event) => setBack(event.target.value)}
          >
            {screen.languages.map((language) => (
              <option key={language.locale} value={language.locale}>
                {language.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {screen.folders.length ? (
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Ordner</span>
          <select
            className={styles.select}
            value={folderId}
            onChange={(event) => setFolderId(event.target.value)}
          >
            <option value="">Ohne Ordner</option>
            {screen.folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className={styles.buttons}>
        {onCancel ? (
          <button
            type="button"
            className={styles.ghostButton}
            onClick={onCancel}
          >
            Abbrechen
          </button>
        ) : null}
        <button
          type="submit"
          className={styles.cta}
          disabled={!title.trim() || busy}
        >
          Stapel anlegen
        </button>
      </div>
    </form>
  );
}

function ManualSheet(props: LernBoxScreenProps) {
  const { decks } = props;
  const [deckId, setDeckId] = useState(decks[0]?.id ?? "");
  const [creating, setCreating] = useState(decks.length === 0);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [saved, setSaved] = useState("");
  const first = useRef<HTMLInputElement>(null);
  const deck = decks.find((entry) => entry.id === deckId);
  const german =
    deck?.frontLabel === "Deutsch" && deck.backLabel === "Englisch";

  useEffect(() => {
    if (!creating) first.current?.focus();
  }, [creating]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!deck || !question.trim() || !answer.trim()) return;
    const result = await props.onAddCard?.(deck.id, { question, answer });
    if (result === "added") {
      setSaved(`„${question.trim()}“ gespeichert · Box 1`);
    } else if (result === "duplicate") {
      setSaved("Diese Vokabel ist schon in der LernBox.");
    } else {
      setSaved("Das hat nicht geklappt. Bitte versuche es noch einmal.");
    }
    if (result === "added" || result === "duplicate") {
      setQuestion("");
      setAnswer("");
      first.current?.focus();
    }
  }

  return (
    <Modal title="Vokabel eintragen" onClose={props.onCloseSheet}>
      {creating ? (
        <NewDeck
          screen={props}
          onCreated={(id) => {
            setDeckId(id);
            setCreating(false);
          }}
          onCancel={decks.length ? () => setCreating(false) : undefined}
        />
      ) : (
        <form
          className={styles.sheetForm}
          onSubmit={(event) => void save(event)}
        >
          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              {deck?.frontLabel ?? "Vorderseite"}
            </span>
            <input
              ref={first}
              className={styles.input}
              placeholder={german ? "z. B. Frühstück" : "Wort"}
              autoComplete="off"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              {deck?.backLabel ?? "Rückseite"}
            </span>
            <input
              className={styles.input}
              placeholder={german ? "z. B. breakfast" : "Übersetzung"}
              autoComplete="off"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
            />
          </label>
          <p className={styles.hint}>
            Mehrere richtige Antworten mit „|“ trennen, z. B. home | house.
          </p>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>In Stapel</span>
            <DeckChips
              decks={decks}
              value={deckId}
              onChange={setDeckId}
              onNew={() => setCreating(true)}
            />
          </div>
          {saved ? (
            <span className={styles.saved} role="status">
              {saved}
            </span>
          ) : null}
          <div className={styles.buttons}>
            <button
              type="button"
              className={styles.ghostButton}
              onClick={props.onCloseSheet}
            >
              Fertig
            </button>
            <button
              type="submit"
              className={styles.cta}
              disabled={!question.trim() || !answer.trim()}
            >
              Speichern und nächste
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function ImportSheet(props: LernBoxScreenProps) {
  const { decks } = props;
  const [deckId, setDeckId] = useState(decks[0]?.id ?? "");
  const [creating, setCreating] = useState(decks.length === 0);
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  return (
    <Modal title="Viele Vokabeln einfügen" onClose={props.onCloseSheet}>
      {creating ? (
        <NewDeck
          screen={props}
          onCreated={(id) => {
            setDeckId(id);
            setCreating(false);
          }}
          onCancel={decks.length ? () => setCreating(false) : undefined}
        />
      ) : (
        <form
          className={styles.sheetForm}
          onSubmit={(event) => {
            event.preventDefault();
            if (!deckId || !text.trim()) return;
            void props.onImportCards?.(deckId, text).then((message) => {
              setResult(message);
              setText("");
            });
          }}
        >
          <p className={styles.hint}>
            Eine Vokabel pro Zeile. Spalten aus Excel oder Sheets, oder mit
            Semikolon: Vorderseite; Rückseite; Tag (optional).
          </p>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Vokabeln zum Importieren</span>
            <textarea
              className={styles.textarea}
              placeholder={"Haus\thome | house\tUnit 1\nBaum;tree"}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </label>
          <label className={styles.fileButton}>
            <Icon name="upload" size={16} /> Datei wählen
            <input
              type="file"
              accept=".txt,.csv,.tsv,text/plain,text/csv"
              className={styles.fileInput}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void file.text().then(setText);
              }}
            />
          </label>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>In Stapel</span>
            <DeckChips
              decks={decks}
              value={deckId}
              onChange={setDeckId}
              onNew={() => setCreating(true)}
            />
          </div>
          {result ? (
            <span className={styles.saved} role="status">
              {result}
            </span>
          ) : null}
          <div className={styles.buttons}>
            <button
              type="button"
              className={styles.ghostButton}
              onClick={props.onCloseSheet}
            >
              Fertig
            </button>
            <button
              type="submit"
              className={styles.cta}
              disabled={!text.trim()}
            >
              Importieren
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function groupCode(value: string) {
  return value.match(/.{1,4}/g)?.join(" ") ?? value;
}

function CodeSheet(props: LernBoxScreenProps) {
  const [code, setCode] = useState("");
  const { transfer } = props;
  return (
    <Modal title="Code eingeben" onClose={props.onCloseSheet}>
      <form
        className={styles.sheetForm}
        onSubmit={(event) => {
          event.preventDefault();
          props.onTransferCode?.(code);
        }}
      >
        <p className={styles.sheetText}>
          Tippe den Code von der Tafel oder vom Arbeitsblatt ein, oder scanne
          den QR-Code mit der Kamera.
        </p>
        <div className={styles.codeBox}>
          <input
            className={styles.codeInput}
            aria-label="Code"
            aria-invalid={Boolean(transfer.error)}
            placeholder="····"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={groupCode(code)}
            onChange={(event) =>
              setCode(
                event.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "")
                  .slice(0, 24),
              )
            }
          />
          <QrCodeScanner
            onResult={(value) => props.onTransferQr?.(value)}
            buttonClassName={styles.scanButton ?? ""}
            iconSize={24}
            iconStrokeWidth={2.2}
          />
        </div>
        {transfer.error ? (
          <p className={styles.codeError} role="alert">
            {transfer.error}
          </p>
        ) : null}
        {transfer.success ? (
          <div className={styles.found} role="status">
            <strong>{transfer.success.title}</strong>
            <span>
              {transfer.success.added} neu · {transfer.success.reused} schon
              vorhanden
            </span>
          </div>
        ) : null}
        <button
          type="submit"
          className={styles.cta}
          disabled={code.length !== 24 || transfer.busy}
        >
          {transfer.busy ? "Übernimmt …" : "Stapel hinzufügen"}
        </button>
      </form>
    </Modal>
  );
}

/* ================= Bearbeiten: alle Vokabeln ================= */

const COLUMNS: ReadonlyArray<[LbSortKey, string]> = [
  ["question", "Vorderseite"],
  ["answer", "Rückseite"],
  ["deck", "Stapel"],
  ["tag", "Tag"],
  ["box", "Box"],
];

function Edit(props: LernBoxScreenProps & { edit: LbEdit }) {
  const { edit } = props;
  return (
    <div className={styles.edit}>
      <header className={styles.editHead}>
        <button
          type="button"
          className={styles.backText}
          onClick={props.onBack}
        >
          <Icon name="back" size={18} strokeWidth={2.2} /> LernBox
        </button>
        <span className={styles.editTitles}>
          <h1 className={styles.editTitle}>Alle Vokabeln</h1>
          <span className={styles.sheetSubtitle}>
            {edit.cards.length} von {edit.total} Vokabeln
            <span className={styles.wideOnly}>
              {" "}
              · Spaltenkopf antippen zum Sortieren · Stift zum Ändern
            </span>
          </span>
        </span>
        <PlusMenu {...props} />
      </header>

      {props.notice ? (
        <p className={styles.notice} role="status">
          {props.notice}
        </p>
      ) : null}

      <div className={styles.tools}>
        <input
          className={cx(styles.input, styles.search)}
          type="search"
          placeholder="Suchen …"
          aria-label="Vokabeln durchsuchen"
          autoComplete="off"
          value={edit.query}
          onChange={(event) => props.onQuery?.(event.target.value)}
        />
        <div className={styles.chips} role="group" aria-label="Stapel filtern">
          {[{ id: "all", title: "Alle" }, ...props.decks].map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={cx(
                styles.chip,
                edit.filter === entry.id && styles.chipOn,
              )}
              aria-pressed={edit.filter === entry.id}
              onClick={() => props.onFilter?.(entry.id)}
            >
              {entry.title.split(" · ")[0]}
            </button>
          ))}
        </div>
        <label className={cx(styles.sortSelect, styles.narrowOnly)}>
          <span className={styles.fieldLabel}>Sortieren nach</span>
          <select
            className={styles.select}
            value={edit.sortKey ?? ""}
            onChange={(event) => {
              const key = event.target.value as LbSortKey | "";
              if (key) props.onSort?.(key);
            }}
          >
            <option value="">Reihenfolge der Eingabe</option>
            {COLUMNS.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {edit.cards.length === 0 ? (
        <p className={styles.empty}>
          {edit.query
            ? "Keine Vokabel passt zur Suche."
            : "Noch keine Vokabeln. Tippe auf das Plus, um welche einzutragen."}
        </p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              {COLUMNS.map(([key, label]) => (
                <th
                  key={key}
                  scope="col"
                  aria-sort={
                    edit.sortKey === key
                      ? edit.sortDir === 1
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <button
                    type="button"
                    className={cx(
                      styles.sortButton,
                      edit.sortKey === key && styles.sortActive,
                    )}
                    title="Sortieren"
                    onClick={() => props.onSort?.(key)}
                  >
                    {label}
                    <span className={styles.arrow} aria-hidden="true">
                      {edit.sortKey === key
                        ? edit.sortDir === 1
                          ? "↑"
                          : "↓"
                        : "↕"}
                    </span>
                  </button>
                </th>
              ))}
              <th scope="col">
                <span className={styles.srOnly}>Aktionen</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {edit.cards.map((card) => (
              <CardRow key={card.id} card={card} {...props} />
            ))}
          </tbody>
        </table>
      )}

      <Manage {...props} />
    </div>
  );
}

function CardRow({ card, ...props }: LernBoxScreenProps & { card: LbCard }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<LbCardInput>({
    question: card.question,
    answer: card.answer,
    tag: card.tag ?? "",
  });
  const [deckId, setDeckId] = useState(card.deckId);
  const tagInput = useRef<HTMLInputElement>(null);

  function open() {
    setDraft({
      question: card.question,
      answer: card.answer,
      tag: card.tag ?? "",
    });
    setDeckId(card.deckId);
    setEditing(true);
  }
  function done() {
    if (draft.question.trim() && draft.answer.trim()) {
      props.onSaveCard?.(card.id, draft, deckId);
    }
    setEditing(false);
  }
  const dot = {
    "--box": BOX_COLORS[card.box - 1],
  } as CSSProperties;

  if (!editing) {
    return (
      <tr className={styles.row}>
        <td className={styles.cellQuestion}>{card.question}</td>
        <td className={styles.cellAnswer}>{card.answer}</td>
        <td className={styles.cellDeck}>{card.deckTitle}</td>
        <td className={styles.cellTag}>
          {card.tag ? <span className={styles.tag}>{card.tag}</span> : null}
        </td>
        <td className={styles.cellBox}>
          <span className={styles.boxLabel} style={dot}>
            <span className={styles.boxDot} aria-hidden="true" />
            Box {card.box}
          </span>
        </td>
        <td className={styles.cellAction}>
          <button
            type="button"
            className={styles.rowButton}
            aria-label={`${card.question} bearbeiten`}
            onClick={open}
          >
            <Icon name="pencil" size={16} strokeWidth={2.2} />
          </button>
        </td>
      </tr>
    );
  }
  return (
    <tr className={cx(styles.row, styles.rowEditing)}>
      <td className={styles.cellQuestion}>
        <input
          className={styles.cellInput}
          aria-label="Vorderseite"
          value={draft.question}
          onChange={(event) =>
            setDraft({ ...draft, question: event.target.value })
          }
        />
      </td>
      <td className={styles.cellAnswer}>
        <input
          className={styles.cellInput}
          aria-label="Rückseite"
          value={draft.answer}
          onChange={(event) =>
            setDraft({ ...draft, answer: event.target.value })
          }
        />
      </td>
      <td className={styles.cellDeck}>
        <select
          className={styles.cellSelect}
          aria-label="Stapel"
          value={deckId}
          onChange={(event) => setDeckId(event.target.value)}
        >
          {props.decks.map((deck) => (
            <option key={deck.id} value={deck.id}>
              {deck.title}
            </option>
          ))}
        </select>
      </td>
      <td className={styles.cellTag}>
        {draft.tag ? (
          <span className={styles.tag}>
            {draft.tag}
            <button
              type="button"
              className={styles.tagRemove}
              aria-label="Tag entfernen"
              onClick={() => setDraft({ ...draft, tag: "" })}
            >
              ×
            </button>
          </span>
        ) : (
          <input
            ref={tagInput}
            className={styles.tagInput}
            placeholder="+ Tag"
            aria-label="Tag hinzufügen"
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              const value = event.currentTarget.value.trim();
              if (value) setDraft({ ...draft, tag: value });
            }}
            onBlur={(event) => {
              const value = event.currentTarget.value.trim();
              if (value) setDraft({ ...draft, tag: value });
            }}
          />
        )}
      </td>
      <td className={styles.cellBox}>
        <span className={styles.boxLabel} style={dot}>
          <span className={styles.boxDot} aria-hidden="true" />
          Box {card.box}
        </span>
      </td>
      <td className={styles.cellAction}>
        <button
          type="button"
          className={styles.rowButton}
          aria-label={`${card.question} löschen`}
          onClick={() => props.onDeleteCards?.([card.id])}
        >
          <Icon name="trash" size={16} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          className={cx(styles.rowButton, styles.rowButtonOn)}
          aria-label="Fertig"
          onClick={done}
        >
          <Icon name="check" size={16} strokeWidth={2.6} />
        </button>
      </td>
    </tr>
  );
}

/** Stapel, Ordner und Sicherung: bleiben erreichbar, auch wenn der Entwurf sie nicht zeigt. */
function Manage(props: LernBoxScreenProps) {
  const [folderTitle, setFolderTitle] = useState("");
  return (
    <details className={styles.manage}>
      <summary>Stapel, Ordner und Sicherung</summary>
      <div className={styles.manageBody}>
        <ul className={styles.manageList}>
          {props.decks.map((deck) => (
            <li key={deck.id} className={styles.manageItem}>
              <span className={styles.manageName}>
                <strong>{deck.title}</strong>
                <span className={styles.muted}>
                  {plural(deck.total, "Vokabel", "Vokabeln")}
                </span>
              </span>
              {props.folders.length ? (
                <select
                  className={styles.select}
                  aria-label={`Ordner für ${deck.title}`}
                  value={deck.folderId ?? ""}
                  onChange={(event) =>
                    props.onMoveDeck?.(deck.id, event.target.value || null)
                  }
                >
                  <option value="">Ohne Ordner</option>
                  {props.folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.title}
                    </option>
                  ))}
                </select>
              ) : null}
              <button
                type="button"
                className={styles.ghostButton}
                aria-label={`${deck.title} löschen`}
                onClick={() => props.onDeleteDeck?.(deck.id)}
              >
                <Icon name="trash" size={15} /> Löschen
              </button>
            </li>
          ))}
        </ul>

        <ul className={styles.manageList}>
          {props.folders.map((folder) => (
            <li key={folder.id} className={styles.manageItem}>
              <span className={styles.manageName}>
                <strong>{folder.title}</strong>
                <span className={styles.muted}>Ordner</span>
              </span>
              <button
                type="button"
                className={styles.ghostButton}
                aria-label={`Ordner ${folder.title} löschen`}
                title="Ordner löschen (Stapel bleiben)"
                onClick={() => props.onDeleteFolder?.(folder.id)}
              >
                <Icon name="trash" size={15} /> Löschen
              </button>
            </li>
          ))}
        </ul>
        <form
          className={styles.inlineForm}
          onSubmit={(event) => {
            event.preventDefault();
            if (!folderTitle.trim()) return;
            props.onCreateFolder?.(folderTitle.trim());
            setFolderTitle("");
          }}
        >
          <input
            className={styles.input}
            aria-label="Name des neuen Ordners"
            placeholder="z. B. Buch Klasse 5"
            maxLength={80}
            value={folderTitle}
            onChange={(event) => setFolderTitle(event.target.value)}
          />
          <button type="submit" className={styles.ghostButton}>
            Ordner anlegen
          </button>
        </form>

        <div className={styles.inlineForm}>
          <button
            type="button"
            className={styles.ghostButton}
            disabled={props.decks.length === 0}
            onClick={props.onExport}
          >
            <Icon name="download" size={15} /> Sicherung speichern
          </button>
          <label className={styles.fileButton}>
            <Icon name="upload" size={15} /> Sicherung laden
            <input
              type="file"
              accept="application/json"
              className={styles.fileInput}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) props.onImportBackup?.(file);
                event.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
    </details>
  );
}

/* ================= Lernrunde (4b/4c, Ergebnis 4g–4j) ================= */

function Study(props: LernBoxScreenProps & { study: LbStudy }) {
  const { study } = props;
  const input = useRef<HTMLInputElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (study.feedback) nextButton.current?.focus();
    else if (study.mode === "writing") input.current?.focus();
  }, [study.feedback, study.mode, study.question]);

  const head = (
    <header className={styles.studyHead}>
      <button
        type="button"
        className={styles.backSquare}
        aria-label="Runde beenden"
        title="Runde beenden"
        onClick={props.onEndSession}
      >
        <Icon name="back" size={20} strokeWidth={2.2} />
      </button>
      <span className={styles.studyTitles}>
        <h1 className={styles.studyTitle}>{study.title}</h1>
        <span className={styles.sheetSubtitle}>
          {study.done ? (
            "Runde abgeschlossen"
          ) : (
            <>
              {study.remaining} übrig ·{" "}
              <span className={styles.wideOnly}>
                {study.feedback ? study.directionLabel : study.modeLabel}
              </span>
              <span className={styles.narrowOnly}>{study.directionLabel}</span>
            </>
          )}
        </span>
      </span>
      <ThemeSwitch theme={props.theme} onToggle={props.onToggleTheme} />
    </header>
  );

  if (study.done) {
    return (
      <div className={styles.study}>
        {head}
        <div className={styles.resultWrap}>
          <div className={styles.result}>
            <p className={styles.eyebrow}>Runde abgeschlossen</p>
            <h2 className={styles.doneTitle}>Gut gearbeitet</h2>
            <p className={styles.resultNext}>
              {study.done.correct} gewusst · {study.done.wrong} noch zu üben
            </p>
            <button
              type="button"
              className={styles.cta}
              onClick={props.onEndSession}
            >
              Zur LernBox
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.study}>
      {head}
      <div
        className={styles.progress}
        role="progressbar"
        aria-label="Fortschritt der Runde"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(study.progress * 100)}
      >
        <span style={{ width: `${Math.round(study.progress * 100)}%` }} />
      </div>

      {study.feedback ? (
        <Feedback
          feedback={study.feedback}
          canSpeak={study.canSpeak}
          nextRef={nextButton}
          onNext={props.onNext}
          onSpeak={props.onSpeak}
        />
      ) : (
        <div className={styles.studyBody}>
          <article className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.eyebrow}>{study.eyebrow}</span>
              <span className={styles.cardTools}>
                {study.canSpeak ? (
                  <button
                    type="button"
                    className={styles.iconButton}
                    aria-label="Vorlesen"
                    title="Vorlesen"
                    onClick={() => props.onSpeak?.("question")}
                  >
                    <Icon name="speaker" size={18} />
                  </button>
                ) : null}
                <span className={styles.boxPill}>Box {study.box}</span>
              </span>
            </div>
            <h2 className={styles.question}>{study.question}</h2>
            {study.mode === "oral" && study.revealed ? (
              <p className={styles.revealed}>
                {study.revealedAnswer}
                {study.canSpeak ? (
                  <button
                    type="button"
                    className={styles.iconButton}
                    aria-label="Lösung vorlesen"
                    onClick={() => props.onSpeak?.("answer")}
                  >
                    <Icon name="speaker" size={16} />
                  </button>
                ) : null}
              </p>
            ) : null}
          </article>

          {study.mode === "writing" ? (
            <form
              className={styles.answerRow}
              onSubmit={(event) => {
                event.preventDefault();
                props.onCheck?.();
              }}
            >
              <input
                ref={input}
                className={styles.answer}
                aria-label="Deine Antwort"
                placeholder="Antwort tippen"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                value={study.answer}
                onChange={(event) => props.onAnswer?.(event.target.value)}
              />
              <button
                type="submit"
                className={styles.check}
                disabled={!study.answer.trim()}
              >
                Prüfen{" "}
                <span className={styles.enterKey} aria-hidden="true">
                  ↵
                </span>
              </button>
            </form>
          ) : study.revealed ? (
            <div className={styles.oral}>
              <p className={styles.oralAnswer}>Wusstest du es?</p>
              <div className={styles.oralButtons}>
                <button
                  type="button"
                  className={styles.badButton}
                  onClick={() => props.onAssess?.(false)}
                >
                  Nicht gewusst
                </button>
                <button
                  type="button"
                  className={styles.goodButton}
                  onClick={() => props.onAssess?.(true)}
                >
                  Gewusst
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className={styles.cta}
              onClick={props.onReveal}
            >
              Antwort zeigen
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Feedback({
  feedback,
  canSpeak,
  nextRef,
  onNext,
  onSpeak,
}: {
  feedback: LbFeedback;
  canSpeak: boolean;
  nextRef: RefObject<HTMLButtonElement | null>;
  onNext: (() => void) | undefined;
  onSpeak: ((side: "question" | "answer") => void) | undefined;
}) {
  const good = feedback.correct;
  return (
    <div className={styles.resultWrap}>
      <div
        className={cx(styles.result, !good && styles.resultBad)}
        role="status"
      >
        <span className={styles.resultIcon}>
          <Icon
            name={good ? "check" : "close"}
            size={good ? 38 : 34}
            strokeWidth={2.8}
          />
        </span>
        <h2 className={styles.resultTitle}>
          {good ? "Gewusst" : "Nicht gewusst"}
        </h2>
        <span className={styles.resultTexts}>
          <span className={styles.resultPrompt}>{feedback.prompt}</span>
          <span className={styles.resultAnswer}>
            {feedback.expected}
            {canSpeak ? (
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Lösung vorlesen"
                onClick={() => onSpeak?.("answer")}
              >
                <Icon name="speaker" size={18} />
              </button>
            ) : null}
          </span>
          {good ? null : (
            <span className={styles.resultGiven}>
              Du: <s>{feedback.given}</s>
            </span>
          )}
        </span>
        <span className={styles.resultNext}>
          Box {feedback.boxFrom} → Box {feedback.boxTo} · {feedback.nextLabel}
        </span>
      </div>
      <button
        ref={nextRef}
        type="button"
        className={styles.next}
        onClick={onNext}
      >
        Weiter
        <span className={styles.enterKey} aria-hidden="true">
          ↵
        </span>
      </button>
    </div>
  );
}
