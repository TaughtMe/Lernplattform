export type CompanionMood = "welcome" | "focus" | "celebrate" | "encourage";

function companionLevel(completed: number) {
  if (completed >= 18) return "Wortweber";
  if (completed >= 7) return "Tastenentdecker";
  if (completed >= 1) return "Erste Sprosse";
  return "Neugieriger Keim";
}

export function TypingCompanion({
  mood = "welcome",
  completed = 0,
  total = 0,
  compact = false,
}: {
  mood?: CompanionMood;
  completed?: number;
  total?: number;
  compact?: boolean;
}) {
  const level = companionLevel(completed);
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const message =
    mood === "celebrate"
      ? "Das war ein sicherer Schritt!"
      : mood === "encourage"
        ? "Fehler zeigen uns den nächsten Übungsweg."
        : mood === "focus"
          ? "Ich passe auf deinen ruhigen Rhythmus auf."
          : completed > 0
            ? "Schön, dass du wieder da bist."
            : "Wir entdecken die Tastatur gemeinsam.";

  return (
    <aside
      className={`typing-companion mood-${mood}${compact ? " is-compact" : ""}`}
      aria-label={`Ramo, dein Lernbegleiter. Entwicklungsstufe: ${level}.`}
    >
      <svg viewBox="0 0 180 160" aria-hidden="true">
        <ellipse
          className="typing-companion__shadow"
          cx="90"
          cy="146"
          rx="52"
          ry="8"
        />
        <path
          className="typing-companion__leaf leaf-left"
          d="M69 39C45 35 36 17 38 7c18 1 34 14 38 31Z"
        />
        <path
          className="typing-companion__leaf leaf-right"
          d="M106 38c5-20 20-31 37-30 2 13-8 28-31 34Z"
        />
        <path
          className="typing-companion__body"
          d="M45 91c0-35 19-60 45-60s45 25 45 60c0 36-18 55-45 55S45 127 45 91Z"
        />
        <path
          className="typing-companion__belly"
          d="M61 101c7-12 17-18 29-18s23 6 30 18c-4 25-14 37-30 37s-26-12-29-37Z"
        />
        <circle className="typing-companion__eye" cx="75" cy="72" r="5" />
        <circle className="typing-companion__eye" cx="106" cy="72" r="5" />
        <path
          className="typing-companion__mouth"
          d={
            mood === "encourage"
              ? "M82 89c5-3 12-3 17 0"
              : "M82 87c5 6 12 6 17 0"
          }
        />
        <circle className="typing-companion__cheek" cx="65" cy="86" r="6" />
        <circle className="typing-companion__cheek" cx="116" cy="86" r="6" />
        <path className="typing-companion__arm" d="M53 102c-15 1-22 8-26 17" />
        <path className="typing-companion__arm" d="M127 102c15 1 22 8 26 17" />
        <g className="typing-companion__key">
          <rect x="73" y="108" width="35" height="27" rx="7" />
          <text x="90.5" y="126" textAnchor="middle">
            F J
          </text>
        </g>
      </svg>
      {!compact ? (
        <div className="typing-companion__copy">
          <span>Dein Lernbegleiter</span>
          <strong>Ramo · {level}</strong>
          <p>{message}</p>
          <div
            className="typing-companion__progress"
            role="progressbar"
            aria-label="Entwicklung von Ramo"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <small>
            {completed} von {total} Lernschritten gemeistert
          </small>
        </div>
      ) : (
        <span className="typing-companion__bubble">{message}</span>
      )}
    </aside>
  );
}
