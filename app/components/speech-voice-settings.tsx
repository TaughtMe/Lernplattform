"use client";

import { useEffect } from "react";
import {
  installLanguage,
  languageStatus,
} from "../../src/speech/model/model-speaker";
import { useAreaVisible } from "../release/release-context";
import { useSpeechVoiceSettings } from "../ui/use-speech-voice-settings";
import { VoiceSettingsBody } from "../views/parts/voice-settings";
import { SettingsGroup } from "../views/lehrer/settings-screen";
import { manageStyles as m } from "../views/lehrer/manage-parts";

function useVoiceSettings() {
  const visible = useAreaVisible("sprachmodell");
  const settings = useSpeechVoiceSettings(visible);
  return { visible, settings };
}

function Body({
  settings,
}: {
  settings: ReturnType<typeof useSpeechVoiceSettings>;
}) {
  return (
    <VoiceSettingsBody
      languages={settings.languages}
      onSelect={settings.select}
      onSample={(code) => void settings.sample(code)}
      onInstall={(code) => void settings.install(code)}
      onRemove={(code) => void settings.remove(code)}
    />
  );
}

/** Karte „Vorlesen“ in den Einstellungen der Schülerinnen und Schüler. */
export function StudentVoiceSettings() {
  const { visible, settings } = useVoiceSettings();
  if (!visible || settings.languages.length === 0) return null;
  return (
    <section
      className="ui-card ui-card--pad ui-stack"
      aria-labelledby="voice-settings-title"
    >
      <h2 id="voice-settings-title" className="ui-h-section">
        Vorlesen
      </h2>
      <Body settings={settings} />
    </section>
  );
}

/** Gruppe „Vorlesen“ in den Einstellungen der Lehrkraft. */
export function TeacherVoiceSettings() {
  const { visible, settings } = useVoiceSettings();
  if (!visible || settings.languages.length === 0) return null;
  return (
    <SettingsGroup
      title="Vorlesen"
      hint="Stimme je Sprache und Installation auf diesem Gerät."
    >
      <div className={m.card}>
        <Body settings={settings} />
      </div>
    </SettingsGroup>
  );
}

/** Nach dem Start der installierten App so lange warten, bevor geladen wird. */
const AUTO_INSTALL_DELAY_MS = 8000;

/**
 * Installiert Deutsch im Hintergrund, wenn Lernraum als App installiert ist
 * (display-mode standalone) und kein Datensparmodus an ist. Im Browser-Tab
 * lädt eine Sprache beim ersten Vorlesen oder über „Installieren“.
 */
export function SpeechModelAutoInstall() {
  const visible = useAreaVisible("sprachmodell");
  useEffect(() => {
    if (!visible || typeof window === "undefined") return;
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches === true ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    if (!standalone || connection?.saveData) return;
    const timer = setTimeout(() => {
      void languageStatus("de").then((status) => {
        if (status === "missing") void installLanguage("de");
      });
    }, AUTO_INSTALL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [visible]);
  return null;
}
