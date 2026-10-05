import type { Metadata } from "next";
import { CloudSyncSetup } from "../../components/cloud-sync-setup";
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
      <CloudSyncSetup />
    </div>
  );
}
