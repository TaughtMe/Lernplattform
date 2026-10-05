import { fireEvent } from "@testing-library/react";

/** Zwei Finger legen sich auf die Spielfläche. */
export function twoFingersDown(stage: Element) {
  for (const pointerId of [1, 2]) {
    fireEvent.pointerDown(stage, { pointerId, pointerType: "touch" });
  }
}

export function fingerUp(stage: Element, pointerId: number) {
  fireEvent.pointerUp(stage, { pointerId, pointerType: "touch" });
}

/** Beide Finger heben ab. */
export function twoFingersUp(stage: Element) {
  fingerUp(stage, 1);
  fingerUp(stage, 2);
}

/** Zeigen und loslassen wie im Spiel: Wort sehen, dann Schreibfeld. */
export function revealWithTwoFingers(container: HTMLElement) {
  const stage = container.querySelector("[data-game-surface]") as HTMLElement;
  twoFingersDown(stage);
  twoFingersUp(stage);
}

export function keysDown() {
  fireEvent.keyDown(window, { code: "KeyA", key: "a" });
  fireEvent.keyDown(window, { code: "KeyL", key: "l" });
}

export function keysUp() {
  fireEvent.keyUp(window, { code: "KeyL", key: "l" });
  fireEvent.keyUp(window, { code: "KeyA", key: "a" });
}
