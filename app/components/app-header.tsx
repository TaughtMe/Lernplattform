import Link from "next/link";

export function AppHeader() {
  return (
    <>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Lernraum Startseite">
          <span className="brand__mark" aria-hidden="true">
            L
          </span>
          <span>Lernraum</span>
        </Link>
        <nav className="desktop-navigation" aria-label="Hauptnavigation">
          <Link href="/lernen">Mein Lernraum</Link>
          <Link href="/#raumcode">Raum beitreten</Link>
          <Link href="/duell">Duell</Link>
          <Link href="/haus">Mein Haus</Link>
        </nav>
        <Link className="teacher-link" href="/lehrer">
          Lehrer-Login
        </Link>
      </header>
      <nav className="mobile-navigation" aria-label="Mobile Hauptnavigation">
        <Link href="/lernen">Lernraum</Link>
        <Link href="/#raumcode">Raum</Link>
        <Link href="/duell">Duell</Link>
        <Link href="/haus">Haus</Link>
      </nav>
    </>
  );
}
