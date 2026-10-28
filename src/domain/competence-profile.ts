import type { ClassModule } from "./class-workspace";
import type { LearningEventV1 } from "./learning-bundle";
import {
  effectiveLearningBoxLevel,
  type LearningBoxCard,
  type LearningBoxDirection,
} from "./learning-box";
import {
  learningWordId,
  type LearningWordProgress,
} from "./learning-word-progress";
import { localDayKey } from "./local-day";
import { mathFamilyKey, mathReviews } from "./math-practice";

/**
 * Kompetenzprofil (Umsetzungsplan Welle 3, D2-3; Audit D-003, D-004).
 *
 * Reine Projektion aus vorhandenen Daten: Lernereignisse, LernBox-Karten,
 * Lernwort-Lernstände und die Wortboxen. Es wird nichts zusätzlich gespeichert
 * und nichts übertragen. Je Teilbereich (Wortbox, Vokabelstapel, Rechenart mit
 * Zahlenraum, Textbox, Tastenwelt) steht „neu“, „im Aufbau“ oder „sicher“ und
 * ein maschinenlesbarer Grund.
 *
 * „Sicher“ heißt für ein Lernobjekt (Wort, Karte): Box 3 oder höher **und**
 * richtiger Abruf ohne Hilfe an mindestens zwei verschiedenen lokalen Tagen.
 * Als Abruf zählt eine getippte, richtige Antwort ohne Hilfe und ohne
 * Selbstkorrektur, und je Runde nur der erste Versuch. Wiedererkennen (Auswahl),
 * Selbsteinschätzung nach dem Aufdecken und die Wiederholung direkt nach dem
 * Fehler zählen nicht (D-004).
 *
 * Ein Teilbereich ist „sicher“, wenn mindestens `COMPETENCE_SAFE_SHARE` seiner
 * Objekte sicher sind, mindestens aber `COMPETENCE_MIN_SAFE_OBJECTS` (bei
 * kleinen Teilbereichen alle). Für Mathe gelten dieselben zwei Bedingungen auf
 * der Ebene der Rechenart (siehe `mathEntry`).
 */

export const COMPETENCE_SAFE_MIN_BOX = 3;
export const COMPETENCE_SAFE_MIN_DAYS = 2;
export const COMPETENCE_SAFE_SHARE = 0.8;
export const COMPETENCE_MIN_SAFE_OBJECTS = 5;

export type CompetenceLevel = "neu" | "im-aufbau" | "sicher";

export type CompetenceKind =
  "wortbox" | "vokabelstapel" | "rechenart" | "textbox" | "tastenwelt";

/** Was zur nächsten Stufe noch fehlt (maschinenlesbar, die Ansicht formuliert den Text). */
export type CompetenceMissing = "share" | "box" | "days" | "breadth";

export type CompetenceReason =
  /** Noch keine Antwort in diesem Teilbereich. */
  | { code: "no-answers" }
  /** Begonnen, aber nicht alle Bedingungen für „sicher“ erfüllt. */
  | { code: "building"; missing: CompetenceMissing[] }
  | { code: "safe" }
  /** Textbox und Tastenwelt haben keine Box; mehr als „im Aufbau“ ist nicht messbar. */
  | { code: "no-recall-box" };

export type CompetenceEntry = {
  /** Eindeutig, z. B. `wortbox:double-consonants` oder `rechenart:multiply:normal:reihe-7`. */
  id: string;
  kind: CompetenceKind;
  module: ClassModule;
  label: string;
  /** Interne Route zum Üben dieses Teilbereichs. */
  route: string;
  level: CompetenceLevel;
  reason: CompetenceReason;
  /** Objekte im Teilbereich (Wörter, Karten, bei Mathe die bisher gesehenen Aufgaben). */
  objects: number;
  /** Objekte mit mindestens einer Antwort. */
  started: number;
  /** Objekte bzw. Aufgaben, die die Bedingungen für „sicher“ erfüllen. */
  safe: number;
  /** So viele sichere Objekte braucht der Teilbereich für „sicher“ (0 ohne Anteilsregel). */
  needed: number;
  /** Objekte, deren letzte Antwort falsch war, bzw. bei Mathe offene Fehlerposten unter Box 3. */
  open: number;
  /** Lokale Tage mit richtigem Abruf ohne Hilfe im Teilbereich. */
  cleanDays: number;
};

export type CompetenceProfile = {
  entries: CompetenceEntry[];
  /** Lernobjekt (Ereignis-, Karten- oder Wort-Id) → Teilbereiche, in denen es zählt. */
  objectAreas: ReadonlyMap<string, readonly string[]>;
};

/** Eine Wortbox in der Sicht des Profils (feste oder eigene). */
export type CompetenceWordBox = {
  id: string;
  kind: "fest" | "eigen" | "unterricht";
  title: string;
  words: readonly string[];
};

