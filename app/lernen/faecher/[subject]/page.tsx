import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  findPersonalSubject,
  PERSONAL_SUBJECTS,
} from "../../../../src/domain/personal-learning-space";
import { DailyPracticePanel } from "../../../components/daily-practice-panel";
import { StudentPage } from "../../../ui/shell/student-page";
import { SubjectIcon } from "../../../components/subject-icon";
import { ButtonLink, Card, PageHeader } from "../../../ui/primitives";

type SubjectPageProps = {
  params: Promise<{ subject: string }>;
};

export function generateStaticParams() {
  return PERSONAL_SUBJECTS.map((subject) => ({
    subject: subject.hubRoute.split("/").at(-1)!,
  }));
}

export async function generateMetadata({
  params,
}: SubjectPageProps): Promise<Metadata> {
  const subject = findPersonalSubject((await params).subject);
  return { title: subject ? `${subject.label} · Mein Lernraum` : "Fach" };
}

export default async function SubjectPage({ params }: SubjectPageProps) {
  const subject = findPersonalSubject((await params).subject);
  if (!subject) notFound();

  return (
    <StudentPage activePath={subject.hubRoute}>
      <div className="ui-page">
        <div className="ui-row">
          <span className="ui-icon-tile" aria-hidden="true">
            <SubjectIcon subject={subject.id} />
          </span>
          <PageHeader eyebrow="Fach in deinem Lernraum" title={subject.label}>
            {subject.description}
          </PageHeader>
        </div>

        <Card
          look="pop"
          className="ui-stack"
          aria-labelledby="subject-due-title"
        >
          <p className="ui-eyebrow">In diesem Fach</p>
          <h2 id="subject-due-title" className="ui-h-section">
            Heute üben
          </h2>
          <p className="ui-small ui-muted">
            Fällige Inhalte und frühere Fehler aus {subject.label} werden hier
            als eigener Fachblock ausgewählt.
          </p>
          <DailyPracticePanel enabledModules={[subject.id]} />
        </Card>

        <div className="ui-cols">
          <Card
            look="pop"
            className="ui-stack"
            aria-labelledby="subject-free-title"
          >
            <p className="ui-eyebrow">Selbst auswählen</p>
            <h2 id="subject-free-title" className="ui-h-section">
              Freies Üben
            </h2>
            <p className="ui-small ui-muted">
              Wähle Inhalt und Übungsart selbst. Die Ergebnisse fließen in
              denselben persönlichen Lernstand wie fällige Wiederholungen.
            </p>
            <ButtonLink href={subject.practiceRoute}>
              {subject.practiceLabel}
            </ButtonLink>
          </Card>
          <Card
            look="soft"
            className="ui-stack"
            aria-labelledby="subject-content-title"
          >
            <p className="ui-eyebrow">Sammlungen</p>
            <h2 id="subject-content-title" className="ui-h-section">
              {subject.contentLabel}
            </h2>
            <p className="ui-small ui-muted">
              Eigene und von einer Lehrkraft übernommene Inhalte bleiben nach
              ihrer Herkunft unterscheidbar, nutzen aber denselben Lernstand.
            </p>
            <ButtonLink variant="ghost" href={subject.practiceRoute}>
              {subject.contentLabel} öffnen
            </ButtonLink>
          </Card>
        </div>
      </div>
    </StudentPage>
  );
}
