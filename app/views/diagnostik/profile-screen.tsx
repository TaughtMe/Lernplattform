"use client";

import { useState } from "react";
import {
  Button,
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
  Pill,
} from "../../ui/primitives";
import type { ProfileGroup, ProfileRow } from "./profile-copy";
import styles from "./profile-screen.module.css";

/** „neu“ bleibt ohne Farbe, damit „im Aufbau“ und „sicher“ auffallen. */
function tone(level: ProfileRow["level"]) {
  return level === "sicher"
    ? { tone: "good" as const }
    : level === "im-aufbau"
      ? { tone: "accent" as const }
      : {};
}

/**
 * „Meinen Stand zeigen“ (L25-7): Das Kind zeigt der Lehrkraft am eigenen
 * Gerät, wie weit es ist. Nur Bereiche und Stand, groß und ruhig; keine
 * Erklärungen mit Zahlen, keine Fehlerwörter, keine Knöpfe zum Üben. Es wird
 * nichts übermittelt.
 */
function ShowView({
  groups,
  onClose,
}: {
  groups: readonly ProfileGroup[];
  onClose: () => void;
}) {
  return (
    <div className={`ui-page ${styles.show}`}>
      <div className={styles.showHead}>
        <h1 className={styles.showTitle}>Mein Stand</h1>
        <Button variant="soft" onClick={onClose}>
          Zurück
        </Button>
      </div>
      {groups.map((group) => (
        <section
          key={group.id}
          className={styles.showGroup}
          aria-labelledby={`zeigen-${group.id}`}
        >
          <h2 id={`zeigen-${group.id}`} className={styles.showGroupTitle}>
            {group.title}
          </h2>
          <ul className={styles.showList}>
            {group.rows.map((row) => (
              <li key={row.id} className={styles.showRow}>
                <span>{row.label}</span>
                <Pill {...tone(row.level)} className={styles.showLevel}>
                  <span className="ui-sr-only">{"Stand: "}</span>
                  {row.levelLabel}
                </Pill>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/**
 * „Mein Stand“ (D2-3): je Teilbereich neu, im Aufbau oder sicher. Keine
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
  const [showing, setShowing] = useState(false);
  if (showing && status === "ready" && groups.length > 0) {
    return <ShowView groups={groups} onClose={() => setShowing(false)} />;
  }
  return (
    <div className="ui-page">
      <PageHeader eyebrow="Deine Entwicklung" title="Mein Stand">
        So weit bist du in jedem Bereich. „Sicher“ heißt: Du hast es an
        mindestens zwei Tagen ohne Hilfe richtig gemacht.
      </PageHeader>
      {status === "ready" && groups.length > 0 ? (
        <div>
          <Button variant="soft" onClick={() => setShowing(true)}>
            Meinen Stand zeigen
          </Button>
        </div>
      ) : null}

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
