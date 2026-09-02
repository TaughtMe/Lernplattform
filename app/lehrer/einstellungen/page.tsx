import type { Metadata } from "next";
import { TeacherCockpitShell } from "../../components/teacher-cockpit-shell";
import { TeacherProfilePanel } from "../../components/teacher-workspace-manager";

export const metadata: Metadata = { title: "Einstellungen" };

export default function Page() {
  return (
    <TeacherCockpitShell active="settings">
      <TeacherProfilePanel />
    </TeacherCockpitShell>
  );
}
