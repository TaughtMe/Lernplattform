import Link from "next/link";
import { ServiceWorkerManager } from "./service-worker-manager";

export function SiteMetaActions() {
  return (
    <nav className="site-meta-actions" aria-label="Version und Rechtliches">
      <Link href="/impressum">Impressum</Link>
      <Link href="/datenschutz">Datenschutz</Link>
      <ServiceWorkerManager />
    </nav>
  );
}
