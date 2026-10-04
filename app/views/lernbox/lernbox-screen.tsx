"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { Icon } from "../../ui/icons";
import { cx, HomeLink, ThemeSwitch, type Theme } from "../parts/parts";
import styles from "./lernbox-screen.module.css";

export type LbMode = "writing" | "oral";
export type LbDirection = "forward" | "reverse" | "mixed";
export type LbSort = "alphabet" | "box" | "tag" | "date" | "deck";

export type LbDeck = {
  id: string;
  title: string;
  folderId: string | null;
  total: number;
  due: number;
  /** Karten je Box 1–5. */
  boxes: readonly number[];
  sourceLabel: string;
};
export type LbFolder = { id: string; title: string };
export type LbCard = {
  id: string;
  question: string;
  answer: string;
  tag: string | null;
  box: number;
  deckTitle: string;
};
export type LbLanguage = { locale: string; label: string };

export type LbStudy = {
  title: string;
  subtitle: string;
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
  feedback: { correct: boolean; expected: string } | null;
  done: { correct: number; wrong: number } | null;
  canSpeak: boolean;
};

export type LbManager = {
  title: string;
  subtitle: string;
  deck: {
    id: string;
    folderId: string | null;
    frontLabel: string;
    backLabel: string;
    due: number;
    total: number;
    boxes: readonly number[];
  } | null;
  cards: readonly LbCard[];
  query: string;
  sort: LbSort;
};

