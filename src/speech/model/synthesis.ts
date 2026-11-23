/**
 * Vom Text zum Audio wie `KittenTTS2Tiny.generate` (kittenml 0.9.8), ohne
 * Browser- und ONNX-Abhängigkeit: Der Worker übergibt Frontend und
 * Modellaufruf. So ist der Ablauf testbar.
 */
import { resolveVoice, type SpeechLanguage } from "./manifest";
import type { VoiceTable } from "./npz";
import { tokenize } from "./frontend";

/** Pause zwischen zwei Stücken (`GAP_S`). */
export const GAP_SECONDS = 0.15;

export type ModelRun = (input: {
  ids: number[];
  style: Float32Array;
  speed: number;
}) => Promise<{ waveform: Float32Array; durations: number[] }>;

export type SynthesisParts = {
  entry: SpeechLanguage;
  vocab: Readonly<Record<string, number>>;
  voices: VoiceTable;
  sampleRate: number;
  /** Text → Lautschrift-Stücke (`phonemeChunks`). */
  frontend: (text: string) => string[];
  run: ModelRun;
};

/** Stilzeile einer Stimme: `min(Tokenzahl − 1, Zeilen − 1)` wie `_chunk`. */
export function styleRow(
  voice: { data: Float32Array; shape: number[] },
  tokenCount: number,
): Float32Array {
  if (voice.shape.length < 2) return voice.data;
  const rows = voice.shape[0] ?? 1;
  const width = voice.data.length / rows;
  const row = Math.max(0, Math.min(tokenCount - 1, rows - 1));
  return voice.data.slice(row * width, (row + 1) * width);
}

/** Pythons `round`: bei genau .5 zur geraden Zahl. */
export function roundHalfEven(value: number): number {
  const floor = Math.floor(value);
  const rest = value - floor;
  if (rest < 0.5) return floor;
  if (rest > 0.5) return floor + 1;
  return floor % 2 === 0 ? floor : floor + 1;
}

/**
 * Ein Stück zuschneiden wie `_chunk`: begrenzen, Anfang (außer beim ersten
 * Stück) und Ende-Token nach den Dauern kürzen, 5-ms-Blenden.
 */
export function trimChunk(
  waveform: Float32Array,
  durations: readonly number[],
  keepStart: boolean,
): Float32Array {
  let wave = Float32Array.from(waveform, (value) =>
    Math.max(-1, Math.min(1, value)),
  );
  const total = durations.reduce((sum, value) => sum + value, 0);
  const perFrame = Math.max(1, roundHalfEven(wave.length / Math.max(total, 1)));
  const lead = keepStart ? 0 : Math.max(0, (durations[0] ?? 0) - 1) * perFrame;
  const trail = Math.max(0, (durations.at(-1) ?? 0) - 1) * perFrame;
  if (lead + trail + perFrame < wave.length) {
    wave = wave.slice(lead, wave.length - trail);
  }
  const fade = Math.min(120, Math.floor(wave.length / 8));
  if (fade === 1) wave[0] = 0;
  if (fade > 1) {
    for (let index = 0; index < fade; index += 1) {
      const gain = index / (fade - 1);
      wave[index] = (wave[index] ?? 0) * gain;
      const end = wave.length - 1 - index;
      wave[end] = (wave[end] ?? 0) * gain;
    }
  }
  return wave;
}

/** Erzeugt Audio für einen Text; Stücke mit 0,15 s Pause dazwischen. */
export async function synthesizeText(
  text: string,
  options: { voice?: string | null | undefined; speed: number },
  parts: SynthesisParts,
): Promise<Float32Array> {
  const voice = resolveVoice(parts.entry, options.voice);
  const table = parts.voices[voice.id];
  if (!table) throw new Error("Stimme fehlt in der Stimmen-Datei");

  const pieces: Float32Array[] = [];
  for (const [index, phonemes] of parts.frontend(text).entries()) {
    const ids = tokenize(phonemes, parts.vocab);
    const { waveform, durations } = await parts.run({
      ids,
      style: styleRow(table, ids.length),
      speed: options.speed,
    });
    pieces.push(trimChunk(waveform, durations, index === 0));
  }

  const gap = Math.round(GAP_SECONDS * parts.sampleRate);
  const length =
    pieces.reduce((sum, piece) => sum + piece.length, 0) +
    gap * Math.max(0, pieces.length - 1);
  const result = new Float32Array(length);
  let offset = 0;
  for (const [index, piece] of pieces.entries()) {
    if (index > 0) offset += gap;
    result.set(piece, offset);
    offset += piece.length;
  }
  return result;
}
