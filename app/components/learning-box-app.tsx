"use client";

import { StudentDashboardShell } from "./student-dashboard-shell";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  evaluateLearningBoxAnswer,
  getLearningBoxLevel,
  getLearningBoxPrompt,
  isLearningBoxCardDue,
  processLearningBoxResult,
  type LearningBoxCard,
  type LearningBoxDeck,
  type LearningBoxDirection,
  type LearningBoxMode,
} from "../../src/domain/learning-box";
import {
  createLearningBoxRepository,
  migrateLegacyLearningBox,
} from "../../src/storage/personal-learning-events";
import { Icon } from "../ui/icons";
import { Segmented } from "../ui/primitives";

/** Ansicht im Hauptbereich (Design 4a–4c): Stapel, Karten verwalten, Lernrunde. */
type View = "decks" | "deck" | "session";

const LANGUAGES: Record<string, { name: string; into: string }> = {
  "de-DE": { name: "Deutsch", into: "Auf Deutsch" },
  "en-US": { name: "Englisch", into: "Auf Englisch" },
  "fr-FR": { name: "Französisch", into: "Auf Französisch" },
  "es-ES": { name: "Spanisch", into: "Auf Spanisch" },
  la: { name: "Latein", into: "Auf Latein" },
};

function languageShort(locale: string) {
  return (LANGUAGES[locale]?.name ?? locale).slice(0, 2).toUpperCase();
}

function dueCount(cards: LearningBoxCard[], direction: LearningBoxDirection) {
  return cards.filter((card) => isLearningBoxCardDue(card, direction)).length;
}

