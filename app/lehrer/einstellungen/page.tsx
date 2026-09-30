import type { Metadata } from "next";
import { TeacherProfilePanel } from "../../components/teacher-workspace-manager";

export const metadata: Metadata = { title: "Einstellungen" };

export default function Page() {
  return (
    <div className="ui-page">
      <TeacherProfilePanel />
    </div>
  );
}
