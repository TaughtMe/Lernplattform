"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { VersionButton } from "./version-button";

/**
 * Vollbild-Screens aus dem Entwurf füllen den Bildschirm ohne Seitenfuß:
 * Startseite, Live-Raum der Lehrkraft und der Schülerbereich mit eigener
 * Navigation. Die Startseite verlinkt Impressum und Datenschutz selbst.
 */
const FULLSCREEN_ROUTES = new Set(["/", "/lehrer/live"]);
const FULLSCREEN_PREFIXES = [
  "/lernen",
  "/ueben",
  "/lernbox",
  "/frei",
  "/klasse",
  "/raum",
];

function isFullscreen(pathname: string) {
  return (
    FULLSCREEN_ROUTES.has(pathname) ||
    FULLSCREEN_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  );
}

/** Schlichter Seitenfuß: Name, Rechtliches und Version. */
export function SiteFooter() {
  const pathname = usePathname();
  if (isFullscreen(pathname)) return null;
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
