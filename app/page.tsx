import Link from "next/link";
import { RoomCodeForm } from "./components/room-code-form";

export default function Home() {
  return (
    <main className="main-entry">
      <header className="main-entry__header">
        <Link className="brand" href="/" aria-label="Lernraum Startseite">
          <span className="brand__mark" aria-hidden="true">
            L
          </span>
          <span>Lernraum</span>
        </Link>
        <Link className="teacher-link" href="/lehrer">
          Lehrer-Login
        </Link>
      </header>

      <section
        className="main-entry__content"
        aria-labelledby="main-entry-title"
      >
        <div className="main-entry__intro">
          <p className="eyebrow">Dein Lernraum</p>
          <h1 id="main-entry-title">Wie möchtest du heute lernen?</h1>
          <p>
            Öffne deinen Lernraum. Er verbindet Hinweise deiner Lehrkraft mit
            dem, was dir beim Üben als Nächstes hilft.
          </p>
        </div>

        <div className="main-entry__actions">
          <Link className="main-action main-action--class" href="/lernen">
            <span className="main-action__label">Deine Klassen</span>
            <strong>Mein Lernraum</strong>
            <small>Empfehlungen, Lehrerimpulse und Fortschritt verbinden</small>
          </Link>
          <Link className="main-action main-action--free" href="/frei">
            <span className="main-action__label">Selbst auswählen</span>
            <strong>Freies Üben</strong>
            <small>Grundfähigkeiten selbstständig und sinnvoll festigen</small>
          </Link>
        </div>

        <div className="main-entry__code">
          <RoomCodeForm />
        </div>
        <p className="privacy-note">
          Persönliche Lernstände bleiben auf diesem Gerät.
        </p>
      </section>
    </main>
  );
}
