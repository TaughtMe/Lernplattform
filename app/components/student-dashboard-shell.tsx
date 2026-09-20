import type { ReactNode } from "react";
import { StudentHeader } from "./student-header";
import { StudentRouteFocus } from "./student-route-focus";

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
    <main className="learning-room-shell student-dashboard student-dashboard--with-sidebar">
      <StudentHeader activePath={activePath} summary={summary} />
      <StudentRouteFocus activePath={activePath} />

      {children}
    </main>
  );
}