export type LernBoxScreenProps = {
  theme: Theme;
  panelOpen: boolean;
  loading: boolean;
  notice: string;
  folders: readonly LbFolder[];
  decks: readonly LbDeck[];
  collapsedFolders: readonly string[];
  selectedDeckId: string | null;
  mode: LbMode;
  direction: LbDirection;
  directionLabels: { forward: string; reverse: string };
  /** Während einer Runde sind Modus und Richtung gesperrt. */
  locked: boolean;
  dueTotal: number;
  errorCount: number;
  languages: readonly LbLanguage[];
  main:
    | { kind: "welcome" }
    | { kind: "manager"; manager: LbManager }
    | { kind: "study"; study: LbStudy };
  onToggleTheme?: () => void;
  onTogglePanel?: () => void;
  onToggleFolder?: (id: string) => void;
  onSelectDeck?: (id: string) => void;
  onShowAll?: () => void;
  onDeleteDeck?: (id: string) => void;
  onDeleteFolder?: (id: string) => void;
  onCreateDeck?: (input: {
    title: string;
    folderId: string | null;
    frontLocale: string;
    backLocale: string;
    importText?: string;
  }) => void;
  onCreateFolder?: (title: string) => void;
  /** Übernahme von Lehrkraft-Paketen per QR-Code/Transfercode. */
  transferSlot?: ReactNode;
  onMode?: (mode: LbMode) => void;
  onDirection?: (direction: LbDirection) => void;
  onLearnDue?: () => void;
  onLearnErrors?: () => void;
  onBack?: () => void;
  onExport?: () => void;
  onImportBackup?: (file: File) => void;
  // Karten verwalten
  onStartDeck?: () => void;
  onMoveDeck?: (folderId: string | null) => void;
  onAddCard?: (input: {
    question: string;
    answer: string;
    tag: string;
  }) => void;
  onImportCards?: (text: string) => void;
  onQuery?: (query: string) => void;
  onSort?: (sort: LbSort) => void;
  onEditCard?: (
    id: string,
    input: { question: string; answer: string; tag: string },
  ) => void;
  onPracticeCards?: (ids: string[]) => void;
  onMoveCards?: (ids: string[], deckId: string) => void;
  onTagCards?: (ids: string[], tag: string) => void;
  onDeleteCards?: (ids: string[]) => void;
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

/** LernBox nach Design 4a (Übersicht mobil), 4b (Karte mobil) und 4c (Desktop). */
export function LernBoxScreen(props: LernBoxScreenProps) {
  const mainOpen = props.main.kind !== "welcome";
  return (
    <div className={styles.screen}>
      <div
        className={cx(
          styles.layout,
          mainOpen && styles.mainOpen,
          !props.panelOpen && styles.panelClosed,
        )}
      >
        <Panel {...props} />
        <section className={styles.main} aria-live="polite">
          {props.main.kind === "study" ? (
            <Study {...props} study={props.main.study} />
          ) : props.main.kind === "manager" ? (
            <Manager
              key={props.main.manager.deck?.id ?? "alle"}
              {...props}
              manager={props.main.manager}
            />
          ) : (
            <Welcome {...props} />
          )}
        </section>
      </div>
    </div>
  );
}

/* ================= Panel (4a / 4c links) ================= */

function Panel(props: LernBoxScreenProps) {
  const [creating, setCreating] = useState<"deck" | "folder" | "transfer" | null>(null);
  const loose = props.decks.filter((deck) => !deck.folderId);
  return (
    <aside className={styles.panel} aria-labelledby="lernbox-title">
      <div className={styles.panelHead}>
        <span className={styles.panelStart}>
          <HomeLink />
          <h1 id="lernbox-title" className={styles.panelTitle}>
            Lernen
          </h1>
        </span>
        <span className={styles.narrowOnly}>
          <ThemeSwitch theme={props.theme} onToggle={props.onToggleTheme} />
        </span>
        <button
          type="button"
          className={cx(styles.iconButton, styles.wideOnly)}
          aria-label="Leiste einklappen"
          title="Einklappen"
          onClick={props.onTogglePanel}
        >
          <Icon name="panelClose" size={18} />
        </button>
      </div>

      <div className={styles.segment} role="group" aria-label="Bereich">
        <span className={styles.segmentOn} aria-current="page">
          Vokabeln
        </span>
        <Link href="/frei/german/lernwoerter" className={styles.segmentOff}>
          Wortspeicher
        </Link>
      </div>

      <div className={styles.hero}>
        <p className={styles.heroCount}>
          <strong>{props.dueTotal}</strong> Karten fällig
        </p>
        <div className={styles.narrowOnly}>
          <ModeSwitch {...props} dark />
        </div>
        <button
          type="button"
          className={styles.heroButton}
          disabled={props.dueTotal === 0 || props.locked}
          onClick={props.onLearnDue}
        >
          Alle fälligen lernen
        </button>
      </div>

      <div className={styles.sectionHead}>
        <span className={styles.label}>Stapel</span>
        <span className={styles.headActions}>
          <button
            type="button"
            className={styles.link}
            aria-expanded={creating === "folder"}
            onClick={() => setCreating(creating === "folder" ? null : "folder")}
          >
            + Ordner
          </button>
          <button
            type="button"
            className={styles.link}
            aria-expanded={creating === "deck"}
            onClick={() => setCreating(creating === "deck" ? null : "deck")}
          >
            + Neuer Stapel
          </button>
          {props.transferSlot ? (
            <button
              type="button"
              className={styles.link}
              aria-expanded={creating === "transfer"}
              onClick={() =>
                setCreating(creating === "transfer" ? null : "transfer")
              }
            >
              QR-Import
            </button>
          ) : null}
        </span>
      </div>

      {creating === "folder" ? (
        <CreateFolder
          onCreate={(title) => {
            props.onCreateFolder?.(title);
            setCreating(null);
          }}
        />
      ) : null}
      {creating === "transfer" ? props.transferSlot : null}
      {creating === "deck" || (!props.loading && props.decks.length === 0) ? (
        <CreateDeck
          folders={props.folders}
          languages={props.languages}
          onCreate={(input) => {
            props.onCreateDeck?.(input);
            setCreating(null);
          }}
        />
      ) : null}

      {props.notice && props.main.kind === "welcome" ? (
        <p className={styles.notice} role="status">
          {props.notice}
        </p>
      ) : null}

      {props.loading ? (
        <p className={styles.muted}>LernBox wird geladen …</p>
      ) : (
        <div className={styles.decks}>
          {props.folders.map((folder) => {
            const inside = props.decks.filter(
              (deck) => deck.folderId === folder.id,
            );
            const open = !props.collapsedFolders.includes(folder.id);
            const due = inside.reduce((sum, deck) => sum + deck.due, 0);
            return (
              <div key={folder.id} className={styles.folder}>
                <div className={styles.folderHead}>
                  <button
                    type="button"
                    className={styles.folderToggle}
                    aria-expanded={open}
                    onClick={() => props.onToggleFolder?.(folder.id)}
                  >
                    <span
                      className={cx(styles.chevron, open && styles.chevronOpen)}
                      aria-hidden="true"
                    >
                      <Icon name="forward" size={14} strokeWidth={2.4} />
                    </span>
                    <strong>{folder.title}</strong>
                    <span className={styles.muted}>
                      {inside.length} Stapel{due ? ` · ${due} fällig` : ""}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={styles.iconButton}
                    aria-label={`Ordner ${folder.title} löschen`}
                    title="Ordner löschen (Stapel bleiben)"
                    onClick={() => props.onDeleteFolder?.(folder.id)}
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </div>
                {open ? (
                  inside.length ? (
                    <DeckList {...props} decks={inside} />
                  ) : (
                    <p className={cx(styles.muted, styles.folderEmpty)}>
                      Noch leer. Lege einen Stapel in diesem Ordner an.
                    </p>
                  )
                ) : null}
              </div>
            );
          })}
          {loose.length ? <DeckList {...props} decks={loose} /> : null}
        </div>
      )}

      {props.decks.length ? (
        <>
          <div className={styles.boxLegend}>
            <span>Box 1 · neu</span>
            <span>Box 5 · sitzt</span>
          </div>
          <button
            type="button"
            className={styles.link}
            onClick={props.onShowAll}
          >
            Alle Vokabeln ansehen und sortieren
          </button>
        </>
      ) : null}

      <div className={cx(styles.modeBlock, styles.wideOnly)}>
        <span className={styles.label}>Modus</span>
        <ModeSwitch {...props} />
        <DirectionSwitch {...props} />
        {props.locked ? (
          <p className={styles.lockHint}>
            Beende die Runde, um Modus oder Richtung zu wechseln.
          </p>
        ) : null}
      </div>
      <div className={styles.narrowOnly}>
        <DirectionSwitch {...props} />
      </div>

      <button
        type="button"
        className={styles.errors}
        disabled={props.errorCount === 0 || props.locked}
        onClick={props.onLearnErrors}
      >
        <span>Meine Fehler üben</span>
        <span className={styles.errorPill}>{props.errorCount}</span>
      </button>

      <details className={styles.backup}>
        <summary>Datensicherung</summary>
        <div className={styles.backupRow}>
          <button
            type="button"
            className={styles.ghost}
            disabled={props.decks.length === 0}
            onClick={props.onExport}
          >
            <Icon name="download" size={15} /> Sicherung speichern
          </button>
          <label className={styles.ghost}>
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
      </details>
    </aside>
  );
}

function DeckList(props: LernBoxScreenProps & { decks: readonly LbDeck[] }) {
  return (
    <ul className={styles.deckList}>
      {props.decks.map((deck) => (
        <li key={deck.id} className={styles.deckItem}>
          <button
            type="button"
            className={styles.deck}
            aria-current={deck.id === props.selectedDeckId ? "true" : undefined}
            onClick={() => props.onSelectDeck?.(deck.id)}
          >
            <span className={styles.deckHead}>
              <span className={styles.deckTitles}>
                <strong>{deck.title}</strong>
                <span className={styles.deckMeta}>
                  {deck.sourceLabel} · {deck.total} Karten
                </span>
              </span>
              {deck.total === 0 ? null : deck.due > 0 ? (
                <span className={styles.duePill}>{deck.due} fällig</span>
              ) : (
                <span className={styles.donePill}>erledigt</span>
              )}
            </span>
            <BoxBar boxes={deck.boxes} />
          </button>
          <button
            type="button"
            className={cx(styles.iconButton, styles.deckDelete)}
            aria-label={`${deck.title} löschen`}
            title="Stapel löschen"
            onClick={() => props.onDeleteDeck?.(deck.id)}
          >
            <Icon name="trash" size={15} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function BoxBar({
  boxes,
  large = false,
}: {
  boxes: readonly number[];
  large?: boolean;
}) {
  return (
    <span
      className={cx(styles.boxBar, large && styles.boxBarLarge)}
      role="img"
      aria-label={`Boxverteilung: ${boxes.map((count, index) => `Box ${index + 1}: ${count}`).join(", ")}`}
    >
      {boxes.map((count, index) => (
        <span
          key={index}
          style={
            {
              flexGrow: Math.max(1, count),
              background: BOX_COLORS[index],
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}

function ModeSwitch({
  mode,
  locked,
  onMode,
  dark = false,
}: LernBoxScreenProps & { dark?: boolean }) {
  return (
    <div
      className={cx(styles.segment, dark && styles.segmentDark)}
      role="group"
      aria-label="Modus"
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
          className={mode === value ? styles.segmentOn : styles.segmentOff}
          aria-pressed={mode === value}
          disabled={locked}
          onClick={() => onMode?.(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function DirectionSwitch({
  direction,
  directionLabels,
  locked,
  onDirection,
}: LernBoxScreenProps) {
  return (
    <div className={styles.segment} role="group" aria-label="Richtung">
      {(
        [
          ["forward", directionLabels.forward],
          ["reverse", directionLabels.reverse],
          ["mixed", "Gemischt"],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          type="button"
          className={direction === value ? styles.segmentOn : styles.segmentOff}
          aria-pressed={direction === value}
          disabled={locked}
          onClick={() => onDirection?.(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function CreateFolder({ onCreate }: { onCreate: (title: string) => void }) {
  const [title, setTitle] = useState("");
  return (
    <form
      className={styles.create}
      onSubmit={(event) => {
        event.preventDefault();
        if (title.trim()) onCreate(title.trim());
      }}
    >
      <input
        className={styles.input}
        aria-label="Name des neuen Ordners"
        placeholder="z. B. Buch Klasse 5"
        maxLength={80}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <button type="submit" className={styles.primarySmall}>
        Ordner anlegen
      </button>
    </form>
  );
}

function CreateDeck({
  folders,
  languages,
  onCreate,
}: {
  folders: readonly LbFolder[];
  languages: readonly LbLanguage[];
  onCreate: (input: {
    title: string;
    folderId: string | null;
    frontLocale: string;
    backLocale: string;
    importText?: string;
  }) => void;
}) {
  const [title, setTitle] = useState("");
  const [importText, setImportText] = useState("");
  const [folderId, setFolderId] = useState("");
  const [front, setFront] = useState(languages[0]?.locale ?? "de-DE");
  const [back, setBack] = useState(languages[1]?.locale ?? "en-GB");
  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!title.trim()) return;
    onCreate({
      title: title.trim(),
      folderId: folderId || null,
      frontLocale: front,
      backLocale: back,
      ...(importText.trim() ? { importText } : {}),
    });
    setTitle("");
    setImportText("");
  }
  return (
    <form className={styles.create} onSubmit={submit}>
      <input
        className={styles.input}
        aria-label="Name der neuen Lernbox"
        placeholder="z. B. Unit 3"
        maxLength={80}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <div className={styles.createGrid}>
        <label className={styles.field}>
          <span>Vorderseite</span>
          <select
            className={styles.input}
            value={front}
            onChange={(event) => setFront(event.target.value)}
          >
            {languages.map((language) => (
              <option key={language.locale} value={language.locale}>
                {language.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>Rückseite</span>
          <select
            className={styles.input}
            value={back}
            onChange={(event) => setBack(event.target.value)}
          >
            {languages.map((language) => (
              <option key={language.locale} value={language.locale}>
                {language.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {folders.length ? (
        <label className={styles.field}>
          <span>Ordner</span>
          <select
            className={styles.input}
            value={folderId}
            onChange={(event) => setFolderId(event.target.value)}
          >
            <option value="">Ohne Ordner</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <details>
        <summary className={styles.muted}>Vokabeln gleich importieren</summary>
        <textarea
          className={styles.importArea}
          aria-label="Vokabeln für die neue Lernbox"
          placeholder={"Haus\thome | house\tUnit 1\nBaum;tree"}
          value={importText}
          onChange={(event) => setImportText(event.target.value)}
        />
        <label className={styles.ghost}>
          <Icon name="upload" size={15} /> Datei wählen
          <input
            type="file"
            accept=".txt,.csv,.tsv,text/plain,text/csv"
            className={styles.fileInput}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void file.text().then(setImportText);
            }}
          />
        </label>
      </details>
      <button type="submit" className={styles.primarySmall}>
        Erstellen
      </button>
    </form>
  );
}

/* ================= Hauptbereich ================= */

function MainHead({
  title,
  subtitle,
  screen,
  children,
}: {
  title: string;
  subtitle: string;
  screen: LernBoxScreenProps;
  children?: ReactNode;
}) {
  return (
    <header className={styles.mainHead}>
      <button
        type="button"
        className={cx(styles.squareButton, styles.narrowOnly)}
        aria-label="Zurück zu den Stapeln"
        onClick={screen.onBack}
      >
        <Icon name="back" size={18} strokeWidth={2.2} />
      </button>
      {!screen.panelOpen ? (
        <button
          type="button"
          className={cx(styles.iconButton, styles.wideOnly)}
          aria-label="Stapel und Modus ausklappen"
          title="Stapel und Modus"
          onClick={screen.onTogglePanel}
        >
          <Icon name="panelOpen" size={18} />
        </button>
      ) : null}
      <span className={styles.mainTitles}>
        <h2 className={styles.mainTitle}>{title}</h2>
        <span className={styles.mainSubtitle}>{subtitle}</span>
      </span>
      {children}
      <span className={styles.wideOnly}>
        <ThemeSwitch theme={screen.theme} onToggle={screen.onToggleTheme} />
      </span>
    </header>
  );
}

function Welcome(props: LernBoxScreenProps) {
  return (
    <div className={styles.welcome}>
      {!props.panelOpen ? (
        <button
          type="button"
          className={cx(styles.iconButton, styles.welcomeOpen)}
          aria-label="Stapel und Modus ausklappen"
          onClick={props.onTogglePanel}
        >
          <Icon name="panelOpen" size={18} />
        </button>
      ) : null}
      <Icon name="cards" size={34} />
      <p className={styles.welcomeTitle}>
        {props.decks.length
          ? "Wähle links einen Stapel."
          : "Lege links deinen ersten Stapel an."}
      </p>
      <p className={styles.muted}>
        Eigene Vokabeln und Fehler aus dem Laufdiktat landen hier und kommen
        wieder, wenn sie fällig sind.
      </p>
    </div>
  );
}

/* ---------- Lernrunde (4b / 4c) ---------- */

function Study(props: LernBoxScreenProps & { study: LbStudy }) {
  const { study } = props;
  const input = useRef<HTMLInputElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (study.feedback) nextButton.current?.focus();
    else if (study.mode === "writing") input.current?.focus();
  }, [study.feedback, study.mode, study.question]);

  if (study.done) {
    return (
      <div className={styles.study}>
        <MainHead
          title={study.title}
          subtitle="Runde abgeschlossen"
          screen={props}
        />
        <div className={styles.doneCard}>
          <p className={styles.eyebrow}>Runde abgeschlossen</p>
          <h2 className={styles.doneTitle}>Gut gearbeitet</h2>
          <p className={styles.muted}>
            {study.done.correct} gewusst · {study.done.wrong} noch zu üben
          </p>
          <button
            type="button"
            className={styles.primary}
            onClick={props.onEndSession}
          >
            Zur LernBox
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.study}>
      <MainHead title={study.title} subtitle={study.subtitle} screen={props}>
        <button
          type="button"
          className={styles.endButton}
          onClick={props.onEndSession}
        >
          Runde beenden
        </button>
      </MainHead>
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

        {study.feedback ? (
          <div
            className={cx(
              styles.feedback,
              study.feedback.correct ? styles.good : styles.bad,
            )}
            role="status"
          >
            <strong>
              {study.feedback.correct ? "Richtig" : "Noch nicht richtig"}
            </strong>
            <span className={styles.expected}>
              {study.feedback.correct ? "Lösung: " : "Richtig ist: "}„
              {study.feedback.expected}“
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
            </span>
            <button
              ref={nextButton}
              type="button"
              className={styles.primary}
              onClick={props.onNext}
            >
              Weiter
            </button>
          </div>
        ) : study.mode === "writing" ? (
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
            className={styles.primary}
            onClick={props.onReveal}
          >
            Antwort zeigen
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- Karten verwalten ---------- */

const SORTS: ReadonlyArray<[LbSort, string]> = [
  ["alphabet", "Alphabet"],
  ["box", "Box"],
  ["tag", "Tag"],
  ["date", "Datum"],
  ["deck", "Stapel"],
];

function Manager(props: LernBoxScreenProps & { manager: LbManager }) {
  const { manager } = props;
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ question: "", answer: "", tag: "" });
  const [newCard, setNewCard] = useState({ question: "", answer: "", tag: "" });
  const [importText, setImportText] = useState("");
  const [bulkTag, setBulkTag] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const visibleIds = manager.cards.map((card) => card.id);
  const chosen = selected.filter((id) => visibleIds.includes(id));
  const allChosen =
    visibleIds.length > 0 && chosen.length === visibleIds.length;
  const deck = manager.deck;

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
    );
  }

  return (
    <div className={styles.manager}>
      <MainHead
        title={manager.title}
        subtitle={manager.subtitle}
        screen={props}
      >
        {deck ? (
          <button
            type="button"
            className={styles.primaryHead}
            disabled={deck.total === 0}
            onClick={props.onStartDeck}
          >
            Lernen
          </button>
        ) : null}
      </MainHead>

      {deck ? (
        <section className={styles.deckHero} aria-label="Stapel">
          <p className={styles.muted}>
            {deck.due} von {deck.total} Karten fällig
          </p>
          <BoxBar boxes={deck.boxes} large />
          <div className={styles.boxes}>
            {deck.boxes.map((count, index) => (
              <span key={index}>
                <small>Box {index + 1}</small>
                <strong>{count}</strong>
              </span>
            ))}
          </div>
          {props.folders.length ? (
            <label className={styles.inlineField}>
              <span>Ordner</span>
              <select
                className={styles.input}
                value={deck.folderId ?? ""}
                onChange={(event) =>
                  props.onMoveDeck?.(event.target.value || null)
                }
              >
                <option value="">Ohne Ordner</option>
                {props.folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </section>
      ) : null}

      {deck ? (
        <div className={styles.addGrid}>
          <form
            className={styles.panelCard}
            onSubmit={(event) => {
              event.preventDefault();
              if (!newCard.question.trim() || !newCard.answer.trim()) return;
              props.onAddCard?.(newCard);
              setNewCard((current) => ({
                ...current,
                question: "",
                answer: "",
              }));
            }}
          >
            <h2 className={styles.sectionTitle}>Neue Karte</h2>
            <div className={styles.cardFields}>
              <label className={styles.field}>
                <span>{deck.frontLabel}</span>
                <input
                  className={styles.input}
                  placeholder="Vorderseite"
                  value={newCard.question}
                  onChange={(event) =>
                    setNewCard({ ...newCard, question: event.target.value })
                  }
                />
              </label>
              <label className={styles.field}>
                <span>{deck.backLabel}</span>
                <input
                  className={styles.input}
                  placeholder="z. B. home | house"
                  value={newCard.answer}
                  onChange={(event) =>
                    setNewCard({ ...newCard, answer: event.target.value })
                  }
                />
              </label>
              <label className={styles.field}>
                <span>Tag</span>
                <input
                  className={styles.input}
                  placeholder="z. B. Unit 3"
                  value={newCard.tag}
                  onChange={(event) =>
                    setNewCard({ ...newCard, tag: event.target.value })
                  }
                />
              </label>
            </div>
            <p className={styles.muted}>
              Mehrere richtige Antworten mit „|“ trennen.
            </p>
            <button type="submit" className={styles.greenButton}>
              Karte hinzufügen
            </button>
          </form>

          <details className={styles.panelCard}>
            <summary className={styles.sectionTitle}>
              Viele Vokabeln importieren
            </summary>
            <p className={styles.muted}>
              Eine Vokabel pro Zeile. Spalten aus Excel/Sheets oder mit
              Semikolon: Vorderseite; Rückseite; Tag (optional).
            </p>
            <textarea
              className={styles.importArea}
              aria-label="Vokabeln zum Importieren"
              placeholder={"Haus\thome | house\tUnit 1\nBaum;tree"}
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
            />
            <div className={styles.importRow}>
              <label className={styles.ghost}>
                <Icon name="upload" size={15} /> Datei wählen
                <input
                  type="file"
                  accept=".txt,.csv,.tsv,text/plain,text/csv"
                  className={styles.fileInput}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void file.text().then(setImportText);
                  }}
                />
              </label>
              <button
                type="button"
                className={styles.greenButton}
                disabled={!importText.trim()}
                onClick={() => {
                  props.onImportCards?.(importText);
                  setImportText("");
                }}
              >
                Importieren
              </button>
            </div>
          </details>
        </div>
      ) : null}

      {props.notice ? (
        <p className={styles.notice} role="status">
          {props.notice}
        </p>
      ) : null}

      <section className={styles.listSection} aria-label="Vokabelliste">
        <div className={styles.listTools}>
          <label className={styles.search}>
            <Icon name="list" size={16} />
            <input
              className={styles.searchInput}
              type="search"
              aria-label="Vokabeln durchsuchen"
              placeholder="Suchen in Vokabeln und Tags"
              value={manager.query}
              onChange={(event) => props.onQuery?.(event.target.value)}
            />
          </label>
          <label className={styles.inlineField}>
            <span>Sortieren</span>
            <select
              className={styles.input}
              value={manager.sort}
              onChange={(event) => props.onSort?.(event.target.value as LbSort)}
            >
              {SORTS.filter(([value]) => value !== "deck" || !deck).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>

        {chosen.length ? (
          <div className={styles.bulk} role="group" aria-label="Auswahl">
            <strong>{chosen.length} ausgewählt</strong>
            <button
              type="button"
              className={styles.primarySmall}
              onClick={() => props.onPracticeCards?.(chosen)}
            >
              Auswahl üben
            </button>
            <label className={styles.inlineField}>
              <span className={styles.srOnly}>Verschieben nach</span>
              <select
                className={styles.input}
                aria-label="Auswahl verschieben nach"
                value=""
                onChange={(event) => {
                  if (!event.target.value) return;
                  props.onMoveCards?.(chosen, event.target.value);
                  setSelected([]);
                }}
              >
                <option value="">Verschieben nach …</option>
                {props.decks.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.title}
                  </option>
                ))}
              </select>
            </label>
            <form
              className={styles.tagForm}
              onSubmit={(event) => {
                event.preventDefault();
                props.onTagCards?.(chosen, bulkTag);
                setBulkTag("");
              }}
            >
              <input
                className={styles.input}
                aria-label="Tag für die Auswahl"
                placeholder="Tag setzen (leer = entfernen)"
                value={bulkTag}
                onChange={(event) => setBulkTag(event.target.value)}
              />
              <button type="submit" className={styles.ghost}>
                Tag setzen
              </button>
            </form>
            {confirmDelete ? (
              <span className={styles.confirm} role="alert">
                {chosen.length} Karten löschen?
                <button
                  type="button"
                  className={styles.badButton}
                  onClick={() => {
                    props.onDeleteCards?.(chosen);
                    setSelected([]);
                    setConfirmDelete(false);
                  }}
                >
                  Ja, löschen
                </button>
                <button
                  type="button"
                  className={styles.ghost}
                  onClick={() => setConfirmDelete(false)}
                >
                  Abbrechen
                </button>
              </span>
            ) : (
              <button
                type="button"
                className={styles.ghost}
                onClick={() => setConfirmDelete(true)}
              >
                <Icon name="trash" size={15} /> Löschen
              </button>
            )}
          </div>
        ) : null}

        {manager.cards.length === 0 ? (
          <p className={styles.empty}>
            {manager.query
              ? "Keine Vokabel passt zur Suche."
              : "Noch keine Karten."}
          </p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col" className={styles.checkCol}>
                  <input
                    type="checkbox"
                    aria-label="Alle sichtbaren Vokabeln auswählen"
                    checked={allChosen}
                    onChange={() => setSelected(allChosen ? [] : visibleIds)}
                  />
                </th>
                <th scope="col">Vokabel</th>
                <th scope="col" className={styles.hideNarrow}>
                  Tag
                </th>
                <th scope="col">Box</th>
                {deck ? null : (
                  <th scope="col" className={styles.hideNarrow}>
                    Stapel
                  </th>
                )}
                <th scope="col">
                  <span className={styles.srOnly}>Aktionen</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {manager.cards.map((card) =>
                editing === card.id ? (
                  <tr key={card.id} className={styles.editRow}>
                    <td colSpan={deck ? 5 : 6}>
                      <form
                        className={styles.editForm}
                        onSubmit={(event) => {
                          event.preventDefault();
                          if (!draft.question.trim() || !draft.answer.trim())
                            return;
                          props.onEditCard?.(card.id, draft);
                          setEditing(null);
                        }}
                      >
                        <input
                          className={styles.input}
                          aria-label="Vorderseite bearbeiten"
                          value={draft.question}
                          onChange={(event) =>
                            setDraft({ ...draft, question: event.target.value })
                          }
                        />
                        <input
                          className={styles.input}
                          aria-label="Rückseite bearbeiten"
                          value={draft.answer}
                          onChange={(event) =>
                            setDraft({ ...draft, answer: event.target.value })
                          }
                        />
                        <input
                          className={styles.input}
                          aria-label="Tag bearbeiten"
                          placeholder="Tag"
                          value={draft.tag}
                          onChange={(event) =>
                            setDraft({ ...draft, tag: event.target.value })
                          }
                        />
                        <button type="submit" className={styles.primarySmall}>
                          Speichern
                        </button>
                        <button
                          type="button"
                          className={styles.ghost}
                          onClick={() => setEditing(null)}
                        >
                          Abbrechen
                        </button>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={card.id}>
                    <td className={styles.checkCol}>
                      <input
                        type="checkbox"
                        aria-label={`${card.question} auswählen`}
                        checked={chosen.includes(card.id)}
                        onChange={() => toggle(card.id)}
                      />
                    </td>
                    <td>
                      <strong>{card.question}</strong>
                      <span className={styles.muted}> · {card.answer}</span>
                      {card.tag ? (
                        <span className={cx(styles.tagPill, styles.narrowTag)}>
                          {card.tag}
                        </span>
                      ) : null}
                    </td>
                    <td className={styles.hideNarrow}>
                      {card.tag ? (
                        <span className={styles.tagPill}>{card.tag}</span>
                      ) : (
                        <span className={styles.muted}>–</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={styles.boxDot}
                        style={
                          {
                            "--box": BOX_COLORS[card.box - 1],
                          } as CSSProperties
                        }
                      >
                        {card.box}
                      </span>
                    </td>
                    {deck ? null : (
                      <td className={cx(styles.hideNarrow, styles.muted)}>
                        {card.deckTitle}
                      </td>
                    )}
                    <td className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.iconButton}
                        aria-label={`${card.question} bearbeiten`}
                        onClick={() => {
                          setDraft({
                            question: card.question,
                            answer: card.answer,
                            tag: card.tag ?? "",
                          });
                          setEditing(card.id);
                        }}
                      >
                        <Icon name="pencil" size={15} />
                      </button>
                      <button
                        type="button"
                        className={styles.iconButton}
                        aria-label={`${card.question} löschen`}
                        onClick={() => props.onDeleteCards?.([card.id])}
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
