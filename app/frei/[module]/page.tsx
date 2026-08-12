import Link from "next/link";

export default function Page() {
  return (
    <main className="class-shell">
      <header className="class-topbar">
        <Link href="/lernen" className="back-link">
          ← Freies Üben
        </Link>
        <span className="ranking-note">Persönlicher Bereich</span>
      </header>
      <section className="simple-module">
        <p className="eyebrow">Du entscheidest</p>
        <h1>Freies Üben</h1>
        <p>
          Hier wählst du später Thema, Übungsart und Schwierigkeit selbst.
          Ergebnisse bleiben persönlich und werden nicht automatisch mit einer
          Klasse geteilt.
        </p>
        <Link className="button button--primary" href="/lernen">
          Andere Übung wählen
        </Link>
      </section>
    </main>
  );
}