export type CompetenceSources = {
  now: number;
  events: readonly LearningEventV1[];
  cards: readonly LearningBoxCard[];
  decks: readonly { id: string; title: string }[];
  words: readonly LearningWordProgress[];
  wordBoxes: readonly CompetenceWordBox[];
};

type ObjectEvidence = {
  /** Lokale Tage mit richtigem Abruf ohne Hilfe (erste Antwort je Runde). */
  cleanDays: Set<string>;
  /** Die letzte Antwort war falsch. */
  lastIncorrect: boolean;
};

function isIncorrect(event: LearningEventV1) {
  return (
    event.assessment.knowledge === "incorrect" ||
    event.assessment.writing === "incorrect"
  );
}

/** Richtiger Abruf ohne Hilfe: getippt, richtig, ohne Hilfe, ohne Selbstkorrektur. */
function isUnaidedRecall(event: LearningEventV1) {
  return (
    event.answerMode === "typed" &&
    event.help === "none" &&
    !event.assessment.selfCorrected &&
    event.assessment.knowledge === "correct" &&
    event.assessment.writing !== "incorrect"
  );
}

function byTime(left: LearningEventV1, right: LearningEventV1) {
  return (
    left.occurredAt.localeCompare(right.occurredAt) ||
    left.id.localeCompare(right.id)
  );
}

function collectEvidence(events: readonly LearningEventV1[]) {
  const evidence = new Map<string, ObjectEvidence>();
  const seenAttempts = new Set<string>();
  for (const event of [...events].sort(byTime)) {
    const current = evidence.get(event.learningObjectId) ?? {
      cleanDays: new Set<string>(),
      lastIncorrect: false,
    };
    current.lastIncorrect = isIncorrect(event);
    // In einer Runde zählt nur der erste Versuch je Objekt und Richtung.
    const attempt = `${event.learningObjectId}|${event.roundId}|${event.direction}`;
    if (!seenAttempts.has(attempt)) {
      seenAttempts.add(attempt);
      if (isUnaidedRecall(event)) {
        current.cleanDays.add(localDayKey(event.occurredAt));
      }
    }
    evidence.set(event.learningObjectId, current);
  }
  return evidence;
}

function isSafeObject(box: number, evidence: ObjectEvidence | undefined) {
  return (
    box >= COMPETENCE_SAFE_MIN_BOX &&
    (evidence?.cleanDays.size ?? 0) >= COMPETENCE_SAFE_MIN_DAYS
  );
}

type ShareCounts = {
  objects: number;
  started: number;
  safe: number;
  open: number;
  cleanDays: number;
};

/** Anteilsregel für Wortboxen und Vokabelstapel. */
function shareEntry(
  base: Pick<CompetenceEntry, "id" | "kind" | "module" | "label" | "route">,
  counts: ShareCounts,
): CompetenceEntry {
  const needed = Math.min(
    counts.objects,
    Math.max(
      COMPETENCE_MIN_SAFE_OBJECTS,
      Math.ceil(counts.objects * COMPETENCE_SAFE_SHARE),
    ),
  );
  if (counts.started === 0) {
    return {
      ...base,
      ...counts,
      needed,
      level: "neu",
      reason: { code: "no-answers" },
    };
  }
  const safe = counts.safe >= needed;
  return {
    ...base,
    ...counts,
    needed,
    level: safe ? "sicher" : "im-aufbau",
    reason: safe ? { code: "safe" } : { code: "building", missing: ["share"] },
  };
}

function addArea(
  areas: Map<string, string[]>,
  objectId: string,
  areaId: string,
) {
  const list = areas.get(objectId);
  if (!list) areas.set(objectId, [areaId]);
  else if (!list.includes(areaId)) list.push(areaId);
}

const OPERATION_LABEL: Record<string, string> = {
  add: "Plus",
  subtract: "Minus",
  multiply: "Mal",
  divide: "Geteilt",
};
const RANGE_LABEL: Record<string, string> = {
  "bis-20": "bis 20",
  "bis-100": "bis 100",
  "bis-1000": "bis 1000",
  darueber: "über 1000",
};

/** Lesbarer Name einer Aufgabenfamilie (`mathFamilyKey`), z. B. „Mal: Reihe 7“. */
export function mathFamilyLabel(familyKey: string): string {
  if (familyKey === "mixed-expression") return "Gemischte Aufgaben";
  const [operation = "", gap = "normal", range = ""] = familyKey.split(":");
  const name = OPERATION_LABEL[operation] ?? "Rechnen";
  const withGap = gap === "normal" ? "" : " mit Lücke";
  if (range.startsWith("reihe-")) {
    return `${name}${withGap}: Reihe ${range.slice("reihe-".length)}`;
  }
  return `${name}${withGap} ${RANGE_LABEL[range] ?? ""}`.trim();
}

