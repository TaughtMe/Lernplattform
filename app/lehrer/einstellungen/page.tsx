import type { Metadata } from "next";
import { TeacherShell } from "../../ui/shell/teacher-shell";
import { TeacherProfilePanel } from "../../components/teacher-workspace-manager";

export const metadata: Metadata = { title: "Einstellungen" };

export default function Page() {
  return (
    <TeacherShell active="settings">
      <div className="ui-page">
        <TeacherProfilePanel />
      </div>
    </TeacherShell>
  );
}
