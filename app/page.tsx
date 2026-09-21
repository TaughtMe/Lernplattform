import Link from "next/link";
import { LandingLearnerAction } from "./components/landing-learner-action";
import { PilotConnectionNotice } from "./components/pilot-connection-notice";
import { RoomCodeForm } from "./components/room-code-form";
import { isPilotGateEnabled } from "../src/pilot-mode";

export default function Home() {
  const previewEnabled = !isPilotGateEnabled();
  const configured = Boolean(
    process.env["NEXT_PUBLIC_SUPABASE_URL"] &&
    process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
  );
  return (
    <main className="main-entry landing-page">
      <header className="main-entry__header">
        <Link className="brand" href="/" aria-label="Lernraum Startseite">
          <span className="brand__mark" aria-hidden="true">
            L
          </span>
          <span>Lernraum</span>
        </Link>
        <nav className="landing-page__nav" aria-label="Schnellnavigation">
          <Link
            className="teacher-link"
            href="/lehrer"
            aria-label="Lehrerbereich"
          >
            <span className="teacher-link__full">Lehrerbereich</span>
            <span className="teacher-link__short">Lehrer</span>
          </Link>
        </nav>
      </header>

      <section className="landing-launch" aria-labelledby="landing-title">
        <h1 id="landing-title" className="sr-only">
          Lernraum starten
        </h1>
        <div className="landing-launch__profile">
          {previewEnabled ? <LandingLearnerAction variant="entry" /> : null}
        </div>
        <div className="landing-launch__join" id="raumcode">
          <div className="landing-entry__heading">
            <h2 id="room-title">Bereit für dein Laufdiktat?</h2>
            <p>Raumcode eingeben oder QR-Code scannen.</p>
          </div>
          <div className="landing-entry__form">
            <RoomCodeForm idPrefix="main-join" mode="room" />
            <PilotConnectionNotice configured={configured} />
          </div>
        </div>
        {previewEnabled ? (
          <nav className="landing-launch__secondary" aria-label="Direkt lernen">
            <Link href="/lernen/material">Frei üben</Link>
          </nav>
        ) : null}
      </section>
    </main>
  );
}
