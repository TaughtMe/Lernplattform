import type { Metadata } from "next";
import { TeacherCockpitShell } from "../../components/teacher-cockpit-shell";
import { TeacherAssignmentManager } from "../../components/teacher-workspace-manager";

export const metadata: Metadata = { title: "Aufgaben" };

export default function Page() {
  return (
    <TeacherCockpitShell active="assignments">
      <TeacherAssignmentManager />
    </TeacherCockpitShell>
  );
}
