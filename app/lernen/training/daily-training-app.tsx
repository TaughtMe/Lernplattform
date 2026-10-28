"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  DailyPlanKind,
  DailyPlanModule,
} from "../../../src/domain/daily-plan";
import {
  planTraining,
  trainingMinutesLabel,
  trainingSegments,
  trainingStatus,
  type TrainingMinutes,
} from "../../../src/domain/daily-training";
import {
  createDailyTrainingRepository,
  type DailyTrainingSource,
} from "../../../src/storage/daily-training";
import { useActiveTime } from "../../ui/use-active-time";
import {
  TrainingScreen,
  type TrainingSegmentView,
} from "../../views/diagnostik/training-screen";

const MODULE_TITLES: Record<DailyPlanModule, string> = {
  vocabulary: "Vokabeln",
  german: "Rechtschreibung",
  mathematics: "Kopfrechnen",
};

const KIND_LABELS: Record<DailyPlanKind, string> = {
  error: "Nochmal üben",
  review: "Wiederholen",
  new: "Neu",
  archive: "Bonus",
};

type Load = () => Promise<DailyTrainingSource>;

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

function approx(ms: number) {
  return `etwa ${plural(trainingMinutesLabel(ms), "Minute", "Minuten")}`;
}

/**
 * Container für „Dein Training“: lädt Portion und Profil, plant für die
 * gewählte Dauer und misst die aktive Zeit auf dieser Seite. Die Aufgaben
 * selbst öffnen die vorhandenen Module (`?heute=1`); eine durchgehende Uhr über
 * die Module hinweg ist noch nicht verdrahtet. `now` ist die Uhr der Messung.
 */
export function DailyTrainingApp({
  load,
  now,
}: {
  load?: Load | undefined;
  now?: (() => number) | undefined;
}) {
  const loadSource = useMemo<Load>(
    () => load ?? (() => createDailyTrainingRepository().load()),
    [load],
  );
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error" }
    | { status: "ready"; source: DailyTrainingSource }
  >({ status: "loading" });
  const [minutes, setMinutes] = useState<TrainingMinutes>(10);
  const [started, setStarted] = useState(false);
  const clock = useActiveTime({ running: started, ...(now ? { now } : {}) });

  useEffect(() => {
    let active = true;
    loadSource()
      .then((source) => {
        if (active) setState({ status: "ready", source });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [loadSource]);

  const plan = useMemo(
    () =>
      state.status === "ready"
        ? planTraining({
            items: state.source.openItems,
            minutes,
            profile: state.source.profile,
          })
        : undefined,
    [state, minutes],
  );

  const segments: TrainingSegmentView[] = useMemo(
    () =>
      trainingSegments(plan?.steps ?? []).map((segment, index) => ({
        id: `${index}:${segment.href}`,
        title: MODULE_TITLES[segment.module],
        count: plural(segment.steps.length, "Aufgabe", "Aufgaben"),
        duration: approx(segment.seconds * 1000),
        areas: [
          ...new Set(
            segment.steps.flatMap((step) =>
              step.area ? [step.area.label] : [],
            ),
          ),
        ],
        kinds: [
          ...new Set(segment.steps.map((step) => KIND_LABELS[step.item.kind])),
        ],
        href: segment.href,
      })),
    [plan],
  );

  const budgetMs = plan?.budgetMs ?? minutes * 60_000;
  const ending = trainingStatus({
    budgetMs,
    activeMs: clock.activeMs,
    // Eine laufende Aufgabe kennt diese Seite nicht: Sie öffnet die Module.
    taskRunning: false,
    stepsLeft: plan?.steps.length ?? 0,
  });
  const phase =
    ending === "running" && clock.status !== "running" ? "paused" : ending;

  const emptyKind =
    state.status === "ready" && segments.length === 0
      ? state.source.total > 0
        ? "done"
        : "nothing"
      : undefined;
  const summary =
    plan && plan.steps.length > 0
      ? `Das sind ${plural(plan.steps.length, "Aufgabe", "Aufgaben")}, ${approx(plan.estimatedMs)}.`
      : undefined;

  return (
    <TrainingScreen
      status={state.status}
      minutes={minutes}
      onMinutes={(next) => {
        setMinutes(next);
        setStarted(false);
        clock.restart();
      }}
      summary={summary}
      segments={segments}
      emptyKind={emptyKind}
      clock={{
        started,
        activeMs: Math.min(clock.activeMs, budgetMs),
        budgetMs,
        phase,
        onStart: () => {
          clock.restart();
          setStarted(true);
        },
      }}
    />
  );
}
