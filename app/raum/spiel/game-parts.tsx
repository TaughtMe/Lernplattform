"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { ProgressDeliveryStatus } from "../../../src/integrations/laufdiktat/progress-delivery";
import { AnimalImage } from "../../ui/animal";
import { Icon } from "../../ui/icons";
import { Button } from "../../ui/primitives";
import { ThemeButton } from "../../ui/theme-button";

/** Kopfzeile des Spiels (Design 5a/5b): Zurück, Tier, Raum, Zähler. */
export function GameHeader({
  code,
  subtitle,
  animal,
  onBack,
  children,
}: {
  code: string;
  subtitle: string;
  animal?: string | null | undefined;
  onBack?: (() => void) | undefined;
  children?: ReactNode;
}) {
  return (
    <header className="ui-game__head">
      {onBack ? (
        <button
          type="button"
          className="ui-icon-btn ui-icon-btn--square"
          aria-label="Spiel verlassen"
          title="Spiel verlassen"
          onClick={onBack}
        >
          <Icon name="back" size={18} />
        </button>
      ) : null}
      {animal ? <AnimalImage animal={animal} size={40} /> : null}
      <span className="ui-stack ui-grow" style={{ ["--gap" as string]: "0" }}>
        <strong className="ui-game__title">Laufdiktat · Raum {code}</strong>
        <span className="ui-tiny ui-muted">{subtitle}</span>
      </span>
      {children}
      <ThemeButton />
    </header>
  );
}

/** Fortschritt als Segmente; höchstens 40, damit die Leiste lesbar bleibt. */
export function ProgressSegments({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  return (
    <div className="ui-game__segments" aria-hidden="true">
      {Array.from({ length: Math.min(total, 40) }, (_, position) => (
        <span
          key={position}
          className={
            position < current
              ? "is-done"
              : position === current
                ? "is-current"
                : undefined
          }
        />
      ))}
    </div>
  );
}

/** Halteflächen an beiden Rändern; die Berührung selbst wertet das Spiel aus. */
export function HoldEdges({ holding }: { holding: boolean }) {
  return (
    <>
      {(["left", "right"] as const).map((side) => (
        <div
          key={side}
          className={`ui-game__edge ui-game__edge--${side}${holding ? " is-holding" : ""}`}
          aria-hidden="true"
        >
          <Icon name="hand" size={20} />
          <span>{holding ? "Halten" : "Hier"}</span>
        </div>
      ))}
    </>
  );
}

/** Abschreibhilfe: bereits richtig getippte Zeichen werden markiert. */
export function CopyGuide({
  target,
  answer,
}: {
  target: string;
  answer: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const characters = [...target];
  const typed = [...answer];
  let prefix = 0;
  while (prefix < characters.length && characters[prefix] === typed[prefix])
    prefix++;
  useEffect(() => {
    container.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [prefix]);
  return (
    <div className="ui-stack ui-game__copy">
      <p className="ui-label">Tippe die Lösung ab</p>
      <div
        ref={container}
        className="ui-game__copy-text"
        aria-label={`Lösung: ${target}`}
      >
        {characters.map((character, index) => (
          <span
            key={index}
            data-active={index === prefix ? "true" : undefined}
            className={index < prefix ? "is-copied" : undefined}
          >
            {character === " " ? " " : character}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Rückmeldung zur Übertragung des Ergebnisses an die Lehrkraft. */
export function DeliveryNotice({
  status,
  onRetry,
}: {
  status: ProgressDeliveryStatus;
  onRetry?: (() => void) | undefined;
}) {
  if (status === "idle") return null;
  return (
    <div
      className={`ui-notice${status === "error" ? " ui-notice--bad" : status === "saved" ? " ui-notice--good" : ""} ui-stack`}
      role="status"
      aria-live="polite"
    >
      <p>
        {status === "saving"
          ? "Dein Ergebnis wird an die Lehrkraft gesendet …"
          : status === "saved"
            ? "Dein Ergebnis wurde an diese Unterrichtsrunde zurückgegeben."
            : "Dein Ergebnis konnte nicht gesendet werden. Lass diese Seite geöffnet und versuche es erneut."}
      </p>
      {status === "error" && onRetry ? (
        <Button size="sm" onClick={onRetry}>
          Erneut senden
        </Button>
      ) : null}
    </div>
  );
}

export function GameWarning({
  children,
  alert,
}: {
  children: ReactNode;
  alert?: boolean;
}) {
  return (
    <p className="ui-notice ui-notice--bad" role={alert ? "alert" : "status"}>
      {children}
    </p>
  );
}
