import { useState } from "react";
import {
  exerciseCardTitle,
  parseMathCardParams,
  type MathCardPreset,
} from "../../../src/domain/exercise-card";
import type { MathKindId } from "../../../src/domain/mental-math-kinds";
import type { MentalMathOperation } from "../../../src/domain/mental-math";
import { wantsDailyPlan } from "../../lernen/plan-today";

/**
 * Einstellung einer Übungskarte (L25-4) aus der Adresse. Ohne gültige Karte,
 * mit `?round=` (Wiederholung) oder `?heute=1` (Tagesportion) gibt es keine
 * Vorbelegung: diese Wege gehen vor.
 */
export function readCardPreset(
  params: URLSearchParams,
): { preset: MathCardPreset; title: string } | undefined {
  if (params.get("round") || wantsDailyPlan(params)) return undefined;
  const preset = parseMathCardParams(params);
  return preset
    ? { preset, title: exerciseCardTitle({ kind: "kopfrechnen", ...preset }) }
    : undefined;
}

/** Zeile im Einstellungsschritt; das Kind startet selbst (Entscheidung 86). */
export function CardNote({ title }: { title: string | undefined }) {
  if (!title) return null;
  return (
    <p className="ui-small" data-testid="card-note">
      Von deiner Übungskarte: <strong>{title}</strong>. Tippe auf „Runde
      starten“, wenn du bereit bist.
    </p>
  );
}

/**
 * Vorbelegung aus der Karte: `apply` ruft nur die Setter auf (Rechenarten,
 * Zahlenraum, Aufgabenarten) und merkt den Titel; es startet nichts.
 */
export function useCardPreset(
  setKinds: (kinds: MathKindId[]) => void,
  setOperations: (operations: MentalMathOperation[]) => void,
  setMax: (max: number) => void,
) {
  const [title, setTitle] = useState<string>();
  function apply(params: URLSearchParams) {
    const card = readCardPreset(params);
    if (!card) return;
    if ("mathKinds" in card.preset) setKinds(card.preset.mathKinds);
    else {
      setOperations(card.preset.operations);
      setMax(card.preset.max);
    }
    setTitle(card.title);
  }
  return { title, apply };
}
