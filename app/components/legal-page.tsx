import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="legal-shell">
      <header className="legal-header">
        <Link href="/" aria-label="Zurück zur Lernraum-Startseite">
          <span aria-hidden="true">←</span> Lernraum
        </Link>
        <nav aria-label="Rechtliche Seiten">
          <Link href="/impressum">Impressum</Link>
          <Link href="/datenschutz">Datenschutz</Link>
        </nav>
      </header>
      <main className="legal-content">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="legal-intro">{intro}</p>
        <div className="legal-sections">{children}</div>
        <p className="legal-updated">Stand: 25. August 2026</p>
      </main>
    </div>
  );
}
