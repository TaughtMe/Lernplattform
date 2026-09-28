import type { Metadata } from "next";
import { StudentShell } from "../components/student-shell";
import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = { title: "Mein Lernraum" };

export default function Page() {
  return <StudentShell><DashboardClient /></StudentShell>;
}
