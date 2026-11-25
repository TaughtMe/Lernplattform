// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { takeLiveIntent, writeLiveIntent } from "./live-intent";

beforeEach(() => sessionStorage.clear());

describe("Start-Absicht", () => {
  it("trägt einen Inhalt der Ablage und wird einmal gelesen", () => {
    writeLiveIntent({ contentId: "p1", mode: "UEBUNG", classId: "" });
    expect(takeLiveIntent()).toEqual({
      contentId: "p1",
      mode: "UEBUNG",
      classId: "",
    });
    expect(takeLiveIntent()).toBeNull();
  });

  it("trägt einen Schnellstart", () => {
    writeLiveIntent({
      quick: "kopfrechnen-3",
      mode: "LAUFDIKTAT",
      classId: "",
    });
    expect(takeLiveIntent()?.quick).toBe("kopfrechnen-3");
  });

  it("lehnt eine unbekannte Vorgabe und beides zugleich ab", () => {
    expect(
      writeLiveIntent({ quick: "nichts", mode: "LAUFDIKTAT", classId: "" }),
    ).toBe(false);
    expect(
      writeLiveIntent({
        contentId: "p1",
        quick: "einmaleins",
        mode: "LAUFDIKTAT",
        classId: "",
      }),
    ).toBe(false);
    expect(takeLiveIntent()).toBeNull();
  });
});
