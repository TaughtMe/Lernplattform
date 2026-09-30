"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { areaOf } from "./shell/areas";
import { VersionButton } from "./version-button";

/**
 * Seitenfuß: Name, Rechtliches und Version mit Update-Hinweis. Schüler- und
 * Lehrerbereich zeigen ihn kompakt im eigenen Rahmen (`compact`), damit er
 * ohne Scrollen sichtbar bleibt; die Startseite verlinkt Impressum und
 * Datenschutz selbst.
 */
export function SiteFooter({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  if (!compact && (pathname === "/" || areaOf(pathname))) return null;
  if (compact) {
    return (
      <footer className="ui ui-footer ui-footer--compact">
        <nav aria-label="Version und Rechtliches">
          <Link href="/impressum">Impressum</Link>
          <Link href="/datenschutz">Datenschutz</Link>
          <VersionButton />
        </nav>
      </footer>
    );
  }
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
