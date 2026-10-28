/**
 * Freigaberegister (Entscheidung 47): Jeder Lernbereich hat eine Stufe.
 *
 * - `frei`: für alle sichtbar
 * - `vorschau`: nur sichtbar, wenn auf dem Gerät die Vorschau eingeschaltet ist
 * - `aus`: nirgends sichtbar, Routen leiten um
 *
 * Das Register steuert Sichtbarkeit und Navigation. Es ist keine
 * Zugriffskontrolle: Lokale Daten bleiben auf dem Gerät, und Raum- sowie
 * Lehrkrafttoken schützen die Supabase-Funktionen unabhängig davon.
 */
import * as z from "zod";

export const releaseStageSchema = z.enum(["aus", "vorschau", "frei"]);
export type ReleaseStage = z.infer<typeof releaseStageSchema>;

type AreaDefinition = {
  label: string;
  /** Routen-Präfixe; "/" steht nur für die Startseite selbst. */
  routes: readonly string[];
  stage: ReleaseStage;
};

/**
 * Standardstufen für den Schulbetrieb: Alle Lernbereiche und der
 * Lehrerbereich sind frei (Entscheidung 48: Schüler erreichen ihren
 * Lernraum über das Tier auf der Startseite). Motivation und Duell sind aus.
 * Abweichungen werden per LERNRAUM_FREIGABE gesetzt, z. B.
 * `lernbox=frei,motivation=vorschau`.
 */
export const RELEASE_AREAS = {
  start: { label: "Start", routes: ["/"], stage: "frei" },
  recht: {
    label: "Impressum und Datenschutz",
    routes: ["/impressum", "/datenschutz"],
    stage: "frei",
  },
  raum: { label: "Laufdiktat-Raum", routes: ["/raum"], stage: "frei" },
  "lehrer-live": {
    label: "Laufdiktat Lehrkraft",
    routes: ["/lehrer/live"],
    stage: "frei",
  },
  mathe: {
    label: "Kopfrechnen",
    routes: ["/frei/mathematics"],
    stage: "frei",
  },
  lernen: {
    label: "Mein Lernraum",
    routes: [
      "/lernen",
      "/ueben",
      "/frei",
      "/klasse",
      "/lernen/klasse",
      "/lernen/aufgaben",
      "/lernen/fortschritt",
      "/lernen/einstellungen",
      "/lernen/material",
      "/lernen/faecher",
    ],
    stage: "frei",
  },
  lernbox: {
    label: "LernBox",
    routes: ["/lernbox", "/frei/vocabulary"],
    stage: "frei",
  },
  wortspeicher: {
    label: "Wortspeicher",
    routes: ["/frei/german"],
    stage: "frei",
  },
  textbox: {
    label: "Textbox",
    routes: ["/frei/german/textbox"],
    // Von der Lehrkraft am 08.10.2026 freigegeben (Entscheidung 54).
    stage: "frei",
  },
  "laufdiktat-frei": {
    label: "Laufdiktat allein üben",
    routes: ["/frei/german/laufdiktat"],
    stage: "frei",
  },
  tastenwelt: {
    label: "Tastenwelt",
    routes: ["/frei/typing"],
    stage: "frei",
  },
  lehrer: {
    label: "Lehrerbereich",
    routes: ["/lehrer"],
    stage: "frei",
  },
  "lehrer-aufgaben": {
    label: "Aufgaben der Lehrkraft",
    routes: ["/lehrer/aufgaben"],
    // Kommt später; bis dahin nur mit Vorschau auf dem Gerät.
    stage: "vorschau",
  },
  "geraete-sync": {
    label: "Geräte abgleichen (Lehrkraft)",
    // Kein eigener Pfad: schaltet Einrichtung und Cloud-Symbol im Lehrerbereich.
    routes: [],
    // Entscheidung 53: frei seit dem Pilot der projektverantwortlichen
    // Lehrkraft (7. Oktober 2026); mit LERNRAUM_FREIGABE=geraete-sync=vorschau
    // erscheint wieder der Handabgleich.
    stage: "frei",
  },
  "lehrer-geraet": {
    label: "Gerätetyp und Sperre im Lehrerbereich",
    // Kein eigener Pfad: schaltet die Wahl „Mein Gerät“ / „Tafel“ beim ersten
    // Öffnen des Lehrerbereichs, die Sperre der Personenbereiche auf der Tafel
    // und die PIN-Sperre in den Lehrer-Einstellungen (Befund B-009).
    routes: [],
    stage: "vorschau",
  },
  spiegelschrift: {
    label: "Spiegelschrift im Lesetext",
    // Kein eigener Pfad: schaltet Schalter in den Einstellungen und die
    // Anzeige im Einprägen der Textbox.
    routes: [],
    stage: "vorschau",
  },
  gastmodus: {
    label: "Gastmodus (geteilte Geräte)",
    // Schaltet die Einstiegsseite /gast und den Knopf „Gast-QR“ der Lehrkraft.
    // Das Band „Gastmodus“ erscheint, solange ein Gastmodus auf dem Gerät läuft.
    routes: ["/gast"],
    stage: "vorschau",
  },
  motivation: {
    label: "Häuser, Serie und Abzeichen",
    routes: ["/haus", "/lehrer/haeuser"],
    // Entscheidung 47/39: gebaut, im Schulbetrieb zunächst aus.
    stage: "aus",
  },
  duell: { label: "Duell", routes: ["/duell"], stage: "aus" },
  "demo-klasse": {
    label: "Demo-Klasse 7b",
    // Feste Demo-Klasse aus der Anfangszeit, Testgelände der Browser-Tests.
    // Echte Klassen laufen über /klasse/[classId].
    routes: ["/klasse/7b"],
    stage: "vorschau",
  },
  demo: { label: "Alte Demo-Seiten", routes: ["/demo"], stage: "aus" },
} as const satisfies Record<string, AreaDefinition>;

