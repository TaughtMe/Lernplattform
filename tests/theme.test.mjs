import assert from "node:assert/strict";
import test from "node:test";
import { isTheme, nextTheme } from "../src/ui/theme.ts";

test("isTheme: only accepts 'light' or 'dark'", () => {
  assert.equal(isTheme("light"), true);
  assert.equal(isTheme("dark"), true);
  assert.equal(isTheme("sepia"), false);
  assert.equal(isTheme(null), false);
});

test("nextTheme: toggles between light and dark", () => {
  assert.equal(nextTheme("light"), "dark");
  assert.equal(nextTheme("dark"), "light");
});
