import type { Metadata } from "next";
import { CloudSyncPanel } from "../../components/cloud-sync-panel";
import { TeacherProfilePanel } from "../../components/teacher-workspace-manager";

export const metadata: Metadata = { title: "Einstellungen" };

export default function Page() {
  return (
    <div className="ui-page">
      <TeacherProfilePanel />
      <CloudSyncPanel area="teacher" />
    </div>
  );
}
