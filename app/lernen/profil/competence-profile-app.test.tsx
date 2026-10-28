import "fake-indexeddb/auto";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildCompetenceProfile } from "../../../src/domain/competence-profile";
import { CompetenceProfileApp } from "./competence-profile-app";

const empty = {
  now: Date.parse("2026-10-25T10:00:00.000Z"),
  events: [],
  cards: [],
  decks: [],
  words: [],
  wordBoxes: [
    {
      id: "ck-tz",
      kind: "fest" as const,
      title: "ck und tz",
      words: ["Jacke", "Katze"],
    },
  ],
};

describe("Kompetenzprofil: Container", () => {
  it("lädt das Profil und zeigt die Teilbereiche", async () => {
    render(
      <CompetenceProfileApp load={async () => buildCompetenceProfile(empty)} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("geladen");
    expect(
      await screen.findByRole("link", { name: "Üben ck und tz" }),
    ).toBeInTheDocument();
    expect(screen.getByText("neu")).toBeInTheDocument();
    expect(
      screen.getByText("Hier hast du noch nichts geübt."),
    ).toBeInTheDocument();
  });

  it("sagt kurz Bescheid, wenn der Lernstand nicht lesbar ist", async () => {
    render(
      <CompetenceProfileApp
        load={async () => {
          throw new Error("kaputt");
        }}
      />,
    );
    expect(await screen.findByText(/nicht verfügbar/)).toBeInTheDocument();
  });

  it("liest ohne eingespeiste Funktion aus dem lokalen Speicher", async () => {
    render(<CompetenceProfileApp />);
    // Leerer Speicher: feste Wortboxen sind „neu“.
    expect(
      await screen.findByRole("link", { name: "Üben Doppelkonsonanten" }),
    ).toBeInTheDocument();
  });
});
