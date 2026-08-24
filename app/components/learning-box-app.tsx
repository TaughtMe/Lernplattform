"use client";

import Link from "next/link";
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

type View = "decks" | "deck" | "session";

const directionLabel: Record<LearningBoxDirection, string> = {
  forward: "Vorderseite → Rückseite",
  reverse: "Rückseite → Vorderseite",
};

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
    setSelectedDeckId(undefined);
    setNotice("");
  }

  return (
    <main className="learning-box-shell">
      <header className="learning-box-topbar">
        {view === "decks" ? (
          <Link href="/frei" className="back-link">
            ← Freies Üben
          </Link>
        ) : (
          <button className="text-button" onClick={leaveDeck}>
            ← Meine LernBox
          </button>
        )}
        <div>
          <strong>Meine LernBox</strong>
          <span>Persönlich · auf diesem Gerät</span>
        </div>
        <Link href="/" className="back-link">
          Lernraum
        </Link>
      </header>

      {view === "decks" && (
        <DeckOverview
          decks={decks}
          cards={deckCards}
          loading={loading}
          interactionReady={interactionReady}
          notice={notice}
          onCreate={async (input) => {
            const deck = await repository.createDeck(input);
            setDecks((current) => [deck, ...current]);
            setDeckCards((current) => ({ ...current, [deck.id]: [] }));
          }}
          onDelete={async (id) => {
            await repository.deleteDeck(id);
            await refresh();
          }}
          onOpen={openDeck}
          onExport={async () => {
            downloadJson(await repository.exportBackup(), "LernBox-Sicherung");
          }}
          onImport={async (event) => {
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
              await repository.importBackup({
                decks: value.decks,
                cards: value.cards,
              });
              setNotice("Sicherung wurde importiert.");
              await refresh();
            } catch {
              setNotice("Diese Datei ist keine gültige LernBox-Sicherung.");
            } finally {
              event.target.value = "";
            }
          }}
        />
      )}

      {view === "deck" && selectedDeck && (
        <DeckDetail
          deck={selectedDeck}
          cards={selectedCards}
          notice={notice}
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
      )}

      {view === "session" && selectedDeck && (
        <LearningSession
          deck={selectedDeck}
          cards={selectedCards}
          onSave={async (card, result) => {
            await repository.putCardAndEvent({ card, ...result });
            await refresh();
          }}
          onClose={() => setView("deck")}
        />
      )}
    </main>
  );
}

