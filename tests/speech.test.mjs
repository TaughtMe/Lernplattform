import assert from "node:assert/strict";
import test from "node:test";
import { isSpeechSupported, speak } from "../src/laufdiktat/speech.ts";

test("isSpeechSupported: false outside the browser (no window)", () => {
  assert.equal(isSpeechSupported(), false);
});

test("speak: is a silent no-op outside the browser", () => {
  assert.doesNotThrow(() => speak("Haus"));
});
