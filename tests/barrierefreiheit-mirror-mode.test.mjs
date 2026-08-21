import assert from "node:assert/strict";
import test from "node:test";
import {
  computeMirrorUntil,
  isMirrorActive,
  remainingMinutes,
  hasMirrorPin,
  verifyMirrorPin,
  getMirrorUntil,
  grantMirrorMode,
  endMirrorMode,
} from "../src/barrierefreiheit/mirror-mode.ts";

const NOW = Date.parse("2026-08-21T10:00:00.000Z");

test("computeMirrorUntil: adds the given number of minutes", () => {
  assert.equal(computeMirrorUntil(20, NOW), new Date(NOW + 20 * 60_000).toISOString());
});

test("isMirrorActive: true while the until timestamp is still in the future", () => {
  const until = computeMirrorUntil(20, NOW);
  assert.equal(isMirrorActive(until, NOW), true);
  assert.equal(isMirrorActive(until, NOW + 19 * 60_000), true);
});

test("isMirrorActive: false once the until timestamp has passed", () => {
  const until = computeMirrorUntil(20, NOW);
  assert.equal(isMirrorActive(until, NOW + 21 * 60_000), false);
});

test("isMirrorActive: false for null, empty, or garbled input", () => {
  assert.equal(isMirrorActive(null, NOW), false);
  assert.equal(isMirrorActive("", NOW), false);
  assert.equal(isMirrorActive("not-a-date", NOW), false);
});

test("remainingMinutes: rounds up so the last minute doesn't disappear early", () => {
  const until = computeMirrorUntil(20, NOW);
  assert.equal(remainingMinutes(until, NOW), 20);
  assert.equal(remainingMinutes(until, NOW + 19 * 60_000 + 1), 1);
});

test("remainingMinutes: zero once expired or for missing input", () => {
  const until = computeMirrorUntil(20, NOW);
  assert.equal(remainingMinutes(until, NOW + 20 * 60_000), 0);
  assert.equal(remainingMinutes(null, NOW), 0);
});

test("outside the browser (no window): PIN/grant helpers are safe no-ops", () => {
  assert.equal(hasMirrorPin(), false);
  assert.equal(getMirrorUntil(), null);
  assert.doesNotThrow(() => grantMirrorMode(20));
  assert.doesNotThrow(() => endMirrorMode());
});

test("outside the browser: verifyMirrorPin resolves false rather than throwing", async () => {
  assert.equal(await verifyMirrorPin("1234"), false);
});
