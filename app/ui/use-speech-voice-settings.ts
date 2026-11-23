"use client";

import { useCallback, useEffect, useState } from "react";
import {
  installLanguage,
  languageStatus,
  missingBytes,
  modelLanguages,
  removeLanguage,
  speakSample,
} from "../../src/speech/model/model-speaker";
import { resolveVoice } from "../../src/speech/model/manifest";
import {
  readVoicePreferences,
  setPreferredVoice,
  subscribeVoicePreferences,
} from "../../src/speech/model/voice-preferences";
import type { VoiceLanguageView } from "../views/parts/voice-settings";

const MB = 1024 * 1024;

/** Liest Sprachen, Stimmen, Wahl und Installationsstand. */
async function loadViews(): Promise<VoiceLanguageView[]> {
  const preferences = readVoicePreferences();
  const list = await modelLanguages();
  return Promise.all(
    list.map(async ({ code, entry }) => {
      const status = await languageStatus(code);
      return {
        code,
        label: entry.label,
        voices: entry.voiceList,
        selected: resolveVoice(entry, preferences[code]).id,
        status: status === "installed" ? "installed" : "missing",
        progress: 0,
        sizeMb: Math.max(1, Math.round((await missingBytes(code)) / MB)),
        sampling: false,
      } satisfies VoiceLanguageView;
    }),
  );
}

/** Eine laufende Installation oder Hörprobe behält ihren Zustand. */
function merge(
  current: VoiceLanguageView[],
  views: VoiceLanguageView[],
): VoiceLanguageView[] {
  return views.map((view) => {
    const old = current.find((item) => item.code === view.code);
    if (!old) return view;
    return {
      ...view,
      sampling: old.sampling,
      ...(old.status === "installing"
        ? { status: old.status, progress: old.progress }
        : {}),
    };
  });
}

/**
 * Zustand und Aktionen der Einstellung „Vorlesen“ (Stimme je Sprache,
 * Installieren). `enabled` ist die Freigabe `sprachmodell`.
 */
export function useSpeechVoiceSettings(enabled: boolean) {
  const [languages, setLanguages] = useState<VoiceLanguageView[]>([]);

  const patch = useCallback(
    (code: string, change: Partial<VoiceLanguageView>) =>
      setLanguages((current) =>
        current.map((language) =>
          language.code === code ? { ...language, ...change } : language,
        ),
      ),
    [],
  );

  const refresh = useCallback(() => {
    void loadViews().then((views) =>
      setLanguages((current) => merge(current, views)),
    );
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = () => {
      void loadViews().then((views) => {
        if (alive) setLanguages((current) => merge(current, views));
      });
    };
    load();
    const unsubscribe = subscribeVoicePreferences(load);
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [enabled]);

  const select = useCallback(
    (code: string, voice: string) => {
      setPreferredVoice(code, voice);
      patch(code, { selected: voice });
    },
    [patch],
  );

  const install = useCallback(
    async (code: string) => {
      patch(code, { status: "installing", progress: 0 });
      const ok = await installLanguage(code, (progress) =>
        patch(code, { progress }),
      );
      patch(code, { status: ok ? "installed" : "failed", progress: 0 });
      if (ok) refresh();
    },
    [patch, refresh],
  );

  const remove = useCallback(
    async (code: string) => {
      await removeLanguage(code);
      refresh();
    },
    [refresh],
  );

  const sample = useCallback(
    async (code: string) => {
      const language = languages.find((item) => item.code === code);
      if (!language) return;
      patch(code, { sampling: true });
      try {
        await speakSample(code, language.selected);
      } finally {
        patch(code, { sampling: false });
        refresh();
      }
    },
    [languages, patch, refresh],
  );

  return { languages, select, install, remove, sample };
}
