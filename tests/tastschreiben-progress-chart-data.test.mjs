import assert from "node:assert/strict";
import test from "node:test";
import { recentMetricPoints } from "../src/tastschreiben/progress-chart-data.ts";

function attempt(occurredAt, wpm, accuracy) {
  return { occurredAt, wpm, accuracy };
}

test("recentMetricPoints: empty history gives empty points", () => {
  assert.deepEqual(recentMetricPoints([], "wpm"), []);
});

test("recentMetricPoints: maps the requested metric with sequential index", () => {
  const history = [attempt("2026-01-01", 20, 90), attempt("2026-01-02", 25, 92)];
  assert.deepEqual(recentMetricPoints(history, "wpm"), [
    { index: 0, value: 20, occurredAt: "2026-01-01" },
    { index: 1, value: 25, occurredAt: "2026-01-02" },
  ]);
  assert.deepEqual(recentMetricPoints(history, "accuracy"), [
    { index: 0, value: 90, occurredAt: "2026-01-01" },
    { index: 1, value: 92, occurredAt: "2026-01-02" },
  ]);
});

test("recentMetricPoints: caps to the last maxPoints entries", () => {
  const history = Array.from({ length: 30 }, (_, i) => attempt(`2026-01-${i + 1}`, i, 100));
  const points = recentMetricPoints(history, "wpm", 5);
  assert.equal(points.length, 5);
  assert.deepEqual(
    points.map((p) => p.value),
    [25, 26, 27, 28, 29],
  );
});

test("recentMetricPoints: default maxPoints is 20", () => {
  const history = Array.from({ length: 25 }, (_, i) => attempt(`2026-01-${i + 1}`, i, 100));
  assert.equal(recentMetricPoints(history, "wpm").length, 20);
});
