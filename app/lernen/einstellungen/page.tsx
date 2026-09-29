import type { Metadata } from "next";
import { StudentDashboardShell } from "../../components/student-dashboard-shell";
import { StudentSettingsPanel } from "../../components/student-settings-panel";

export const metadata: Metadata = { title: "Profil" };

export default function Page() {
  return (
    <StudentDashboardShell activePath="/lernen/einstellungen">
      <div className="ui-page">
        <header>
          <h1 className="ui-h-page">Profil und Einstellungen</h1>
          <p className="ui-small ui-muted">
            Tier, Darstellung und Sicherung deines Lernstands.
          </p>
        </header>
        <StudentSettingsPanel />
      </div>
    </StudentDashboardShell>
  );
}
