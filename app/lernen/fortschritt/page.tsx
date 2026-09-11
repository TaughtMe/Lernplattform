import type { Metadata } from "next";
import { AdaptiveProgressPanel } from "../../components/adaptive-progress-panel";
import { StudentDashboardShell } from "../../components/student-dashboard-shell";

export const metadata: Metadata = { title: "Mein Fortschritt" };

export default function Page() {
  return (
    <StudentDashboardShell activePath="/lernen/fortschritt">
      <div className="student-dashboard__page student-dashboard__page--compact">
        <header>
          <p className="eyebrow">Deine Entwicklung</p>
          <h1>Mein Fortschritt</h1>
          <p>Was du geübt und Schritt für Schritt verbessert hast.</p>
        </header>
        <AdaptiveProgressPanel />
      </div>
    </StudentDashboardShell>
  );
}
