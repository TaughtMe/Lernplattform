import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { TodayTask } from "../../../src/domain/today-tasks";
import { HomeScreen, type HomeScreenProps } from "./home-screen";

afterEach(cleanup);

const base: HomeScreenProps = {
  title: "Lernraum",
  animal: null,
  theme: "light",
  done: 0,
  target: 0,
  continueHref: "/ueben",
  week: [],
  due: { done: 0, total: 0 },
  difficult: [],
  practiceHref: null,
};

function task(overrides: Partial<TodayTask>): TodayTask {
  return {
    id: "german",
    module: "german",
    title: "Wörter üben",
    icon: "wortspeicher",
    href: "/frei/german/lernwoerter?heute=1",
    done: 0,
    total: 5,
    finished: false,
    ...overrides,
  };
}

describe("HomeScreen: Aufgabenkarten", () => {
  it("zeigt ohne Aufgaben keine Karten, sondern die bisherigen Kacheln", () => {
    render(<HomeScreen {...base} todayTasks={[]} />);
    expect(
      screen.queryByRole("list", { name: "Aufgaben für heute" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("heute dran")).toBeVisible();
    expect(screen.getByText("schwierige Wörter")).toBeVisible();
  });

  it("zeigt ohne die Eigenschaft dieselbe Ansicht wie bisher (Designvergleich)", () => {
    const { container } = render(<HomeScreen {...base} />);
    const without = container.innerHTML;
    cleanup();
    const { container: other } = render(
      <HomeScreen {...base} todayTasks={[]} />,
    );
    expect(other.innerHTML).toBe(without);
  });

  it("zeigt je Bereich eine Karte mit Stand und Link in die heutige Übung", () => {
    render(
      <HomeScreen
        {...base}
        done={3}
        target={8}
        todayTasks={[
          task({ done: 3, total: 5 }),
          task({
            id: "vocabulary",
            module: "vocabulary",
            title: "Vokabeln",
            icon: "lernbox",
            href: "/lernbox?heute=1",
            total: 3,
          }),
        ]}
      />,
    );
    const list = screen.getByRole("list", { name: "Aufgaben für heute" });
    const links = within(list).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/frei/german/lernwoerter?heute=1",
      "/lernbox?heute=1",
    ]);
    expect(links[0]).toHaveTextContent("Wörter üben");
    expect(links[0]).toHaveTextContent("3 von 5 geschafft");
    expect(links[1]).toHaveTextContent("0 von 3 geschafft");
    // Die Karten ersetzen die Kacheln.
    expect(screen.queryByText("schwierige Wörter")).not.toBeInTheDocument();
  });

  it("zeigt einen geschafften Bereich mit Haken am Ende, ohne Link", () => {
    render(
      <HomeScreen
        {...base}
        todayTasks={[
          task({ done: 1, total: 5 }),
          task({
            id: "vocabulary",
            module: "vocabulary",
            title: "Vokabeln",
            icon: "lernbox",
            done: 4,
            total: 4,
            finished: true,
          }),
        ]}
      />,
    );
    const items = within(
      screen.getByRole("list", { name: "Aufgaben für heute" }),
    ).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("1 von 5 geschafft");
    expect(within(items[0]!).getByRole("link")).toBeVisible();
    expect(items[1]).toHaveTextContent("Vokabeln");
    expect(items[1]).toHaveTextContent("geschafft");
    expect(items[1]).not.toHaveTextContent("von");
    expect(within(items[1]!).queryByRole("link")).toBeNull();
    expect(items[1]!.querySelector("svg")).not.toBeNull();
  });

  it("begrüßt im Erstkontakt ohne Karten und ohne Kacheln", () => {
    render(<HomeScreen {...base} firstContact mainLabel="Loslegen" />);
    expect(
      screen.getByText(
        "Schön, dass du da bist! Tippe auf Loslegen und such dir etwas aus.",
      ),
    ).toBeVisible();
    expect(
      screen.queryByRole("list", { name: "Aufgaben für heute" }),
    ).toBeNull();
    expect(screen.queryByText("heute dran")).not.toBeInTheDocument();
    for (const link of screen.getAllByRole("link", { name: "Loslegen" })) {
      expect(link).toHaveAttribute("href", "/ueben");
    }
  });
});
