"use client";

import { ACHIEVEMENTS } from "../../../src/tastschreiben/achievements.ts";
import { MEDAL_ICONS, MEDAL_LABELS, type MedalTier } from "../../../src/tastschreiben/medals.ts";

interface AchievementsPanelProps {
  unlocked: Set<string>;
  medal: MedalTier;
  totalPoints: number;
}

export function AchievementsPanel({ unlocked, medal, totalPoints }: AchievementsPanelProps) {
  return (
    <div className="achievements-panel">
      <div className="achievements-panel__summary">
        <div className="achievements-panel__medal">
          <span className="achievements-panel__medal-icon" aria-hidden="true">
            {MEDAL_ICONS[medal]}
          </span>
          <span>{MEDAL_LABELS[medal]}</span>
        </div>
        <div className="achievements-panel__points">
          <strong>{totalPoints}</strong>
          <span>Punkte</span>
        </div>
      </div>
      <ul className="achievements-panel__grid">
        {ACHIEVEMENTS.map((a) => {
          const isUnlocked = unlocked.has(a.id);
          return (
            <li
              key={a.id}
              className={`achievements-panel__badge${isUnlocked ? " achievements-panel__badge--unlocked" : ""}`}
              title={a.description}
            >
              <span className="achievements-panel__badge-icon" aria-hidden="true">
                {a.icon}
              </span>
              <span className="achievements-panel__badge-title">{a.title}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
