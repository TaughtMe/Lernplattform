/** Fingerfarben der Tastenwelt (Design 6a): ein Farbton je Finger. */
import type { Finger } from "../../../src/tastschreiben/keyboard-layout";

export const FINGER_HUE: Record<Finger, number> = {
  "left-pinky": 25,
  "left-ring": 60,
  "left-middle": 95,
  "left-index": 140,
  "right-index": 185,
  "right-middle": 245,
  "right-ring": 295,
  "right-pinky": 345,
  thumb: 70,
};

export const FINGER_NAME: Record<Finger, string> = {
  "left-pinky": "linker kleiner Finger",
  "left-ring": "linker Ringfinger",
  "left-middle": "linker Mittelfinger",
  "left-index": "linker Zeigefinger",
  "right-index": "rechter Zeigefinger",
  "right-middle": "rechter Mittelfinger",
  "right-ring": "rechter Ringfinger",
  "right-pinky": "rechter kleiner Finger",
  thumb: "Daumen",
};

export const LEFT_HAND: ReadonlyArray<[Finger, string]> = [
  ["left-pinky", "Klein"],
  ["left-ring", "Ring"],
  ["left-middle", "Mittel"],
  ["left-index", "Zeige"],
  ["thumb", "Daumen"],
];

export const RIGHT_HAND: ReadonlyArray<[Finger, string]> = [
  ["thumb", "Daumen"],
  ["right-index", "Zeige"],
  ["right-middle", "Mittel"],
  ["right-ring", "Ring"],
  ["right-pinky", "Klein"],
];
