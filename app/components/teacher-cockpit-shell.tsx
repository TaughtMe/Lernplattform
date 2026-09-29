import type { ReactNode } from "react";
import { TeacherShell, type TeacherArea } from "../ui/shell/teacher-shell";

export type { TeacherArea };

/** Bestehende Lehrerseiten im neuen Rahmen (Design „Lernraum UI“). */
export function TeacherCockpitShell({
  active,
  children,
}: {
  active: TeacherArea;
  children: ReactNode;
}) {
  return <TeacherShell active={active}>{children}</TeacherShell>;
}
