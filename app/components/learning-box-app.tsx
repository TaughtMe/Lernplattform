"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  evaluateLearningBoxAnswer,
  filterLearningBoxCards,
  getLearningBoxLevel,
  getLearningBoxPrompt,
  isLearningBoxCardDue,
  isLearningBoxCardDueFor,
  learningBoxAlternatives,
  learningBoxDirectionAt,
  parseLearningBoxImport,
  processLearningBoxResult,
  sortLearningBoxCards,
  type LearningBoxCard,
  type LearningBoxDeck,
  type LearningBoxDirection,
  type LearningBoxFolder,
  type LearningBoxMode,
  type LearningBoxSessionDirection,
  type LearningBoxSort,
} from "../../src/domain/learning-box";
import { VOCABULARY_LANGUAGES } from "../../src/domain/running-dictation";
import {
  createLearningBoxRepository,
  migrateLegacyLearningBox,
} from "../../src/storage/personal-learning-events";
import { StudentPage } from "../ui/shell/student-page";
import { useThemeToggle } from "../ui/theme";
import {
  LernBoxScreen,
  type LbDeck,
  type LbManager,
  type LbStudy,
} from "../views/lernbox/lernbox-screen";

const LANGUAGES: Record<string, { name: string; into: string }> =
  Object.fromEntries(
    [...VOCABULARY_LANGUAGES, { locale: "en-US", label: "Englisch" }].map(
      ({ locale, label }) => [locale, { name: label, into: `Auf ${label}` }],
    ),
  );
const LANGUAGE_CHOICES = VOCABULARY_LANGUAGES.map(({ locale, label }) => ({
  locale,
  label,
}));
const MODE_LABEL: Record<LearningBoxMode, string> = {
  writing: "Schreiben",
  oral: "Mündlich",
};
const PANEL_KEY = "lernbox:leiste";
const FOLDERS_KEY = "lernbox:ordner-zu";

function languageName(locale: string) {
  return LANGUAGES[locale]?.name ?? locale;
}
function languageShort(locale: string) {
  return languageName(locale).slice(0, 2).toUpperCase();
}
function sourceLabel(deck: LearningBoxDeck) {
  switch (deck.source.kind) {
    case "running-dictation":
      return "aus dem Laufdiktat";
    case "teacher":
      return "von der Lehrkraft";
    case "import":
      return "importiert";
    default:
      return "eigene";
  }
}

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}
function store(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ohne Speicher gilt die Einstellung nur für diesen Besuch.
  }
}

/** Mehrere richtige Antworten („home | house“) lesbar anzeigen. */
function showAlternatives(text: string) {
  return learningBoxAlternatives(text).join(" / ");
}

/** Karte gilt als Fehler, wenn sie schon geübt wurde und wieder in Box 1 liegt. */
function isMistake(card: LearningBoxCard) {
  const reviewed = card.lastReviewed > card.createdAt;
  return (
    reviewed &&
    (card.box === 1 || (card.reverseInterval > 0 && card.reverseBox === 1))
  );
}

type QueueItem = { card: LearningBoxCard; direction: LearningBoxDirection };

type Session = {
  title: string;
  mode: LearningBoxMode;
  queue: QueueItem[];
  index: number;
  answer: string;
  revealed: boolean;
  feedback: { correct: boolean; expected: string } | null;
  stats: { correct: number; wrong: number };
  roundId: string;
  finished: boolean;
};

type View =
  { kind: "welcome" } | { kind: "deck"; id: string } | { kind: "all" };

/** Reihenfolge und Richtung der Karten einer Runde. */
function buildQueue(
  cards: readonly LearningBoxCard[],
  choice: LearningBoxSessionDirection,
  onlyDue: boolean,
): QueueItem[] {
  const now = Date.now();
  return cards.map((card, index) => {
    let direction = learningBoxDirectionAt(choice, index);
    if (choice === "mixed" && onlyDue) {
      const forward = isLearningBoxCardDue(card, "forward", now);
      const reverse = isLearningBoxCardDue(card, "reverse", now);
      if (forward !== reverse) direction = forward ? "forward" : "reverse";
    }
    return { card, direction };
  });
}

