"use client";

import { useId } from "react";
import { Button, Toggle } from "../../ui/primitives";

/**
 * Einstellung „Vorlesen“: Stimme je Sprache wählen, Probe hören, Sprache auf
 * dem Gerät installieren (docs/umsetzungsplan-sprachmodell.md, 3.7). Reine
 * Ansicht: Werte und Aktionen kommen als Props.
 */
export type VoiceLanguageStatus =
  "installed" | "missing" | "installing" | "failed";

export type VoiceLanguageView = {
  /** Grundsprache, z. B. `de`. */
  code: string;
  /** z. B. „Deutsch“. */
  label: string;
  voices: readonly { id: string; label: string; description: string }[];
  selected: string;
  status: VoiceLanguageStatus;
  /** Anteil 0–1 während der Installation. */
  progress: number;
  /** Noch zu ladende Menge in MB (gerundet). */
  sizeMb: number;
  /** Gerade läuft die Hörprobe. */
  sampling: boolean;
};

export type VoiceSettingsActions = {
  /** Lernraum-Stimme an oder aus (je Gerät). */
  onToggle?: (enabled: boolean) => void;
  onSelect?: (code: string, voice: string) => void;
  onSample?: (code: string) => void;
  onInstall?: (code: string) => void;
  onRemove?: (code: string) => void;
};

function statusText(language: VoiceLanguageView) {
  switch (language.status) {
    case "installed":
      return "Auf diesem Gerät installiert. Funktioniert auch ohne Internet.";
    case "installing":
      return `Wird installiert … ${Math.round(language.progress * 100)} %`;
    case "failed":
      return "Installation hat nicht geklappt. Mit Internet erneut versuchen.";
    default:
      return `Noch nicht auf diesem Gerät (etwa ${language.sizeMb} MB).`;
  }
}

function VoiceLanguage({
  language,
  actions,
}: {
  language: VoiceLanguageView;
  actions: VoiceSettingsActions;
}) {
  const titleId = useId();
  const selectId = useId();
  const busy = language.status === "installing";
  return (
    <div className="ui-stack" role="group" aria-labelledby={titleId}>
      <h3 id={titleId} className="ui-label">
        {language.label}
      </h3>
      <label className="ui-labeled" htmlFor={selectId}>
        Stimme für {language.label}
        <select
          id={selectId}
          className="ui-input"
          value={language.selected}
          onChange={(event) =>
            actions.onSelect?.(language.code, event.target.value)
          }
        >
          {language.voices.map((voice) => (
            <option key={voice.id} value={voice.id}>
              {voice.description
                ? `${voice.label} (${voice.description})`
                : voice.label}
            </option>
          ))}
        </select>
      </label>
      <div className="ui-row">
        <Button
          variant="soft"
          size="sm"
          disabled={busy || language.sampling}
          aria-label={`Probe hören: ${language.label}`}
          onClick={() => actions.onSample?.(language.code)}
        >
          {language.sampling ? "Spielt …" : "Probe hören"}
        </Button>
        {language.status === "installed" ? (
          <Button
            variant="ghost"
            size="sm"
            aria-label={`${language.label} vom Gerät entfernen`}
            onClick={() => actions.onRemove?.(language.code)}
          >
            Entfernen
          </Button>
        ) : (
          <Button
            variant="soft"
            size="sm"
            disabled={busy}
            aria-label={`${language.label} installieren`}
            onClick={() => actions.onInstall?.(language.code)}
          >
            Installieren
          </Button>
        )}
      </div>
      {busy ? (
        <progress
          max={1}
          value={language.progress}
          aria-label={`Installation ${language.label}`}
        />
      ) : null}
      {/* Live-Region ohne Rolle „status“: Der Stand ist meist ruhiger Text,
          Änderungen (Installation) werden trotzdem angesagt. */}
      <p className="ui-small ui-muted" aria-live="polite" aria-atomic="true">
        {statusText(language)}
      </p>
    </div>
  );
}

/** Inhalt der Einstellung; der Rahmen (Karte, Gruppe) kommt vom Aufrufer. */
export function VoiceSettingsBody({
  enabled = true,
  languages,
  ...actions
}: {
  /** Lernraum-Stimme ist auf diesem Gerät an. */
  enabled?: boolean;
  languages: readonly VoiceLanguageView[];
} & VoiceSettingsActions) {
  return (
    <div className="ui-stack">
      <Toggle
        label="Lernraum-Stimme verwenden"
        hint="Liest mit einer Stimme vor, die in Lernraum steckt und auf diesem Gerät läuft. Ausgeschaltet lesen die Stimmen des Geräts vor."
        checked={enabled}
        onChange={(on) => actions.onToggle?.(on)}
      />
      {enabled ? (
        <>
          <p className="ui-small ui-muted">
            Die Sprache folgt der Übung, zum Beispiel der Sprache einer LernBox.
            Stimme und Installation gelten nur auf diesem Gerät.
          </p>
          {languages.map((language) => (
            <VoiceLanguage
              key={language.code}
              language={language}
              actions={actions}
            />
          ))}
        </>
      ) : null}
    </div>
  );
}
