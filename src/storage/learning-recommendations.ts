import { mathFamilyKey, mathReviews } from "../domain/math-practice";
import { learningEventV1Schema } from "../domain/learning-bundle";
import { readTolerant } from "../domain/tolerant-read";
import {
  learningWordProgressSchema,
  typingProgressSchema,
} from "./progress-schema";
import type { ClassModule } from "../domain/class-workspace";
import type { LearningEventV1 } from "../domain/learning-bundle";
import {
  prioritizeLearningRecommendations,
  type LearningRecommendationCandidate,
} from "../domain/learning-recommendation";
import { isLearningWordDue } from "../domain/learning-word-progress";
import { deriveLeitnerProgress } from "../domain/leitner-schedule";
import { isLearningBoxCardScheduledDue } from "../domain/learning-box";
import {
  TYPING_LESSONS,
  isTypingLessonUnlocked,
} from "../tastschreiben/curriculum";
import { PersonalLearningDatabase } from "./personal-learning-events";

function eventModule(event: LearningEventV1): ClassModule | undefined {
  if (event.learningArea) return event.learningArea;
  if (event.learningObjectId.startsWith("math:")) return "mathematics";
  if (event.learningObjectId.startsWith("typing:")) return "typing";
  if (event.learningObjectId.startsWith("learning-word:")) return "german";
  if (event.source === "learning-box") return "vocabulary";
  return undefined;
}

function isIncorrect(event: LearningEventV1) {
  return (
    event.assessment.knowledge === "incorrect" ||
    event.assessment.writing === "incorrect"
  );
}

function latestEvents(events: readonly LearningEventV1[]) {
  const latest = new Map<string, LearningEventV1>();
  for (const event of events) {
    const current = latest.get(event.learningObjectId);
    if (!current || current.occurredAt < event.occurredAt) {
      latest.set(event.learningObjectId, event);
    }
  }
  return [...latest.values()];
}

/**
 * Letzte Ereignisse je Lernobjekt eines Moduls, ohne Mathe-Versuche (sie laufen
 * über `mathReviews`) und ohne Antworten zu vorhandenen LernBox-Karten (sie
 * zählen über die Karten).
 */
function latestModuleEvents(
  events: readonly LearningEventV1[],
  cardIds: ReadonlySet<string>,
  learningModule: ClassModule,
) {
  return latestEvents(
    events.filter(
      (event) =>
        !event.math &&
        !(
          event.source === "learning-box" && cardIds.has(event.learningObjectId)
        ),
    ),
  ).filter((event) => eventModule(event) === learningModule);
}

/**
 * Unsichere Ereignis-Aufgaben eines Moduls: Das jeweils letzte Ereignis eines
 * Lernobjekts war falsch. Gemeinsame Quelle für Empfehlungen und Tagesportion.
 */
export function unresolvedEventErrors(
  events: readonly LearningEventV1[],
  cardIds: ReadonlySet<string>,
  learningModule: ClassModule,
): LearningEventV1[] {
  return latestModuleEvents(events, cardIds, learningModule).filter(
    isIncorrect,
  );
}

/**
 * Fällige Vokabeln aus Ereignissen ohne LernBox-Karte: Das letzte Ereignis war
 * nicht falsch, und der Leitner-Abstand ist erreicht (`dueAt` ist der frühere
 * Termin aus Wissen und Schreiben). Gemeinsame Quelle für Empfehlungen und
 * Tagesportion.
 */
export function dueEventVocabulary(
  events: readonly LearningEventV1[],
  now: string,
  cardIds: ReadonlySet<string>,
): Array<{ event: LearningEventV1; dueAt: string }> {
  const related = new Map<string, LearningEventV1[]>();
  for (const event of events) {
    const list = related.get(event.learningObjectId);
    if (list) list.push(event);
    else related.set(event.learningObjectId, [event]);
  }
  return latestModuleEvents(events, cardIds, "vocabulary")
    .filter((event) => !isIncorrect(event))
    .flatMap((event) => {
      const history = related.get(event.learningObjectId)!;
      const availableAt = history
        .map((candidate) => candidate.occurredAt)
        .sort()[0]!;
      const progress = deriveLeitnerProgress({
        events: history,
        learningObjectId: event.learningObjectId,
        direction: event.direction,
        availableAt,
      });
      const dueAt =
        progress.knowledge.dueAt <= progress.writing.dueAt
          ? progress.knowledge.dueAt
          : progress.writing.dueAt;
      return dueAt <= now ? [{ event, dueAt }] : [];
    });
}

