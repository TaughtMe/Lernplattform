"use client";

import { useEffect, useMemo, useState } from "react";
import {
  summarizePersonalLearning,
  type PersonalLearningSummary,
} from "../../src/domain/adaptive-learning";
import { createPersonalLearningEventRepository } from "../../src/storage/personal-learning-events";

const emptySummary: PersonalLearningSummary = {
  activities: 0,
  activeDays: 0,
  improvedObjects: 0,
  classContributions: 0,
  privateActivities: 0,
};

export function AdaptiveProgressPanel() {
  const repository = useMemo(() => createPersonalLearningEventRepository(), []);
  const [summary, setSummary] = useState(emptySummary);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    repository
      .list()
      .then((events) => {
        if (active) setSummary(summarizePersonalLearning(events));
      })
      .catch(() => {
        if (active) setUnavailable(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [repository]);

  if (loading)
    return (
      <p className="learning-loop-loading">Fortschritt wird lokal geladen …</p>
    );

  if (unavailable) {
    return (
      <p className="learning-loop-loading" role="status">
        Der lokale Lernstand ist auf diesem Gerät gerade nicht verfügbar.
      </p>
    );
  }

  return (
    <div className="learning-loop-progress">
      <div className="learning-loop-metrics">
        <article>
          <strong>{summary.activities}</strong>
          <span>Übungen bearbeitet</span>
        </article>
        <article>
          <strong>{summary.activeDays}</strong>
          <span>aktive Tage</span>
        </article>
        <article>
          <strong>{summary.improvedObjects}</strong>
          <span>frühere Fehler verbessert</span>
        </article>
      </div>
      <p>
        Jede Übung zählt. {summary.privateActivities} Aktivitäten bleiben rein
        persönlich; {summary.classContributions} sind als Klassenbeitrag
        gekennzeichnet. Vollständige Antworten werden nicht übertragen.
      </p>
    </div>
  );
}
