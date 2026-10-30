import { HydrationGate } from "../../ui/hydration-gate";
import {
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Notice,
  PageHeader,
  Pill,
  ProgressBar,
} from "../../ui/primitives";

export type TrainingSegmentView = {
  id: string;
  /** Name des Moduls, z. B. „Kopfrechnen“. */
  title: string;
  /** „3 Aufgaben“ */
  count: string;
  /** „etwa 3 Minuten“ */
  duration: string;
  /** Teilbereiche, aus denen die Aufgaben kommen. */
  areas: string[];
  /** Arten, z. B. „Nochmal üben“, „Wiederholen“, „Neu“. */
  kinds: string[];
  href: string;
};

export type TrainingClock = {
  started: boolean;
  activeMs: number;
  budgetMs: number;
  phase: "running" | "paused" | "finish-current" | "closing";
  onStart: () => void;
};

const MINUTE_CHOICES = [10, 20] as const;

/** Anzeige der Uhr als „m:ss“. */
export function formatClock(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const rest = String(seconds % 60).padStart(2, "0");
  return `${Math.floor(seconds / 60)}:${rest}`;
}

const PHASE_TEXT: Record<Exclude<TrainingClock["phase"], "running">, string> = {
  paused:
    "Die Uhr ist angehalten. Sie läuft weiter, sobald du wieder etwas tippst.",
  "finish-current":
    "Die Zeit ist um. Mach deine Aufgabe noch fertig, dann kommt der Abschluss.",
  closing: "Geschafft! Das war dein Training für heute.",
};

/**
 * „Dein Training“ (D2-4): Dauer wählen, die Abfolge sehen, die aktive Zeit
 * mitlaufen lassen. Die Ansicht zeigt nur, was sie bekommt; Planung und Uhr
 * liegen im Container.
 */
export function TrainingScreen({
  status,
  minutes,
  onMinutes,
  summary,
  segments,
  emptyKind,
  clock,
}: {
  status: "loading" | "ready" | "error";
  minutes: 10 | 20;
  onMinutes: (minutes: 10 | 20) => void;
  summary?: string | undefined;
  segments: readonly TrainingSegmentView[];
  /** Warum nichts zu planen ist: noch keine Portion oder alles erledigt. */
  emptyKind?: "nothing" | "done" | undefined;
  clock: TrainingClock;
}) {
  return (
    <div className="ui-page">
      <PageHeader eyebrow="Heute" title="Dein Training">
        Wähle, wie lange du üben möchtest. Wir suchen die Aufgaben für dich aus.
      </PageHeader>

      <HydrationGate className="ui-stack">
        <p className="ui-label" id="training-dauer">
          Wie lange?
        </p>
        <div
          className="ui-row ui-wrap"
          role="group"
          aria-labelledby="training-dauer"
        >
          {MINUTE_CHOICES.map((choice) => (
            <button
              key={choice}
              type="button"
              className="ui-chip"
              aria-pressed={minutes === choice}
              onClick={() => onMinutes(choice)}
            >
              {choice} Minuten
            </button>
          ))}
        </div>
      </HydrationGate>

      {status === "loading" ? (
        <p className="ui-small ui-muted" role="status">
          Dein Training wird vorbereitet …
        </p>
      ) : null}
      {status === "error" ? (
        <Notice tone="bad" role="status">
          Dein Lernstand ist auf diesem Gerät gerade nicht verfügbar.
        </Notice>
      ) : null}

      {status === "ready" && emptyKind === "done" ? (
        <EmptyState title="Dein Teil für heute ist geschafft">
          Du kannst frei weiterüben, wenn du magst.
        </EmptyState>
      ) : null}
      {status === "ready" && emptyKind === "nothing" ? (
        <EmptyState title="Heute ist noch nichts dran">
          Sobald du etwas geübt hast, suchen wir dir hier Aufgaben aus.
        </EmptyState>
      ) : null}

      {status === "ready" && segments.length > 0 ? (
        <>
          <Card look="soft" className="ui-stack" aria-labelledby="training-uhr">
            <h2 id="training-uhr" className="ui-h-section">
              Deine Zeit
            </h2>
            {clock.started ? (
              <>
                <p className="ui-big-num">
                  <span className="ui-sr-only">Aktive Zeit: </span>
                  {formatClock(clock.activeMs)}
                  <span className="ui-small ui-muted">
                    {" "}
                    von {formatClock(clock.budgetMs)}
                  </span>
                </p>
                <ProgressBar
                  value={clock.activeMs}
                  max={clock.budgetMs}
                  label="Zeit im Training"
                  tone="green"
                />
                {clock.phase !== "running" ? (
                  <p role="status" className="ui-small">
                    {PHASE_TEXT[clock.phase]}
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <p className="ui-small ui-muted">
                  {summary} Die Uhr zählt nur, wenn du wirklich übst.
                </p>
                <div>
                  <Button onClick={clock.onStart}>Training starten</Button>
                </div>
              </>
            )}
          </Card>

          <ol className="ui-list" aria-label="Deine Aufgaben">
            {segments.map((segment, index) => (
              <li key={segment.id} className="ui-item">
                <div className="ui-grow ui-stack">
                  <div className="ui-row ui-wrap">
                    <strong>
                      {index + 1}. {segment.title}
                    </strong>
                    <span className="ui-small ui-muted">
                      {segment.count} · {segment.duration}
                    </span>
                  </div>
                  {segment.areas.length > 0 ? (
                    <p className="ui-small ui-muted">
                      {segment.areas.join(", ")}
                    </p>
                  ) : null}
                  <div className="ui-row ui-wrap">
                    {segment.kinds.map((kind) => (
                      <Pill key={kind}>{kind}</Pill>
                    ))}
                  </div>
                </div>
                <ButtonLink
                  size="sm"
                  href={segment.href}
                  aria-label={`Los, ${index + 1}. ${segment.title}`}
                >
                  Los
                </ButtonLink>
              </li>
            ))}
          </ol>
        </>
      ) : null}
    </div>
  );
}
