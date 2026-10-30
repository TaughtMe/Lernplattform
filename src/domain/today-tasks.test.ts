import { describe, expect, it } from "vitest";
import type { DailyPlanItem } from "./daily-plan";
import { resolveStages, resolveVisibility } from "./release";
import { todayTasks } from "./today-tasks";

const visible = resolveVisibility(resolveStages(""), false);
const moduleHref = (module: string) => `/${module}?heute=1`;

function item(
  key: string,
  module: DailyPlanItem["module"],
  route?: string,
): Pick<DailyPlanItem, "key" | "module" | "route"> {
  return { key, module, ...(route ? { route } : {}) };
}

describe("todayTasks", () => {
  it("gibt ohne Portion keine Karte aus", () => {
    expect(
      todayTasks({
        items: [],
        openKeys: [],
        visibility: visible,
        moduleHref,
      }),
    ).toEqual([]);
  });

  it("zeigt nur Bereiche mit Aufgaben und zählt geschaffte und alle", () => {
    const tasks = todayTasks({
      items: [
        item("g1", "german"),
        item("g2", "german"),
        item("g3", "german"),
        item("m1", "mathematics"),
      ],
      openKeys: ["g2", "g3", "m1"],
      visibility: visible,
      moduleHref,
    });
    expect(tasks.map((task) => task.title)).toEqual(["Wörter üben", "Rechnen"]);
    expect(tasks[0]).toMatchObject({
      module: "german",
      icon: "wortspeicher",
      href: "/german?heute=1",
      done: 1,
      total: 3,
      finished: false,
    });
    // Keine Vokabeln in der Portion: keine Vokabel-Karte.
    expect(tasks.some((task) => task.module === "vocabulary")).toBe(false);
  });

  it("stellt offene Bereiche in Portionsreihenfolge vor die geschafften", () => {
    const tasks = todayTasks({
      items: [
        item("v1", "vocabulary"),
        item("g1", "german"),
        item("m1", "mathematics"),
        item("v2", "vocabulary"),
      ],
      // Vokabeln sind fertig, Deutsch und Mathe offen.
      openKeys: ["g1", "m1"],
      visibility: visible,
      moduleHref,
    });
    expect(tasks.map((task) => [task.module, task.finished])).toEqual([
      ["german", false],
      ["mathematics", false],
      ["vocabulary", true],
    ]);
    expect(tasks[2]).toMatchObject({ done: 2, total: 2 });
  });

  it("behält die Reihenfolge der Portion unter den geschafften Bereichen", () => {
    const tasks = todayTasks({
      items: [item("m1", "mathematics"), item("v1", "vocabulary")],
      openKeys: new Set<string>(),
      visibility: visible,
      moduleHref,
    });
    expect(tasks.map((task) => task.module)).toEqual([
      "mathematics",
      "vocabulary",
    ]);
    expect(tasks.every((task) => task.finished)).toBe(true);
  });

  it("zeigt nur Bereiche, die laut Freigaberegister sichtbar sind", () => {
    const tasks = todayTasks({
      items: [
        item("v1", "vocabulary"),
        item("g1", "german"),
        item("m1", "mathematics"),
      ],
      openKeys: ["v1", "g1", "m1"],
      visibility: resolveVisibility(
        resolveStages("lernbox=aus,mathe=vorschau"),
        false,
      ),
      moduleHref,
    });
    expect(tasks.map((task) => task.module)).toEqual(["german"]);
  });

  it("führt Aufgaben aus dem Unterricht über ihre eigene Route", () => {
    const tasks = todayTasks({
      items: [
        item("v1", "vocabulary"),
        item("k1", "vocabulary", "/klasse/7b/aufgaben/vokabeln"),
        item("k2", "vocabulary", "/klasse/7b/aufgaben/vokabeln"),
      ],
      openKeys: ["v1", "k2"],
      visibility: visible,
      moduleHref,
    });
    expect(tasks.map((task) => [task.title, task.href, task.done])).toEqual([
      ["Vokabeln", "/vocabulary?heute=1", 0],
      ["Aus dem Unterricht", "/klasse/7b/aufgaben/vokabeln", 1],
    ]);
  });
});
