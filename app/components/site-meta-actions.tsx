import Link from "next/link";
import { ServiceWorkerManager } from "./service-worker-manager";

export function SiteMetaActions() {
  return (
    <footer className="site-footer site-meta-actions">
      <span>Lernraum</span>
      <span>Persönlicher Lernraum, lokal auf diesem Gerät.</span>
      <nav aria-label="Version und Rechtliches">
        <Link href="/impressum">Impressum</Link>
        <Link href="/datenschutz">Datenschutz</Link>
        <ServiceWorkerManager />
      </nav>
    </footer>
  );
}
