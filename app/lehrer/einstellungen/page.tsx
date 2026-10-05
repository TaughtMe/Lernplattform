import type { Metadata } from "next";
import { CloudSyncPanel } from "../../components/cloud-sync-panel";
import { TeacherProfilePanel } from "../../components/teacher-workspace-manager";

export const metadata: Metadata = { title: "Einstellungen" };

export default function Page() {
  return (
    <div className="ui-page">
      <aside className="ui-notice">
        <strong>Dieses Gerät ist die Schutzgrenze.</strong> Lehrkraftdaten
        bleiben lokal. Nutze deshalb ein geschütztes, nicht gemeinsam
        verwendetes Geräteprofil.
      </aside>
      <TeacherProfilePanel />
      <CloudSyncPanel area="teacher" />
    </div>
  );
}
