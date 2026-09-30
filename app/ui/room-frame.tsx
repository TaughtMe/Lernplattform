import type { ReactNode } from "react";
import { AnimalImage } from "./animal";
import { ThemeToggle } from "./theme-toggle";

/**
 * Rahmen für Raum-Beitritt, Lobby und Abschluss (Design 5a/5b); die
 * Schülernavigation kommt aus dem Layout. Tier, „Laufdiktat · Raum …“ und
 * Darstellungsknopf.
 * Das laufende Spiel bleibt ohne Navigation im Vollbild.
 */
export function RoomFrame({
  code,
  animal,
  subtitle,
  children,
}: {
  code: string;
  animal: string | null;
  subtitle?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="ui ui-room">
      <header className="ui-room__head">
        {animal ? <AnimalImage animal={animal} size={40} /> : null}
        <div className="ui-grow">
          <p className="ui-h-section ui-truncate">
            Laufdiktat{/^\d{4}$/.test(code) ? ` · Raum ${code}` : ""}
          </p>
          {subtitle ? <p className="ui-small ui-muted">{subtitle}</p> : null}
        </div>
        <ThemeToggle />
      </header>
      <div className="ui-room__body">{children}</div>
    </div>
  );
}
