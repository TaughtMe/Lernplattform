import { createHash } from "node:crypto";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { contentHash, sha256Hex, stableStringify } from "./hash";

describe("sha256Hex", () => {
  it("matches the reference implementation", () => {
    expect(sha256Hex("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("agrees with node:crypto for arbitrary text, including block borders", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 300 }), (text) => {
        expect(sha256Hex(text)).toBe(
          createHash("sha256").update(text).digest("hex"),
        );
      }),
    );
    for (const length of [54, 55, 56, 63, 64, 65, 119, 120]) {
      const text = "ä".repeat(length);
      expect(sha256Hex(text)).toBe(
        createHash("sha256").update(text).digest("hex"),
      );
    }
  });
});

describe("contentHash", () => {
  it("ignores key order and undefined fields", () => {
    expect(contentHash({ a: 1, b: [1, { c: 2, d: 3 }] })).toBe(
      contentHash({ b: [1, { d: 3, c: 2 }], a: 1, e: undefined }),
    );
    expect(stableStringify(undefined)).toBe("null");
  });

  it("distinguishes different content", () => {
    expect(contentHash({ a: 1 })).not.toBe(contentHash({ a: 2 }));
  });
});