type MathFamilyData = {
  tasks: Set<string>;
  cleanTasks: Set<string>;
  cleanDays: Set<string>;
};

/**
 * Rechenart mit Zahlenraum. Die einzelnen Aufgaben wechseln (sie entstehen
 * zufällig), deshalb gelten die zwei Bedingungen für „sicher“ auf der Ebene der
 * Aufgabenfamilie:
 * - Box 3 oder höher: Kein offener Wiederholungsposten der Familie liegt unter
 *   Box 3 (`mathReviews`, gefestigte Posten gelten als erledigt).
 * - Richtiger Abruf ohne Hilfe an mindestens zwei Tagen, mit mindestens
 *   `COMPETENCE_MIN_SAFE_OBJECTS` verschiedenen Aufgaben (Breite).
 */
function mathEntry(
  familyKey: string,
  data: MathFamilyData,
  openBelowBox3: number,
): CompetenceEntry {
  const base = {
    id: `rechenart:${familyKey}`,
    kind: "rechenart" as const,
    module: "mathematics" as const,
    label: mathFamilyLabel(familyKey),
    route: "/frei/mathematics",
    objects: data.tasks.size,
    started: data.tasks.size,
    safe: data.cleanTasks.size,
    needed: COMPETENCE_MIN_SAFE_OBJECTS,
    open: openBelowBox3,
    cleanDays: data.cleanDays.size,
  };
  const missing: CompetenceMissing[] = [];
  if (openBelowBox3 > 0) missing.push("box");
  if (data.cleanDays.size < COMPETENCE_SAFE_MIN_DAYS) missing.push("days");
  if (data.cleanTasks.size < COMPETENCE_MIN_SAFE_OBJECTS) {
    missing.push("breadth");
  }
  return missing.length === 0
    ? { ...base, level: "sicher", reason: { code: "safe" } }
    : { ...base, level: "im-aufbau", reason: { code: "building", missing } };
}

function mathEntries(
  events: readonly LearningEventV1[],
  areas: Map<string, string[]>,
): CompetenceEntry[] {
  const families = new Map<string, MathFamilyData>();
  const seenAttempts = new Set<string>();
  for (const event of [...events].sort(byTime)) {
    if (!event.math) continue;
    const familyKey = mathFamilyKey(event.math);
    const data = families.get(familyKey) ?? {
      tasks: new Set<string>(),
      cleanTasks: new Set<string>(),
      cleanDays: new Set<string>(),
    };
    families.set(familyKey, data);
    data.tasks.add(event.learningObjectId);
    addArea(areas, event.learningObjectId, `rechenart:${familyKey}`);
    const attempt = `${event.learningObjectId}|${event.roundId}`;
    if (seenAttempts.has(attempt)) continue;
    seenAttempts.add(attempt);
    if (isUnaidedRecall(event)) {
      data.cleanTasks.add(event.learningObjectId);
      data.cleanDays.add(localDayKey(event.occurredAt));
    }
  }
  const openByFamily = new Map<string, number>();
  for (const review of mathReviews(events)) {
    // Stufe 0 (Fehler offen) und Stufe 1 und 2 liegen unter Box 3.
    if (Math.max(review.step, 1) >= COMPETENCE_SAFE_MIN_BOX) continue;
    const key = mathFamilyKey(review);
    openByFamily.set(key, (openByFamily.get(key) ?? 0) + 1);
  }
  return [...families]
    .map(([key, data]) => mathEntry(key, data, openByFamily.get(key) ?? 0))
    .sort((left, right) => left.label.localeCompare(right.label, "de"));
}

/** Box einer Karte: die schwächere der geübten Richtungen (wirksame Box). */
function cardBox(card: LearningBoxCard, now: number): number {
  const practiced: LearningBoxDirection[] = [];
  if (card.interval > 0) practiced.push("forward");
  if (card.reverseInterval > 0) practiced.push("reverse");
  if (practiced.length === 0) return 0;
  return Math.min(
    ...practiced.map((direction) =>
      effectiveLearningBoxLevel(card, direction, now),
    ),
  );
}

