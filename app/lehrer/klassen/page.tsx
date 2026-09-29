import type { Metadata } from "next";
import { TeacherClassConfigurator } from "../../components/teacher-class-configurator";
import { TeacherShell } from "../../ui/shell/teacher-shell";

export const metadata: Metadata = { title: "Klassen" };

export default function Page() {
  return (
    <TeacherShell active="classes">
      <div className="ui-page">
        <TeacherClassConfigurator />
      </div>
    </TeacherShell>
  );
}
