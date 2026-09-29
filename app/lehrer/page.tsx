import type { Metadata } from "next";
import { TeacherCockpitShell } from "../components/teacher-cockpit-shell";
import { TeacherOverview } from "./teacher-overview";

export const metadata: Metadata = { title: "Lehrerbereich" };

export default function Page() {
  return (
    <TeacherCockpitShell active="overview">
      <TeacherOverview />
    </TeacherCockpitShell>
  );
}