export function LearningBoxApp() {
  const repository = useMemo(() => createLearningBoxRepository(), []);
  const { theme, toggleTheme } = useThemeToggle();
  const [decks, setDecks] = useState<LearningBoxDeck[]>([]);
  const [folders, setFolders] = useState<LearningBoxFolder[]>([]);
  const [cards, setCards] = useState<LearningBoxCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [view, setView] = useState<View>({ kind: "welcome" });
  const [panelOpen, setPanelOpen] = useState(true);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [mode, setMode] = useState<LearningBoxMode>("writing");
  const [direction, setDirection] =
    useState<LearningBoxSessionDirection>("forward");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<LearningBoxSort>("alphabet");
  const [session, setSession] = useState<Session | null>(null);
  const refreshRevision = useRef(0);

  const refresh = useCallback(async () => {
    const revision = ++refreshRevision.current;
    const [nextDecks, nextFolders, nextCards] = await Promise.all([
      repository.listDecks(),
      repository.listFolders(),
      repository.listAllCards(),
    ]);
    if (revision !== refreshRevision.current) return;
    setDecks(nextDecks);
    setFolders(nextFolders);
    setCards(nextCards);
    setLoading(false);
  }, [repository]);

  useEffect(() => {
    let active = true;
    void migrateLegacyLearningBox().then(async (result) => {
      if (!active) return;
      setPanelOpen(readStored(PANEL_KEY, true));
      setCollapsed(readStored<string[]>(FOLDERS_KEY, []));
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
      if (active && requested) setView({ kind: "deck", id: requested });
    });
    return () => {
      active = false;
    };
  }, [refresh]);

  const deckById = useMemo(
    () => new Map(decks.map((deck) => [deck.id, deck])),
    [decks],
  );
  const now = Date.now();
  const dueCards = cards.filter((card) =>
    isLearningBoxCardDueFor(card, direction, now),
  );
  const mistakes = cards.filter(isMistake);
  const selectedDeck = view.kind === "deck" ? deckById.get(view.id) : undefined;
  const labelDeck = selectedDeck ?? decks[0];
  const directionLabels = labelDeck
    ? {
        forward: `${languageShort(labelDeck.frontLocale)} → ${languageShort(labelDeck.backLocale)}`,
        reverse: `${languageShort(labelDeck.backLocale)} → ${languageShort(labelDeck.frontLocale)}`,
      }
    : { forward: "DE → EN", reverse: "EN → DE" };
  const locked = session !== null && !session.finished;

  const lbDecks: LbDeck[] = decks.map((deck) => {
    const inside = cards.filter((card) => card.deckId === deck.id);
    const boxes = [0, 0, 0, 0, 0];
    for (const card of inside)
      boxes[card.box - 1] = (boxes[card.box - 1] ?? 0) + 1;
    return {
      id: deck.id,
      title: deck.title,
      folderId: deck.folderId ?? null,
      total: inside.length,
      due: inside.filter((card) =>
        isLearningBoxCardDueFor(card, direction, now),
      ).length,
      boxes,
      sourceLabel: `${languageName(deck.backLocale)} · ${sourceLabel(deck)}`,
    };
  });

  function say(text: string, locale: string) {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.split("|")[0]?.trim());
    utterance.lang = locale;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  function startSession(
    title: string,
    pool: readonly LearningBoxCard[],
    onlyDue: boolean,
  ) {
    if (!pool.length) return;
    setNotice("");
    setSession({
      title,
      mode,
      queue: buildQueue(pool, direction, onlyDue),
      index: 0,
      answer: "",
      revealed: false,
      feedback: null,
      stats: { correct: 0, wrong: 0 },
      roundId: crypto.randomUUID(),
      finished: false,
    });
  }

  async function assess(correct: boolean, expected: string) {
    if (!session) return;
    const item = session.queue[session.index];
    if (!item) return;
    const updated = processLearningBoxResult(item.card, {
      correct,
      direction: item.direction,
      mode: session.mode,
    });
    await repository.putCardAndEvent({
      card: updated,
      correct,
      direction: item.direction,
      mode: session.mode,
      roundId: session.roundId,
    });
    const queue = session.queue.map((entry, index) =>
      index === session.index ? { ...entry, card: updated } : entry,
    );
    const stats = {
      correct: session.stats.correct + (correct ? 1 : 0),
      wrong: session.stats.wrong + (correct ? 0 : 1),
    };
    if (session.mode === "writing") {
      setSession({
        ...session,
        queue,
        stats,
        feedback: { correct, expected: showAlternatives(expected) },
      });
    } else {
      advance({ ...session, queue, stats });
    }
  }

  function advance(current: Session) {
    const index = current.index + 1;
    setSession({
      ...current,
      index,
      answer: "",
      revealed: false,
      feedback: null,
      finished: index >= current.queue.length,
    });
    if (index >= current.queue.length) void refresh();
  }

  function endSession() {
    setSession(null);
    void refresh();
  }

  async function run(action: () => Promise<unknown>, message?: string) {
    try {
      await action();
      if (message !== undefined) setNotice(message);
    } catch {
      setNotice("Das hat nicht geklappt. Bitte versuche es noch einmal.");
    }
    await refresh();
  }

  function downloadBackup(value: unknown) {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `LernBox-Sicherung-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importBackup(file: File) {
    try {
      const value = JSON.parse(await file.text()) as {
        decks?: LearningBoxDeck[];
        cards?: LearningBoxCard[];
        folders?: LearningBoxFolder[];
      };
      if (!Array.isArray(value.decks) || !Array.isArray(value.cards)) {
        throw new Error("invalid");
      }
      await repository.importBackup({
        decks: value.decks,
        cards: value.cards,
        ...(Array.isArray(value.folders) ? { folders: value.folders } : {}),
      });
      setNotice("Sicherung wurde importiert.");
      await refresh();
    } catch {
      setNotice("Diese Datei ist keine gültige LernBox-Sicherung.");
    }
  }

  // ---------- Hauptbereich ----------
  let main: Parameters<typeof LernBoxScreen>[0]["main"] = { kind: "welcome" };
  if (session) {
    const item = session.queue[session.index];
    const deck = item ? deckById.get(item.card.deckId) : undefined;
    const prompt = item
      ? getLearningBoxPrompt(item.card, item.direction)
      : null;
    const answerLocale = deck
      ? item?.direction === "forward"
        ? deck.backLocale
        : deck.frontLocale
      : "";
    const remaining = session.queue.length - session.index;
    const study: LbStudy = {
      title: session.title,
      subtitle: `${remaining} übrig · ${MODE_LABEL[session.mode]}`,
      progress: session.queue.length ? session.index / session.queue.length : 1,
      eyebrow: LANGUAGES[answerLocale]?.into ?? "Antwort",
      box: item ? getLearningBoxLevel(item.card, item.direction) : 1,
      question: showAlternatives(prompt?.question ?? ""),
      mode: session.mode,
      answer: session.answer,
      revealed: session.revealed,
      revealedAnswer: showAlternatives(prompt?.answer ?? ""),
      feedback: session.feedback,
      done: session.finished ? session.stats : null,
      canSpeak: typeof window !== "undefined" && "speechSynthesis" in window,
    };
    main = { kind: "study", study };
  } else if (view.kind === "all" || selectedDeck) {
    const pool = selectedDeck
      ? cards.filter((card) => card.deckId === selectedDeck.id)
      : cards;
    const activeSort = selectedDeck && sort === "deck" ? "alphabet" : sort;
    const shown = sortLearningBoxCards(
      filterLearningBoxCards(pool, query),
      activeSort,
      (id) => deckById.get(id)?.title ?? "",
    );
    const summary = selectedDeck
      ? lbDecks.find((deck) => deck.id === selectedDeck.id)
      : undefined;
    const manager: LbManager = {
      title: selectedDeck?.title ?? "Alle Vokabeln",
      subtitle: selectedDeck
        ? `${languageName(selectedDeck.frontLocale)} → ${languageName(selectedDeck.backLocale)} · ${sourceLabel(selectedDeck)}`
        : `${cards.length} Karten in ${decks.length} Stapeln`,
      deck:
        selectedDeck && summary
          ? {
              id: selectedDeck.id,
              folderId: selectedDeck.folderId ?? null,
              frontLabel: languageName(selectedDeck.frontLocale),
              backLabel: languageName(selectedDeck.backLocale),
              due: summary.due,
              total: summary.total,
              boxes: summary.boxes,
            }
          : null,
      cards: shown.map((card) => ({
        id: card.id,
        question: card.question,
        answer: card.answer,
        tag: card.tag ?? null,
        box: card.box,
        deckTitle: deckById.get(card.deckId)?.title ?? "",
      })),
      query,
      sort: activeSort,
    };
    main = { kind: "manager", manager };
  }

  const cardsOf = (ids: readonly string[]) =>
    cards.filter((card) => ids.includes(card.id));

  return (
    <StudentPage activePath="/lernbox" bare>
      <LernBoxScreen
        theme={theme}
        panelOpen={panelOpen}
        loading={loading}
        notice={notice}
        folders={folders.map(({ id, title }) => ({ id, title }))}
        decks={lbDecks}
        collapsedFolders={collapsed}
        selectedDeckId={selectedDeck?.id ?? null}
        mode={session?.mode ?? mode}
        direction={direction}
        directionLabels={directionLabels}
        locked={locked}
        dueTotal={dueCards.length}
        errorCount={mistakes.length}
        languages={LANGUAGE_CHOICES}
        main={main}
        onToggleTheme={toggleTheme}
        onTogglePanel={() => {
          setPanelOpen(!panelOpen);
          store(PANEL_KEY, !panelOpen);
        }}
        onToggleFolder={(id) => {
          const next = collapsed.includes(id)
            ? collapsed.filter((entry) => entry !== id)
            : [...collapsed, id];
          setCollapsed(next);
          store(FOLDERS_KEY, next);
        }}
        onSelectDeck={(id) => {
          if (locked) return;
          setSession(null);
          setView({ kind: "deck", id });
          setQuery("");
          setNotice("");
        }}
        onShowAll={() => {
          if (locked) return;
          setSession(null);
          setView({ kind: "all" });
          setQuery("");
          setNotice("");
        }}
        onDeleteDeck={(id) => {
          const deck = lbDecks.find((entry) => entry.id === id);
          if (
            deck &&
            deck.total > 0 &&
            !window.confirm(
              `Stapel „${deck.title}“ mit ${deck.total} Karten löschen?`,
            )
          ) {
            return;
          }
          if (view.kind === "deck" && view.id === id)
            setView({ kind: "welcome" });
          void run(() => repository.deleteDeck(id));
        }}
        onDeleteFolder={(id) =>
          void run(
            () => repository.deleteFolder(id),
            "Ordner gelöscht. Seine Stapel liegen jetzt ohne Ordner.",
          )
        }
        onCreateDeck={(input) =>
          void run(async () => {
            const deck = await repository.createDeck({
              title: input.title,
              folderId: input.folderId ?? undefined,
              frontLocale: input.frontLocale,
              backLocale: input.backLocale,
            });
            if (input.importText) {
              const { rows, skipped } = parseLearningBoxImport(
                input.importText,
              );
              const result = await repository.importCards(deck.id, rows);
              setNotice(
                `${result.added} Vokabeln importiert${
                  skipped.length
                    ? ` · Zeile ${skipped.join(", ")} übersprungen`
                    : ""
                }.`,
              );
            }
            if (input.folderId) {
              const next = collapsed.filter(
                (entry) => entry !== input.folderId,
              );
              setCollapsed(next);
              store(FOLDERS_KEY, next);
            }
            return deck;
          })
        }
        onCreateFolder={(title) =>
          void run(
            () => repository.createFolder(title),
            `Ordner „${title}“ angelegt.`,
          )
        }
        onMode={(value) => {
          if (!locked) setMode(value);
        }}
        onDirection={(value) => {
          if (!locked) setDirection(value);
        }}
        onLearnDue={() => startSession("Alle fälligen Karten", dueCards, true)}
        onLearnErrors={() => startSession("Meine Fehler", mistakes, false)}
        onBack={() => {
          if (session) endSession();
          else setView({ kind: "welcome" });
        }}
        onExport={() => void repository.exportBackup().then(downloadBackup)}
        onImportBackup={(file) => void importBackup(file)}
        onStartDeck={() => {
          if (!selectedDeck) return;
          const pool = cards.filter((card) => card.deckId === selectedDeck.id);
          const due = pool.filter((card) =>
            isLearningBoxCardDueFor(card, direction),
          );
          startSession(
            selectedDeck.title,
            due.length ? due : pool,
            due.length > 0,
          );
        }}
        onMoveDeck={(folderId) => {
          if (selectedDeck)
            void run(() => repository.moveDeck(selectedDeck.id, folderId));
        }}
        onAddCard={(input) => {
          if (!selectedDeck) return;
          void run(async () => {
            const result = await repository.addCard({
              deckId: selectedDeck.id,
              question: input.question,
              answer: input.answer,
              ...(input.tag.trim() ? { tag: input.tag } : {}),
            });
            setNotice(
              result.added
                ? "Karte wurde hinzugefügt."
                : "Diese Karte ist bereits in der LernBox.",
            );
          });
        }}
        onImportCards={(text) => {
          if (!selectedDeck) return;
          const { rows, skipped } = parseLearningBoxImport(text);
          void run(async () => {
            const result = await repository.importCards(selectedDeck.id, rows);
            const parts = [`${result.added} Vokabeln importiert`];
            if (result.duplicates)
              parts.push(`${result.duplicates} schon vorhanden`);
            if (skipped.length)
              parts.push(
                `Zeile ${skipped.join(", ")} ohne zwei Spalten übersprungen`,
              );
            setNotice(`${parts.join(" · ")}.`);
          });
        }}
        onQuery={setQuery}
        onSort={setSort}
        onEditCard={(id, input) =>
          void run(
            () =>
              repository.editCard(id, {
                question: input.question,
                answer: input.answer,
                tag: input.tag.trim() || null,
              }),
            "Karte gespeichert.",
          )
        }
        onPracticeCards={(ids) =>
          startSession("Ausgewählte Vokabeln", cardsOf(ids), false)
        }
        onMoveCards={(ids, deckId) =>
          void run(
            () => repository.moveCards(ids, deckId),
            `${ids.length} Karten nach „${deckById.get(deckId)?.title ?? ""}“ verschoben.`,
          )
        }
        onTagCards={(ids, tag) =>
          void run(
            () => repository.setCardsTag(ids, tag),
            tag.trim()
              ? `Tag „${tag.trim()}“ für ${ids.length} Karten gesetzt.`
              : `Tag bei ${ids.length} Karten entfernt.`,
          )
        }
        onDeleteCards={(ids) =>
          void run(
            () => repository.deleteCards(ids),
            ids.length === 1
              ? "Karte gelöscht."
              : `${ids.length} Karten gelöscht.`,
          )
        }
        onAnswer={(value) =>
          session && setSession({ ...session, answer: value })
        }
        onCheck={() => {
          const item = session?.queue[session.index];
          if (!session || !item || !session.answer.trim()) return;
          const result = evaluateLearningBoxAnswer(
            item.card,
            session.answer,
            item.direction,
          );
          void assess(result.accepted, result.expectedAnswer);
        }}
        onReveal={() => session && setSession({ ...session, revealed: true })}
        onAssess={(correct) => {
          const item = session?.queue[session.index];
          if (!item) return;
          void assess(
            correct,
            getLearningBoxPrompt(item.card, item.direction).answer,
          );
        }}
        onNext={() => session && advance(session)}
        onSpeak={(side) => {
          const item = session?.queue[session.index];
          const deck = item ? deckById.get(item.card.deckId) : undefined;
          if (!item || !deck) return;
          const prompt = getLearningBoxPrompt(item.card, item.direction);
          const forward = item.direction === "forward";
          if (side === "question")
            say(prompt.question, forward ? deck.frontLocale : deck.backLocale);
          else say(prompt.answer, forward ? deck.backLocale : deck.frontLocale);
        }}
        onEndSession={endSession}
      />
    </StudentPage>
  );
}
