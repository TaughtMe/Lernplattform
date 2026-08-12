import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Freies Üben" };

const areas = [
  ["Deutsch", "Rechtschreibung, Lernwörter und Deutschmodule", "german"],
  ["Mathematik", "Thema und Schwierigkeit selbst auswählen", "mathematics"],
  ["Vokabeln", "Eigene Stapel und persönliche LernBox", "vocabulary"],
  ["Tipptraining", "Genauigkeit und ruhigen Rhythmus trainieren", "typing"],
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
            Wähle selbst, was du üben möchtest. Dieser Bereich wird nicht
            automatisch mit einer Klasse geteilt.
          </p>
        </div>
        <div className="free-area-grid">
          {areas.map(([title, detail, module]) => (
            <Link
              className="free-area-card"
              href={`/frei/${module}`}
              key={module}
            >
              <span className="entry-card__label">Freies Üben</span>
              <h2>{title}</h2>
              <p>{detail}</p>
              <strong>Auswählen →</strong>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
