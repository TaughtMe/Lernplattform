import Link from "next/link";
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
        <nav
          className="landing-page__nav"
          aria-label="Schnellnavigation"
          style={{
            marginRight: "clamp(0px, calc((100vw - 760px) * 0.25), 76px)",
          }}
        >
          {previewEnabled ? (
            <a href="#funktionen">Was du hier findest</a>
          ) : null}
          <Link className="teacher-link" href="/lehrer">
            Lehrerbereich
          </Link>
        </nav>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero__copy">
          <p className="eyebrow">Lernen im eigenen Rhythmus</p>
          <h1 id="landing-title">
            Ein Lernraum, der dich <em>weiterbringt.</em>
          </h1>
          <p>
            Übe genau das, was heute dran ist. Persönlich, ruhig und direkt auf
            deinem Gerät.
          </p>
          <p className="landing-hero__note">
            Ohne Konto. Persönliche Lernstände bleiben lokal.
          </p>
        </div>
        <div className="landing-hero__entry" id="raumcode">
          <div className="landing-entry__heading">
            <p className="eyebrow">Gemeinsam im Unterricht</p>
            <h2 id="room-title">Bereit für dein Laufdiktat?</h2>
            <p>
              Gib den Raumcode deiner Lehrkraft ein oder scanne den QR-Code.
              Dein Profil-Tier ist direkt dabei.
            </p>
          </div>
          <div className="landing-entry__form">
            <RoomCodeForm idPrefix="main-join" mode="room" />
            <PilotConnectionNotice configured={configured} />
          </div>
        </div>
      </section>

      {previewEnabled ? (
        <section
          className="landing-paths"
          id="funktionen"
          aria-labelledby="paths-title"
        >
          <div className="landing-paths__intro">
            <p className="eyebrow">Dein nächster Schritt</p>
            <h2 id="paths-title">Wähle deinen nächsten Schritt.</h2>
            <p>Wähle deinen nächsten Schritt und bleib bei einer Sache.</p>
          </div>
          <div className="landing-paths__grid">
            <Link className="landing-path landing-path--feature" href="/lernen">
              <strong>Mein Lernraum</strong>
              <span>
                Heute üben, Fehler wiederholen und den Überblick behalten.
              </span>
            </Link>
            <Link className="landing-path" href="/lernen/material">
              <strong>Frei üben</strong>
              <span>
                Ein Fach auswählen und direkt mit einer Übung beginnen.
              </span>
            </Link>
          </div>
        </section>
      ) : null}
    </main>
  );
}
