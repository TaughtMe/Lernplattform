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
      <p className="ui-small ui-muted" role="status">
        Fortschritt wird lokal geladen …
      </p>
    );

  if (unavailable) {
    return (
      <p className="ui-notice ui-notice--bad" role="status">
        Der lokale Lernstand ist auf diesem Gerät gerade nicht verfügbar.
      </p>
    );
  }

  return (
    <div className="ui-stack">
      <div className="ui-stats">
        <div>
          <strong>{summary.activities}</strong>
          Übungen bearbeitet
        </div>
        <div>
          <strong>{summary.activeDays}</strong>
          aktive Tage
        </div>
        <div>
          <strong>{summary.improvedObjects}</strong>
          frühere Fehler verbessert
        </div>
      </div>
      <p className="ui-small ui-muted">
        Jede Übung zählt. {summary.privateActivities} Aktivitäten bleiben rein
        persönlich; {summary.classContributions} sind als Klassenbeitrag
        gekennzeichnet. Vollständige Antworten werden nicht übertragen.
      </p>
    </div>
  );
}
