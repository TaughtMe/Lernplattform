import { describe, expect, it } from "vitest";
import { prioritizeLearningRecommendations } from "./learning-recommendation";

describe("learning recommendations", () => {
  it("prioritizes errors and keeps one clear next step per module", () => {
    const recommendations = prioritizeLearningRecommendations({
      candidates: [
        {
          id: "vocabulary-due",
          module: "vocabulary",
          title: "Vokabeln wiederholen",
          detail: "Heute fällig",
          route: "/lernbox",
          reason: "due",
          amount: 8,
        },
        {
          id: "vocabulary-error",
          module: "vocabulary",
          title: "Unsichere Vokabeln",
          detail: "Aus Fehlern",
          route: "/lernbox",
          reason: "error",
          amount: 2,
          occurredAt: "2026-08-24T09:00:00.000Z",
        },
        {
          id: "typing-next",
          module: "typing",
          title: "Grundstellung beginnen",
          detail: "Nächster Schritt",
          route: "/frei/typing",
          reason: "next-step",
          amount: 1,
        },
      ],
      enabledModules: ["vocabulary", "typing"],
      now: "2026-08-24T10:00:00.000Z",
    });

    expect(recommendations.map((item) => item.id)).toEqual([
      "vocabulary-error",
      "typing-next",
    ]);
  });

  it("excludes disabled modules and respects the daily limit", () => {
    const candidates = ["german", "typing", "mathematics"].map(
      (module, index) => ({
        id: module,
        module: module as "german" | "typing" | "mathematics",
        title: module,
        detail: module,
        route: "/frei",
        reason: "due" as const,
        amount: 1,
        dueAt: `2026-08-2${index + 1}T10:00:00.000Z`,
      }),
    );
    expect(
      prioritizeLearningRecommendations({
        candidates,
        enabledModules: ["german", "typing"],
        now: "2026-08-24T10:00:00.000Z",
        limit: 1,
      }),
    ).toHaveLength(1);
  });
});
