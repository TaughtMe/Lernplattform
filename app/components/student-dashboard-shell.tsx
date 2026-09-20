import type { ReactNode } from "react";
import { StudentHeader } from "./student-header";

export function StudentDashboardShell({
  activePath,
  children,
  summary,
}: {
  activePath: string;
  children: ReactNode;
  summary?: ReactNode;
}) {
  return (
    <main className="learning-room-shell student-dashboard">
      <StudentHeader activePath={activePath} summary={summary} />

      {children}
    </main>
  );
}
