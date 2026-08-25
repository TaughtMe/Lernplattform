import Link from "next/link";
import { PERSONAL_SUBJECTS } from "../../src/domain/personal-learning-space";
import { AdaptiveProgressPanel } from "./adaptive-progress-panel";
import { DailyPracticePanel } from "./daily-practice-panel";
import { RoomCodeForm } from "./room-code-form";
import { StudentClassEnrollment } from "./student-class-enrollment";

export function StudentHome() {
  return (
    <main className="learning-room-shell personal-learning-room">
      <header className="learning-room-topbar">
        <Link className="brand" href="/" aria-label="Lernraum Startseite">
          <span className="brand__mark" aria-hidden="true">
            L
          </span>
          <span>Lernraum</span>
        </Link>
        <strong>Mein Lernraum</strong>
        <span>Lernstand bleibt lokal</span>
      </header>

      <section className="learning-room-hero">
        <div>
          <p className="eyebrow">Dein persönlicher Lernraum</p>
          <h1>Was hilft dir heute weiter?</h1>
          <p>
            Fällige Wiederholungen, eigene Inhalte und Lernstoff aus deinen
            Klassen greifen auf denselben persönlichen Lernstand zu.
          </p>
        </div>
        <aside aria-label="Lernoptionen">
          <span>Vor der Lernrunde</span>
          <Link className="all-due-link" href="#heute">
            Alles Fällige üben →
          </Link>
          <small>oder unten ein einzelnes Fach auswählen</small>
        </aside>
      </section>

      <nav
        className="learning-room-nav personal-learning-room__nav"
        aria-label="Bereiche im Lernraum"
      >
        <a href="#heute">Heute üben</a>
        <a href="#faecher">Fächer</a>
        <a href="#inhalte">Meine Inhalte</a>
        <a href="#fortschritt">Mein Fortschritt</a>
        <a href="#klasse">Meine Klasse</a>
      </nav>

      <div className="learning-room-content">
        <section
          className="learning-loop-section learning-loop-section--today"
          id="heute"
        >
          <header>
            <div>
              <p className="eyebrow">Alles Fällige</p>
              <h2>Heute üben</h2>
            </div>
            <p>Fälliges, frühere Fehler und passende nächste Schritte</p>
          </header>
          <DailyPracticePanel />
          <div className="learning-loop-explanation">
            <span aria-hidden="true">↻</span>
            <p>
              Eine gemeinsame Tagesauswahl bündelt Inhalte in ruhigen
              Fachblöcken. Fehler helfen dabei, den nächsten Schritt passend zu
              wählen.
            </p>
          </div>
        </section>

        <section className="learning-loop-section" id="faecher">
          <header>
            <div>
              <p className="eyebrow">Ein Fach auswählen</p>
              <h2>Fächer</h2>
            </div>
            <p>In jedem Fach findest du fällige Inhalte und freies Üben</p>
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
        </section>

        <section className="learning-loop-section" id="inhalte">
          <header>
            <div>
              <p className="eyebrow">Mit sichtbarer Herkunft</p>
              <h2>Meine Inhalte</h2>
            </div>
            <p>Eigene und übernommene Sammlungen an einem Ort</p>
          </header>
          <div className="personal-content-list">
            {PERSONAL_SUBJECTS.map((subject) => (
              <Link href={subject.hubRoute} key={subject.id}>
                <span>
                  <strong>{subject.contentLabel}</strong>
                  <small>
                    Eigene Inhalte und Lehrkraftinhalte gemeinsam ansehen
                  </small>
                </span>
                <span aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
          <p className="personal-content-note">
            Die Quelle eines Inhalts bleibt sichtbar. Aktualisierungen erzeugen
            keine zweite Sammlung und setzen deinen Lernstand nicht zurück.
          </p>
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

        <section className="learning-loop-section" id="klasse">
          <header>
            <div>
              <p className="eyebrow">Organisatorischer Kontext</p>
              <h2>Meine Klasse</h2>
            </div>
            <p>
              Inhalte übernehmen und gemeinsamen Unterrichtsräumen beitreten
            </p>
          </header>
          <StudentClassEnrollment />
          <section
            className="join-class join-class--panel"
            aria-label="Unterrichtsraum öffnen"
          >
            <div>
              <span>
                <strong>Unterrichtsraum öffnen</strong>
                <small>Vierstelligen Raumcode eingeben oder scannen.</small>
              </span>
            </div>
            <RoomCodeForm idPrefix="personal-learning-room" mode="room" />
          </section>
        </section>
      </div>
    </main>
  );
}
