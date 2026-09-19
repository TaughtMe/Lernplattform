import Link from "next/link";
import { ArrowLeftIcon } from "../../../../components/ui-icons";

export default function Page() {
  return (
    <main className="class-shell">
      <header className="class-topbar">
        <Link href="/klasse/7b" className="back-link">
          <ArrowLeftIcon aria-hidden="true" /> Klasse 7b
        </Link>
      </header>
      <section className="simple-module">
        <p className="eyebrow">Freigeschaltete Klassenaufgabe</p>
        <h1>Dieses Lernmodul folgt als Nächstes.</h1>
        <p>
          Klassenstruktur, Freigabe und Einordnung stehen bereits. Die Fachlogik
          wird aus dem Vaultplan ergänzt.
        </p>
        <Link className="button button--primary" href="/klasse/7b">
          Zur Aufgabenübersicht
        </Link>
      </section>
    </main>
  );
}
