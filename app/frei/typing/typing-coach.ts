/**
 * Hinweise der Tastenwelt (Design 6a): nächste Taste, Finger, Umschalt,
 * Kommentar des Tiers und Sterne. Reine Funktionen.
 */
import {
  lookupTypingCharacter,
  type Finger,
} from "../../../src/tastschreiben/keyboard-layout";
import { FINGER_HUE, FINGER_NAME } from "../../views/tastenwelt/fingers";

export type KeyTarget = {
  codes: string[];
  fingers: Finger[];
  hint: { text: string; hue: number } | null;
};

/** Tasten und Finger für das nächste Zeichen. */
export function keyTarget(char: string | undefined): KeyTarget {
  if (char === undefined) return { codes: [], fingers: [], hint: null };
  const info = lookupTypingCharacter(char);
  if (!info?.key.finger) return { codes: [], fingers: [], hint: null };
  const finger = info.key.finger;
  if (char === " ") {
    return {
      codes: [info.key.code],
      fingers: ["thumb"],
      hint: { text: "Leertaste · mit dem Daumen", hue: FINGER_HUE.thumb },
    };
  }
  const leftHand = finger.startsWith("left");
  const shiftFinger: Finger = leftHand ? "right-pinky" : "left-pinky";
  const codes = [info.key.code];
  const fingers: Finger[] = [finger];
  let text = `„${char}“ · ${FINGER_NAME[finger]}`;
  if (info.needsShift) {
    codes.push(leftHand ? "ShiftRight" : "ShiftLeft");
    fingers.push(shiftFinger);
    text += ` + Umschalt mit dem ${leftHand ? "rechten" : "linken"} kleinen Finger`;
  }
  return { codes, fingers, hint: { text, hue: FINGER_HUE[finger] } };
}

/** Tastencode eines getippten Zeichens (für die rote Fehlertaste). */
export function keyCodeOf(char: string) {
  return lookupTypingCharacter(char)?.key.code ?? null;
}

/** Sterne aus der Genauigkeit: ab 97 % drei, ab 90 % zwei, sonst einer. */
export function starsFor(accuracy: number) {
  return accuracy >= 97 ? 3 : accuracy >= 90 ? 2 : 1;
}

const quote = (char: string) => (char === " " ? "die Leertaste" : `„${char}“`);

/** Kommentar des Tiers während und nach der Übung. */
export function coachSay({
  done,
  accuracy,
  wrong,
  wanted,
  position,
  combo,
}: {
  done: boolean;
  accuracy: number;
  wrong: string | null;
  wanted: string | undefined;
  position: number;
  combo: number;
}) {
  if (done) {
    return accuracy >= 97
      ? "Wow, fast fehlerfrei! Das gibt drei Sterne."
      : "Geschafft! Beim nächsten Mal wird es noch genauer.";
  }
  if (wrong !== null && wanted !== undefined) {
    return `Hoppla, das war ${quote(wrong)}. Gesucht ist ${quote(wanted)}.`;
  }
  if (!position)
    return "Finger auf die Grundreihe. Auf F und J spürst du kleine Huckel.";
  if (combo >= 10) return `${combo} richtige am Stück! Bleib so genau.`;
  if (combo >= 5) return "Läuft! Nicht schneller werden, nur sauber bleiben.";
  return "Gut so. Schau auf den Bildschirm, nicht auf die Finger.";
}
