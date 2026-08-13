import Link from "next/link";
import { CLASS_MODULE_LABELS } from "../../src/domain/class-workspace";
import { demoClass } from "../../src/domain/demo-class";
import { RoomCodeForm } from "./room-code-form";

export function StudentHome() {
  return (
    <main className="student-shell">
      <header className="student-topbar">
        <Link className="brand" href="/" aria-label="Lernraum Startseite">
          <span className="brand__mark" aria-hidden="true">
            L
          </span>
          <span>Lernraum</span>
        </Link>
        <Link className="student-profile" href="/">
          Startseite
        </Link>
      </header>

      <section className="student-start" aria-labelledby="student-start-title">
        <div className="student-welcome">
          <p className="eyebrow">Mein Lernraum</p>
          <h1 id="student-start-title">Meine Klassen</h1>
          <p>
            Jede Klasse verbindet deine persönlichen Lernsignale mit den
            freigeschalteten Übungsbereichen. Deine vollständigen Ergebnisse
            bleiben auf diesem Gerät.
          </p>
        </div>

        <div className="class-list">
          <Link className="entry-card entry-card--class" href="/klasse/7b">
            <span className="entry-card__label">Aktive Klasse</span>
            <h2>{demoClass.name}</h2>
            <p>
              {demoClass.teacherName} · Schuljahr {demoClass.schoolYear}
            </p>
            <div className="module-chips" aria-label="Aktive Bereiche">
              {demoClass.enabledModules.map((module) => (
                <span key={module}>{CLASS_MODULE_LABELS[module]}</span>
              ))}
            </div>
            <strong>Lernraum öffnen →</strong>
          </Link>
        </div>

        <section className="join-class join-class--panel">
          <div>
            <span>
              <strong>Weitere Klasse oder Raum öffnen</strong>
              <small>Gib den Code deiner Lehrkraft ein.</small>
            </span>
          </div>
          <RoomCodeForm idPrefix="student-class" mode="auto" />
        </section>
      </section>
    </main>
  );
}
