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
  type LearningBoxCard,
  type LearningBoxDeck,
  type LearningBoxDirection,
  type LearningBoxFolder,
  type LearningBoxMode,
  type LearningBoxSessionDirection,
} from "../../src/domain/learning-box";
import { VOCABULARY_LANGUAGES } from "../../src/domain/running-dictation";
import {
  parseTransferQrPayload,
  retrieveLearningBundleByCode,
  retrieveLearningBundleByQr,
} from "../../src/integrations/content-transfer/content-transfer-client";
import {
  getLiveRoomClient,
  type LiveRoomConfig,
} from "../../src/integrations/laufdiktat/live-room-client";
import {
  createLearningBoxRepository,
  migrateLegacyLearningBox,
} from "../../src/storage/personal-learning-events";
import { StudentPage } from "../ui/shell/student-page";
import { useThemeToggle } from "../ui/theme";
import {
  LernBoxScreen,
  type LbCard,
  type LbDeck,
  type LbEdit,
  type LbSheet,
  type LbSortKey,
  type LbStudy,
  type LbTransfer,
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
const DAY_MS = 24 * 60 * 60 * 1000;

function languageName(locale: string) {
  return LANGUAGES[locale]?.name ?? locale;
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
  feedback: {
    correct: boolean;
    expected: string;
    given: string;
    boxFrom: number;
    boxTo: number;
    nextLabel: string;
  } | null;
  stats: { correct: number; wrong: number };
  roundId: string;
  finished: boolean;
};

type View = "home" | "edit";

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

function nextLabel(card: LearningBoxCard, direction: LearningBoxDirection) {
  const next =
    direction === "forward" ? card.nextReview : card.reverseNextReview;
  const days = Math.max(1, Math.round((next - Date.now()) / DAY_MS));
  return days === 1 ? "kommt morgen wieder" : `kommt in ${days} Tagen wieder`;
}

const SORT_VALUE: Record<LbSortKey, (card: LbCard) => string | number> = {
  question: (card) => card.question,
  answer: (card) => card.answer,
  deck: (card) => card.deckTitle,
  tag: (card) => card.tag ?? "",
  box: (card) => card.box,
};

export function LearningBoxApp({
  transferConfig = null,
}: {
  transferConfig?: LiveRoomConfig | null;
}) {
  const repository = useMemo(() => createLearningBoxRepository(), []);
  const { theme, toggleTheme } = useThemeToggle();
  const [decks, setDecks] = useState<LearningBoxDeck[]>([]);
  const [folders, setFolders] = useState<LearningBoxFolder[]>([]);
  const [cards, setCards] = useState<LearningBoxCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [view, setView] = useState<View>("home");
  const [sheet, setSheet] = useState<LbSheet | null>(null);
  const [mode, setMode] = useState<LearningBoxMode>("writing");
  const [direction, setDirection] =
    useState<LearningBoxSessionDirection>("forward");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState<{ key: LbSortKey | null; dir: 1 | -1 }>({
    key: null,
    dir: 1,
  });
  const [session, setSession] = useState<Session | null>(null);
  const [transfer, setTransfer] = useState<LbTransfer>({
    busy: false,
    error: "",
    success: null,
  });
  const refreshRevision = useRef(0);

  const refresh = useCallback(async () => {
    const revision = ++refreshRevision.current;
    const [nextDecks, nextFolders, nextCards] = await Promise.all([
      repository.listDecks(),
      repository.listFolders(),
      repository.listAllCards(),
    ]);
    if (revision !== refreshRevision.current) return undefined;
    setDecks(nextDecks);
    setFolders(nextFolders);
    setCards(nextCards);
    setLoading(false);
    return nextDecks;
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
      const loaded = await refresh();
      // ?stapel=<id> öffnet das Start-Fenster eines Stapels, z. B. nach dem Laufdiktat.
      const requested = new URLSearchParams(window.location.search).get(
        "stapel",
      );
      if (active && requested && loaded?.some((deck) => deck.id === requested))
        setSheet({ kind: "start", scope: requested });
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
    isLearningBoxCardDueFor(card, "mixed", now),
  );
  const mistakes = cards.filter(isMistake);

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
      due: inside.filter((card) => isLearningBoxCardDueFor(card, "mixed", now))
        .length,
      boxes,
      sourceLabel: sourceLabel(deck),
      frontLabel: languageName(deck.frontLocale),
      backLabel: languageName(deck.backLocale),
    };
  });

  function directionLabelsFor(scope: string) {
    const deck = deckById.get(scope) ?? decks[0];
    return deck
      ? {
          forward: `${languageName(deck.frontLocale)} → ${languageName(deck.backLocale)}`,
          reverse: `${languageName(deck.backLocale)} → ${languageName(deck.frontLocale)}`,
        }
      : { forward: "Deutsch → Englisch", reverse: "Englisch → Deutsch" };
  }

  function say(text: string, locale: string) {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.split("|")[0]?.trim());
    utterance.lang = locale;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  function startSession(
    scope: string,
    choice: {
      mode: LearningBoxMode;
      direction: LearningBoxSessionDirection;
    },
  ) {
    const deck = deckById.get(scope);
    let title = "Heute dran";
    let pool: LearningBoxCard[] = [];
    let onlyDue = false;
    if (scope === "due") {
      pool = cards.filter((card) =>
        isLearningBoxCardDueFor(card, choice.direction),
      );
      onlyDue = true;
    } else if (scope === "errors") {
      title = "Meine Fehler";
      pool = mistakes;
    } else if (deck) {
      title = deck.title;
      const all = cards.filter((card) => card.deckId === deck.id);
      const due = all.filter((card) =>
        isLearningBoxCardDueFor(card, choice.direction),
      );
      pool = due.length ? due : all;
      onlyDue = due.length > 0;
    }
    setMode(choice.mode);
    setDirection(choice.direction);
    setSheet(null);
    if (!pool.length) {
      setNotice("Dafür ist gerade nichts fällig.");
      return;
    }
    setNotice("");
    setSession({
      title,
      mode: choice.mode,
      queue: buildQueue(pool, choice.direction, onlyDue),
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
        feedback: {
          correct,
          expected: showAlternatives(expected),
          given: session.answer.trim(),
          boxFrom: getLearningBoxLevel(item.card, item.direction),
          boxTo: getLearningBoxLevel(updated, item.direction),
          nextLabel: nextLabel(updated, item.direction),
        },
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

  // ---------- Vokabelpaket der Lehrkraft (Code oder QR) ----------
  async function receivePackage(
    fetchBundle: () => ReturnType<typeof retrieveLearningBundleByCode>,
    fallback: string,
  ) {
    setTransfer({ busy: true, error: "", success: null });
    try {
      const bundle = await fetchBundle();
      const title = bundle.stacks[0]?.title ?? "Von der Lehrkraft";
      const result = await repository.ingestBundle({
        bundle,
        title,
        source: { kind: "teacher", sourceId: bundle.id },
      });
      setTransfer({
        busy: false,
        error: "",
        success: { title, added: result.added, reused: result.reused },
      });
      await refresh();
    } catch (cause) {
      setTransfer({
        busy: false,
        error: cause instanceof Error ? cause.message : fallback,
        success: null,
      });
    }
  }

  function transferFailure(error: string) {
    setTransfer({ busy: false, error, success: null });
  }

  function receiveByCode(code: string) {
    if (!transferConfig)
      return transferFailure(
        "Die Inhaltsübertragung ist noch nicht konfiguriert.",
      );
    if (code.length !== 24)
      return transferFailure(
        "Bitte gib den vollständigen 24-stelligen Code ein.",
      );
    void receivePackage(
      () =>
        retrieveLearningBundleByCode(getLiveRoomClient(transferConfig), code),
      "Das Paket konnte nicht übernommen werden.",
    );
  }

  function receiveByQr(value: string) {
    if (!transferConfig)
      return transferFailure(
        "Die Inhaltsübertragung ist noch nicht konfiguriert.",
      );
    void receivePackage(
      () =>
        retrieveLearningBundleByQr(
          getLiveRoomClient(transferConfig),
          parseTransferQrPayload(value),
        ),
      "Der QR-Code konnte nicht gelesen werden.",
    );
  }

  // ---------- Hauptbereich ----------
  let main: Parameters<typeof LernBoxScreen>[0]["main"] = { kind: "home" };
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
    const labels = directionLabelsFor(deck?.id ?? "");
    const total = session.queue.length;
    const answered = session.index + (session.feedback ? 1 : 0);
    const study: LbStudy = {
      title: session.title,
      remaining: Math.max(0, total - answered),
      modeLabel: MODE_LABEL[session.mode],
      directionLabel:
        item?.direction === "reverse" ? labels.reverse : labels.forward,
      progress: total ? answered / total : 1,
      eyebrow: LANGUAGES[answerLocale]?.into ?? "Antwort",
      box: item ? getLearningBoxLevel(item.card, item.direction) : 1,
      question: showAlternatives(prompt?.question ?? ""),
      mode: session.mode,
      answer: session.answer,
      revealed: session.revealed,
      revealedAnswer: showAlternatives(prompt?.answer ?? ""),
      feedback: session.feedback
        ? {
            ...session.feedback,
            prompt: showAlternatives(prompt?.question ?? ""),
          }
        : null,
      done: session.finished ? session.stats : null,
      canSpeak: typeof window !== "undefined" && "speechSynthesis" in window,
    };
    main = { kind: "study", study };
  } else if (view === "edit") {
    const pool =
      filter === "all" ? cards : cards.filter((card) => card.deckId === filter);
    const rows: LbCard[] = filterLearningBoxCards(pool, query).map((card) => ({
      id: card.id,
      question: card.question,
      answer: card.answer,
      tag: card.tag ?? null,
      box: card.box,
      deckId: card.deckId,
      deckTitle: deckById.get(card.deckId)?.title ?? "",
    }));
    const createdAt = new Map(cards.map((card) => [card.id, card.createdAt]));
    const byKey = sort.key ? SORT_VALUE[sort.key] : null;
    rows.sort((a, b) => {
      if (!byKey)
        return (createdAt.get(b.id) ?? 0) - (createdAt.get(a.id) ?? 0);
      const x = byKey(a);
      const y = byKey(b);
      // Vokabeln ohne Tag stehen immer am Ende.
      if (sort.key === "tag" && (x === "") !== (y === ""))
        return x === "" ? 1 : -1;
      const order =
        typeof x === "number" && typeof y === "number"
          ? x - y
          : String(x).localeCompare(String(y), "de");
      return order * sort.dir;
    });
    const edit: LbEdit = {
      cards: rows,
      total: pool.length,
      query,
      filter,
      sortKey: sort.key,
      sortDir: sort.dir,
    };
    main = { kind: "edit", edit };
  }

  return (
    <StudentPage activePath="/lernbox" bare>
      <LernBoxScreen
        theme={theme}
        loading={loading}
        notice={notice}
        folders={folders.map(({ id, title }) => ({ id, title }))}
        decks={lbDecks}
        dueTotal={dueCards.length}
        errorCount={mistakes.length}
        languages={LANGUAGE_CHOICES}
        mode={mode}
        direction={direction}
        directionLabelsFor={directionLabelsFor}
        main={main}
        sheet={sheet}
        transfer={transfer}
        onToggleTheme={toggleTheme}
        onOpenSheet={(next) => {
          setTransfer({ busy: false, error: "", success: null });
          setNotice("");
          setSheet(next);
        }}
        onCloseSheet={() => setSheet(null)}
        onStart={({ scope, mode: chosenMode, direction: chosenDirection }) =>
          startSession(scope, { mode: chosenMode, direction: chosenDirection })
        }
        onEdit={() => {
          setView("edit");
          setQuery("");
          setFilter("all");
          setNotice("");
        }}
        onBack={() => {
          if (session) endSession();
          else {
            setView("home");
            setNotice("");
          }
        }}
        onCreateDeck={async (input) => {
          try {
            const deck = await repository.createDeck({
              title: input.title,
              folderId: input.folderId ?? undefined,
              frontLocale: input.frontLocale,
              backLocale: input.backLocale,
            });
            await refresh();
            return deck.id;
          } catch {
            setNotice("Das hat nicht geklappt. Bitte versuche es noch einmal.");
            return null;
          }
        }}
        onAddCard={async (deckId, input) => {
          try {
            const result = await repository.addCard({
              deckId,
              question: input.question,
              answer: input.answer,
            });
            await refresh();
            return result.added ? "added" : "duplicate";
          } catch {
            return "error";
          }
        }}
        onImportCards={async (deckId, text) => {
          const { rows, skipped } = parseLearningBoxImport(text);
          try {
            const result = await repository.importCards(deckId, rows);
            await refresh();
            const parts = [`${result.added} Vokabeln importiert`];
            if (result.duplicates)
              parts.push(`${result.duplicates} schon vorhanden`);
            if (skipped.length)
              parts.push(
                `Zeile ${skipped.join(", ")} ohne zwei Spalten übersprungen`,
              );
            return `${parts.join(" · ")}.`;
          } catch {
            return "Das hat nicht geklappt. Bitte versuche es noch einmal.";
          }
        }}
        onTransferCode={receiveByCode}
        onTransferQr={receiveByQr}
        onQuery={setQuery}
        onFilter={setFilter}
        onSort={(key) =>
          setSort((current) =>
            current.key === key
              ? { key, dir: current.dir === 1 ? -1 : 1 }
              : { key, dir: 1 },
          )
        }
        onSaveCard={(id, input, deckId) =>
          void run(async () => {
            await repository.editCard(id, {
              question: input.question,
              answer: input.answer,
              tag: input.tag.trim() || null,
            });
            const card = cards.find((entry) => entry.id === id);
            if (card && card.deckId !== deckId)
              await repository.moveCards([id], deckId);
          }, "Vokabel gespeichert.")
        }
        onDeleteCards={(ids) =>
          void run(
            () => repository.deleteCards(ids),
            ids.length === 1
              ? "Vokabel gelöscht."
              : `${ids.length} Vokabeln gelöscht.`,
          )
        }
        onCreateFolder={(title) =>
          void run(
            () => repository.createFolder(title),
            `Ordner „${title}“ angelegt.`,
          )
        }
        onDeleteFolder={(id) =>
          void run(
            () => repository.deleteFolder(id),
            "Ordner gelöscht. Seine Stapel liegen jetzt ohne Ordner.",
          )
        }
        onMoveDeck={(id, folderId) =>
          void run(() => repository.moveDeck(id, folderId))
        }
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
          if (filter === id) setFilter("all");
          void run(() => repository.deleteDeck(id));
        }}
        onExport={() => void repository.exportBackup().then(downloadBackup)}
        onImportBackup={(file) => void importBackup(file)}
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
