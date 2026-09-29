import type { ReactNode } from "react";
import { ThemeToggle } from "../theme-toggle";
import { RouteFocus } from "./route-focus";
import { StudentShell } from "./student-shell";

/**
 * Schülerseite im Lernraum-Rahmen; setzt den Fokus nach dem Seitenwechsel
 * auf die Überschrift. Screens aus dem Entwurf bringen ihren Kopf selbst mit
 * (`bare`); ältere Seiten erhalten oben rechts den Hell/Dunkel-Umschalter.
 */
export function StudentPage({
  activePath,
  bare = false,
  children,
}: {
  activePath: string;
  bare?: boolean;
  children: ReactNode;
}) {
  return (
    <StudentShell activePath={activePath}>
      <RouteFocus activePath={activePath} />
      {bare ? (
        children
      ) : (
        <div className="ui ui-student-page">
          <div className="ui-student-page__head">
            <ThemeToggle />
          </div>
          {children}
        </div>
      )}
    </StudentShell>
  );
}
