"use client";

import { useMemo, useState } from "react";
import { useSpeech } from "../../components/use-speech";
import { buildLearningWordPattern } from "../../../src/domain/learning-word";
import {
  buildMathStartPoint,
  buildSpellingStartPoint,
  isMathAnswerCorrect,
  isSpellingAnswerCorrect,
  mathSuggestion,
  spellingSuggestion,
  startPointProgress,
  type MathStartTask,
  type SpellingTask,
  type StartPointAnswer,
  type StartPointTask,
} from "../../../src/domain/start-point";
import { createStartPointRepository } from "../../../src/storage/start-point";
import { Button } from "../../ui/primitives";
import { STAGE_COPY } from "../../views/wortspeicher/stage-copy";
import {
  StartPointScreen,
  type StartPointChoice,
} from "../../views/diagnostik/start-point-screen";

const CHOICES: readonly StartPointChoice[] = [
  {
    id: "spelling",
    title: "Rechtschreibung",
    detail:
      "Du schreibst ein paar Wörter auf. Wir sagen dir, welche Wortbox gut passt.",
  },
  {
    id: "math",
    title: "Kopfrechnen",
    detail: "Du rechnest ein paar Aufgaben. Wir sagen dir, wo du gut anfängst.",
  },
];

const SAVE_ISSUE =
  "Deine Antwort konnte gerade nicht gespeichert werden. Du kannst trotzdem weitermachen.";

type SpellingRun = {
  subject: "spelling";
  roundId: string;
  /** Wort hören (Stufe 6); sonst als Lückenwort (Stufe 3). */
  listening: boolean;
  tasks: StartPointTask<SpellingTask>[];
  answers: StartPointAnswer[];
};

type MathRun = {
  subject: "math";
  roundId: string;
  tasks: StartPointTask<MathStartTask>[];
  answers: StartPointAnswer[];
};

type Repository = Pick<
  ReturnType<typeof createStartPointRepository>,
  "recordSpelling" | "recordMath"
>;

/** Das Lückenwort, vorlesbar: aus „H_nd“ wird „H, Lücke, n, d“. */
function spokenPattern(pattern: string) {
  return Array.from(pattern)
    .map((letter) => (letter === "_" ? "Lücke" : letter))
    .join(", ");
}

/**
 * Container für „Wir suchen deinen Startpunkt“: baut die Aufgabenfolge, nimmt
 * die Antworten an, speichert sie als gewöhnliche Lernereignisse und zeigt am
 * Ende den Vorschlag. `random` ist der Zufall der Rechenaufgaben.
 */
