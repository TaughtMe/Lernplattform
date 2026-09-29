import Link from "next/link";
import { VersionButton } from "./version-button";

/** Schlichter Seitenfuß für alle Seiten: Name, Rechtliches und Version. */
export function SiteFooter() {
  return (
    <footer className="ui ui-footer">
      <strong>Lernraum</strong>
      <span className="ui-footer__claim">
        Persönlicher Lernraum, lokal auf diesem Gerät.
      </span>
      <nav aria-label="Version und Rechtliches">
        <Link href="/impressum">Impressum</Link>
        <Link href="/datenschutz">Datenschutz</Link>
        <VersionButton />
      </nav>
    </footer>
  );
}
