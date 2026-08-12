import { describe, expect, it } from "vitest";
import { LOCAL_DATA_AREAS } from "./local-data-boundaries";

describe("local data boundaries", () => {
  it("uses distinct versioned namespaces for every role area", () => {
    const namespaces = Object.values(LOCAL_DATA_AREAS);

    expect(new Set(namespaces).size).toBe(namespaces.length);
    expect(namespaces).toEqual([
      "lernraum:personal:v1",
      "lernraum:classes:v1",
      "lernraum:teacher:v1",
    ]);
  });
});
