import type { Metadata } from "next";
import Link from "next/link";
import { CLASS_MODULE_LABELS } from "../../../src/domain/class-workspace";
import { demoClass } from "../../../src/domain/demo-class";
import { DailyPracticePanel } from "../../components/daily-practice-panel";

export const metadata: Metadata = { title: demoClass.name };
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
          <DailyPracticePanel />
        </section>
      </section>
    </main>
  );
}
