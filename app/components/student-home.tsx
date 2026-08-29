import Link from "next/link";
import { DailyPracticePanel } from "./daily-practice-panel";
import { RoomCodeForm } from "./room-code-form";
import { StudentDashboardShell } from "./student-dashboard-shell";

export function StudentHome() {
  return (
    <StudentDashboardShell activePath="/lernen">
      <section className="student-dashboard__intro">
        <p className="eyebrow">Deine Runde für heute</p>
        <h1>Meine Startseite</h1>
        <p>Eine passende Aufgabe. Ein klarer nächster Schritt.</p>
      </section>

      <div className="student-dashboard__focus-grid">
        <section
          className="student-dashboard__focus"
          aria-labelledby="today-title"
        >
          <header>
            <div>
              <p className="eyebrow">Tagesaufgabe</p>
              <h2 id="today-title">Heute üben</h2>
            </div>
            <Link href="/lernen/fortschritt">Fortschritt ansehen</Link>
          </header>
          <DailyPracticePanel maxItems={1} />
        </section>

        <aside className="student-dashboard__quick" aria-label="Schnellzugriff">
          <div>
            <p className="eyebrow">Unterricht</p>
            <h2>Raum beitreten</h2>
            <p>Gib den Code deiner Lehrkraft ein.</p>
            <RoomCodeForm idPrefix="personal-learning-room" mode="room" />
          </div>
          <Link href="/lernen/aufgaben">
            <span>Von deiner Lehrkraft</span>
            <strong>Meine Aufgaben →</strong>
          </Link>
        </aside>
      </div>
    </StudentDashboardShell>
  );
}
