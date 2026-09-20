import Link from "next/link";
import { ArrowLeftIcon } from "../../components/ui-icons";

export default function Page() {
  return (
    <main className="class-shell">
      <header className="class-topbar">
        <Link href="/lernen/material" className="back-link">
          <ArrowLeftIcon aria-hidden="true" /> Zurück zu Frei üben
        </Link>
        <span className="ranking-note">Persönlicher Bereich</span>
      </header>
      <section className="simple-module">
        <p className="eyebrow">Du entscheidest</p>
        <h1>Fach auswählen</h1>
        <p>
          Hier wählst du später Thema, Übungsart und Schwierigkeit selbst.
          Ergebnisse bleiben persönlich und werden nicht automatisch mit einer
          Klasse geteilt.
        </p>
        <Link className="button button--primary" href="/lernen/material">
          Andere Übung wählen
        </Link>
      </section>
    </main>
  );
}