export type ReleaseAreaId = keyof typeof RELEASE_AREAS;
export type ReleaseStages = Record<ReleaseAreaId, ReleaseStage>;
export type ReleaseVisibility = Record<ReleaseAreaId, boolean>;

const AREA_IDS = Object.keys(RELEASE_AREAS) as ReleaseAreaId[];

export const PREVIEW_COOKIE = "lernraum-vorschau";

function isAreaId(value: string): value is ReleaseAreaId {
  return value in RELEASE_AREAS;
}

/** Liest `bereich=stufe,…`; unbekannte oder fehlerhafte Einträge werden gemeldet. */
export function parseReleaseConfig(raw: string | undefined) {
  const overrides: Partial<ReleaseStages> = {};
  const rejected: string[] = [];
  for (const entry of (raw ?? "").split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const [area = "", stage = ""] = trimmed.split("=").map((s) => s.trim());
    const parsed = releaseStageSchema.safeParse(stage);
    if (isAreaId(area) && parsed.success) overrides[area] = parsed.data;
    else rejected.push(trimmed);
  }
  return { overrides, rejected };
}

export function resolveStages(raw: string | undefined): ReleaseStages {
  const { overrides } = parseReleaseConfig(raw);
  return Object.fromEntries(
    AREA_IDS.map((id) => [id, overrides[id] ?? RELEASE_AREAS[id].stage]),
  ) as ReleaseStages;
}

export function isStageVisible(stage: ReleaseStage, preview: boolean) {
  return stage === "frei" || (stage === "vorschau" && preview);
}

export function resolveVisibility(
  stages: ReleaseStages,
  preview: boolean,
): ReleaseVisibility {
  return Object.fromEntries(
    AREA_IDS.map((id) => [id, isStageVisible(stages[id], preview)]),
  ) as ReleaseVisibility;
}

function normalize(pathname: string) {
  return pathname.replace(/\/+$/, "") || "/";
}

/** Bereich mit dem längsten passenden Präfix, sonst null. */
export function areaForPath(pathname: string): ReleaseAreaId | null {
  const path = normalize(pathname);
  let best: { id: ReleaseAreaId; length: number } | null = null;
  for (const id of AREA_IDS) {
    for (const route of RELEASE_AREAS[id].routes) {
      const matches =
        route === "/"
          ? path === "/"
          : path === route || path.startsWith(`${route}/`);
      if (matches && (!best || route.length > best.length)) {
        best = { id, length: route.length };
      }
    }
  }
  return best?.id ?? null;
}

/** Ziel für nicht sichtbare Routen: Lehrkraft zum Live-Raum, sonst Start. */
export function fallbackRoute(pathname: string) {
  return normalize(pathname).startsWith("/lehrer") ? "/lehrer/live" : "/";
}

export function isPathVisible(pathname: string, visibility: ReleaseVisibility) {
  const area = areaForPath(pathname);
  return area === null || visibility[area];
}

/**
 * Markdown-Tabelle der Standardstufen, Quelle für README und Test.
 * Spalten sind wie bei Prettier auf die längste Zelle aufgefüllt.
 */
export function releaseStagesMarkdown(): string {
  const header = ["Bereich", "Bezeichnung", "Routen", "Standard"];
  const rows = AREA_IDS.map((id) => {
    const area: AreaDefinition = RELEASE_AREAS[id];
    return [
      `\`${id}\``,
      area.label,
      area.routes.length ? area.routes.map((r) => `\`${r}\``).join(", ") : "–",
      `\`${area.stage}\``,
    ];
  });
  const widths = header.map((title, column) =>
    Math.max(title.length, ...rows.map((row) => row[column]!.length)),
  );
  const line = (cells: string[]) =>
    `| ${cells.map((cell, column) => cell.padEnd(widths[column]!)).join(" | ")} |`;
  const separator = `| ${widths.map((width) => "-".repeat(width)).join(" | ")} |`;
  return [line(header), separator, ...rows.map(line)].join("\n");
}