function eventCandidates(
  events: readonly LearningEventV1[],
  now: string,
  cardIds: ReadonlySet<string> = new Set(),
): LearningRecommendationCandidate[] {
  const candidates: LearningRecommendationCandidate[] = [];

  for (const learningModule of ["vocabulary", "mathematics"] as const) {
    const errors = unresolvedEventErrors(events, cardIds, learningModule);
    if (errors.length > 0) {
      const newest = [...errors].sort((left, right) =>
        right.occurredAt.localeCompare(left.occurredAt),
      )[0]!;
      candidates.push({
        id: `${learningModule}-errors`,
        module: learningModule,
        title:
          newest.practice?.title ??
          (learningModule === "mathematics"
            ? "Fehlerfamilien im Kopfrechnen festigen"
            : "Unsichere Vokabeln wiederholen"),
        detail:
          learningModule === "mathematics"
            ? "Neue Aufgaben aus den Rechenfamilien deiner letzten Fehler."
            : "Ein früherer Fehler wird mit einem neuen Abruf gefestigt.",
        route:
          newest.practice?.route ??
          (learningModule === "mathematics" ? "/frei/mathematics" : "/lernbox"),
        reason: "error",
        amount: errors.length,
        occurredAt: newest.occurredAt,
      });
      continue;
    }

    if (learningModule !== "vocabulary") continue;
    const due = dueEventVocabulary(events, now, cardIds);
    if (due.length > 0) {
      const first = due[0]!.event;
      candidates.push({
        id: "vocabulary-events-due",
        module: "vocabulary",
        title: first.practice?.title ?? "Vokabeln für heute üben",
        detail: "Diese Karten sind heute wieder dran.",
        route: first.practice?.route ?? "/lernbox",
        reason: "due",
        amount: due.length,
        dueAt: now,
      });
    }
  }
  return candidates;
}

