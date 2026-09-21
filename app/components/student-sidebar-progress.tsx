"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPersonalLearningEventRepository } from "../../src/storage/personal-learning-events";
import { TrophyIcon } from "./ui-icons";

const DAILY_TARGET = 20;

function localDayKey(value: string | Date) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function activeStreak(days: ReadonlySet<string>, now = new Date()) {
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(localDayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(localDayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function StudentSidebarProgress({
  active = false,
}: {
  active?: boolean;
}) {
  const repository = useMemo(() => createPersonalLearningEventRepository(), []);
  const [summary, setSummary] = useState({ completedToday: 0, streak: 0 });

  useEffect(() => {
    let current = true;
    void repository
      .list()
      .then((events) => {
        if (!current) return;
        const today = localDayKey(new Date());
        const days = new Set(
          events.map((event) => localDayKey(event.occurredAt)),
        );
        setSummary({
          completedToday: events.filter(
            (event) => localDayKey(event.occurredAt) === today,
          ).length,
          streak: activeStreak(days),
        });
      })
      .catch(() => {
        // The local-first app remains usable when progress storage is unavailable.
      });
    return () => {
      current = false;
    };
  }, [repository]);

  const progress = Math.min(
    100,
    Math.round((summary.completedToday / DAILY_TARGET) * 100),
  );

  return (
    <Link
      className={`student-shell__progress${active ? " is-active" : ""}`}
      href="/lernen/fortschritt"
      aria-current={active ? "page" : undefined}
      aria-label={`Fortschritt ansehen. ${summary.streak || 0} Tage Serie, ${summary.completedToday} von ${DAILY_TARGET} heute.`}
      title="Fortschritt"
    >
      <TrophyIcon aria-hidden="true" />
      <span className="student-shell__progress-copy">
        <span>
          <strong>{summary.streak || "–"}</strong> Tage Serie
        </span>
        <span className="student-shell__progress-track" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </span>
        <small>
          {summary.completedToday} von {DAILY_TARGET} heute
        </small>
      </span>
    </Link>
  );
}
