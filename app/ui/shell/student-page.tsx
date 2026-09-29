import type { ReactNode } from "react";
import { RouteFocus } from "./route-focus";
import { StudentShell } from "./student-shell";

/** Schülerseite im Lernraum-Rahmen; setzt den Fokus nach dem Seitenwechsel auf die Überschrift. */
export function StudentPage({
  activePath,
  children,
}: {
  activePath: string;
  children: ReactNode;
}) {
  return (
    <StudentShell activePath={activePath}>
      <RouteFocus activePath={activePath} />
      {children}
    </StudentShell>
  );
}
