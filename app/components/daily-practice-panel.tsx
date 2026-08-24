"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CLASS_MODULE_LABELS } from "../../src/domain/class-workspace";
import {
  selectDailyPractice,
  type DailyPracticeGroup,
} from "../../src/domain/daily-practice";
import { demoClass } from "../../src/domain/demo-class";
import { TYPING_LESSONS } from "../../src/tastschreiben/curriculum";
import {
  createLearningWordProgressRepository,
  createPersonalLearningEventRepository,
  createTypingProgressRepository,
} from "../../src/storage/personal-learning-events";

const practiceCatalog = [
  {
    learningObjectId: "school-library",
    title: "School words wiederholen",
    module: "vocabulary" as const,
    route: "/klasse/7b/aufgaben/vokabeln",
    availableAt: "2026-08-12T08:00:00.000Z",
  },
];

export function DailyPracticePanel() {
  const repository = useMemo(() => createPersonalLearningEventRepository(), []);
  const learningWords = useMemo(
    () => createLearningWordProgressRepository(),
    [],
  );
  const typing = useMemo(() => createTypingProgressRepository(), []);
  const [practice, setPractice] = useState<DailyPracticeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([repository.list(), learningWords.listDue(), typing.list()])
      .then(([events, dueWords, typingProgress]) => {
        if (!active) return;
        const selected = selectDailyPractice({
          events,
          catalog: practiceCatalog,
          classId: demoClass.id,
          enabledModules: demoClass.enabledModules,
          now: new Date().toISOString(),
        });
        if (
          demoClass.enabledModules.includes("german") &&
          dueWords.length > 0
        ) {
          selected.push({
            learningObjectId: "due-learning-words",
            title: "Fällige Lernwörter festigen",
            module: "german",
            route: "/frei/german/lernwoerter",
            availableAt: new Date().toISOString(),
            reason: "due",
            amount: dueWords.length,
          });
        }
        const unfinishedTyping = TYPING_LESSONS.find((lesson) => {
          const entry = typingProgress.find((item) => item.id === lesson.id);
          return entry && entry.attempts > 0 && !entry.completed;
        });
        if (demoClass.enabledModules.includes("typing") && unfinishedTyping) {
          selected.push({
            learningObjectId: `typing:${unfinishedTyping.id}`,
            title: `${unfinishedTyping.title} weiter üben`,
            module: "typing",
            route: "/frei/typing",
            availableAt: new Date().toISOString(),
            reason: "error",
            amount: 1,
          });
        }
        setPractice(selected);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [learningWords, repository, typing]);

  if (loading) {
    return <p className="today-empty">Deine heutige Auswahl wird geladen …</p>;
  }

  if (failed) {
    return (
      <p className="today-empty today-empty--error">
        Deine Wiederholungen konnten auf diesem Gerät nicht geladen werden.
      </p>
    );
  }

  if (practice.length === 0) {
    return (
      <div className="today-empty">
        <strong>Im Moment ist nichts offen.</strong>
        <p>
          Fehlerhafte oder später fällige Inhalte erscheinen automatisch hier.
        </p>
      </div>
    );
  }

  return (
    <div className="today-grid">
      {practice.map((item) => (
        <Link
          className="today-card"
          href={item.route}
          key={item.learningObjectId}
        >
          <div>
            <span className="content-type">
              {CLASS_MODULE_LABELS[item.module]}
            </span>
            <span className="reason-label">
              {item.reason === "error"
                ? "Aus deinem letzten Fehler"
                : "Heute fällig"}
            </span>
          </div>
          <h3>{item.title}</h3>
          <p>{item.amount} Inhalt zum Wiederholen</p>
          <strong>
            {item.reason === "error"
              ? "Fehler jetzt üben"
              : "Jetzt wiederholen"}{" "}
            →
          </strong>
        </Link>
      ))}
    </div>
  );
}
