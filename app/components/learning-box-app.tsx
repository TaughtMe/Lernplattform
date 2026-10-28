"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  effectiveLearningBoxLevel,
  evaluateLearningBoxAnswer,
  filterLearningBoxCards,
  getLearningBoxPrompt,
  isFirstLearningBoxAttempt,
  isLearningBoxCardDue,
  isLearningBoxCardDueFor,
  isLearningBoxCardLongUnpracticed,
  learningBoxAlternatives,
  learningBoxAttemptKey,
  learningBoxDeckStatus,
  learningBoxDirectionAt,
  processLearningBoxResult,
  type LearningBoxCard,
  type LearningBoxDeck,
  type LearningBoxDirection,
  type LearningBoxFolder,
  type LearningBoxMode,
  type LearningBoxSessionDirection,
} from "../../src/domain/learning-box";
import {
  buildLearningBoxSnapshot,
  learningBoxSnapshotSchema,
  restoreLearningBoxQueue,
} from "../../src/domain/learning-box-snapshot";
import { VOCABULARY_LANGUAGES } from "../../src/domain/running-dictation";
import {
  extractTransferCode,
  parseTransferQrPayload,
  retrieveLearningBundleByCode,
  retrieveLearningBundleByQr,
} from "../../src/integrations/content-transfer/content-transfer-client";
import {
  getLiveRoomClient,
  type LiveRoomConfig,
} from "../../src/integrations/laufdiktat/live-room-client";
import type { DailyPlanItem } from "../../src/domain/daily-plan";
import { createDailyPlanRepository } from "../../src/storage/daily-plan";
import {
  PersonalLearningDatabase,
  createLearningBoxRepository,
  migrateLegacyLearningBox,
} from "../../src/storage/personal-learning-events";
import {
  PLAN_DONE_NOTICE,
  openModuleItems,
  wantsDailyPlan,
} from "../lernen/plan-today";
import { useRoundGuard } from "../ui/round-guard";
import { StudentPage } from "../ui/shell/student-page";
import { useRoundSnapshot } from "../ui/use-round-snapshot";
import { useThemeToggle } from "../ui/theme";
import { ResumeOffer } from "../views/shell/resume-offer";
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

/**
 * Karte gilt als Fehler, wenn sie schon geübt wurde und wieder in Box 1 liegt.
 * Bewusst die gespeicherte Box: Ein Fehler ist eine falsche Antwort; eine
 * Rückstufung nach Zeit („lange nicht geübt“) ist kein Fehler.
 */
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
    practice: boolean;
    nextLabel: string;
  } | null;
  stats: { correct: number; wrong: number };
  /** Übungsrunde einer Box: nichts wird verschoben oder gespeichert. */
  practice: boolean;
  roundId: string;
  startedAt: string;
  /** Schon bewertete Karte+Richtung dieser Runde: nur der erste Versuch zählt (C3-1). */
  attempted: string[];
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

/**
 * Runde der Tagesportion: Die Richtung kommt je Element aus dem Plan. Eine Karte
 * kann zweimal vorkommen (vorwärts und rückwärts); Elemente ohne Karte
 * (inzwischen gelöscht) entfallen.
 */
