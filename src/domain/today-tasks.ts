/**
 * Aufgabenkarten der Lernen-Startseite: Aus den Elementen der Tagesportion
 * wird je Bereich eine Karte mit „3 von 5 geschafft“. Ein Bereich ohne
 * Aufgaben heute bekommt keine Karte. Alles hier ist rein; Portion, offene
 * Elemente und Freigaben kommen von außen.
 */
import type { DailyPlanItem, DailyPlanModule } from "./daily-plan";
import type { ReleaseVisibility } from "./release";

/** Bilder unter `/illustrations/practice/<icon>.svg`. */
export type TodayTaskIcon = "wortspeicher" | "kopfrechnen" | "lernbox";

export interface TodayTask {
  /** Eindeutig: das Modul, bei einer eigenen Übungsroute (Unterricht) die Route. */
  id: string;
  module: DailyPlanModule;
  title: string;
  icon: TodayTaskIcon;
  /** Direkt in die heutige Übung dieses Bereichs. */
  href: string;
  /** Erledigte und alle Elemente dieses Bereichs in der Portion. */
  done: number;
  total: number;
  /** Alles für heute geschafft: Die Karte zeigt einen Haken und steht hinten. */
  finished: boolean;
}

const MODULES: Record<
  DailyPlanModule,
  {
    area: "lernbox" | "wortspeicher" | "mathe";
    title: string;
    icon: TodayTaskIcon;
  }
> = {
  vocabulary: { area: "lernbox", title: "Vokabeln", icon: "lernbox" },
  german: { area: "wortspeicher", title: "Wörter üben", icon: "wortspeicher" },
  mathematics: { area: "mathe", title: "Rechnen", icon: "kopfrechnen" },
};

/** Titel einer Karte für Elemente mit eigener Übungsroute (Aufgaben aus dem Unterricht). */
const LESSON_TITLE = "Aus dem Unterricht";

/**
 * Zählt die Portion je Bereich. Offene Bereiche stehen vorn (in der Reihenfolge
 * der Portion), geschaffte danach. Ein Bereich, der laut Freigaberegister nicht
 * sichtbar ist, bekommt keine Karte. Elemente mit eigener Übungsroute
 * (Klassenaufgaben, Vorschläge aus dem Unterricht) bilden je Route eine eigene
 * Karte, die dorthin führt.
 */
export function todayTasks(input: {
  items: ReadonlyArray<Pick<DailyPlanItem, "key" | "module" | "route">>;
  /** Schlüssel der Elemente, die heute noch offen sind. */
  openKeys: ReadonlySet<string> | readonly string[];
  visibility: Pick<ReleaseVisibility, "lernbox" | "wortspeicher" | "mathe">;
  /** Einstieg in die heutige Übung eines Moduls. */
  moduleHref: (module: DailyPlanModule) => string;
}): TodayTask[] {
  const open = new Set(input.openKeys);
  const groups = new Map<string, TodayTask>();
  for (const item of input.items) {
    const entry = MODULES[item.module];
    if (!input.visibility[entry.area]) continue;
    const id = item.route ?? item.module;
    const group = groups.get(id) ?? {
      id,
      module: item.module,
      title: item.route ? LESSON_TITLE : entry.title,
      icon: entry.icon,
      href: item.route ?? input.moduleHref(item.module),
      done: 0,
      total: 0,
      finished: false,
    };
    group.total += 1;
    if (!open.has(item.key)) group.done += 1;
    groups.set(id, group);
  }
  const tasks = [...groups.values()].map((task) => ({
    ...task,
    finished: task.done >= task.total,
  }));
  return [
    ...tasks.filter((task) => !task.finished),
    ...tasks.filter((task) => task.finished),
  ];
}
