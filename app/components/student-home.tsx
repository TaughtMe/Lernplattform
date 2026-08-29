import Link from "next/link";
import { PERSONAL_SUBJECTS } from "../../src/domain/personal-learning-space";
import type { LiveRoomConfig } from "../../src/integrations/laufdiktat/live-room-client";
import { AdaptiveProgressPanel } from "./adaptive-progress-panel";
import { DailyPracticePanel } from "./daily-practice-panel";
import { RoomCodeForm } from "./room-code-form";
import { StudentAssignments } from "./student-assignments";
import { StudentClassEnrollment } from "./student-class-enrollment";
import { StudentContentTransfer } from "./student-content-transfer";

const studentNavigation = [
  { href: "#heute", label: "Heute" },
  { href: "#material", label: "Material" },
  { href: "/frei/typing", label: "Tastschreiben" },
  { href: "#klasse", label: "Klasse" },
] as const;

export function StudentHome({
  transferConfig,
}: {
  transferConfig: LiveRoomConfig | null;
}) {
  return (
    <main className="learning-room-shell student-dashboard">
      <header className="student-dashboard__topbar">
        <Link className="brand" href="/" aria-label="Lernraum Startseite">
          <span className="brand__mark" aria-hidden="true">
            L
          </span>
          <span>Lernraum</span>
        </Link>
        <nav aria-label="Bereiche im Lernraum">
          {studentNavigation.map((item, index) => (
            <Link
              className={index === 0 ? "is-active" : undefined}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <span className="student-dashboard__local">Lernstand bleibt lokal</span>
      </header>

      <section className="student-dashboard__intro" id="heute">
        <p className="eyebrow">Dein persönlicher Lernraum</p>
        <h1>Was hilft dir heute weiter?</h1>
        <p>
          Deine heutige Auswahl verbindet fällige Wiederholungen, frühere Fehler
          und die nächsten sinnvollen Schritte.
        </p>
      </section>

      <div className="student-dashboard__focus-grid">
        <section
          className="student-dashboard__focus"
          aria-labelledby="today-title"
        >
          <header>
            <div>
              <p className="eyebrow">Tagesfokus</p>
              <h2 id="today-title">Heute üben</h2>
            </div>
            <span>Genauigkeit vor Tempo</span>
          </header>
          <DailyPracticePanel />
        </section>

        <aside className="student-dashboard__quick" aria-label="Schnellzugriff">
          <div>
            <p className="eyebrow">Unterricht</p>
            <h2>Raum beitreten</h2>
            <p>
              Öffne mit dem Code deiner Lehrkraft direkt die gemeinsame Runde.
            </p>
            <RoomCodeForm idPrefix="personal-learning-room" mode="room" />
          </div>
          <Link href="/frei/typing">
            <span>Tastschreiben</span>
            <strong>Kurze Übungsrunde starten →</strong>
          </Link>
        </aside>
      </div>

      <nav
        className="student-dashboard__section-nav"
        aria-label="Weitere Bereiche"
      >
        <a href="#material">Mein Material</a>
        <a href="#fortschritt">Mein Fortschritt</a>
        <a href="#aufgaben">Aufgaben</a>
        <a href="#klasse">Meine Klasse</a>
      </nav>

      <div className="learning-room-content student-dashboard__content">
        <section className="learning-loop-section" id="material">
          <header>
            <div>
              <p className="eyebrow">Alles an einem Ort</p>
              <h2>Mein Material</h2>
            </div>
            <p>Fächer, eigene Sammlungen und Inhalte deiner Lehrkraft</p>
          </header>

          <div className="personal-subject-grid">
            {PERSONAL_SUBJECTS.map((subject) => (
              <Link href={subject.hubRoute} key={subject.id}>
                <span
                  className="personal-subject-grid__icon"
                  aria-hidden="true"
                >
                  {subject.icon}
                </span>
                <h3>{subject.label}</h3>
                <p>{subject.description}</p>
                <strong>Fach öffnen →</strong>
              </Link>
            ))}
          </div>

          <div className="student-dashboard__transfer">
            <StudentContentTransfer transferConfig={transferConfig} />
          </div>
        </section>

        <section className="learning-loop-section" id="fortschritt">
          <header>
            <div>
              <p className="eyebrow">Deine Entwicklung</p>
              <h2>Mein Fortschritt</h2>
            </div>
            <p>Aktivität, Regelmäßigkeit und persönliche Verbesserung</p>
          </header>
          <AdaptiveProgressPanel />
        </section>

        <section className="learning-loop-section" id="aufgaben">
          <header>
            <div>
              <p className="eyebrow">Von deiner Lehrkraft</p>
              <h2>Meine Aufgaben</h2>
            </div>
            <p>Aufträge übernehmen, bearbeiten und datensparsam zurückgeben</p>
          </header>
          <StudentAssignments />
        </section>

        <section className="learning-loop-section" id="klasse">
          <header>
            <div>
              <p className="eyebrow">Gemeinsam lernen</p>
              <h2>Meine Klasse</h2>
            </div>
            <p>Klasseninhalte übernehmen und Einschreibungen verwalten</p>
          </header>
          <StudentClassEnrollment />
        </section>
      </div>

      <nav
        className="student-dashboard__mobile-nav"
        aria-label="Mobile Bereiche im Lernraum"
      >
        {studentNavigation.map((item, index) => (
          <Link
            className={index === 0 ? "is-active" : undefined}
            href={item.href}
            key={item.href}
          >
            <span aria-hidden="true" />
            {item.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
