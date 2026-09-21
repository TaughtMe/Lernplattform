import type { Metadata } from "next";
import { RunningDictationApp } from "../../../components/running-dictation-app";
import { StudentDashboardShell } from "../../../components/student-dashboard-shell";

export const metadata: Metadata = { title: "Laufdiktat" };

export default function RunningDictationPage() {
  return (
    <StudentDashboardShell activePath="/frei/german/laufdiktat">
      <div className="student-module-workspace">
        <RunningDictationApp />
      </div>
    </StudentDashboardShell>
  );
}
