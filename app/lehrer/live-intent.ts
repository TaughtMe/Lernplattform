import * as z from "zod";
import { isQuickStartId } from "./quick-start";

/**
 * Start-Absicht von „Jetzt starten“ im Start-Overlay: Der Lehrer-Raum liest sie
 * genau einmal und löscht sie, bevor er den Raum erstellt. Sie trägt nur IDs
 * und den Modus, keine Tokens und keine Inhalte. Statt einer Inhalts-ID kann
 * sie die Kennung eines Schnellstarts tragen („Kopfrechnen live“, Wortbox).
 */
export const LIVE_INTENT_KEY = "lernraum.teacher-live-intent";

export const liveIntentSchema = z
  .object({
    contentId: z.string().min(1).max(200).optional(),
    /** Kennung einer Schnellstart-Vorgabe, siehe `quick-start.ts`. */
    quick: z.string().max(60).refine(isQuickStartId).optional(),
    mode: z.enum(["LAUFDIKTAT", "UEBUNG", "BATTLE", "STATION"]),
    /** Klasse des Raums; leer = „Nicht zugeordnet“, also ohne Klasse. */
    classId: z.union([z.literal(""), z.uuid()]),
  })
  .strict()
  .refine(
    (intent) =>
      (intent.contentId === undefined) !== (intent.quick === undefined),
    {
      message: "Entweder ein Inhalt oder ein Schnellstart.",
    },
  );

export type LiveIntent = z.infer<typeof liveIntentSchema>;

export function writeLiveIntent(intent: LiveIntent) {
  try {
    sessionStorage.setItem(
      LIVE_INTENT_KEY,
      JSON.stringify(liveIntentSchema.parse(intent)),
    );
    return true;
  } catch {
    return false;
  }
}

/** Liest die Absicht und löscht sie im selben Zug. */
export function takeLiveIntent(): LiveIntent | null {
  try {
    const raw = sessionStorage.getItem(LIVE_INTENT_KEY);
    sessionStorage.removeItem(LIVE_INTENT_KEY);
    if (!raw) return null;
    const parsed = liveIntentSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
