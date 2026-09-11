import type { ProgressDeliveryStatus } from "../../src/integrations/laufdiktat/progress-delivery";

export function LiveProgressNotice({
  status,
  onRetry,
}: {
  status: ProgressDeliveryStatus;
  onRetry?: (() => void) | undefined;
}) {
  if (status === "idle") return null;
  return (
    <div role="status" aria-live="polite">
      <p>
        {status === "saving"
          ? "Dein Ergebnis wird an die Lehrkraft gesendet …"
          : status === "saved"
            ? "Dein Ergebnis wurde an diese Unterrichtsrunde zurückgegeben."
            : "Dein Ergebnis konnte nicht gesendet werden. Lass diese Seite geöffnet und versuche es erneut."}
      </p>
      {status === "error" && onRetry ? (
        <button className="button button--primary" onClick={onRetry}>
          Erneut senden
        </button>
      ) : null}
    </div>
  );
}
