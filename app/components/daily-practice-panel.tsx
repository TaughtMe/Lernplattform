"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CLASS_MODULE_LABELS } from "../../src/domain/class-workspace";
import {
  selectDailyPractice,
  type DailyPracticeGroup,
} from "../../src/domain/daily-practice";
import { demoClass } from "../../src/domain/demo-class";
import { createPersonalLearningEventRepository } from "../../src/storage/personal-learning-events";

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
  const [practice, setPractice] = useState<DailyPracticeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    repository
      .list()
      .then((events) => {
        if (!active) return;
        setPractice(
          selectDailyPractice({
            events,
            catalog: practiceCatalog,
            classId: demoClass.id,
            enabledModules: demoClass.enabledModules,
            now: new Date().toISOString(),
          }),
        );
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
  }, [repository]);

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
