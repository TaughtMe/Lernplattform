import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  findPersonalSubject,
  PERSONAL_SUBJECTS,
} from "../../../../src/domain/personal-learning-space";
import { DailyPracticePanel } from "../../../components/daily-practice-panel";

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
    <main className="subject-space-shell">
      <header className="learning-room-topbar">
        <Link href="/lernen#faecher" className="back-link">
          ← Alle Fächer
        </Link>
        <strong>Mein Lernraum</strong>
        <span>Lernstand bleibt lokal</span>
      </header>

      <section className="subject-space">
        <div className="subject-space__heading">
          <span className="subject-space__icon" aria-hidden="true">
            {subject.icon}
          </span>
          <div>
            <p className="eyebrow">Fach in deinem Lernraum</p>
            <h1>{subject.label}</h1>
            <p>{subject.description}</p>
          </div>
        </div>

        <div className="subject-space__actions">
          <article className="subject-action subject-action--due">
            <span className="entry-card__label">In diesem Fach</span>
            <h2>Heute üben</h2>
            <p>
              Fällige Inhalte und frühere Fehler aus {subject.label} werden hier
              als eigener Fachblock ausgewählt.
            </p>
            <DailyPracticePanel enabledModules={[subject.id]} />
          </article>

          <article className="subject-action subject-action--recommended">
            <span className="entry-card__label">Selbst auswählen</span>
            <h2>Freies Üben</h2>
            <p>
              Wähle Inhalt und Übungsart selbst. Die Ergebnisse fließen in
              denselben persönlichen Lernstand wie fällige Wiederholungen.
            </p>
            <Link
              className="button button--primary"
              href={subject.practiceRoute}
            >
              {subject.practiceLabel}
            </Link>
          </article>

          <article className="subject-action">
            <span className="entry-card__label">Sammlungen</span>
            <h2>{subject.contentLabel}</h2>
            <p>
              Eigene und von einer Lehrkraft übernommene Inhalte bleiben nach
              ihrer Herkunft unterscheidbar, nutzen aber denselben Lernstand.
            </p>
            <Link className="button button--quiet" href={subject.practiceRoute}>
              {subject.contentLabel} öffnen
            </Link>
          </article>
        </div>
      </section>
    </main>
  );
}
