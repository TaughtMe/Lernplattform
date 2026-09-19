import type { Metadata } from "next";
import { StudentAssignments } from "../../components/student-assignments";
import { StudentDashboardShell } from "../../components/student-dashboard-shell";

export const metadata: Metadata = { title: "Meine Aufgaben" };

export default function Page() {
  return (
    <StudentDashboardShell activePath="/lernen/aufgaben">
      <div className="student-dashboard__page">
        <header>
          <p className="eyebrow">Von deiner Lehrkraft</p>
          <h1>Meine Aufgaben</h1>
          <p>Übernimm einen Auftrag und arbeite ihn in Ruhe ab.</p>
        </header>
        <StudentAssignments />
      </div>
    </StudentDashboardShell>
  );
}
