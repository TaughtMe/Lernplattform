import { checkMentalMathAnswer } from "../domain/mental-math";
import {
  learningEventV1Schema,
  type LearningEventV1,
} from "../domain/learning-bundle";
import {
  mathReviews,
  optionsForMathTask,
  type MathOptions,
  type MathPracticeTask,
} from "../domain/math-practice";
import {
  createPersonalLearningEventRepository,
  PersonalLearningDatabase,
} from "./personal-learning-events";
import { learningEventIdentity } from "./learning-event-identity";

export async function createMathAttempt(input: {
  task: MathPracticeTask;
  options?: MathOptions;
  answer: string;
  roundId: string;
  attemptId: string;
  selfCorrected: boolean;
  usedHelp: boolean;
  source?: "lesson" | "running-dictation";
  now?: string;
}): Promise<LearningEventV1> {
  const { practiceKey, ...task } = input.task;
  const options = input.options ?? optionsForMathTask(task);
  const id = await learningEventIdentity(
    "math-attempt",
    input.roundId,
    input.attemptId,
  );
  const learningObjectId =
    practiceKey ??
    (await learningEventIdentity("math", task.source, task.gap ?? "normal"));
  return learningEventV1Schema.parse({
    id,
    learningObjectId,
    occurredAt: input.now ?? new Date().toISOString(),
    source: input.source ?? "lesson",
    learningArea: "mathematics",
    roundId: input.roundId,
    direction: "prompt-to-answer",
    answerMode: "typed",
    help: input.usedHelp ? "solution" : "none",
    math: { task, options, answer: input.answer },
    practice: { title: "Mathe weiter üben", route: "/frei/mathematics" },
    assessment: {
      knowledge: checkMentalMathAnswer(task, input.answer)
        ? "correct"
        : "incorrect",
      writing: "not-assessed",
      selfCorrected: input.selfCorrected,
    },
  });
}

export function createMathPracticeRepository(
  database = new PersonalLearningDatabase(),
) {
  const events = createPersonalLearningEventRepository(database);
  return {
    put: events.put,
    list: events.list,
    reviews: async () => mathReviews(await events.list()),
  };
}
