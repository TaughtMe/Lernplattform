import type { Metadata } from "next";
import { TeacherShell } from "../../ui/shell/teacher-shell";
import { TeacherHouses } from "./teacher-houses";

export const metadata: Metadata = { title: "Häuser" };

export default function Page() {
  return (
    <TeacherShell active="houses">
      <TeacherHouses />
    </TeacherShell>
  );
}
