import assert from "node:assert/strict";
import test from "node:test";
import { createHouse } from "../src/klasse/haus.ts";

test("createHouse: produces a unique id tied to the class", () => {
  const a = createHouse("class-1", "Feuer");
  const b = createHouse("class-1", "Wasser");
  assert.notEqual(a.id, b.id);
  assert.equal(a.classId, "class-1");
  assert.equal(a.name, "Feuer");
});