export function createLearningRecommendationRepository(
  database = new PersonalLearningDatabase(),
) {
  return {
    list: async (input: {
      enabledModules: readonly ClassModule[];
      now?: string;
      limit?: number;
      /**
       * Wurde auf dem Gerät schon eine Hardwaretastatur benutzt? Ohne sie
       * schlägt die Tastenwelt keinen ersten Schritt vor (Befund C-003); wer
       * dort schon geübt hat, bekommt den Lernweg weiter. Ohne Angabe gilt
       * „ja“, die Oberfläche übergibt den echten Wert.
       */
      hardwareKeyboard?: boolean;
    }) => {
      const now = input.now ?? new Date().toISOString();
      const nowMs = new Date(now).getTime();
      const [events, cards, storedWords, storedTyping] = await Promise.all([
        database.learningEvents.toArray(),
        database.learningBoxCards.toArray(),
        database.learningWordProgress.toArray(),
        database.typingProgress.toArray(),
      ]);
      // Tolerant gelesen (Regel S-1): ein unlesbares Ereignis sperrt nicht alle.
      const checkedEvents = readTolerant(
        learningEventV1Schema,
        events,
        "learningEvents",
      ).items;
      const learningWords = readTolerant(
        learningWordProgressSchema,
        storedWords,
        "learningWordProgress",
      ).items;
      const typingProgress = readTolerant(
        typingProgressSchema,
        storedTyping,
        "typingProgress",
      ).items;
      const candidates = eventCandidates(
        checkedEvents,
        now,
        new Set(cards.map((card) => card.id)),
      );
      const mathDue = mathReviews(checkedEvents).filter(
        (review) => review.dueAt <= now,
      );
      if (mathDue.length)
        candidates.push({
          id: "math-reviews",
          module: "mathematics",
          title: "Mathe weiter üben",
          detail:
            "Deine Fehler und Wiederholungen mit passenden Aufgaben üben.",
          route: "/frei/mathematics",
          reason: mathDue.some((review) => review.errors > 0 && review.step < 2)
            ? "error"
            : "due",
          amount: new Set(mathDue.map(mathFamilyKey)).size,
          dueAt: mathDue[0]!.dueAt,
        });

      // Fällig ist nur, was schon einmal geübt wurde; neue Karten sind ein
      // nächster Schritt, kein Rückstand.
      const dueCards = cards.filter((card) =>
        isLearningBoxCardScheduledDue(card, nowMs),
      );
      const newCards = cards.filter((card) => card.interval === 0);
      if (dueCards.length === 0 && newCards.length > 0) {
        candidates.push({
          id: "learning-box-new",
          module: "vocabulary",
          title: "Neue Vokabeln beginnen",
          detail: "Ein paar neue Karten aus deinen Stapeln.",
          route: "/lernbox",
          reason: "next-step",
          amount: newCards.length,
        });
      }
      if (dueCards.length > 0) {
        // Gespeicherte Box 1: ein falsch beantworteter Abruf, keine Zeitrückstufung
        // („lange nicht geübt“ belegt kein Vergessen).
        const errorCards = dueCards.filter(
          (card) =>
            card.lastReviewed > card.createdAt &&
            (card.box === 1 || card.reverseBox === 1),
        );
        candidates.push({
          id: "learning-box-due",
          module: "vocabulary",
          title:
            errorCards.length > 0
              ? "Unsichere Vokabeln erneut abrufen"
              : "Vokabeln für heute üben",
          detail:
            errorCards.length > 0
              ? "Diese Karten waren zuletzt noch nicht sicher."
              : "Diese Karten sind heute wieder dran.",
          route: "/lernbox",
          reason: errorCards.length > 0 ? "error" : "due",
          amount: errorCards.length || dueCards.length,
          dueAt: new Date(
            Math.min(
              ...dueCards.flatMap((card) => [
                card.nextReview,
                card.reverseNextReview,
              ]),
            ),
          ).toISOString(),
        });
      }

      // Archivwörter (Box 6) sind nie regulär fällig (Regel A-2).
      const dueWords = learningWords.filter((word) =>
        isLearningWordDue(word, now),
      );
      if (dueWords.length > 0) {
        const errorWords = dueWords.filter(
          (word) => word.box === 1 && word.incorrectAttempts > 0,
        );
        candidates.push({
          id: "learning-words-due",
          module: "german",
          title:
            errorWords.length > 0
              ? "Unsichere Lernwörter festigen"
              : "Lernwörter für heute üben",
          detail:
            errorWords.length > 0
              ? "Übe sie noch einmal, dann sitzen sie."
              : "Diese Wörter sind heute wieder dran.",
          route: "/frei/german/lernwoerter",
          reason: errorWords.length > 0 ? "error" : "due",
          amount: errorWords.length || dueWords.length,
          dueAt: [...dueWords].sort((left, right) =>
            left.dueAt.localeCompare(right.dueAt),
          )[0]!.dueAt,
        });
      }

      const completedTyping = new Set(
        typingProgress.filter((item) => item.completed).map((item) => item.id),
      );
      const unfinishedTyping = TYPING_LESSONS.find((lesson) => {
        const progress = typingProgress.find((item) => item.id === lesson.id);
        return progress && progress.attempts > 0 && !progress.completed;
      });
      const nextTyping =
        unfinishedTyping ??
        TYPING_LESSONS.find(
          (lesson) =>
            !completedTyping.has(lesson.id) &&
            isTypingLessonUnlocked(lesson.id, completedTyping),
        );
      const typingStarted = typingProgress.some((item) => item.attempts > 0);
      if (nextTyping && ((input.hardwareKeyboard ?? true) || typingStarted)) {
        const progress = typingProgress.find(
          (item) => item.id === nextTyping.id,
        );
        candidates.push({
          id: `typing-${nextTyping.id}`,
          module: "typing",
          title:
            progress && !progress.completed
              ? `${nextTyping.title} weiter festigen`
              : `${nextTyping.title} beginnen`,
          detail:
            progress && !progress.completed
              ? `Die letzte Runde lag bei ${progress.bestAccuracy}% Genauigkeit.`
              : "Das ist der nächste passende Schritt in deinem Tipp-Lernweg.",
          route: "/frei/typing",
          reason: progress && !progress.completed ? "error" : "next-step",
          amount: 1,
          ...(progress?.lastPracticedAt
            ? { occurredAt: progress.lastPracticedAt }
            : {}),
        });
      }

      return prioritizeLearningRecommendations({
        candidates,
        enabledModules: input.enabledModules,
        now,
        ...(input.limit === undefined ? {} : { limit: input.limit }),
      });
    },
  };
}
