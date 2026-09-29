"use client";

import type { LiveRoomConfig } from "../../../src/integrations/laufdiktat/live-room-client";
import { Icon } from "../../ui/icons";
import { Button, Notice } from "../../ui/primitives";
import { MathBuilder } from "./math-builder";
import { ModeStep } from "./mode-step";
import { LiveStep, LobbyStep } from "./room-steps";
import { TextBuilder } from "./text-builder";
import {
  CONTENT_MODES,
  LABELS,
  useTeacherLiveRoom,
  type Stage,
  type TeacherLiveModel,
  type TeacherLiveRefs,
} from "./use-teacher-live-room";
import { VocabularyBuilder } from "./vocabulary-builder";

const STEPS: ReadonlyArray<{ id: Stage; label: string; title: string }> = [
  { id: "content", label: "Diktat", title: "Wortliste vorbereiten" },
  { id: "settings", label: "Modus", title: "Modus wählen" },
  { id: "lobby", label: "Lobby", title: "Lobby öffnen" },
  { id: "live", label: "Live", title: "Live-Sitzung" },
];

/**
 * Laufdiktat für Lehrkräfte (Design 5c/5d und 1d): Diktat → Modus → Lobby →
 * Live. Zustand und Raumabläufe liegen in useTeacherLiveRoom.
 */
export function TeacherLiveRoom({
  liveRoomConfig,
}: {
  liveRoomConfig: LiveRoomConfig | null;
}) {
  const [
    t,
    { mainRef, builderRef, sourceRef, markerContainerRef, mathEditInputRef },
  ] = useTeacherLiveRoom(liveRoomConfig);
  const stepIndex = STEPS.findIndex((step) => step.id === t.stage);
  const step = STEPS[stepIndex] ?? STEPS[0]!;

  return (
    <section
      className="ui ui-live"
      aria-labelledby="teacher-live-title"
      data-hydrated={t.hydrated ? "true" : "false"}
    >
      <header className="ui-live__head">
        <div className="ui-row">
          <button
            type="button"
            className="ui-icon-btn"
            aria-label="Zurück"
            disabled={t.stage === "content"}
            onClick={t.goBack}
          >
            <Icon name="back" size={18} />
          </button>
          <div className="ui-stack" style={{ ["--gap" as string]: "2px" }}>
            <p className="ui-small ui-muted">
              Laufdiktat · Schritt {stepIndex + 1} von 4
              {t.room ? ` · Raum ${t.room.code}` : ""}
            </p>
            <h1 id="teacher-live-title" className="ui-h-page">
              {step.title}
            </h1>
          </div>
        </div>
        <nav className="ui-live__steps" aria-label="Schritte">
          {STEPS.map(({ id, label }, index) => {
            const locked =
              (index > 0 && !t.words.length) ||
              (id === "lobby" && !t.room && t.stage !== "settings") ||
              (id === "live" && t.stage !== "live");
            return (
              <button
                key={id}
                type="button"
                aria-current={t.stage === id ? "step" : undefined}
                aria-label={`${index + 1}. ${label}`}
                disabled={locked}
                className={index < stepIndex ? "is-done" : undefined}
                onClick={() => t.jumpToStage(id)}
              >
                <span aria-hidden="true">
                  {index < stepIndex ? (
                    <Icon name="check" size={14} />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="ui-live__step-label">{label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      <main className="ui-live__main" ref={mainRef}>
        {t.stage === "content" ? (
          <ContentStep
            t={t}
            builderRef={builderRef}
            sourceRef={sourceRef}
            markerContainerRef={markerContainerRef}
            mathEditInputRef={mathEditInputRef}
          />
        ) : null}
        {t.stage === "settings" ? <ModeStep t={t} /> : null}
        {t.stage === "lobby" ? <LobbyStep t={t} /> : null}
        {t.stage === "live" ? <LiveStep t={t} /> : null}
        {t.error ? (
          <Notice tone="bad" role="alert">
            {t.error}
          </Notice>
        ) : t.connectionWarning ? (
          <Notice tone="bad" role="status">
            {t.connectionWarning}
          </Notice>
        ) : null}
      </main>

      <footer className="ui-live__foot">
        <p className="ui-small ui-muted ui-desktop-only">
          {t.stage === "live" && t.room
            ? `Raumcode ${t.room.code}`
            : t.stage === "content"
              ? "Der Raum entsteht erst, wenn du die Lobby öffnest."
              : "Schüler brauchen kein Konto"}
        </p>
        <Button
          variant={t.stage === "live" ? "bad" : "green"}
          size="lg"
          onClick={t.goForward}
          disabled={t.footerDisabled}
        >
          {forwardLabel(t)}
          {t.stage === "live" ? null : <Icon name="arrow" size={18} />}
        </Button>
      </footer>
    </section>
  );
}

function forwardLabel(t: TeacherLiveModel) {
  if (t.busy)
    return t.stage === "settings"
      ? "Öffnet …"
      : t.stage === "lobby"
        ? "Startet …"
        : t.stage === "live"
          ? "Beendet …"
          : "Weiter zu Modus";
  if (t.stage === "content") return "Weiter zu Modus";
  if (t.stage === "settings") return "Lobby öffnen";
  if (t.stage === "lobby")
    return t.gameMode === "STATION" ? "Stationen starten" : "Diktat starten";
  return "Sitzung beenden";
}

function ContentStep({
  t,
  builderRef,
  sourceRef,
  markerContainerRef,
  mathEditInputRef,
}: {
  t: TeacherLiveModel;
} & Pick<
  TeacherLiveRefs,
  "builderRef" | "sourceRef" | "markerContainerRef" | "mathEditInputRef"
>) {
  return (
    <div className="ui-stack" ref={builderRef}>
      <div
        className="ui-seg ui-live__tabs"
        role="tablist"
        aria-label="Aufgabenformat"
      >
        {CONTENT_MODES.map((mode) => (
          <button
            type="button"
            role="tab"
            key={mode}
            aria-selected={t.contentMode === mode}
            disabled={!t.hydrated}
            onClick={() => t.chooseContentMode(mode)}
          >
            {LABELS[mode]}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={`${LABELS[t.contentMode]} bearbeiten`}>
        {t.contentMode === "text" ? (
          <TextBuilder
            t={t}
            sourceRef={sourceRef}
            markerContainerRef={markerContainerRef}
          />
        ) : null}
        {t.contentMode === "vocabulary" ? <VocabularyBuilder t={t} /> : null}
        {t.contentMode === "math" ? (
          <MathBuilder t={t} mathEditInputRef={mathEditInputRef} />
        ) : null}
      </div>
    </div>
  );
}
