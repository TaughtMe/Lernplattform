"use client";

import type { TeacherGameMode } from "../../../src/integrations/laufdiktat/teacher-session";
import { Icon, type IconName } from "../../ui/icons";
import { Card, NumberStepper, Toggle } from "../../ui/primitives";
import { MODES, type TeacherLiveModel } from "./use-teacher-live-room";

const MODE_ICON: Record<TeacherGameMode, IconName> = {
  LAUFDIKTAT: "run",
  UEBUNG: "ear",
  BATTLE: "duel",
  STATION: "pin",
};

/** Schritt 2: Spielmodus und Optionen. */
export function ModeStep({ t }: { t: TeacherLiveModel }) {
  const mode = t.activeMode;
  const station = t.gameMode === "STATION";
  return (
    <div className="ui-live__columns">
      <div
        className="ui-stack"
        role="radiogroup"
        aria-label="Spielmodus wählen"
      >
        {MODES.map((item) => (
          <button
            type="button"
            key={item.id}
            role="radio"
            aria-checked={t.gameMode === item.id}
            className="ui-select-card ui-live__mode"
            onClick={() => t.setGameMode(item.id)}
          >
            <span className="ui-icon-tile" aria-hidden="true">
              <Icon name={MODE_ICON[item.id]} size={22} />
            </span>
            <span
              className="ui-stack ui-grow"
              style={{ ["--gap" as string]: "2px" }}
            >
              <strong>{item.title}</strong>
              <span className="ui-small ui-muted">{item.short}</span>
            </span>
          </button>
        ))}
      </div>

      <Card look="pop" className="ui-stack" aria-labelledby="mode-title">
        <div className="ui-row">
          <span className="ui-icon-tile" aria-hidden="true">
            <Icon name={MODE_ICON[mode.id]} size={22} />
          </span>
          <h2 id="mode-title" className="ui-h-section">
            {mode.title}
          </h2>
        </div>
        <p className="ui-small ui-muted">{mode.text}</p>
        <ol className="ui-live__flow" aria-label="Ablauf">
          {mode.steps.map((step, index) => (
            <li key={step}>
              <span aria-hidden="true">{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>

        <h3 className="ui-label">Optionen</h3>
        {t.gameMode === "UEBUNG" ? (
          <span className="ui-between">
            <span className="ui-small">Fehlversuche bis Lösung</span>
            <NumberStepper
              label="Fehlversuche bis Lösung"
              value={t.attempts}
              min={1}
              max={10}
              onChange={t.setAttempts}
            />
          </span>
        ) : null}
        {t.gameMode === "BATTLE" ? (
          <>
            <Toggle
              label="Tintenfleck-Angriff"
              checked={t.battleInk}
              onChange={t.setBattleInk}
            />
            <Toggle
              label="Flimmer-Angriff"
              checked={t.battleFlicker}
              onChange={t.setBattleFlicker}
            />
          </>
        ) : null}
        {station ? (
          <span className="ui-between">
            <span className="ui-small">Anzahl Schülernummern</span>
            <NumberStepper
              label="Anzahl Schülernummern"
              value={t.stationCount}
              min={1}
              max={100}
              onChange={t.setStationCount}
            />
          </span>
        ) : null}
        <Toggle label="Vorlesen erlauben" checked={t.tts} onChange={t.setTts} />
        <Toggle
          label={
            station
              ? "Reihenfolge je Schülernummer mischen"
              : "Reihenfolge pro Schüler mischen"
          }
          checked={station ? t.stationShuffle : t.shuffleWords}
          onChange={station ? t.setStationShuffle : t.setShuffleWords}
        />
        {!station ? (
          <>
            <Toggle
              label="Nur getippte Eingaben erlauben"
              checked={t.strictTyping}
              onChange={t.setStrictTyping}
            />
            <Toggle
              label="Sterne anzeigen"
              checked={t.showStars}
              onChange={t.setShowStars}
            />
          </>
        ) : null}
      </Card>
    </div>
  );
}
