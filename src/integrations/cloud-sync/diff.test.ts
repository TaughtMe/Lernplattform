import { describe, expect, it } from "vitest";
import { differences } from "./diff";

describe("differences", () => {
  it("lists only changed fields with readable labels", () => {
    expect(
      differences(
        { title: "Mein", source: "a", updatedAt: "1", revision: 1 },
        { title: "Ihr", source: "a", updatedAt: "2", revision: 2 },
      ),
    ).toEqual([{ field: "title", label: "Titel", kept: "Mein", other: "Ihr" }]);
  });

  it("shows missing values, lists, flags and long text compactly", () => {
    const result = differences(
      { classIds: ["a", "b"], writingRelief: true, source: "x".repeat(300) },
      { enabledModules: [], unknown: { a: 1 }, writingRelief: false },
    );
    const byField = Object.fromEntries(result.map((d) => [d.field, d]));
    expect(byField["classIds"]).toMatchObject({ kept: "a, b", other: "–" });
    expect(byField["writingRelief"]).toMatchObject({
      kept: "ja",
      other: "nein",
    });
    expect(byField["source"]?.kept).toHaveLength(140);
    expect(byField["source"]?.kept.endsWith("…")).toBe(true);
    expect(byField["unknown"]).toMatchObject({
      label: "unknown",
      other: '{"a":1}',
    });
  });

  it("copes with a missing side", () => {
    expect(differences(undefined, { title: "A" })).toHaveLength(1);
    expect(differences(undefined, undefined)).toEqual([]);
  });
});
