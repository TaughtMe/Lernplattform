/**
 * Vom Text zum Audio (Plan 3.3), ohne Browser- und ONNX-Abhängigkeit: Der
 * Worker übergibt Phonemizer und Modellaufruf. So ist der Ablauf testbar.
 */
import type { SpeechLanguage } from "./manifest";
import { styleFor, type VoiceTable } from "./npz";
import { tokenize } from "./symbols";
import { chunkText, phonemizeWithPunctuation } from "./text";

export type ModelRun = (input: {
  ids: number[];
  style: Float32Array;
  speed: number;
}) => Promise<Float32Array>;

export type SynthesisParts = {
  entry: SpeechLanguage;
  voices: VoiceTable;
  phonemize: (words: string) => string;
  run: ModelRun;
};

/** Stimme nach Wunsch, sonst die Vorgabe der Sprache. */
export function resolveVoice(
  entry: SpeechLanguage,
  wanted?: string | undefined,
) {
  return (
    entry.voiceList.find(
      (voice) => voice.id === wanted || voice.label === wanted,
    ) ??
    entry.voiceList.find((voice) => voice.id === entry.defaultVoice) ??
    entry.voiceList[0]
  );
}

/** Erzeugt Audio für einen Text; Stücke werden aneinandergehängt. */
export async function synthesizeText(
  text: string,
  options: { voice?: string | undefined; speed: number },
  parts: SynthesisParts,
): Promise<Float32Array> {
  const voice = resolveVoice(parts.entry, options.voice);
  const table = voice ? parts.voices[voice.id] : undefined;
  if (!voice || !table) throw new Error("Stimme fehlt in der Stimmen-Datei");
  const speed = options.speed * voice.speedPrior;

  const pieces: Float32Array[] = [];
  for (const chunk of chunkText(text)) {
    const phonemes = phonemizeWithPunctuation(chunk, parts.phonemize);
    if (!phonemes) continue;
    const ids = tokenize(phonemes);
    const audio = await parts.run({
      ids,
      style: styleFor(table, ids.length),
      speed,
    });
    pieces.push(
      audio.subarray(0, Math.max(0, audio.length - parts.entry.trimSamples)),
    );
  }

  const length = pieces.reduce((sum, piece) => sum + piece.length, 0);
  const result = new Float32Array(length);
  let offset = 0;
  for (const piece of pieces) {
    result.set(piece, offset);
    offset += piece.length;
  }
  return result;
}
