import type { ReactNode } from "react";
import { StudentPage } from "../ui/shell/student-page";
import { ButtonLink, Card, Pill } from "../ui/primitives";
import { RoomCodeEntry } from "../ui/room-code-entry";

/**
 * Klassenansicht für Schüler: Die Klasse ergänzt den persönlichen
 * Lernraum um Inhalte und gemeinsame Unterrichtsrunden.
 */
export function ClassOverview({
  teacherName,
  className,
  intro,
  modules,
}: {
  teacherName: string;
  className: string;
  intro: ReactNode;
  modules?: readonly string[] | undefined;
}) {
  return (
    <StudentPage activePath="/lernen/klasse">
      <div className="ui-page">
        <div className="ui-stack" style={{ ["--gap" as string]: "6px" }}>
          <p className="ui-eyebrow">Meine Klasse · {teacherName}</p>
          <h1 className="ui-h-page">{className}</h1>
          <p className="ui-small ui-muted">{intro}</p>
          <ButtonLink href="/lernen" className="ui-class__cta">
            Im persönlichen Lernraum üben
          </ButtonLink>
        </div>
        <div className="ui-cols">
          {modules?.length ? (
            <Card
              look="pop"
              className="ui-stack"
              aria-labelledby="class-content-title"
            >
              <p className="ui-eyebrow">Bereitgestellte Bereiche</p>
              <h2 id="class-content-title" className="ui-h-section">
                Inhalte aus dieser Klasse
              </h2>
              <p className="ui-small ui-muted">
                Übernommene Stapel und Listen erscheinen bei deinen Fächern und
                unter „Meine Inhalte“ mit sichtbarer Herkunft.
              </p>
              <div
                className="ui-row ui-wrap"
                aria-label="Fachbereiche der Klasse"
              >
                {modules.map((module) => (
                  <Pill key={module}>{module}</Pill>
                ))}
              </div>
            </Card>
          ) : null}
          <Card
            look="pop"
            className="ui-stack"
            aria-labelledby="class-room-title"
          >
            <p className="ui-eyebrow">Gemeinsame Runde</p>
            <h2 id="class-room-title" className="ui-h-section">
              Unterrichtsraum beitreten
            </h2>
            <p className="ui-small ui-muted">
              Gib den Code deiner Lehrkraft ein oder scanne den QR-Code. Die
              Ergebnisse fließen danach in deinen persönlichen Lernstand.
            </p>
            <RoomCodeEntry />
          </Card>
        </div>
      </div>
    </StudentPage>
  );
}
