import type { Metadata } from "next";
import { StudentClassEnrollment } from "../../components/student-class-enrollment";
import { StudentDashboardShell } from "../../components/student-dashboard-shell";

export const metadata: Metadata = { title: "Meine Klasse" };

export default function Page() {
  return (
    <StudentDashboardShell activePath="/lernen/klasse">
      <div className="student-dashboard__page student-dashboard__page--compact">
        <header>
          <p className="eyebrow">Gemeinsam lernen</p>
          <h1>Meine Klasse</h1>
          <p>
            Scanne deinen persönlichen QR-Code oder gib den Klassencode deiner
            Lehrkraft ein.
          </p>
        </header>
        <StudentClassEnrollment />
      </div>
    </StudentDashboardShell>
  );
}
