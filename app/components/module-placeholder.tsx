import { ButtonLink, Card } from "../ui/primitives";
import { StudentDashboardShell } from "./student-dashboard-shell";

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  status: string;
  activePath: string;
};

/** Platzhalter für Bereiche, die im Freigaberegister noch nicht frei sind. */
export function ModulePlaceholder({
  eyebrow,
  title,
  description,
  status,
  activePath,
}: Props) {
  return (
    <StudentDashboardShell activePath={activePath}>
      <div className="ui-page">
        <div className="ui-stack" style={{ ["--gap" as string]: "4px" }}>
          <p className="ui-eyebrow">{eyebrow}</p>
          <h1 className="ui-h-page">{title}</h1>
        </div>
        <p className="ui-muted">{description}</p>
        <Card look="pop" className="ui-stack">
          <h2 className="ui-h-section">{status}</h2>
          <p className="ui-small ui-muted">
            Der Einstieg steht bereits. Die fachliche Logik wird über den
            gemeinsamen Lernraum-Kern angebunden, sobald sie stabil ist.
          </p>
        </Card>
        <ButtonLink href="/" variant="ghost">
          Zurück zur Startseite
        </ButtonLink>
      </div>
    </StudentDashboardShell>
  );
}
