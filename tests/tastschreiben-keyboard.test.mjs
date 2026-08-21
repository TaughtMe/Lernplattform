import assert from "node:assert/strict";
import test from "node:test";
import { lookupChar, fingerForChar, handOf, HOME_ROW_KEYS, KEYBOARD_ROWS } from "../src/tastschreiben/keyboard-layout.ts";

test("lookupChar: finds base characters without needing shift", () => {
  const result = lookupChar("a");
  assert.ok(result);
  assert.equal(result.needsShift, false);
  assert.equal(result.key.base, "a");
});

test("lookupChar: finds shifted characters and reports needsShift", () => {
  const result = lookupChar("A");
  assert.ok(result);
  assert.equal(result.needsShift, true);
  assert.equal(result.key.base, "a");
});

test("lookupChar: returns undefined for a character not on the keyboard", () => {
  assert.equal(lookupChar("€"), undefined);
});

test("fingerForChar: home row keys map to the expected fingers", () => {
  assert.equal(fingerForChar("a"), "left-pinky");
  assert.equal(fingerForChar("f"), "left-index");
  assert.equal(fingerForChar("j"), "right-index");
  assert.equal(fingerForChar("ö"), "right-pinky");
});

test("fingerForChar: shifted characters resolve to the same finger as their base", () => {
  assert.equal(fingerForChar("A"), fingerForChar("a"));
  assert.equal(fingerForChar(","), fingerForChar(";"));
});

test("handOf: thumb and left fingers are 'left', the rest are 'right'", () => {
  assert.equal(handOf("thumb"), "left");
  assert.equal(handOf("left-index"), "left");
  assert.equal(handOf("right-index"), "right");
  assert.equal(handOf("right-pinky"), "right");
});

test("HOME_ROW_KEYS: exactly the eight resting-position keys", () => {
  assert.deepEqual(HOME_ROW_KEYS, ["a", "s", "d", "f", "j", "k", "l", "ö"]);
});

test("every key on the keyboard has a unique base character", () => {
  const bases = KEYBOARD_ROWS.flat().map((k) => k.base);
  assert.equal(new Set(bases).size, bases.length, "no duplicate base keys");
});
