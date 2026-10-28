import { useId } from "react";
import { resumeProgressLabel } from "../../../src/domain/round-snapshot";
import { Button, Card } from "../../ui/primitives";

/**
 * Angebot beim Öffnen eines Moduls, wenn eine Runde unterbrochen wurde
 * (Befund C-001): „Weitermachen (3 von 10)“ oder „Neu anfangen“. Für alle
 * Module gleich; das Modul liefert nur Titel, Stand und die zwei Aktionen.
 */
export function ResumeOffer({
  detail,
  done,
  total,
  busy = false,
  onResume,
  onDiscard,
}: {
  /** Was angefangen war, z. B. „ck und tz · Stufe 2“. */
  detail: string;
  done: number;
  total: number;
  /** Das Fortsetzen wird vorbereitet (z. B. die Stimme). */
  busy?: boolean;
  onResume: () => void;
  onDiscard: () => void;
}) {
  const titleId = useId();
  return (
    <Card look="pop" className="ui ui-stack" aria-labelledby={titleId}>
      <div className="ui-stack" style={{ ["--gap" as string]: "4px" }}>
        <h2 id={titleId} className="ui-h-section">
          Du warst mitten in einer Runde
        </h2>
        <p className="ui-small ui-muted">{detail}</p>
      </div>
      <div className="ui-row ui-wrap">
        <Button variant="green" disabled={busy} onClick={onResume}>
          Weitermachen ({resumeProgressLabel(done, total)})
        </Button>
        <Button variant="ghost" disabled={busy} onClick={onDiscard}>
          Neu anfangen
        </Button>
      </div>
    </Card>
  );
}
