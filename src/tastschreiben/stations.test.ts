import { describe, expect, it } from "vitest";
import { TYPING_LESSONS } from "./curriculum";
import {
  aggregateProblemChars,
  buildTypingStations,
  stationStates,
} from "./stations";

describe("Lernweg der Tastenwelt", () => {
  it("bündelt jede Hauptlektion genau einmal zu zehn Stationen", () => {
    const stations = buildTypingStations();
    expect(stations.map((station) => station.title)).toEqual([
      "Grundstellung",
      "Obere Reihe",
      "Untere Reihe",
      "Großbuchstaben",
      "Zahlen",
      "Umlaute und Zeichen",
      "Alle Tasten",
      "Wörter",
      "Sätze",
      "Abschreibtexte",
    ]);
    const ids = stations.flatMap((station) =>
      station.lessons.map((lesson) => lesson.id),
    );
    expect(ids).toEqual(TYPING_LESSONS.map((lesson) => lesson.id));
  });

  it("zeigt Lektionen ohne Regel als weitere Station", () => {
    const extra = { ...TYPING_LESSONS[0]!, id: "neu-ohne-regel" };
    const stations = buildTypingStations([...TYPING_LESSONS, extra]);
    expect(stations.at(-1)).toMatchObject({
      id: "weitere",
      lessons: [extra],
    });
  });

  it("markiert geschaffte, aktuelle und gesperrte Stationen", () => {
    const stations = buildTypingStations();
    const first = stations[0]!.lessons.map((lesson) => lesson.id);
    const states = stationStates(
      stations,
      new Set([...first, "oben-zeigefinger"]),
    );
    expect(states[0]).toMatchObject({ state: "done", next: null });
    expect(states[1]).toMatchObject({ state: "current", done: 1 });
    expect(states[1]!.next?.id).toBe("oben-mittelfinger");
    expect(states[2]!.state).toBe("locked");
  });

  it("summiert unsichere Tasten über alle Lektionen", () => {
    expect(
      aggregateProblemChars(
        [
          {
            problemChars: [
              { char: "z", errors: 2 },
              { char: "ß", errors: 1 },
            ],
          },
          {
            problemChars: [
              { char: "z", errors: 1 },
              { char: "b", errors: 3 },
            ],
          },
        ],
        2,
      ),
    ).toEqual([
      { char: "b", errors: 3 },
      { char: "z", errors: 3 },
    ]);
  });
});
