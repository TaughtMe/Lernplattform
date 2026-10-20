import type {
  ContentKind,
  DictationMode,
  EditorMode,
  EditorOption,
} from "./types";
import { MODES } from "./constants";

/** Art des Inhalts für die Zeile über dem Titel („Neues Laufdiktat · Text“). */
export const KIND_LABELS: Record<ContentKind, string> = {
  text: "Text",
  vocabulary: "Vokabeln",
  math: "Mathe",
};

/** Modi ohne Angabe der Seite: die Kurztexte der Ansicht. */
export const DEFAULT_EDITOR_MODES: readonly EditorMode[] = MODES.map(
  ({ id, title, sub }) => ({ id, title, text: sub }),
);

/**
 * Optionen, die es im gewählten Modus wirklich gibt (Design 14c/16a/16b).
 * Stationen haben kein eigenes Tippen am Schülergerät, also weder „Nur
 * getippte Eingaben“ noch Sterne; die Aufgabenhilfe gibt es nur bei Mathe,
 * Tinte und Flimmern nur im Battle.
 */
export function dictationOptionList(
  mode: DictationMode,
  kind: ContentKind,
): EditorOption[] {
  const station = mode === "STATION";
  const all: Array<EditorOption & { show: boolean }> = [
    {
      id: "tts",
      label: "Vorlesen",
      hint: "Abschnitt kann vorgelesen werden, zählt als Spicker",
      show: true,
    },
    {
      id: "shuffle",
      label: "Reihenfolge mischen",
      hint: station
        ? "Jede Schülernummer startet an einer anderen Station"
        : "Jeder bekommt eine eigene Reihenfolge",
      show: true,
    },
    {
      id: "strict",
      label: "Nur getippte Eingaben",
      hint: "Verhindert Einfügen und Autokorrektur",
      show: !station,
    },
    {
      id: "taskHelp",
      label: "Aufgabe nach Fehlern zeigen",
      hint: "Nach 2 Fehlern steht die Aufgabe wieder im Antwortfeld",
      show: !station && kind === "math",
    },
    {
      id: "stars",
      label: "Sterne zeigen",
      hint: "Belohnung nach jedem Abschnitt",
      show: !station,
    },
    {
      id: "ink",
      label: "Tinten-Angriff",
      hint: "Treffer verdecken kurz den Text",
      show: mode === "BATTLE",
    },
    {
      id: "flicker",
      label: "Flimmer-Angriff",
      hint: "Treffer lassen das Wort kurz flimmern",
      show: mode === "BATTLE",
    },
  ];
  return all
    .filter((option) => option.show)
    .map(({ id, label, hint }) => ({ id, label, hint }));
}