export function StartPointApp({
  repository,
  random = Math.random,
}: {
  repository?: Repository | undefined;
  random?: () => number;
}) {
  const store = useMemo(
    () => repository ?? createStartPointRepository(),
    [repository],
  );
  const speech = useSpeech("de-DE");
  const [spelling, setSpelling] = useState<SpellingRun>();
  const [math, setMath] = useState<MathRun>();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [saveIssue, setSaveIssue] = useState<string>();

  function reset() {
    setSpelling(undefined);
    setMath(undefined);
    setValue("");
    setSaveIssue(undefined);
  }

  function start(id: StartPointChoice["id"]) {
    reset();
    const roundId = `startpunkt-${id}-${crypto.randomUUID()}`;
    if (id === "math") {
      setMath({
        subject: "math",
        roundId,
        tasks: buildMathStartPoint(random),
        answers: [],
      });
      return;
    }
    // Das Vorbereiten der Stimme gehört in den Klick.
    void speech.prepare().then((readiness) =>
      setSpelling({
        subject: "spelling",
        roundId,
        listening: readiness === "ready",
        tasks: buildSpellingStartPoint(),
        answers: [],
      }),
    );
  }

  /** Speichert die Antwort; ein Fehler dabei bricht den Einstieg nicht ab. */
  async function save(write: () => Promise<unknown>) {
    setBusy(true);
    setSaveIssue(undefined);
    try {
      await write();
    } catch {
      setSaveIssue(SAVE_ISSUE);
    }
    setValue("");
    setBusy(false);
  }

  async function submitSpelling(
    run: SpellingRun,
    task: StartPointTask<SpellingTask>,
  ) {
    const { word } = task.payload;
    // Ob die Antwort stimmt, entscheidet die Domäne, nicht der Speicher.
    const correct = isSpellingAnswerCorrect(word, value);
    await save(() =>
      store.recordSpelling({
        word,
        answer: value,
        stage: run.listening ? 6 : 3,
        roundId: run.roundId,
        attemptId: task.id,
      }),
    );
    setSpelling({
      ...run,
      answers: [...run.answers, { taskId: task.id, correct }],
    });
  }

  async function submitMath(run: MathRun, task: StartPointTask<MathStartTask>) {
    const correct = isMathAnswerCorrect(task.payload.task, value);
    await save(() =>
      store.recordMath({
        task: task.payload.task,
        answer: value,
        roundId: run.roundId,
        attemptId: task.id,
      }),
    );
    setMath({
      ...run,
      answers: [...run.answers, { taskId: task.id, correct }],
    });
  }

  if (spelling) {
    const progress = startPointProgress(spelling.tasks, spelling.answers);
    if (progress.status === "finished") {
      const suggestion = spellingSuggestion(spelling.tasks, spelling.answers);
      return (
        <StartPointScreen
          phase="result"
          title={`Wortbox „${suggestion?.collectionTitle ?? ""}“`}
          detail={
            suggestion
              ? `Fang mit „${STAGE_COPY[suggestion.stage].title}“ an.`
              : ""
          }
          startHref={
            suggestion
              ? `/frei/german/lernwoerter?sammlung=${suggestion.collectionId}`
              : "/frei/german/lernwoerter"
          }
          startLabel="Wortbox öffnen"
          otherHref="/frei/german/lernwoerter"
          onRepeat={reset}
        />
      );
    }
    const { word } = progress.next.payload;
    const pattern = buildLearningWordPattern(word, 3);
    const listen = () => void speech.say(word);
    return (
      <StartPointScreen
        phase="task"
        number={progress.answered + 1}
        instruction={
          spelling.listening
            ? "Höre das Wort und schreibe es auf."
            : "Welches Wort fehlt? Schreibe das ganze Wort auf."
        }
        prompt={
          spelling.listening ? (
            <Button variant="gold" size="lg" onClick={listen}>
              Anhören
            </Button>
          ) : (
            <p className="ui-big-num" aria-label={spokenPattern(pattern)}>
              {pattern}
            </p>
          )
        }
        value={value}
        speaking={speech.speaking}
        onListen={spelling.listening ? listen : undefined}
        busy={busy}
        saveIssue={saveIssue}
        onChange={setValue}
        onSubmit={() => void submitSpelling(spelling, progress.next)}
        onStop={reset}
      />
    );
  }

  if (math) {
    const progress = startPointProgress(math.tasks, math.answers);
    if (progress.status === "finished") {
      const suggestion = mathSuggestion(math.tasks, math.answers);
      return (
        <StartPointScreen
          phase="result"
          title={suggestion?.label ?? "Kopfrechnen"}
          detail="Stelle das beim Kopfrechnen ein."
          startHref="/frei/mathematics"
          startLabel="Kopfrechnen öffnen"
          otherHref="/frei/mathematics"
          onRepeat={reset}
        />
      );
    }
    return (
      <StartPointScreen
        phase="task"
        number={progress.answered + 1}
        instruction="Rechne im Kopf und schreibe das Ergebnis auf."
        prompt={
          <p className="ui-big-num">{progress.next.payload.task.prompt}</p>
        }
        value={value}
        speaking={false}
        busy={busy}
        saveIssue={saveIssue}
        onChange={setValue}
        onSubmit={() => void submitMath(math, progress.next)}
        onStop={reset}
      />
    );
  }

  return <StartPointScreen phase="choose" choices={CHOICES} onChoose={start} />;
}
