import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "../ui/icons";

/** Rechtliche Seiten: ruhige Lesespalte mit einfachem Kopf. */
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
    <div className="ui ui-legal">
      <header className="ui-legal__head">
        <Link
          href="/"
          className="ui-btn ui-btn--ghost ui-btn--sm"
          aria-label="Zurück zur Lernraum-Startseite"
        >
          <Icon name="back" size={16} /> Lernraum
        </Link>
        <nav aria-label="Rechtliche Seiten" className="ui-row">
          <Link href="/impressum">Impressum</Link>
          <Link href="/datenschutz">Datenschutz</Link>
        </nav>
      </header>
      <main className="ui-legal__main">
        <p className="ui-eyebrow">{eyebrow}</p>
        <h1 className="ui-h-page">{title}</h1>
        <p className="ui-legal__intro">{intro}</p>
        <div className="ui-legal__sections">{children}</div>
        <p className="ui-tiny ui-muted">Stand: 25. August 2026</p>
      </main>
    </div>
  );
}
