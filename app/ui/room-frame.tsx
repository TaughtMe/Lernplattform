import Link from "next/link";
import type { ReactNode } from "react";
import { AnimalImage } from "./animal";
import { Icon } from "./icons";
import { ThemeButton } from "./theme-button";

/**
 * Rahmen für Raum-Beitritt, Lobby und Abschluss (Design 5a/5b):
 * Zurück, Tier, „Laufdiktat · Raum …“ und Darstellungsknopf.
 */
export function RoomFrame({
  code,
  animal,
  subtitle,
  backHref = "/",
  children,
}: {
  code: string;
  animal: string | null;
  subtitle?: string | null;
  backHref?: string;
  children: ReactNode;
}) {
  return (
    <div className="ui ui-room">
      <header className="ui-room__head">
        <Link
          href={backHref}
          className="ui-icon-btn ui-icon-btn--square"
          aria-label="Zurück zur Startseite"
        >
          <Icon name="back" size={18} />
        </Link>
        {animal ? <AnimalImage animal={animal} size={40} /> : null}
        <div className="ui-grow">
          <p className="ui-h-section ui-truncate">
            Laufdiktat{/^\d{4}$/.test(code) ? ` · Raum ${code}` : ""}
          </p>
          {subtitle ? <p className="ui-small ui-muted">{subtitle}</p> : null}
        </div>
        <ThemeButton />
      </header>
      <main className="ui-room__body">{children}</main>
    </div>
  );
}
