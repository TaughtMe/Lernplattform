import type { Metadata } from "next";
import Link from "next/link";
import { RoomCodeForm } from "../components/room-code-form";

export const metadata: Metadata = { title: "Freies Üben" };

const areas = [
  {
    title: "Deutsch",
    detail: "Lernwörter und Rechtschreibstrategien Schritt für Schritt sichern",
    href: "/frei/german/lernwoerter",
    icon: "Aa",
  },
  {
    title: "Kopfrechnen",
    detail: "Grundrechenarten und Aufgabenfamilien sicher automatisieren",
    href: "/frei/mathematics",
    icon: "×",
  },
  {
    title: "Vokabeln",
    detail: "Eigene Stapel mit dem Leitner-Prinzip langfristig lernen",
    href: "/lernbox",
    icon: "ABC",
  },
  {
    title: "Tipptraining",
    detail: "Genauigkeit und ruhigen Rhythmus trainieren",
    href: "/frei/typing",
    icon: "⌨",
  },
] as const;

export default function FreePracticePage() {
  return (
    <main className="student-shell">
      <header className="student-topbar">
        <Link className="back-link" href="/">
          ← Startseite
        </Link>
        <span className="ranking-note">Persönlicher Bereich</span>
      </header>
      <section className="student-start" aria-labelledby="free-title">
        <div className="student-welcome">
          <p className="eyebrow">Du entscheidest</p>
          <h1 id="free-title">Freies Üben</h1>
          <p>
            Stärke grundlegende Fähigkeiten in deinem Tempo. Jede sinnvolle
            Übung zählt; persönliche Ergebnisse bleiben zunächst bei dir.
          </p>
        </div>
        <div className="free-area-grid">
          {areas.map((area) => (
            <Link className="free-area-card" href={area.href} key={area.title}>
              <span className="free-area-card__icon" aria-hidden="true">
                {area.icon}
              </span>
              <span className="entry-card__label">Freies Üben</span>
              <h2>{area.title}</h2>
              <p>{area.detail}</p>
              <strong>Auswählen →</strong>
            </Link>
          ))}
        </div>
        <section
          className="running-room-entry"
          aria-labelledby="free-room-title"
        >
          <div>
            <p className="eyebrow">Gemeinsame Runde</p>
            <h2 id="free-room-title">Zum Laufdiktat</h2>
            <p>
              Hat deine Lehrkraft einen Raum geöffnet? Mit dem Code kommst du
              zuerst in die Lobby und anschließend in die gemeinsame Runde.
            </p>
          </div>
          <RoomCodeForm idPrefix="free-running-room" />
        </section>
      </section>
    </main>
  );
}
