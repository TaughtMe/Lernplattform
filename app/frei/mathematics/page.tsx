import type { Metadata } from "next";
import { MentalMathApp } from "../../components/mental-math-app";
import { StudentDashboardShell } from "../../components/student-dashboard-shell";

export const metadata: Metadata = { title: "Kopfrechnen" };

export default function MathematicsPage() {
  return (
    <StudentDashboardShell activePath="/frei/mathematics">
      <div className="student-module-workspace">
        <MentalMathApp />
      </div>
    </StudentDashboardShell>
  );
}
