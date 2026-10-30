"use client";

import { useSyncExternalStore, type ReactNode } from "react";

const never = () => () => undefined;

/**
 * `true`, sobald React die Seite übernommen hat und Klicks und Eingaben
 * ankommen. Im Server-Render und während des Hydrierens `false`, bei einem
 * Seitenwechsel im Browser sofort `true` (kein Flackern).
 */
export function useInteractive() {
  return useSyncExternalStore(
    never,
    () => true,
    () => false,
  );
}

/**
 * Sperrt alle Bedienelemente darin, bis React die Seite hydriert hat.
 *
 * Vor der Hydration gehen Klicks verloren. Ein `<textarea>` setzt React 19 beim
 * Hydrieren auf den Text aus dem Server-Render zurück (kontrolliert wie mit
 * `defaultValue`); ein `<input>` behält zwar den Text, der Zustand der
 * Komponente kennt ihn aber nicht. Kinder auf langsamen Geräten verlören so ihre
 * ersten Eingaben. Ein gesperrtes `<fieldset>` sperrt Knöpfe, Felder und Auswahlen
 * auf einmal, sichtbar und für Screenreader; Links bleiben benutzbar, sie
 * brauchen kein JavaScript. Das Fieldset hat weder Rahmen noch Abstand;
 * `className` gibt ihm das Layout des Elements, an dessen Stelle es tritt.
 */
export function HydrationGate({
  className,
  children,
}: {
  className?: string | undefined;
  children: ReactNode;
}) {
  const interactive = useInteractive();
  return (
    <fieldset
      className={className ? `ui-gate ${className}` : "ui-gate"}
      disabled={!interactive}
      aria-busy={interactive ? undefined : true}
    >
      {children}
    </fieldset>
  );
}
