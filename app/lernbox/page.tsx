import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Meine LernBox" };

export default function Page() {
  return (
    <main className="integrated-module-shell">
      <header className="integrated-module-header">
        <Link href="/frei" className="back-link">
          ← Freies Üben
        </Link>
        <div>
          <strong>Meine LernBox</strong>
          <span>Vollständige persönliche Vokabelverwaltung</span>
        </div>
        <Link href="/" className="back-link">
          Lernraum
        </Link>
      </header>
      <iframe
        className="integrated-module-frame"
        src="/integrations/lernbox/index.html"
        title="Meine LernBox"
        allow="camera"
      />
    </main>
  );
}