function DeckOverview({
  decks,
  cards,
  loading,
  interactionReady,
  notice,
  onCreate,
  onDelete,
  onOpen,
  onExport,
  onImport,
}: {
  decks: LearningBoxDeck[];
  cards: Record<string, LearningBoxCard[]>;
  loading: boolean;
  interactionReady: boolean;
  notice: string;
  onCreate: (input: {
    title: string;
    frontLocale: string;
    backLocale: string;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onOpen: (id: string) => void;
  onExport: () => Promise<void>;
  onImport: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);

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
  }

  return (
    <section
      className="learning-box-content"
      aria-labelledby="learning-box-title"
    >
      <div className="learning-box-heading">
        <div>
          <p className="eyebrow">Dein persönlicher Wortschatz</p>
          <h1 id="learning-box-title">Meine LernBox</h1>
          <p>
            Eigene Vokabeln und übernommene Fehler landen gemeinsam hier. Die
            Darstellung folgt immer dem Lernraum-Theme.
          </p>
        </div>
        <div className="learning-box-tools">
          <button
            className="button button--quiet"
            onClick={() => void onExport()}
            disabled={decks.length === 0}
          >
            Sicherung speichern
          </button>
          <label className="button button--quiet file-button">
            Sicherung laden
            <input
              type="file"
              accept="application/json"
              onChange={(event) => void onImport(event)}
            />
          </label>
        </div>
      </div>

      <form
        ref={formRef}
        className="deck-create"
        onSubmit={(event) => {
          event.preventDefault();
          void createFromForm();
        }}
      >
        <label>
          Neue Lernbox
          <input
            name="title"
            aria-label="Name der neuen Lernbox"
            placeholder="z. B. Englisch 7b"
            maxLength={80}
          />
        </label>
        <label>
          Vorderseite
          <select name="frontLocale" defaultValue="de-DE">
            <option value="de-DE">Deutsch</option>
            <option value="en-US">Englisch</option>
            <option value="fr-FR">Französisch</option>
            <option value="es-ES">Spanisch</option>
            <option value="la">Latein</option>
          </select>
        </label>
        <label>
          Rückseite
          <select name="backLocale" defaultValue="en-US">
            <option value="en-US">Englisch</option>
            <option value="de-DE">Deutsch</option>
            <option value="fr-FR">Französisch</option>
            <option value="es-ES">Spanisch</option>
            <option value="la">Latein</option>
          </select>
        </label>
        <button
          type="button"
          className="button button--primary"
          disabled={loading || !interactionReady}
          onClick={() => void createFromForm()}
        >
          Erstellen
        </button>
      </form>

      {notice && (
        <p className="learning-box-notice" role="status">
          {notice}
        </p>
      )}

      {loading ? (
        <p className="learning-box-empty">LernBox wird geladen …</p>
      ) : decks.length === 0 ? (
        <div className="learning-box-empty">
          <strong>Noch keine Lernbox vorhanden</strong>
          <p>
            Lege deine erste Box an oder übernimm später Fehler direkt aus einem
            Laufdiktat.
          </p>
        </div>
      ) : (
        <div className="deck-grid">
          {decks.map((deck) => {
            const deckCards = cards[deck.id] ?? [];
            const due = deckCards.filter((card) =>
              isLearningBoxCardDue(card, "forward"),
            ).length;
            return (
              <article className="deck-card" key={deck.id}>
                <button
                  className="deck-card__open"
                  onClick={() => onOpen(deck.id)}
                >
                  <span>
                    {deck.source.kind === "running-dictation"
                      ? "Aus Laufdiktat"
                      : "Persönliche Lernbox"}
                  </span>
                  <h2>{deck.title}</h2>
                  <p>
                    <strong>{due}</strong> fällig · {deckCards.length} Karten
                  </p>
                  <BoxDistribution cards={deckCards} />
                </button>
                <button
                  className="deck-card__delete"
                  aria-label={`${deck.title} löschen`}
                  onClick={() => void onDelete(deck.id)}
                >
                  Löschen
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function DeckDetail({
  deck,
  cards,
  notice,
  onAdd,
  onDelete,
  onStart,
}: {
  deck: LearningBoxDeck;
  cards: LearningBoxCard[];
  notice: string;
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
  const due = cards.filter((card) =>
    isLearningBoxCardDue(card, "forward"),
  ).length;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim() || !answer.trim()) return;
    await onAdd({ question, answer, ...(tag.trim() ? { tag } : {}) });
    setQuestion("");
    setAnswer("");
  }

  return (
    <section className="learning-box-content">
      <div className="deck-detail-heading">
        <div>
          <p className="eyebrow">
            {deck.source.kind === "running-dictation"
              ? "Automatisch übernommen"
              : "Persönliche Lernbox"}
          </p>
          <h1>{deck.title}</h1>
          <p>
            {cards.length} Karten · {due} jetzt fällig
          </p>
        </div>
        <button
          className="button button--primary"
          onClick={onStart}
          disabled={cards.length === 0}
        >
          Lernrunde starten
        </button>
      </div>

      <div className="leitner-overview" aria-label="Verteilung auf fünf Boxen">
        {[1, 2, 3, 4, 5].map((box) => (
          <div key={box}>
            <span>Box {box}</span>
            <strong>{cards.filter((card) => card.box === box).length}</strong>
          </div>
        ))}
      </div>

      <form className="card-create" onSubmit={submit}>
        <h2>Neue Karte</h2>
        <label>
          {deck.frontLocale}
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Vorderseite"
          />
        </label>
        <label>
          {deck.backLocale}
          <input
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Rückseite"
          />
        </label>
        <label>
          Tag
          <input
            value={tag}
            onChange={(event) => setTag(event.target.value)}
            placeholder="z. B. Unit 3"
          />
        </label>
        <button className="button button--secondary">Karte hinzufügen</button>
      </form>

      {notice && (
        <p className="learning-box-notice" role="status">
          {notice}
        </p>
      )}

      <div className="card-list">
        <div className="card-list__heading">
          <h2>Vokabelübersicht</h2>
          <span>{cards.length} Karten</span>
        </div>
        {cards.length === 0 ? (
          <p className="learning-box-empty">Noch keine Karten in dieser Box.</p>
        ) : (
          cards.map((card) => (
            <article key={card.id} className="vocabulary-row">
              <div>
                <strong>{card.question}</strong>
                <span>{card.answer}</span>
              </div>
              <div>
                <span>{card.tag ?? "Ohne Tag"}</span>
                <strong>Box {card.box}</strong>
              </div>
              <button
                aria-label={`${card.question} löschen`}
                onClick={() => void onDelete(card.id)}
              >
                Löschen
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function LearningSession({
  deck,
  cards,
  onSave,
  onClose,
}: {
  deck: LearningBoxDeck;
  cards: LearningBoxCard[];
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
  const [mode, setMode] = useState<LearningBoxMode>("oral");
  const [direction, setDirection] = useState<LearningBoxDirection>("forward");
  const [started, setStarted] = useState(false);
  const [queue, setQueue] = useState<LearningBoxCard[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    expected: string;
  }>();
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const roundId = useRef(crypto.randomUUID());
  const current = queue[index];
  const prompt = current ? getLearningBoxPrompt(current, direction) : undefined;

  function start() {
    const due = cards.filter((card) => isLearningBoxCardDue(card, direction));
    setQueue(due.length ? due : cards);
    setIndex(0);
    setStats({ correct: 0, wrong: 0 });
    roundId.current = crypto.randomUUID();
    setStarted(true);
  }

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

  if (!started) {
    return (
      <section className="learning-box-content learning-session-config">
        <p className="eyebrow">Lernrunde vorbereiten</p>
        <h1>{deck.title}</h1>
        <fieldset>
          <legend>Modus</legend>
          <button
            aria-pressed={mode === "oral"}
            onClick={() => setMode("oral")}
          >
            Karteikarten
          </button>
          <button
            aria-pressed={mode === "writing"}
            onClick={() => setMode("writing")}
          >
            Schreiben
          </button>
        </fieldset>
        <fieldset>
          <legend>Richtung</legend>
          {(["forward", "reverse"] as const).map((value) => (
            <button
              key={value}
              aria-pressed={direction === value}
              onClick={() => setDirection(value)}
            >
              {directionLabel[value]}
            </button>
          ))}
        </fieldset>
        <div className="session-config-actions">
          <button className="button button--quiet" onClick={onClose}>
            Abbrechen
          </button>
          <button className="button button--primary" onClick={start}>
            Lernrunde starten
          </button>
        </div>
      </section>
    );
  }

  if (!current || !prompt) {
    return (
      <section className="learning-box-content learning-session-complete">
        <p className="eyebrow">Runde abgeschlossen</p>
        <h1>Gut gearbeitet</h1>
        <p>
          {stats.correct} gewusst · {stats.wrong} noch zu üben
        </p>
        <button className="button button--primary" onClick={onClose}>
          Zur Lernbox
        </button>
      </section>
    );
  }

  return (
    <section className="learning-box-content learning-session-native">
      <div className="native-session-progress">
        <span>
          {mode === "writing" ? "Schreiben" : "Karteikarten"} ·{" "}
          {directionLabel[direction]}
        </span>
        <strong>
          {index + 1} / {queue.length}
        </strong>
        <div>
          <span style={{ width: `${((index + 1) / queue.length) * 100}%` }} />
        </div>
      </div>
      <article className="native-flashcard">
        <span>Box {getLearningBoxLevel(current, direction)}</span>
        <h1>{prompt.question}</h1>
        {feedback ? (
          <div
            className={
              feedback.correct
                ? "native-feedback is-correct"
                : "native-feedback is-wrong"
            }
          >
            <strong>
              {feedback.correct ? "Richtig" : "Noch nicht richtig"}
            </strong>
            <p>
              {feedback.correct
                ? "Die Karte rückt nach den LernBox-Regeln weiter."
                : `Die passende Antwort ist „${feedback.expected}“.`}
            </p>
            <button className="button button--primary" onClick={next}>
              {index + 1 < queue.length ? "Nächste Karte" : "Runde abschließen"}
            </button>
          </div>
        ) : mode === "writing" ? (
          <form onSubmit={submit}>
            <label>
              Deine Antwort
              <input
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
              />
            </label>
            <button className="button button--primary">Antwort prüfen</button>
          </form>
        ) : revealed ? (
          <div className="native-reveal">
            <span>Antwort</span>
            <strong>{prompt.answer}</strong>
            <div>
              <button
                className="button self-check-button--wrong"
                onClick={() => void assess(false, prompt.answer)}
              >
                Noch üben
              </button>
              <button
                className="button self-check-button--right"
                onClick={() => void assess(true, prompt.answer)}
              >
                Gewusst
              </button>
            </div>
          </div>
        ) : (
          <button
            className="button button--primary"
            onClick={() => setRevealed(true)}
          >
            Antwort aufdecken
          </button>
        )}
      </article>
      <button className="text-button session-cancel" onClick={onClose}>
        Runde beenden
      </button>
    </section>
  );
}

function BoxDistribution({ cards }: { cards: LearningBoxCard[] }) {
  return (
    <div className="box-distribution" aria-label="Boxverteilung">
      {[1, 2, 3, 4, 5].map((box) => (
        <span
          key={box}
          style={{
            flexGrow: Math.max(
              1,
              cards.filter((card) => card.box === box).length,
            ),
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
