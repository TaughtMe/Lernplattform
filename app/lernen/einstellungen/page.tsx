import type { Metadata } from "next";
import { StudentPage } from "../../ui/shell/student-page";
import { StudentSettingsPanel } from "../../components/student-settings-panel";

export const metadata: Metadata = { title: "Profil" };

export default function Page() {
  return (
    <StudentPage activePath="/lernen/einstellungen">
      <div className="ui-page">
        <header>
          <h1 className="ui-h-page">Profil und Einstellungen</h1>
          <p className="ui-small ui-muted">
            Tier, Darstellung und Sicherung deines Lernstands.
          </p>
        </header>
        <StudentSettingsPanel />
      </div>
    </StudentPage>
  );
}
