import Link from "next/link";
import { PilotConnectionNotice } from "./components/pilot-connection-notice";
import { RoomCodeForm } from "./components/room-code-form";

export default function Home() {
  const configured = Boolean(
    process.env["NEXT_PUBLIC_SUPABASE_URL"] &&
    process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
  );
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
          Lehrerbereich
        </Link>
      </header>

      <section
        className="main-entry__content"
        aria-labelledby="main-entry-title"
      >
        <div className="main-entry__intro">
          <p className="eyebrow">Laufdiktat-Pilot</p>
          <h1 id="main-entry-title">Bereit für dein Laufdiktat?</h1>
          <p>
            Gib den vierstelligen Raumcode deiner Lehrkraft ein oder scanne den
            QR-Code. Danach wählst du deinen Namen oder ein Pseudonym und
            wartest gemeinsam in der Lobby.
          </p>
        </div>

        <div className="main-entry__code">
          <RoomCodeForm idPrefix="main-join" mode="room" />
        </div>
        <PilotConnectionNotice configured={configured} />
        <p className="privacy-note">
          Keine Konten, keine dauerhafte Schülerhistorie. Live-Räume benötigen
          Internet.
        </p>
      </section>
    </main>
  );
}
