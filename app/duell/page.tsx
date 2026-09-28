import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "../components/icons";
import { StudentShell } from "../components/student-shell";
import { ThemeToggle } from "../components/theme-toggle";

export const metadata: Metadata = { title: "Duell" };

export default function Page() {
  return (
    <StudentShell>
      <main className="page" style={{ maxWidth: 640, margin: "0 auto", width: "100%" }}>
        <div className="between"><h1 className="h-page">Duell</h1><ThemeToggle /></div>
        <div className="card-dark stack" style={{ padding: 20 }}>
          <span className="fun" style={{ fontSize: 22 }}>Gemeinsam gegeneinander</span>
          <p className="small muted">Duelle mit gemeinsamem Wortschatz kommen als nächster Ausbau – ohne Fehler öffentlich bloßzustellen. Bis dahin: Battle im Raum.</p>
          <Link href="/raum" className="btn btn-gold"><Icon name="duel" size={18} />Battle im Raum spielen</Link>
        </div>
        <div className="card card-pad stack">
          <span className="h-section">So wird es funktionieren</span>
          <ol className="small muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
            <li>Zwei Geräte koppeln sich per QR-Code, ohne Konto.</li>
            <li>Beide bekommen dieselben Wörter aus der LernBox.</li>
            <li>Gewertet wird Genauigkeit, Tempo nur als Bonus.</li>
            <li>Falsche Wörter landen still in der eigenen LernBox.</li>
          </ol>
        </div>
      </main>
    </StudentShell>
  );
}
