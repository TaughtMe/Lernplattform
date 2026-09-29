import type { ReactNode } from "react";
import { StudentShell } from "../ui/shell/student-shell";
import { StudentRouteFocus } from "./student-route-focus";

/**
 * Bestehende Schülerseiten erhalten den neuen Rahmen (Design „Lernraum UI“).
 * Der Inhalt behält vorerst seine bisherigen Klassen, bis die jeweilige
 * Umbauphase ihn ersetzt.
 */
export function StudentDashboardShell({
  activePath,
  children,
}: {
  activePath: string;
  children: ReactNode;
  summary?: ReactNode;
}) {
  return (
    <StudentShell activePath={activePath}>
      <StudentRouteFocus activePath={activePath} />
      <div className="student-dashboard ui-legacy">{children}</div>
    </StudentShell>
  );
}
