import { describe, expect, it } from "vitest";
import { parseClassWorkspace } from "./class-workspace";

const workspace = {
  id: "klasse-7b",
  name: "Klasse 7b",
  teacherName: "Frau Sommer",
  schoolYear: "2026/27",
  enabledModules: ["vocabulary", "typing"],
  todayPractice: [
    {
      id: "due",
      title: "Fällige Vokabeln",
      module: "vocabulary",
      reason: "due",
      amount: 8,
      route: "/klasse/7b/aufgaben/vokabeln",
      rankingEligible: true,
    },
  ],
  assignments: [
    {
      id: "typing",
      title: "Grundreihe",
      module: "typing",
      description: "Übe die Grundstellung.",
      route: "/klasse/7b/aufgaben/tippen",
      status: "new",
      rankingEligible: true,
    },
  ],
};

describe("class workspace", () => {
  it("accepts assignments from enabled modules", () => {
    expect(parseClassWorkspace(workspace).name).toBe("Klasse 7b");
  });

  it("rejects assignments from modules disabled by the teacher", () => {
    expect(() =>
      parseClassWorkspace({
        ...workspace,
        assignments: [{ ...workspace.assignments[0], module: "mathematics" }],
      }),
    ).toThrow(/nicht aktiviert/);
  });

  it("rejects duplicate module activation", () => {
    expect(() =>
      parseClassWorkspace({
        ...workspace,
        enabledModules: ["vocabulary", "vocabulary", "typing"],
      }),
    ).toThrow(/nur einmal/);
  });
});
