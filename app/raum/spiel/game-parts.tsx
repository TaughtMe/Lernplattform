"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { ProgressDeliveryStatus } from "../../../src/integrations/laufdiktat/progress-delivery";
import { Button } from "../../ui/primitives";

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
