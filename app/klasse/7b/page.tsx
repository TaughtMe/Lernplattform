import type { Metadata } from "next";
import Link from "next/link";
import { CLASS_MODULE_LABELS } from "../../../src/domain/class-workspace";
import { demoClass } from "../../../src/domain/demo-class";
import { AdaptiveProgressPanel } from "../../components/adaptive-progress-panel";
import { DailyPracticePanel } from "../../components/daily-practice-panel";
import { RoomCodeForm } from "../../components/room-code-form";

export const metadata: Metadata = { title: demoClass.name };

const freePaths = [
  {
    module: "vocabulary",
    label: "Vokabeln",
    detail: "Fällige Wörter und eigene Stapel langfristig sichern",
    route: "/lernbox",
  },
  {
    module: "german",
    label: "Deutsch",
    detail: "Rechtschreibung, Merkfähigkeit und Lernwörter trainieren",
    route: "/frei/german/lernwoerter",
  },
  {
    module: "mathematics",
    label: "Kopfrechnen",
    detail: "Grundrechenarten und passende Aufgabenfamilien festigen",
    route: "/frei/mathematics",
  },
  {
    module: "typing",
    label: "Tastschreiben",
    detail: "Sicher und genau tippen – Geschwindigkeit kommt später",
    route: "/frei/typing",
  },
] as const;

export default function ClassPage() {
  const enabledPaths = freePaths.filter((path) =>
    demoClass.enabledModules.includes(path.module),
  );

  return (
    <main className="learning-room-shell">
      <header className="learning-room-topbar">
        <Link href="/lernen" className="back-link">
          ← Meine Klassen
        </Link>
        <strong>{demoClass.name}</strong>
        <span>Lernstand bleibt lokal</span>
      </header>

      <section className="learning-room-hero">
        <div>
          <p className="eyebrow">Dein Lernraum · {demoClass.teacherName}</p>
          <h1>Was hilft dir heute weiter?</h1>
          <p>
            Lernraum verbindet das, was du schon geübt hast, mit sinnvollen
            Wiederholungen. Du kannst Empfehlungen öffnen oder selbst
            entscheiden.
          </p>
        </div>
        <aside aria-label="Aktive Lernbereiche">
          <span>In dieser Klasse</span>
          <div className="module-chips">
            {demoClass.enabledModules.map((module) => (
              <span key={module}>{CLASS_MODULE_LABELS[module]}</span>
            ))}
          </div>
        </aside>
      </section>

      <nav className="learning-room-nav" aria-label="Bereiche im Lernraum">
        <a href="#heute">Heute üben</a>
        <a href="#frei">Frei üben</a>
        <a href="#fortschritt">Mein Fortschritt</a>
      </nav>

      <div className="learning-room-content">
        <section
          className="learning-loop-section learning-loop-section--today"
          id="heute"
        >
          <header>
            <div>
              <p className="eyebrow">Aus deinen Lernsignalen</p>
              <h2>Heute üben</h2>
            </div>
            <p>Fälliges, frühere Fehler und sinnvolle nächste Schritte</p>
          </header>
          <DailyPracticePanel />
          <div className="learning-loop-explanation">
            <span aria-hidden="true">↻</span>
            <p>
              Fehler werden nicht bestraft. Sie helfen Lernraum dabei, dir eine
              passendere nächste Übung anzubieten.
            </p>
          </div>
        </section>

        <section className="learning-loop-section" id="frei">
          <header>
            <div>
              <p className="eyebrow">Du entscheidest</p>
              <h2>Frei üben</h2>
            </div>
            <p>Grundfähigkeiten festigen – jede bearbeitete Übung zählt</p>
          </header>
          <div className="learning-path-grid">
            {enabledPaths.map((path) => (
              <Link href={path.route} key={path.module}>
                <span>{path.label}</span>
                <p>{path.detail}</p>
                <strong>Üben →</strong>
              </Link>
            ))}
          </div>
          <section
            className="running-room-entry running-room-entry--inside"
            aria-labelledby="class-room-title"
          >
            <div>
              <p className="eyebrow">Gemeinsame Runde</p>
              <h3 id="class-room-title">Zum Laufdiktat</h3>
              <p>
                Gib den vierstelligen Raumcode ein. Das Laufdiktat öffnet sich
                getrennt von deinen freien Deutschübungen.
              </p>
            </div>
            <RoomCodeForm idPrefix="class-running-room" />
          </section>
        </section>

        <section className="learning-loop-section" id="fortschritt">
          <header>
            <div>
              <p className="eyebrow">Nicht nur Punkte</p>
              <h2>Mein Fortschritt</h2>
            </div>
            <p>Aktivität, Regelmäßigkeit und persönliche Verbesserung</p>
          </header>
          <AdaptiveProgressPanel />
        </section>
      </div>
    </main>
  );
}
