import Link from "next/link";
import { AppHeader } from "./app-header";

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  status: string;
};

export function ModulePlaceholder({
  eyebrow,
  title,
  description,
  status,
}: Props) {
  return (
    <main className="module-page">
      <AppHeader />
      <section className="module-hero">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="status-card">
          <span className="status-dot" aria-hidden="true" />
          <div>
            <strong>{status}</strong>
            <p>
              Der Einstieg steht bereits. Die fachliche Logik wird über den
              gemeinsamen Lernraum-Kern angebunden, sobald sie stabil ist.
            </p>
          </div>
        </div>
        <Link className="button button--primary" href="/">
          Zurück zur Startseite
        </Link>
      </section>
    </main>
  );
}
