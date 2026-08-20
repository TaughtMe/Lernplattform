import Link from "next/link";

export function AppHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Lernraum Startseite"><span className="brand__mark" aria-hidden="true">L</span><span>Lernraum</span></Link>
      <nav aria-label="Hauptnavigation">
        <Link href="/lernen">Heute lernen</Link><Link href="/#raumcode">Raum beitreten</Link><Link href="/duell">Duell</Link><Link href="/haus">Mein Haus</Link>
      </nav>
      <span aria-hidden="true" />
    </header>
  );
}
