import type { ClassModule } from "../domain/class-workspace";
import type { LearningEventV1 } from "../domain/learning-bundle";
import {
  prioritizeLearningRecommendations,
  type LearningRecommendationCandidate,
} from "../domain/learning-recommendation";
import { deriveLeitnerProgress } from "../domain/leitner-schedule";
import { isLearningBoxCardDue } from "../domain/learning-box";
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

function eventCandidates(
  events: readonly LearningEventV1[],
  now: string,
): LearningRecommendationCandidate[] {
  const latest = latestEvents(events);
  const candidates: LearningRecommendationCandidate[] = [];

  for (const learningModule of ["vocabulary", "mathematics"] as const) {
    const moduleEvents = latest.filter(
      (event) => eventModule(event) === learningModule,
    );
    const errors = moduleEvents.filter(isIncorrect);
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
    const due = moduleEvents.filter((event) => {
      const related = events.filter(
        (candidate) => candidate.learningObjectId === event.learningObjectId,
      );
      const availableAt = related
        .map((candidate) => candidate.occurredAt)
        .sort()[0];
      if (!availableAt) return false;
      const progress = deriveLeitnerProgress({
        events: related,
        learningObjectId: event.learningObjectId,
        direction: event.direction,
        availableAt,
      });
      return progress.knowledge.dueAt <= now || progress.writing.dueAt <= now;
    });
    if (due.length > 0) {
      const first = due[0]!;
      candidates.push({
        id: "vocabulary-events-due",
        module: "vocabulary",
        title: first.practice?.title ?? "Fällige Vokabeln wiederholen",
        detail: "Der passende Wiederholungsabstand ist erreicht.",
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
    }) => {
      const now = input.now ?? new Date().toISOString();
      const nowMs = new Date(now).getTime();
      const [events, cards, learningWords, typingProgress] = await Promise.all([
        database.learningEvents.toArray(),
        database.learningBoxCards.toArray(),
        database.learningWordProgress.toArray(),
        database.typingProgress.toArray(),
      ]);
      const candidates = eventCandidates(events, now);

      const dueCards = cards.filter(
        (card) =>
          isLearningBoxCardDue(card, "forward", nowMs) ||
          isLearningBoxCardDue(card, "reverse", nowMs),
      );
      if (dueCards.length > 0) {
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
              : "Fällige Vokabeln wiederholen",
          detail:
            errorCards.length > 0
              ? "Diese Karten waren zuletzt noch nicht sicher."
              : "Der passende Wiederholungsabstand ist erreicht.",
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

      const dueWords = learningWords.filter((word) => word.dueAt <= now);
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
              : "Fällige Lernwörter wiederholen",
          detail:
            errorWords.length > 0
              ? "Die passenden Merkstufen helfen beim nächsten sicheren Abruf."
              : "Die Wörter sind nach ihrem persönlichen Abstand wieder fällig.",
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
      if (nextTyping) {
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
