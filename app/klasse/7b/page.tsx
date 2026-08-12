import type { Metadata } from "next";
import Link from "next/link";
import { CLASS_MODULE_LABELS } from "../../../src/domain/class-workspace";
import { demoClass } from "../../../src/domain/demo-class";

export const metadata: Metadata = { title: demoClass.name };
const reasonLabels = {
  due: "Heute fällig",
  error: "Aus Fehlern",
  teacher: "Von der Lehrkraft",
} as const;
const statusLabels = {
  new: "Neu",
  "in-progress": "Begonnen",
  completed: "Erledigt",
} as const;

export default function ClassPage() {
  return (
    <main className="class-shell">
      <header className="class-topbar">
        <Link href="/lernen" className="back-link">
          ← Mein Lernraum
        </Link>
        <span className="ranking-note">Klassenfortschritt · teilbar</span>
      </header>
      <section className="class-overview">
        <div className="class-heading">
          <div>
            <p className="eyebrow">{demoClass.teacherName}</p>
            <h1>{demoClass.name}</h1>
            <p>
              Hier siehst du nur Bereiche, die für diese Klasse freigeschaltet
              sind.
            </p>
          </div>
          <div
            className="module-chips module-chips--large"
            aria-label="Aktive Klassenbereiche"
          >
            {demoClass.enabledModules.map((module) => (
              <span key={module}>{CLASS_MODULE_LABELS[module]}</span>
            ))}
          </div>
        </div>
        <section
          className="class-section"
          aria-labelledby="today-practice-title"
        >
          <div className="class-section__heading">
            <div>
              <p className="eyebrow">Deine Tagesauswahl</p>
              <h2 id="today-practice-title">Heute üben</h2>
            </div>
            <p>Fällige Inhalte und gezielte Wiederholungen</p>
          </div>
          <div className="today-grid">
            {demoClass.todayPractice.map((item) => (
              <Link className="today-card" href={item.route} key={item.id}>
                <div>
                  <span className="content-type">
                    {CLASS_MODULE_LABELS[item.module]}
                  </span>
                  <span className="reason-label">
                    {reasonLabels[item.reason]}
                  </span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.amount} Aufgaben</p>
                <strong>Jetzt üben →</strong>
              </Link>
            ))}
          </div>
        </section>
        <section className="class-section" aria-labelledby="assignments-title">
          <div className="class-section__heading">
            <div>
              <p className="eyebrow">Von deiner Lehrkraft</p>
              <h2 id="assignments-title">Aufgaben</h2>
            </div>
            <p>Alle freigeschalteten Arbeitsaufträge</p>
          </div>
          <div className="assignment-list">
            {demoClass.assignments.map((assignment) => (
              <Link
                href={assignment.route}
                key={assignment.id}
                className="assignment-row"
              >
                <span
                  className={`assignment-status assignment-status--${assignment.status}`}
                >
                  {statusLabels[assignment.status]}
                </span>
                <span className="assignment-copy">
                  <strong>{assignment.title}</strong>
                  <small>
                    {CLASS_MODULE_LABELS[assignment.module]} ·{" "}
                    {assignment.description}
                  </small>
                </span>
                <span className="assignment-due">
                  {assignment.dueLabel ?? "ohne Termin"}
                </span>
                <span aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
