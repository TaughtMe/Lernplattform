import assert from "node:assert/strict";
import test from "node:test";
import { hashPin, verifyPin, generateSalt } from "../src/klasse/teacher-auth.ts";

test("hashPin/verifyPin: the correct PIN verifies", async () => {
  const stored = await hashPin("1234");
  assert.equal(await verifyPin("1234", stored), true);
});

test("hashPin/verifyPin: a wrong PIN is rejected", async () => {
  const stored = await hashPin("1234");
  assert.equal(await verifyPin("9999", stored), false);
});

test("hashPin: never stores the PIN in plain text", async () => {
  const stored = await hashPin("1234");
  assert.ok(!stored.hash.includes("1234"));
  assert.ok(!stored.salt.includes("1234"));
});

test("hashPin: two calls produce different salts and hashes even for the same PIN", async () => {
  const a = await hashPin("1234");
  const b = await hashPin("1234");
  assert.notEqual(a.salt, b.salt);
  assert.notEqual(a.hash, b.hash);
});

test("generateSalt: produces a 32-char hex string, different each time", () => {
  const a = generateSalt();
  const b = generateSalt();
  assert.equal(a.length, 32);
  assert.match(a, /^[0-9a-f]+$/);
  assert.notEqual(a, b);
});
