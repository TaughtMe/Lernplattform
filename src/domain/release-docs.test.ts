import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { releaseStagesMarkdown } from "./release";

describe("Freigabe-Tabelle im README", () => {
  it("stimmt mit den Standardstufen in release.ts überein", () => {
    const readme = readFileSync("README.md", "utf8");
    const match = readme.match(
      /<!-- freigabe:start -->([\s\S]*?)<!-- freigabe:end -->/,
    );
    expect(
      match,
      "README.md braucht die Marker <!-- freigabe:start --> und <!-- freigabe:end -->.",
    ).not.toBeNull();
    expect(
      match![1]!.trim(),
      "Die Freigabe-Tabelle im README weicht von src/domain/release.ts ab. " +
        "Neu erzeugen: Ausgabe von releaseStagesMarkdown() zwischen die Marker setzen " +
        "und `npx prettier --write README.md` ausführen.",
    ).toBe(releaseStagesMarkdown());
  });
});