export function LearningBoxApp() {
  const repository = useMemo(() => createLearningBoxRepository(), []);
  const [view, setView] = useState<View>("decks");
  const [decks, setDecks] = useState<LearningBoxDeck[]>([]);
  const [deckCards, setDeckCards] = useState<Record<string, LearningBoxCard[]>>(
    {},
  );
  const [selectedDeckId, setSelectedDeckId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [interactionReady, setInteractionReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState<LearningBoxMode>("writing");
  const [direction, setDirection] = useState<LearningBoxDirection>("forward");
  const refreshRevision = useRef(0);

  const refresh = useCallback(async () => {
    const revision = ++refreshRevision.current;
    const nextDecks = await repository.listDecks();
    const entries = await Promise.all(
      nextDecks.map(
        async (deck) => [deck.id, await repository.listCards(deck.id)] as const,
      ),
    );
    if (revision !== refreshRevision.current) return;
    setDecks(nextDecks);
    setDeckCards(Object.fromEntries(entries));
    setLoading(false);
  }, [repository]);

  useEffect(() => {
    let active = true;
    void migrateLegacyLearningBox().then(async (result) => {
      if (!active) return;
      if (result.cards > 0) {
        setNotice(
          `${result.cards} vorhandene Karten wurden in den Lernraum übernommen.`,
        );
      }
      await refresh();
      // ?stapel=<id> öffnet einen Stapel direkt, z. B. nach dem Laufdiktat.
      const requested = new URLSearchParams(window.location.search).get(
        "stapel",
      );
      if (active && requested) {
        setSelectedDeckId(requested);
        setView("deck");
      }
      requestAnimationFrame(() => {
        if (active) setInteractionReady(true);
      });
    });
    return () => {
      active = false;
    };
  }, [refresh]);

  const selectedDeck = decks.find((deck) => deck.id === selectedDeckId);
  const selectedCards = selectedDeckId ? (deckCards[selectedDeckId] ?? []) : [];

  function openDeck(id: string) {
    setSelectedDeckId(id);
    setView("deck");
    setNotice("");
  }

  function leaveDeck() {
    setView("decks");
    setNotice("");
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const value = JSON.parse(await file.text()) as {
        decks?: LearningBoxDeck[];
        cards?: LearningBoxCard[];
      };
      if (!Array.isArray(value.decks) || !Array.isArray(value.cards)) {
        throw new Error("invalid");
      }
      await repository.importBackup({ decks: value.decks, cards: value.cards });
      setNotice("Sicherung wurde importiert.");
      await refresh();
    } catch {
      setNotice("Diese Datei ist keine gültige LernBox-Sicherung.");
    } finally {
      event.target.value = "";
    }
  }

  const mainOpen = view !== "decks" && Boolean(selectedDeck);

  return (
    <StudentDashboardShell activePath="/lernbox">
      <div className={`ui-lb${mainOpen ? " ui-lb--main" : ""}`}>
        <DeckPanel
          decks={decks}
          cards={deckCards}
          selectedId={selectedDeckId}
          loading={loading}
          interactionReady={interactionReady}
          notice={view === "decks" ? notice : ""}
          mode={mode}
          direction={direction}
          onMode={setMode}
          onDirection={setDirection}
          onCreate={async (input) => {
            const deck = await repository.createDeck(input);
            setDecks((current) => [deck, ...current]);
            setDeckCards((current) => ({ ...current, [deck.id]: [] }));
          }}
          onDelete={async (id) => {
            await repository.deleteDeck(id);
            if (id === selectedDeckId) {
              setSelectedDeckId(undefined);
              setView("decks");
            }
            await refresh();
          }}
          onOpen={openDeck}
          onStart={(id) => {
            setSelectedDeckId(id);
            setView("session");
          }}
          onExport={async () => {
            downloadJson(await repository.exportBackup(), "LernBox-Sicherung");
          }}
          onImport={(event) => void importBackup(event)}
        />

        <section className="ui-lb__main" aria-live="polite">
          {view === "deck" && selectedDeck ? (
            <DeckDetail
              deck={selectedDeck}
              cards={selectedCards}
              direction={direction}
              notice={notice}
              onBack={leaveDeck}
              onAdd={async (input) => {
                const result = await repository.addCard({
                  deckId: selectedDeck.id,
                  ...input,
                });
                setNotice(
                  result.added
                    ? "Karte wurde hinzugefügt."
                    : "Diese Karte ist bereits in der LernBox.",
                );
                await refresh();
              }}
              onDelete={async (id) => {
                await repository.deleteCard(id);
                await refresh();
              }}
              onStart={() => setView("session")}
            />
          ) : view === "session" && selectedDeck ? (
            <LearningSession
              key={`${selectedDeck.id}-${mode}-${direction}`}
              deck={selectedDeck}
              cards={selectedCards}
              mode={mode}
              direction={direction}
              onSave={async (card, result) => {
                await repository.putCardAndEvent({ card, ...result });
                await refresh();
              }}
              onClose={() => setView("deck")}
            />
          ) : (
            <div className="ui-lb__welcome">
              <Icon name="cards" size={34} />
              <p className="ui-h-section">
                {decks.length
                  ? "Wähle links einen Stapel."
                  : "Lege links deinen ersten Stapel an."}
              </p>
              <p className="ui-small ui-muted">
                Eigene Vokabeln und Fehler aus dem Laufdiktat landen hier und
                kommen wieder, wenn sie fällig sind.
              </p>
            </div>
          )}
        </section>
      </div>
    </StudentDashboardShell>
  );
}

function DeckPanel({
  decks,
  cards,
  selectedId,
  loading,
  interactionReady,
  notice,
  mode,
  direction,
  onMode,
  onDirection,
  onCreate,
  onDelete,
  onOpen,
  onStart,
  onExport,
  onImport,
}: {
  decks: LearningBoxDeck[];
  cards: Record<string, LearningBoxCard[]>;
  selectedId: string | undefined;
  loading: boolean;
  interactionReady: boolean;
  notice: string;
  mode: LearningBoxMode;
  direction: LearningBoxDirection;
  onMode: (mode: LearningBoxMode) => void;
  onDirection: (direction: LearningBoxDirection) => void;
  onCreate: (input: {
    title: string;
    frontLocale: string;
    backLocale: string;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onOpen: (id: string) => void;
  onStart: (id: string) => void;
  onExport: () => Promise<void>;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [showCreate, setShowCreate] = useState(false);
  const selected = decks.find((deck) => deck.id === selectedId) ?? decks[0];
  const creating = showCreate || (!loading && decks.length === 0);
  const front = selected ? languageShort(selected.frontLocale) : "DE";
  const back = selected ? languageShort(selected.backLocale) : "EN";

  async function createFromForm() {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    const submittedTitle = String(formData.get("title") ?? "").trim();
    if (!submittedTitle) return;
    await onCreate({
      title: submittedTitle,
      frontLocale: String(formData.get("frontLocale") ?? "de-DE"),
      backLocale: String(formData.get("backLocale") ?? "en-US"),
    });
    formRef.current.reset();
    setShowCreate(false);
  }

  return (
    <aside className="ui-lb__panel" aria-labelledby="learning-box-title">
      <h1 id="learning-box-title" className="ui-h-page">
        LernBox
      </h1>

      <div className="ui-between">
        <span className="ui-label">Stapel</span>
        <button
          type="button"
          className="ui-btn ui-btn--link"
          aria-expanded={creating}
          onClick={() => setShowCreate((value) => !value)}
        >
          + Neuer Stapel
        </button>
      </div>

      {creating ? (
        <form
          ref={formRef}
          className="ui-card ui-card--pad ui-stack ui-lb__create"
          style={{ ["--gap" as string]: "10px" }}
          onSubmit={(event) => {
            event.preventDefault();
            void createFromForm();
          }}
        >
          <input
            className="ui-input"
            name="title"
            aria-label="Name der neuen Lernbox"
            placeholder="z. B. Englisch 7b"
            maxLength={80}
          />
          <div className="ui-grid2">
            <label className="ui-stack" style={{ ["--gap" as string]: "4px" }}>
              <span className="ui-tiny ui-muted">Vorderseite</span>
              <select
                className="ui-input"
                name="frontLocale"
                defaultValue="de-DE"
              >
                {Object.entries(LANGUAGES).map(([value, { name }]) => (
                  <option key={value} value={value}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="ui-stack" style={{ ["--gap" as string]: "4px" }}>
              <span className="ui-tiny ui-muted">Rückseite</span>
              <select
                className="ui-input"
                name="backLocale"
                defaultValue="en-US"
              >
                {Object.entries(LANGUAGES).map(([value, { name }]) => (
                  <option key={value} value={value}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="button"
            className="ui-btn ui-btn--primary ui-btn--sm"
            disabled={loading || !interactionReady}
            onClick={() => void createFromForm()}
          >
            Erstellen
          </button>
        </form>
      ) : null}

      {notice ? (
        <p className="ui-notice" role="status">
          {notice}
        </p>
      ) : null}

      {loading ? (
        <p className="ui-small ui-muted">LernBox wird geladen …</p>
      ) : decks.length === 0 ? (
        <div className="ui-empty ui-small">
          <strong>Noch keine Lernbox vorhanden</strong>
          <p>
            Lege deine erste Box an oder übernimm später Fehler direkt aus einem
            Laufdiktat.
          </p>
        </div>
      ) : (
        <ul className="ui-lb__decks">
          {decks.map((deck) => {
            const list = cards[deck.id] ?? [];
            const due = dueCount(list, direction);
            return (
              <li key={deck.id}>
                <button
                  type="button"
                  className="ui-select-card ui-lb__deck"
                  aria-current={deck.id === selectedId ? "true" : undefined}
                  onClick={() => onOpen(deck.id)}
                >
                  <span className="ui-between" style={{ width: "100%" }}>
                    <strong className="ui-truncate">{deck.title}</strong>
                    {list.length === 0 ? null : due > 0 ? (
                      <span className="ui-pill ui-pill--accent">
                        {due} fällig
                      </span>
                    ) : (
                      <span className="ui-pill ui-pill--good">erledigt</span>
                    )}
                  </span>
                  <span className="ui-small ui-muted">
                    {deck.source.kind === "running-dictation"
                      ? "Aus dem Laufdiktat"
                      : deck.source.kind === "teacher"
                        ? "Von der Lehrkraft"
                        : "Eigener Stapel"}{" "}
                    · {list.length} Karten
                  </span>
                  <BoxDistribution cards={list} />
                </button>
                <button
                  type="button"
                  className="ui-lb__delete"
                  aria-label={`${deck.title} löschen`}
                  title="Stapel löschen"
                  onClick={() => void onDelete(deck.id)}
                >
                  <Icon name="trash" size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {decks.length ? (
        <>
          <p className="ui-tiny ui-muted ui-between">
            <span>Box 1 · neu</span>
            <span>Box 5 · sitzt</span>
          </p>
          <span className="ui-label">Modus</span>
          <Segmented
            label="Modus"
            value={mode}
            onChange={onMode}
            options={[
              { value: "writing", label: "Schreiben" },
              { value: "oral", label: "Karteikarten" },
            ]}
          />
          <Segmented
            label="Richtung"
            value={direction}
            onChange={onDirection}
            options={[
              { value: "forward", label: `${front} → ${back}` },
              { value: "reverse", label: `${back} → ${front}` },
            ]}
          />
          {selected ? (
            <button
              type="button"
              className="ui-btn ui-btn--primary ui-btn--block"
              disabled={(cards[selected.id] ?? []).length === 0}
              onClick={() => onStart(selected.id)}
            >
              „{selected.title}“ lernen
            </button>
          ) : null}
        </>
      ) : null}
      <div className="ui-lb__backup">
        <span className="ui-tiny ui-muted">Datensicherung</span>
        <div className="ui-grid2">
          <button
            type="button"
            className="ui-btn ui-btn--ghost ui-btn--sm"
            onClick={() => void onExport()}
            disabled={decks.length === 0}
          >
            Sicherung speichern
          </button>
          <label className="ui-btn ui-btn--ghost ui-btn--sm ui-file">
            Sicherung laden
            <input type="file" accept="application/json" onChange={onImport} />
          </label>
        </div>
      </div>
    </aside>
  );
}

function DeckDetail({
  deck,
  cards,
  direction,
  notice,
  onBack,
  onAdd,
  onDelete,
  onStart,
}: {
  deck: LearningBoxDeck;
  cards: LearningBoxCard[];
  direction: LearningBoxDirection;
  notice: string;
  onBack: () => void;
  onAdd: (input: {
    question: string;
    answer: string;
    tag?: string;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onStart: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [tag, setTag] = useState("");
  const due = dueCount(cards, direction);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim() || !answer.trim()) return;
    await onAdd({ question, answer, ...(tag.trim() ? { tag } : {}) });
    setQuestion("");
    setAnswer("");
  }

  return (
    <div
      className="ui-lb__detail ui-stack"
      style={{ ["--gap" as string]: "16px" }}
    >
      <button
        type="button"
        className="ui-btn ui-btn--link ui-lb__back"
        onClick={onBack}
      >
        <Icon name="back" size={16} /> Alle Stapel
      </button>
      <div className="ui-card ui-card--pad ui-lb__hero ui-center">
        <h1 className="ui-h-page">{deck.title}</h1>
        <p className="ui-muted">
          {due} von {cards.length} Karten fällig
        </p>
        <BoxDistribution cards={cards} large />
        <div className="ui-row ui-wrap" style={{ justifyContent: "center" }}>
          <button
            type="button"
            className="ui-btn ui-btn--primary"
            onClick={onStart}
            disabled={cards.length === 0}
          >
            Lernrunde starten
          </button>
        </div>
        <div className="ui-lb__boxes" aria-label="Verteilung auf fünf Boxen">
          {[1, 2, 3, 4, 5].map((box) => (
            <div key={box}>
              <span className="ui-tiny ui-muted">Box {box}</span>
              <strong>{cards.filter((card) => card.box === box).length}</strong>
            </div>
          ))}
        </div>
      </div>

      <form className="ui-card ui-card--pad ui-stack" onSubmit={submit}>
        <h2 className="ui-h-section">Neue Karte</h2>
        <div className="ui-grid-auto" style={{ ["--min" as string]: "180px" }}>
          <label className="ui-stack" style={{ ["--gap" as string]: "4px" }}>
            <span className="ui-tiny ui-muted">
              {LANGUAGES[deck.frontLocale]?.name ?? deck.frontLocale}
            </span>
            <input
              className="ui-input"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Vorderseite"
            />
          </label>
          <label className="ui-stack" style={{ ["--gap" as string]: "4px" }}>
            <span className="ui-tiny ui-muted">
              {LANGUAGES[deck.backLocale]?.name ?? deck.backLocale}
            </span>
            <input
              className="ui-input"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Rückseite"
            />
          </label>
          <label className="ui-stack" style={{ ["--gap" as string]: "4px" }}>
            <span className="ui-tiny ui-muted">Tag</span>
            <input
              className="ui-input"
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              placeholder="z. B. Unit 3"
            />
          </label>
        </div>
        <button className="ui-btn ui-btn--green ui-btn--sm" type="submit">
          Karte hinzufügen
        </button>
      </form>

      {notice ? (
        <p className="ui-notice" role="status">
          {notice}
        </p>
      ) : null}

      <div className="ui-stack">
        <div className="ui-between">
          <h2 className="ui-h-section">Vokabelübersicht</h2>
          <span className="ui-small ui-muted">{cards.length} Karten</span>
        </div>
        {cards.length === 0 ? (
          <p className="ui-empty ui-small">Noch keine Karten in dieser Box.</p>
        ) : (
          <div className="ui-list">
            {cards.map((card) => (
              <article key={card.id} className="ui-lb__row">
                <div className="ui-grow">
                  <strong>{card.question}</strong>
                  <span className="ui-small ui-muted"> · {card.answer}</span>
                </div>
                <span className="ui-pill">{card.tag ?? "Ohne Tag"}</span>
                <span className="ui-pill ui-pill--accent">Box {card.box}</span>
                <button
                  type="button"
                  className="ui-lb__delete"
                  aria-label={`${card.question} löschen`}
                  onClick={() => void onDelete(card.id)}
                >
                  <Icon name="trash" size={16} />
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LearningSession({
  deck,
  cards,
  mode,
  direction,
  onSave,
  onClose,
}: {
  deck: LearningBoxDeck;
  cards: LearningBoxCard[];
  mode: LearningBoxMode;
  direction: LearningBoxDirection;
  onSave: (
    card: LearningBoxCard,
    result: {
      correct: boolean;
      direction: LearningBoxDirection;
      mode: LearningBoxMode;
      roundId: string;
    },
  ) => Promise<void>;
  onClose: () => void;
}) {
  // Die Runde nimmt beim Start die fälligen Karten (sonst alle) und bleibt dann fest.
  const [queue] = useState<LearningBoxCard[]>(() => {
    const due = cards.filter((card) => isLearningBoxCardDue(card, direction));
    return due.length ? due : cards;
  });
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    expected: string;
  }>();
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const roundId = useRef(crypto.randomUUID());
  const answerRef = useRef<HTMLInputElement>(null);
  const current = queue[index];
  const prompt = current ? getLearningBoxPrompt(current, direction) : undefined;
  const answerLocale =
    direction === "forward" ? deck.backLocale : deck.frontLocale;

  useEffect(() => {
    if (mode === "writing" && !feedback) answerRef.current?.focus();
  }, [index, feedback, mode]);

  async function assess(correct: boolean, expected: string) {
    if (!current) return;
    const updated = processLearningBoxResult(current, {
      correct,
      direction,
      mode,
    });
    await onSave(updated, {
      correct,
      direction,
      mode,
      roundId: roundId.current,
    });
    setFeedback({ correct, expected });
    setStats((value) => ({
      correct: value.correct + (correct ? 1 : 0),
      wrong: value.wrong + (correct ? 0 : 1),
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!current || !answer.trim()) return;
    const result = evaluateLearningBoxAnswer(current, answer, direction);
    await assess(result.accepted, result.expectedAnswer);
  }

  function next() {
    setIndex((value) => value + 1);
    setAnswer("");
    setRevealed(false);
    setFeedback(undefined);
  }

  if (!current || !prompt) {
    return (
      <div className="ui-lb__session">
        <div className="ui-card ui-card--raised ui-lb__done ui-center">
          <p className="ui-eyebrow">Runde abgeschlossen</p>
          <h1 className="ui-h-fun">Gut gearbeitet</h1>
          <p className="ui-muted">
            {stats.correct} gewusst · {stats.wrong} noch zu üben
          </p>
          <button
            type="button"
            className="ui-btn ui-btn--primary"
            onClick={onClose}
          >
            Zur Lernbox
          </button>
        </div>
      </div>
    );
  }

  const remaining = queue.length - index;
  return (
    <div className="ui-lb__session">
      <header className="ui-between ui-lb__session-head">
        <div>
          <h1 className="ui-h-section">{deck.title}</h1>
          <p className="ui-small ui-muted">
            {remaining} übrig ·{" "}
            {mode === "writing" ? "Schreiben" : "Karteikarten"}
          </p>
        </div>
        <button type="button" className="ui-btn ui-btn--link" onClick={onClose}>
          Runde beenden
        </button>
      </header>
      <div
        className="ui-bar"
        role="progressbar"
        aria-label="Fortschritt der Runde"
        aria-valuemin={0}
        aria-valuemax={queue.length}
        aria-valuenow={index}
        aria-valuetext={`${index + 1} / ${queue.length}`}
      >
        <span style={{ width: `${(index / queue.length) * 100}%` }} />
      </div>

      <article className="ui-card ui-card--raised ui-lb__card">
        <div className="ui-between">
          <span className="ui-eyebrow">
            {LANGUAGES[answerLocale]?.into ?? "Antwort"}
          </span>
          <span className="ui-pill">
            Box {getLearningBoxLevel(current, direction)}
          </span>
        </div>
        <h2 className="ui-lb__question">{prompt.question}</h2>
      </article>

      {feedback ? (
        <div
          className={`ui-feedback ${feedback.correct ? "ui-feedback--good" : "ui-feedback--bad"}`}
        >
          <strong>{feedback.correct ? "Richtig" : "Noch nicht richtig"}</strong>
          <p className="ui-small">
            {feedback.correct
              ? "Die Karte rückt nach den LernBox-Regeln weiter."
              : `Die passende Antwort ist „${feedback.expected}“.`}
          </p>
          <button
            type="button"
            className="ui-btn ui-btn--primary"
            onClick={next}
          >
            {index + 1 < queue.length ? "Nächste Karte" : "Runde abschließen"}
          </button>
        </div>
      ) : mode === "writing" ? (
        <form className="ui-lb__answer" onSubmit={submit}>
          <label className="ui-grow">
            <span className="ui-sr-only">Deine Antwort</span>
            <input
              ref={answerRef}
              className="ui-field"
              value={answer}
              placeholder="Antwort tippen"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              onChange={(event) => setAnswer(event.target.value)}
            />
          </label>
          <button className="ui-btn ui-btn--primary ui-btn--lg" type="submit">
            Antwort prüfen
          </button>
        </form>
      ) : revealed ? (
        <div className="ui-card ui-card--pad ui-stack ui-center">
          <span className="ui-eyebrow">Antwort</span>
          <strong className="ui-lb__reveal">{prompt.answer}</strong>
          <div className="ui-grid2">
            <button
              type="button"
              className="ui-btn ui-btn--bad"
              onClick={() => void assess(false, prompt.answer)}
            >
              Noch üben
            </button>
            <button
              type="button"
              className="ui-btn ui-btn--green"
              onClick={() => void assess(true, prompt.answer)}
            >
              Gewusst
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="ui-btn ui-btn--primary ui-btn--lg"
          onClick={() => setRevealed(true)}
        >
          Antwort aufdecken
        </button>
      )}
    </div>
  );
}

const BOX_COLORS = ["#c7674a", "#d98a3d", "#e0a83a", "#7a9e5a", "#2f6b4f"];

/** Boxverteilung als farbige Leiste (Design: Box 1 · neu … Box 5 · sitzt). */
function BoxDistribution({
  cards,
  large = false,
}: {
  cards: LearningBoxCard[];
  large?: boolean;
}) {
  const counts = [1, 2, 3, 4, 5].map(
    (box) => cards.filter((card) => card.box === box).length,
  );
  return (
    <div
      className={`ui-lb__dist${large ? " ui-lb__dist--large" : ""}`}
      role="img"
      aria-label={`Boxverteilung: ${counts.map((count, index) => `Box ${index + 1}: ${count}`).join(", ")}`}
    >
      {counts.map((count, index) => (
        <span
          key={index}
          style={{
            flexGrow: Math.max(1, count),
            background: BOX_COLORS[index],
          }}
        />
      ))}
    </div>
  );
}

function downloadJson(value: unknown, prefix: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${prefix}-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
