import type { ReactNode } from "react";
import { ThemeToggle } from "../theme-toggle";
import { RouteFocus } from "./route-focus";

/**
 * Inhalt einer Schülerseite. Den Rahmen mit Navigation setzt das Root-Layout
 * (`AreaFrame`), damit er beim Seitenwechsel stehen bleibt. Die Seite setzt
 * den Fokus nach dem Wechsel auf die Überschrift. Screens aus dem Entwurf
 * bringen ihren Kopf selbst mit (`bare`); ältere Seiten erhalten oben rechts
 * den Hell/Dunkel-Umschalter.
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
    <>
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
    </>
  );
}
