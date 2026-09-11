import type { Metadata } from "next";
import { TeacherClassConfigurator } from "../../components/teacher-class-configurator";
import { TeacherCockpitShell } from "../../components/teacher-cockpit-shell";

export const metadata: Metadata = { title: "Klassen" };

export default function Page() {
  return (
    <TeacherCockpitShell active="classes">
      <TeacherClassConfigurator />
    </TeacherCockpitShell>
  );
}
