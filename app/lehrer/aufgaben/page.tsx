import type { Metadata } from "next";
import { TeacherShell } from "../../ui/shell/teacher-shell";
import { TeacherAssignmentManager } from "../../components/teacher-workspace-manager";

export const metadata: Metadata = { title: "Aufgaben" };

export default function Page() {
  return (
    <TeacherShell active="assignments">
      <div className="ui-page">
        <TeacherAssignmentManager />
      </div>
    </TeacherShell>
  );
}
