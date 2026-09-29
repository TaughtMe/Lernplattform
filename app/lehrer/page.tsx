import type { Metadata } from "next";
import { TeacherShell } from "../ui/shell/teacher-shell";
import { TeacherOverview } from "./teacher-overview";

export const metadata: Metadata = { title: "Lehrerbereich" };

export default function Page() {
  return (
    <TeacherShell active="overview">
      <TeacherOverview />
    </TeacherShell>
  );
}
