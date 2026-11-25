import type { MathProgressRow } from "../../../src/domain/math-progress";
import { COMPETENCE_LEVEL_LABELS } from "../diagnostik/profile-copy";
import { ButtonLink, EmptyState, Notice, Pill } from "../../ui/primitives";

/**
 * Abschnitt „Kopfrechnen“ in „Mein Fortschritt“ (MA-13): je Aufgabenfamilie,
 * was schon geht. Zählt nach oben, kein Prozent, keine Gesamtzahl, kein
 * Vergleich (Entscheidungen 57, 83).
 */
export function MathProgressView({
  status,
  rows,
  practicePath,
}: {
  status: "loading" | "ready" | "error";
  rows: readonly MathProgressRow[];
  practicePath: string;
}) {
  return (
    <section className="ui-stack" aria-labelledby="math-progress-title">
      <h2 id="math-progress-title" className="ui-h-section">
        Kopfrechnen
      </h2>
      {status === "loading" ? (
        <p className="ui-small ui-muted" role="status">
          Deine Rechenaufgaben werden geladen …
        </p>
      ) : null}
      {status === "error" ? (
        <Notice tone="bad" role="status">
          Dein Kopfrechnen ist auf diesem Gerät gerade nicht verfügbar.
        </Notice>
      ) : null}
      {status === "ready" && rows.length === 0 ? (
        <EmptyState title="Noch nichts gerechnet">
          Sobald du Kopfrechnen übst, siehst du hier, was du schon kannst.
          <div style={{ marginTop: 12 }}>
            <ButtonLink href={practicePath}>Kopfrechnen üben</ButtonLink>
          </div>
        </EmptyState>
      ) : null}
      {status === "ready" && rows.length > 0 ? (
        <ul className="ui-stack" aria-label="Kopfrechnen nach Aufgabenart">
          {rows.map((row) => (
            <li key={row.id} className="ui-between ui-wrap">
              <span>
                <strong>{row.label}</strong>
                <span
                  className="ui-small ui-muted"
                  style={{ display: "block" }}
                >
                  {[row.solved, row.days].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span className="ui-row ui-wrap">
                <Pill
                  {...(row.level === "sicher"
                    ? { tone: "good" as const }
                    : row.level === "im-aufbau"
                      ? { tone: "accent" as const }
                      : {})}
                >
                  {COMPETENCE_LEVEL_LABELS[row.level]}
                </Pill>
                <ButtonLink
                  size="sm"
                  variant="soft"
                  href={row.practiceHref}
                  aria-label={`${row.label} üben`}
                >
                  Üben
                </ButtonLink>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
