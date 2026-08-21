import assert from "node:assert/strict";
import test from "node:test";
import { isSoundSupported, isSoundEnabled, setSoundEnabled, playClick, playError, playComplete } from "../src/tastschreiben/sound.ts";

test("isSoundSupported: false outside the browser (no window)", () => {
  assert.equal(isSoundSupported(), false);
});

test("isSoundEnabled/setSoundEnabled: default false outside the browser, does not throw", () => {
  assert.equal(isSoundEnabled(), false);
  assert.doesNotThrow(() => setSoundEnabled(false));
});

test("playClick/playError/playComplete: silent no-ops outside the browser", () => {
  assert.doesNotThrow(() => playClick());
  assert.doesNotThrow(() => playError());
  assert.doesNotThrow(() => playComplete());
});
