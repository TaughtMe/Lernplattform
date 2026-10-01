"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  TYPING_LESSONS,
  isTypingLessonUnlocked,
  type LessonDef,
} from "../../../src/tastschreiben/curriculum";
import {
  aggregateProblemChars,
  buildTypingStations,
  stationStates,
} from "../../../src/tastschreiben/stations";
import { generateTypingPracticeText } from "../../../src/tastschreiben/text-generator";
import type { TypingLessonProgress } from "../../../src/tastschreiben/typing-progress";
import {
  createTypingSession,
  enterTypingCharacter,
  expectedTypingCharacter,
  type TypingSessionState,
} from "../../../src/tastschreiben/typing-session";
import {
  computeTypingStats,
  type TypingStats,
} from "../../../src/tastschreiben/typing-stats";
import { createTypingProgressRepository } from "../../../src/storage/personal-learning-events";
import { useThemeToggle } from "../../ui/theme";
import { useLearnerProfile } from "../../ui/use-learner-profile";
import {
  MapScreen,
  type MapArea,
  type MapLesson,
} from "../../views/tastenwelt/map-screen";
import {
  PracticeScreen,
  type PracticeTile,
} from "../../views/tastenwelt/practice-screen";
import {
  coachSay,
  keyCodeOf,
  keyTarget,
  lessonKeys,
  medalFor,
  shortLessonTitle,
  starsFor,
} from "./typing-coach";

type Round = {
  lesson: LessonDef;
  stationIndex: number;
  roundId: string;
  session: TypingSessionState;
  combo: number;
  best: number;
  wrong: string | null;
  shake: number;
  stats: TypingStats | null;
};

function newRound(lesson: LessonDef, stationIndex: number): Round {
  const roundId = crypto.randomUUID();
  return {
    lesson,
    stationIndex,
    roundId,
    session: createTypingSession(generateTypingPracticeText(lesson, roundId)),
    combo: 0,
    best: 0,
    wrong: null,
    shake: 0,
    stats: null,
  };
}