function deckEntries(
  sources: CompetenceSources,
  evidence: ReadonlyMap<string, ObjectEvidence>,
  areas: Map<string, string[]>,
): CompetenceEntry[] {
  const entries: CompetenceEntry[] = [];
  for (const deck of sources.decks) {
    const cards = sources.cards.filter((card) => card.deckId === deck.id);
    if (cards.length === 0) continue;
    const id = `vokabelstapel:${deck.id}`;
    const days = new Set<string>();
    let started = 0;
    let safe = 0;
    let open = 0;
    for (const card of cards) {
      addArea(areas, card.id, id);
      const own = evidence.get(card.id);
      if (own || card.interval > 0 || card.reverseInterval > 0) started += 1;
      if (isSafeObject(cardBox(card, sources.now), own)) safe += 1;
      if (own?.lastIncorrect) open += 1;
      for (const day of own?.cleanDays ?? []) days.add(day);
    }
    entries.push(
      shareEntry(
        {
          id,
          kind: "vokabelstapel",
          module: "vocabulary",
          label: deck.title,
          route: "/lernbox",
        },
        { objects: cards.length, started, safe, open, cleanDays: days.size },
      ),
    );
  }
  return entries;
}

function wordBoxEntries(
  sources: CompetenceSources,
  evidence: ReadonlyMap<string, ObjectEvidence>,
  areas: Map<string, string[]>,
): CompetenceEntry[] {
  const progress = new Map(sources.words.map((word) => [word.id, word]));
  return sources.wordBoxes.flatMap((box) => {
    const ids = [...new Set(box.words.map(learningWordId))];
    if (ids.length === 0) return [];
    const areaId = `wortbox:${box.id}`;
    const days = new Set<string>();
    let started = 0;
    let safe = 0;
    let open = 0;
    for (const id of ids) {
      addArea(areas, id, areaId);
      const own = evidence.get(id);
      const stored = progress.get(id);
      if (own || stored) started += 1;
      if (isSafeObject(stored?.box ?? 0, own)) safe += 1;
      if (own?.lastIncorrect) open += 1;
      for (const day of own?.cleanDays ?? []) days.add(day);
    }
    return [
      shareEntry(
        {
          id: areaId,
          kind: "wortbox",
          module: "german",
          label: box.title,
          route:
            box.kind === "fest"
              ? `/frei/german/lernwoerter?sammlung=${box.id}`
              : "/frei/german/lernwoerter",
        },
        { objects: ids.length, started, safe, open, cleanDays: days.size },
      ),
    ];
  });
}

/** Textbox und Tastenwelt: nur „neu“ oder „im Aufbau“, es gibt keine Box. */
function activityEntry(
  events: readonly LearningEventV1[],
  input: {
    id: string;
    kind: "textbox" | "tastenwelt";
    module: ClassModule;
    label: string;
    route: string;
    matches: (event: LearningEventV1) => boolean;
  },
  areas: Map<string, string[]>,
): CompetenceEntry[] {
  const own = events.filter(input.matches);
  if (own.length === 0) return [];
  const days = new Set<string>();
  const objects = new Set<string>();
  for (const event of own) {
    objects.add(event.learningObjectId);
    addArea(areas, event.learningObjectId, input.id);
    if (!isIncorrect(event) && event.help === "none") {
      days.add(localDayKey(event.occurredAt));
    }
  }
  return [
    {
      id: input.id,
      kind: input.kind,
      module: input.module,
      label: input.label,
      route: input.route,
      level: "im-aufbau",
      reason: { code: "no-recall-box" },
      objects: objects.size,
      started: objects.size,
      safe: 0,
      needed: 0,
      open: 0,
      cleanDays: days.size,
    },
  ];
}

/** Baut das Profil aus den gelesenen Daten (rein, ohne Speicherzugriff). */
export function buildCompetenceProfile(
  sources: CompetenceSources,
): CompetenceProfile {
  const areas = new Map<string, string[]>();
  const evidence = collectEvidence(sources.events);
  const entries = [
    ...wordBoxEntries(sources, evidence, areas),
    ...mathEntries(sources.events, areas),
    ...deckEntries(sources, evidence, areas),
    ...activityEntry(
      sources.events,
      {
        id: "textbox:sammlung",
        kind: "textbox",
        module: "german",
        label: "Textbox",
        route: "/frei/german/textbox",
        matches: (event) => event.source === "textbox",
      },
      areas,
    ),
    ...activityEntry(
      sources.events,
      {
        id: "tastenwelt:abschnitte",
        kind: "tastenwelt",
        module: "typing",
        label: "Tastenwelt",
        route: "/frei/typing",
        matches: (event) =>
          event.source === "typing" ||
          event.learningObjectId.startsWith("typing:"),
      },
      areas,
    ),
  ];
  return { entries, objectAreas: areas };
}

/**
 * Wie schwach ein Teilbereich ist (größer = schwächer): „im Aufbau“ vor „neu“
 * vor „sicher“, innerhalb von „im Aufbau“ der Anteil offener Fehler zuerst.
 */
export function competenceWeakness(entry: CompetenceEntry): number {
  if (entry.level === "sicher") return 0;
  if (entry.level === "neu") return 1;
  return 2 + (entry.started > 0 ? entry.open / entry.started : 0);
}
