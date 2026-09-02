"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CLASS_MODULE_LABELS,
  type ClassModule,
} from "../../src/domain/class-workspace";
import type { LearningRecommendation } from "../../src/domain/learning-recommendation";
import { createLearningRecommendationRepository } from "../../src/storage/learning-recommendations";

const PERSONAL_PRACTICE_MODULES: readonly ClassModule[] = [
  "vocabulary",
  "german",
  "mathematics",
  "typing",
];

type DailyPracticePanelProps = {
  enabledModules?: readonly ClassModule[];
  maxItems?: number;
};

export function DailyPracticePanel({
  enabledModules = PERSONAL_PRACTICE_MODULES,
  maxItems,
}: DailyPracticePanelProps = {}) {
  const repository = useMemo(
    () => createLearningRecommendationRepository(),
    [],
  );
  const [practice, setPractice] = useState<LearningRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    repository
      .list({ enabledModules })
      .then((recommendations) => {
        if (!active) return;
        setPractice(recommendations);
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
  }, [enabledModules, repository]);

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
      {practice.slice(0, maxItems).map((item) => (
        <Link className="today-card" href={item.route} key={item.id}>
          <div>
            <span className="content-type">
              {CLASS_MODULE_LABELS[item.module]}
            </span>
            <span className="reason-label">
              {item.reason === "error"
                ? "Aus deinem letzten Fehler"
                : item.reason === "due"
                  ? "Heute fällig"
                  : "Dein nächster Schritt"}
            </span>
          </div>
          <h3>{item.title}</h3>
          <p>{item.detail}</p>
          <strong>
            {item.reason === "error"
              ? "Fehler jetzt üben"
              : item.reason === "due"
                ? "Jetzt wiederholen"
                : "Lernweg fortsetzen"}{" "}
            →
          </strong>
        </Link>
      ))}
    </div>
  );
}
