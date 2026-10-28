import {
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
  Pill,
} from "../../ui/primitives";
import type { ProfileGroup, ProfileRow } from "./profile-copy";

/** „neu“ bleibt ohne Farbe, damit „im Aufbau“ und „sicher“ auffallen. */
function tone(level: ProfileRow["level"]) {
  return level === "sicher"
    ? { tone: "good" as const }
    : level === "im-aufbau"
      ? { tone: "accent" as const }
      : {};
}

/**
 * „Mein Lernstand“ (D2-3): je Teilbereich neu, im Aufbau oder sicher. Keine
 * Prozentzahl, kein Vergleich mit anderen. Die Ansicht zeigt nur die Zeilen,
 * die sie bekommt.
 */
export function ProfileScreen({
  status,
  groups,
}: {
  status: "loading" | "ready" | "error";
  groups: readonly ProfileGroup[];
}) {
  return (
    <div className="ui-page">
      <PageHeader eyebrow="Deine Entwicklung" title="Mein Lernstand">
        So weit bist du in jedem Bereich. „Sicher“ heißt: Du hast es an
        mindestens zwei Tagen ohne Hilfe richtig gemacht.
      </PageHeader>

      {status === "loading" ? (
        <p className="ui-small ui-muted" role="status">
          Dein Lernstand wird geladen …
        </p>
      ) : null}
      {status === "error" ? (
        <p className="ui-notice ui-notice--bad" role="status">
          Dein Lernstand ist auf diesem Gerät gerade nicht verfügbar.
        </p>
      ) : null}
      {status === "ready" && groups.length === 0 ? (
        <EmptyState title="Hier ist noch nichts zu sehen">
          Sobald du übst, erscheint hier, wo du schon sicher bist.
        </EmptyState>
      ) : null}

      {status === "ready"
        ? groups.map((group) => (
            <Card
              key={group.id}
              className="ui-stack"
              aria-labelledby={`profil-${group.id}`}
            >
              <h2 id={`profil-${group.id}`} className="ui-h-section">
                {group.title}
              </h2>
              <ul className="ui-list">
                {group.rows.map((row) => (
                  <li key={row.id} className="ui-item">
                    <div className="ui-grow ui-stack">
                      <div className="ui-row ui-wrap">
                        <strong>{row.label}</strong>
                        <Pill {...tone(row.level)}>
                          <span className="ui-sr-only">{"Stand: "}</span>
                          {row.levelLabel}
                        </Pill>
                      </div>
                      <p className="ui-small ui-muted">{row.explanation}</p>
                    </div>
                    <ButtonLink
                      variant="soft"
                      size="sm"
                      href={row.practiceHref}
                      aria-label={`Üben ${row.label}`}
                    >
                      Üben
                    </ButtonLink>
                  </li>
                ))}
              </ul>
            </Card>
          ))
        : null}
    </div>
  );
}
