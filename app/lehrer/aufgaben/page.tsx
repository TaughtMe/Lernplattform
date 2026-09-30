import type { Metadata } from "next";
import { TeacherAssignmentManager } from "../../components/teacher-workspace-manager";

export const metadata: Metadata = { title: "Aufgaben" };

export default function Page() {
  return (
    <div className="ui-page">
      <TeacherAssignmentManager />
    </div>
  );
}
