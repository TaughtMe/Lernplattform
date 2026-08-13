import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Deutsch üben" };

export default function GermanPracticePage() {
  return (
    <main className="class-shell">
      <header className="class-topbar">
        <Link href="/frei" className="back-link">
          ← Freies Üben
        </Link>
        <span className="ranking-note">Persönlicher Bereich</span>
      </header>
      <section className="simple-module german-practice-hub">
        <p className="eyebrow">Deutsch</p>
        <h1>Wie möchtest du üben?</h1>
        <p>
          Beginne mit einem Laufdiktat. Lernwörter und weitere Schreibtrainings
          kommen anschließend als eigene, klar getrennte Lernwege dazu.
        </p>
        <div className="free-area-grid">
          <Link className="free-area-card" href="/frei/german/laufdiktat">
            <span className="entry-card__label">Jetzt verfügbar</span>
            <h2>Laufdiktat</h2>
            <p>Texte oder Vokabeln ansehen, merken und verdeckt schreiben.</p>
            <strong>Starten →</strong>
          </Link>
        </div>
      </section>
    </main>
  );
}