function buildPlanQueue(
  items: readonly DailyPlanItem[],
  cards: readonly LearningBoxCard[],
): QueueItem[] {
  const byId = new Map(cards.map((card) => [card.id, card]));
  return items.flatMap((item) => {
    const card = byId.get(item.objectIds[0] ?? "");
    return card && item.direction ? [{ card, direction: item.direction }] : [];
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
  const database = useMemo(() => new PersonalLearningDatabase(), []);
  const repository = useMemo(
    () => createLearningBoxRepository(database),
    [database],
  );
  const dailyPlan = useMemo(
    () => createDailyPlanRepository(database),
    [database],
  );
  const { theme, toggleTheme } = useThemeToggle();
  const [decks, setDecks] = useState<LearningBoxDeck[]>([]);
  const [folders, setFolders] = useState<LearningBoxFolder[]>([]);
  const [cards, setCards] = useState<LearningBoxCard[]>([]);
  /** Offene LernBox-Elemente der Tagesportion; Karte und Richtung je Element. */
  const [planItems, setPlanItems] = useState<DailyPlanItem[]>([]);
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
  /** Zwischenstand der unterbrochenen Runde (C-001): „Weitermachen“ in der Übersicht. */
  const roundSnapshot = useRoundSnapshot("lernbox", learningBoxSnapshotSchema);

  const refresh = useCallback(async () => {
    const revision = ++refreshRevision.current;
    const [nextDecks, nextFolders, nextCards, nextPlan] = await Promise.all([
      repository.listDecks(),
      repository.listFolders(),
      repository.listAllCards(),
      // Ohne Plan bleibt das freie Üben möglich; „Heute dran“ zeigt dann nichts.
      dailyPlan
        .progress(new Date().toISOString())
        .then((progress) => openModuleItems(progress, "vocabulary"))
        .catch(() => null),
    ]);
    if (revision !== refreshRevision.current) return undefined;
    setDecks(nextDecks);
    setFolders(nextFolders);
    setCards(nextCards);
    setPlanItems(nextPlan ?? []);
    setLoading(false);
    return { decks: nextDecks, plan: nextPlan ?? [] };
  }, [dailyPlan, repository]);

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
      // QR-Link der Lehrkraft: #code=<Transfercode> öffnet das Code-Fenster.
      const linkedCode = extractTransferCode(window.location.href);
      if (active && linkedCode) {
        setSheet({ kind: "code", initialCode: linkedCode });
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
        return;
      }
      if (
        active &&
        requested &&
        loaded?.decks.some((deck) => deck.id === requested)
      ) {
        setSheet({ kind: "start", scope: requested });
        return;
      }
      // ?heute=1 (Startseite „Weiterlernen“): das Start-Fenster der Portion.
      if (active && loaded && wantsDailyPlan(window.location.search)) {
        if (loaded.plan.length > 0) setSheet({ kind: "start", scope: "heute" });
        else setNotice(PLAN_DONE_NOTICE);
      }
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
  // „Heute dran“ sind die offenen Elemente der Portion, nicht alles Fällige.
  const todayQueue = buildPlanQueue(planItems, cards);
  const todayDecks = new Set(todayQueue.map((entry) => entry.card.deckId)).size;
  const mistakes = cards.filter(isMistake);

  const lbDecks: LbDeck[] = decks.map((deck) => {
    const inside = cards.filter((card) => card.deckId === deck.id);
    const boxes = [0, 0, 0, 0, 0];
    for (const card of inside) {
      const index = effectiveLearningBoxLevel(card, "forward", now) - 1;
      boxes[index] = (boxes[index] ?? 0) + 1;
    }
    return {
      id: deck.id,
      title: deck.title,
      folderId: deck.folderId ?? null,
      total: inside.length,
      ...learningBoxDeckStatus(inside, now),
      boxes,
      longUnpracticed: inside.filter((card) =>
        isLearningBoxCardLongUnpracticed(card, now),
      ).length,
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
    // Tagesportion: Karte und Richtung stehen je Element im Plan.
    let planQueue: QueueItem[] | null = null;
    const box = scope.startsWith("box:") ? Number(scope.slice(4)) : 0;
    if (box) {
      title = `Box ${box} (nur üben)`;
      // Wie das Diagramm: nach wirksamer Box.
      const startedAt = Date.now();
      pool = cards.filter(
        (card) => effectiveLearningBoxLevel(card, "forward", startedAt) === box,
      );
    } else if (scope === "heute") {
      planQueue = todayQueue;
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
    // Die Richtungswahl gilt nicht für die Portion; die Vorgabe bleibt, wie sie war.
    if (!planQueue) setDirection(choice.direction);
    setSheet(null);
    if (planQueue ? planQueue.length === 0 : pool.length === 0) {
      setNotice(
        planQueue ? PLAN_DONE_NOTICE : "Dafür ist gerade nichts fällig.",
      );
      return;
    }
    setNotice("");
    // Eine neue Runde ersetzt den Zwischenstand einer früheren.
    roundSnapshot.clear();
    setSession({
      title,
      mode: choice.mode,
      queue: planQueue ?? buildQueue(pool, choice.direction, onlyDue),
      index: 0,
      answer: "",
      revealed: false,
      feedback: null,
      stats: { correct: 0, wrong: 0 },
      practice: box > 0,
      roundId: crypto.randomUUID(),
      startedAt: new Date().toISOString(),
      attempted: [],
      finished: false,
    });
  }

  /**
   * Hält den Zwischenstand nach jeder bewerteten Antwort und jedem Weiter. Die
   * Antwort steht dann längst in der Datenbank (`assess` wartet darauf); ein
   * Ende der Runde oder nichts mehr zu tun räumt den Zwischenstand ab.
   */
  function persist(next: Session) {
    const content = buildLearningBoxSnapshot({
      title: next.title,
      mode: next.mode,
      practice: next.practice,
      queue: next.queue,
      index: next.index,
      answered: next.feedback !== null,
      stats: next.stats,
      attempted: next.attempted,
      finished: next.finished,
    });
    if (!content) return roundSnapshot.clear();
    roundSnapshot.save({
      roundId: next.roundId,
      startedAt: next.startedAt,
      done: content.done,
      total: content.queue.length,
      state: content,
    });
  }

  /** „Weitermachen“: Die Karten kommen frisch aus der Datenbank, die Stelle aus dem Zwischenstand. */
  function resumeSession() {
    const saved = roundSnapshot.snapshot;
    if (!saved) return;
    const restored = restoreLearningBoxQueue(saved.state, cards);
    if (!restored) {
      roundSnapshot.clear();
      setNotice("Diese Runde ist schon vorbei.");
      return;
    }
    setNotice("");
    setMode(saved.state.mode);
    setSession({
      title: saved.state.title,
      mode: saved.state.mode,
      queue: restored.queue,
      index: restored.index,
      answer: "",
      revealed: false,
      feedback: null,
      stats: saved.state.stats,
      practice: saved.state.practice,
      roundId: saved.roundId,
      startedAt: saved.startedAt,
      attempted: saved.state.attempted,
      finished: false,
    });
  }

  async function assess(correct: boolean, expected: string) {
    if (!session) return;
    const item = session.queue[session.index];
    if (!item) return;
    // Erster Versuch zählt: Ein weiterer Versuch derselben Karte+Richtung in
    // dieser Runde ändert weder Stand noch Ereignis noch Rundenstatistik.
    if (
      !isFirstLearningBoxAttempt(
        session.attempted,
        item.card.id,
        item.direction,
      )
    ) {
      advance(session);
      return;
    }
    const attempted = [
      ...session.attempted,
      learningBoxAttemptKey(item.card.id, item.direction),
    ];
    const answeredAt = Date.now();
    const updated = session.practice
      ? item.card
      : processLearningBoxResult(item.card, {
          correct,
          direction: item.direction,
          mode: session.mode,
          now: answeredAt,
        });
    if (!session.practice) {
      await repository.putCardAndEvent({
        card: updated,
        correct,
        direction: item.direction,
        mode: session.mode,
        roundId: session.roundId,
      });
    }
    // Eine Karte kann in der Runde zweimal vorkommen (vorwärts und rückwärts):
    // Beide Einträge bekommen den neuen Stand, sonst überschriebe die zweite
    // Antwort die erste.
    const queue = session.queue.map((entry) =>
      entry.card.id === item.card.id ? { ...entry, card: updated } : entry,
    );
    const stats = {
      correct: session.stats.correct + (correct ? 1 : 0),
      wrong: session.stats.wrong + (correct ? 0 : 1),
    };
    if (session.mode === "writing") {
      const next: Session = {
        ...session,
        queue,
        stats,
        attempted,
        feedback: {
          correct,
          expected: showAlternatives(expected),
          given: session.answer.trim(),
          boxFrom: effectiveLearningBoxLevel(
            item.card,
            item.direction,
            answeredAt,
          ),
          boxTo: effectiveLearningBoxLevel(updated, item.direction, answeredAt),
          practice: session.practice,
          nextLabel: session.practice
            ? "nur geübt"
            : nextLabel(updated, item.direction),
        },
      };
      setSession(next);
      persist(next);
    } else {
      advance({ ...session, queue, stats, attempted });
    }
  }

  function advance(current: Session) {
    const index = current.index + 1;
    const next: Session = {
      ...current,
      index,
      answer: "",
      revealed: false,
      feedback: null,
      finished: index >= current.queue.length,
    };
    setSession(next);
    persist(next);
    if (next.finished) void refresh();
  }

  function endSession() {
    setSession(null);
    void refresh();
  }

  // Logo, Leiste und Zurück-Geste fragen nach; „Beenden“ lässt den Zwischenstand stehen.
  const requestLeave = useRoundGuard({
    active: session !== null && !session.finished,
    onLeave: endSession,
  });

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
    tag: string,
  ) {
    setTransfer({ busy: true, error: "", success: null });
    try {
      const bundle = await fetchBundle();
      const title = bundle.stacks[0]?.title ?? "Von der Lehrkraft";
      const result = await repository.ingestBundle({
        bundle,
        title,
        source: { kind: "teacher", sourceId: bundle.id },
        // Tags der Pakete sind sehr lang: nur der eigene Tag oder keiner.
        tagOverride: tag,
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

  function receiveByCode(code: string, tag: string) {
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
      tag,
    );
  }

  function receiveByQr(value: string, tag: string) {
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
      tag,
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
      box: item ? effectiveLearningBoxLevel(item.card, item.direction, now) : 1,
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
      box: effectiveLearningBoxLevel(card, "forward", now),
      longUnpracticed: isLearningBoxCardLongUnpracticed(card, now),
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
        dueTotal={todayQueue.length}
        todayDecks={todayDecks}
        planScope="heute"
        resumeOffer={
          !loading && !session && roundSnapshot.snapshot ? (
            <ResumeOffer
              detail={roundSnapshot.snapshot.state.title}
              done={roundSnapshot.snapshot.done}
              total={roundSnapshot.snapshot.total}
              onResume={resumeSession}
              onDiscard={roundSnapshot.clear}
            />
          ) : undefined
        }
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
          if (session) requestLeave();
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
        onImportCards={async (deckId, { rows, skipped }) => {
          try {
            const result = await repository.importCards(deckId, rows);
            await refresh();
            const parts = [
              `${result.added} ${result.added === 1 ? "Vokabel" : "Vokabeln"} importiert`,
            ];
            if (result.duplicates)
              parts.push(`${result.duplicates} schon vorhanden`);
            if (skipped.length)
              parts.push(`Zeile ${skipped.join(", ")} übersprungen`);
            return `${parts.join(" · ")}.`;
          } catch {
            return "Das hat nicht geklappt. Bitte versuche es noch einmal.";
          }
        }}
        onTransferCode={receiveByCode}
        onTransferQr={receiveByQr}
        onReadTransferCode={extractTransferCode}
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
        onEndSession={requestLeave}
      />
    </StudentPage>
  );
}
