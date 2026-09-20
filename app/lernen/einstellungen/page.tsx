import type { Metadata } from "next";
import { StudentDashboardShell } from "../../components/student-dashboard-shell";
import { StudentSettingsPanel } from "../../components/student-settings-panel";

export const metadata: Metadata = { title: "Einstellungen" };

export default function Page() {
  return (
    <StudentDashboardShell activePath="/lernen/einstellungen">
      <div className="student-dashboard__page student-dashboard__page--settings">
        <header>
          <p className="eyebrow">Dein Arbeitsplatz</p>
          <h1>Einstellungen</h1>
          <p>
            Richte Darstellung und Profil so ein, dass Lernen leicht bleibt.
          </p>
        </header>
        <StudentSettingsPanel />
      </div>
    </StudentDashboardShell>
  );
}
