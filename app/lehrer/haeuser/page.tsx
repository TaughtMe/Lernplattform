import type { Metadata } from "next";
import { TeacherCockpitShell } from "../../components/teacher-cockpit-shell";
import { TeacherHouses } from "./teacher-houses";

export const metadata: Metadata = { title: "Häuser" };

export default function Page() {
  return (
    <TeacherCockpitShell active="houses">
      <TeacherHouses />
    </TeacherCockpitShell>
  );
}