/** Tastenwelt (Design 6c Lernweg, 6a/6b Übung) mit Fehler-Stopp. */
export function TypingWorld() {
  const repository = useMemo(() => createTypingProgressRepository(), []);
  const [progress, setProgress] = useState<
    Record<string, TypingLessonProgress>
  >({});
  const [round, setRound] = useState<Round | null>(null);
  const [now, setNow] = useState(0);
  const profile = useLearnerProfile();
  const { theme, toggleTheme } = useThemeToggle();

  const refresh = useCallback(() => {
    void repository
      .list()
      .then((entries) =>
        setProgress(
          Object.fromEntries(entries.map((entry) => [entry.id, entry])),
        ),
      );
  }, [repository]);
  useEffect(() => refresh(), [refresh]);

  const completed = useMemo(
    () =>
      new Set(
        Object.values(progress)
          .filter((entry) => entry.completed)
          .map((entry) => entry.id),
      ),
    [progress],
  );
  const stations = useMemo(() => buildTypingStations(), []);
  const states = stationStates(stations, completed);
  const unsure = aggregateProblemChars(Object.values(progress)).filter((item) =>
    item.char.trim(),
  );

  // Anschläge pro Minute laufend aktualisieren.
  const running = round && round.session.startedAt !== null && !round.stats;
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(performance.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  // Jede abgeschlossene Runde genau einmal speichern.
  const recorded = useRef<string | null>(null);
  useEffect(() => {
    if (!round?.stats || recorded.current === round.roundId) return;
    recorded.current = round.roundId;
    void repository
      .recordAttempt(round.lesson.id, round.stats, round.roundId)
      .then(refresh);
  }, [refresh, repository, round]);

  function start(lesson: LessonDef, stationIndex: number) {
    setRound(newRound(lesson, stationIndex));
  }

  function type(char: string) {
    setRound((current) => {
      if (!current || current.stats) return current;
      const wanted = expectedTypingCharacter(current.session);
      const session = enterTypingCharacter(
        current.session,
        char,
        performance.now(),
        {
          strict: true,
        },
      );
      const right = char === wanted;
      const combo = right ? current.combo + 1 : 0;
      const next: Round = {
        ...current,
        session,
        combo,
        best: Math.max(current.best, combo),
        wrong: right ? null : char,
        shake: right ? current.shake : current.shake + 1,
      };
      if (session.finishedAt !== null) {
        const stats = computeTypingStats(
          session.keystrokes,
          session.startedAt ?? session.finishedAt,
          session.finishedAt,
          session.corrections,
        );
        return { ...next, stats };
      }
      return next;
    });
  }

  if (!round) {
    const current = states.findIndex((entry) => entry.state === "current");
    const heatMax = unsure[0]?.errors ?? 1;
    const heat: Record<string, number> = {};
    for (const item of unsure) {
      const code = keyCodeOf(item.char);
      if (code)
        heat[code] = Math.max(1, Math.ceil((item.errors / heatMax) * 3));
    }
    const extra: LessonDef | null = unsure.length
      ? {
          id: "tasten-extra",
          title: "Tasten-Extra",
          description: "Die Tasten, die zuletzt am häufigsten danebengingen.",
          kind: "drill",
          newKeys: unsure.map((item) => item.char),
          practiceKeys: [...unsure.map((item) => item.char), " "],
        }
      : null;
    // Alle Lektionen der Reihe nach; die erste offene ist die aktuelle.
    const flat = stations.flatMap((station, stationIndex) =>
      station.lessons.map((lesson) => ({ lesson, stationIndex })),
    );
    const currentEntry = flat.find(
      ({ lesson }) =>
        !completed.has(lesson.id) &&
        isTypingLessonUnlocked(lesson.id, completed),
    );
    const currentLesson = currentEntry?.lesson;
    const areas: MapArea[] = stations.map((station) => ({
      title: station.title,
      lessons: station.lessons.map((lesson): MapLesson => {
        const best = progress[lesson.id]?.bestAccuracy;
        const done = completed.has(lesson.id);
        return {
          title: shortLessonTitle(lesson.title),
          keys: lessonKeys(lesson),
          state: done
            ? "done"
            : lesson === currentLesson
              ? "current"
              : isTypingLessonUnlocked(lesson.id, completed)
                ? "open"
                : "locked",
          medal: done ? medalFor(best ?? 0) : null,
        };
      }),
    }));
    return (
      <MapScreen
        animal={profile?.animal ?? null}
        theme={theme}
        onToggleTheme={toggleTheme}
        areas={areas}
        today={{
          done: TYPING_LESSONS.filter((lesson) => completed.has(lesson.id))
            .length,
          total: TYPING_LESSONS.length,
          nextLabel: currentEntry
            ? `Weiter mit Lektion ${flat.indexOf(currentEntry) + 1}`
            : null,
        }}
        unsure={{ keys: unsure.slice(0, 4).map((item) => item.char), heat }}
        onLesson={(index) => {
          const entry = flat[index];
          if (entry && isTypingLessonUnlocked(entry.lesson.id, completed))
            start(entry.lesson, entry.stationIndex);
        }}
        onContinue={() =>
          currentEntry && start(currentEntry.lesson, currentEntry.stationIndex)
        }
        {...(extra
          ? { onExtra: () => start(extra, Math.max(0, current)) }
          : {})}
      />
    );
  }

  const { session, lesson } = round;
  const stationLessons = states[round.stationIndex]?.station.lessons ?? [
    lesson,
  ];
  const lessonIndex = Math.max(
    0,
    stationLessons.findIndex((item) => item.id === lesson.id),
  );
  const wanted = expectedTypingCharacter(session);
  const target = keyTarget(wanted);
  const tiles: PracticeTile[] = Array.from(session.target).map(
    (char, index) => {
      const typed = session.typed[index];
      return {
        char,
        state: typed
          ? typed.corrected
            ? "corrected"
            : typed.correct
              ? "right"
              : "bad"
          : index === session.position
            ? "current"
            : "todo",
      };
    },
  );
  const correct = session.keystrokes.filter((stroke) => stroke.correct).length;
  const accuracy = session.keystrokes.length
    ? Math.round((correct / session.keystrokes.length) * 100)
    : 100;
  const elapsed =
    session.startedAt !== null
      ? (session.finishedAt ?? now) - session.startedAt
      : 0;
  const perMinute =
    elapsed > 1500 ? Math.round(correct / (elapsed / 60_000)) : null;
  const nextLesson = stationLessons[lessonIndex + 1] ?? null;
  const stats = round.stats;

  return (
    <PracticeScreen
      animal={profile?.animal ?? null}
      theme={theme}
      onToggleTheme={toggleTheme}
      stationNumber={round.stationIndex + 1}
      lessonTitle={lesson.title}
      lessonIndex={lessonIndex + 1}
      lessonCount={stationLessons.length}
      tiles={tiles}
      position={session.position}
      shake={round.shake}
      combo={round.combo}
      bestCombo={round.best}
      accuracy={Math.round(stats?.accuracy ?? accuracy)}
      perMinute={perMinute}
      say={coachSay({
        done: Boolean(stats),
        accuracy: stats?.accuracy ?? accuracy,
        wrong: round.wrong,
        wanted,
        position: session.position,
        combo: round.combo,
      })}
      hint={target.hint}
      keyboard={{
        targets: target.codes,
        wrong: round.wrong ? keyCodeOf(round.wrong) : null,
        fingers: target.fingers,
      }}
      started={session.startedAt !== null}
      result={
        stats
          ? {
              stars: starsFor(stats.accuracy),
              text: `${Math.round(stats.accuracy)} % genau · ${Math.round(stats.cpm)} Anschläge pro Minute · beste Serie ${round.best}`,
              weakKeys: stats.problemChars.slice(0, 4).map((item) => item.char),
              nextLabel:
                stats.accuracy >= 90 && nextLesson
                  ? `Weiter zu Übung ${lessonIndex + 2}`
                  : null,
            }
          : null
      }
      onChar={type}
      onBack={() => setRound(null)}
      onRetry={() => start(lesson, round.stationIndex)}
      onNext={() => nextLesson && start(nextLesson, round.stationIndex)}
    />
  );
}
