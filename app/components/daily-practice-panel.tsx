"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CLASS_MODULE_LABELS,
  type ClassModule,
} from "../../src/domain/class-workspace";
import type { LearningRecommendation } from "../../src/domain/learning-recommendation";
import { createLearningRecommendationRepository } from "../../src/storage/learning-recommendations";
import { Icon } from "../ui/icons";
import { EmptyState, Pill } from "../ui/primitives";

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
    return (
      <p className="ui-small ui-muted" role="status">
        Deine heutige Auswahl wird geladen …
      </p>
    );
  }

  if (failed) {
    return (
      <p className="ui-notice ui-notice--bad" role="status">
        Deine Wiederholungen konnten auf diesem Gerät nicht geladen werden.
      </p>
    );
  }

  if (practice.length === 0) {
    return (
      <EmptyState title="Im Moment ist nichts offen.">
        Fehlerhafte oder später fällige Inhalte erscheinen automatisch hier.
      </EmptyState>
    );
  }

  return (
    <div className="ui-grid-auto" style={{ ["--min" as string]: "240px" }}>
      {practice.slice(0, maxItems).map((item) => (
        <Link
          className="ui-card ui-card--pop ui-card--pad ui-stack ui-today-card"
          href={item.route}
          key={item.id}
        >
          <span
            className="ui-row ui-wrap"
            style={{ ["--gap" as string]: "6px" }}
          >
            <Pill>{CLASS_MODULE_LABELS[item.module]}</Pill>
            <Pill tone={item.reason === "error" ? "bad" : "accent"}>
              {item.reason === "error"
                ? "Aus deinem letzten Fehler"
                : item.reason === "due"
                  ? "Heute fällig"
                  : "Dein nächster Schritt"}
            </Pill>
          </span>
          <h3 className="ui-h-section">{item.title}</h3>
          <p className="ui-small ui-muted">{item.detail}</p>
          <strong className="ui-row ui-today-card__cta">
            {item.reason === "error"
              ? "Fehler jetzt üben"
              : item.reason === "due"
                ? "Jetzt wiederholen"
                : "Lernweg fortsetzen"}
            <Icon name="arrow" size={16} />
          </strong>
        </Link>
      ))}
    </div>
  );
}
