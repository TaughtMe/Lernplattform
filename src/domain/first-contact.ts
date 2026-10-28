/**
 * Erstkontakt auf der Lernen-Startseite (Befund C-003): Ein Kind ohne Lernstand
 * bekommt keine Empfehlung aus dem Nichts, sondern eine kurze Begrüßung mit
 * den Kernbereichen. Alles hier ist rein; Lernstand und Freigaben kommen von
 * außen.
 */
import type { ReleaseAreaId, ReleaseVisibility } from "./release";

type FirstContactAreaId = Extract<
  ReleaseAreaId,
  "wortspeicher" | "mathe" | "lernbox"
>;

/** Was die Startseite über das Gerät weiß; `null` heißt „unbekannt“. */
export interface FirstContactInput {
  /** Hat das Gerät irgendeinen persönlichen Lernstand (`hasPersonalLearningState`)? */
  hasLearningState: boolean | null;
  /** Elemente der Tagesportion heute (offene und erledigte). */
  planTotal: number;
  /** Klasse, der das Kind beigetreten ist; Klassenaufgaben sind Lernstoff. */
  className: string | null;
}

/**
 * „Hat noch nichts gelernt“: kein Lernstand auf dem Gerät, keine Portion und
 * keine Klasse. Ist der Lernstand unbekannt (nicht lesbar), gilt das Kind
 * nicht als neu: Die Seite zeigt dann nichts Falsches an.
 */
export function hasLearnedNothing(input: FirstContactInput): boolean {
  return (
    input.hasLearningState === false &&
    input.planTotal === 0 &&
    input.className === null
  );
}

export interface FirstContactArea {
  area: FirstContactAreaId;
  href: string;
  title: string;
  text: string;
  /** Bild unter `/illustrations/practice/<icon>.svg`. */
  icon: "wortspeicher" | "kopfrechnen" | "lernbox";
}

/** Die drei Kernbereiche für den Einstieg, in der Reihenfolge der Karten. */
const FIRST_CONTACT_AREAS: readonly FirstContactArea[] = [
  {
    area: "wortspeicher",
    href: "/frei/german/lernwoerter",
    title: "Wörter üben",
    text: "Wörter richtig schreiben lernen.",
    icon: "wortspeicher",
  },
  {
    area: "mathe",
    href: "/frei/mathematics",
    title: "Rechnen",
    text: "Kopfrechnen im eigenen Tempo.",
    icon: "kopfrechnen",
  },
  {
    area: "lernbox",
    href: "/lernbox",
    title: "Vokabeln",
    text: "Wörter in einer anderen Sprache lernen.",
    icon: "lernbox",
  },
];

/**
 * Einstiegskarten nur für Bereiche, die laut Freigaberegister sichtbar sind.
 * Die Tastenwelt gehört nie dazu: Sie braucht eine Tastatur.
 */
export function firstContactAreas(
  visibility: Pick<ReleaseVisibility, FirstContactAreaId>,
): FirstContactArea[] {
  return FIRST_CONTACT_AREAS.filter((entry) => visibility[entry.area]);
}

export type HomeMainAction = "Loslegen" | "Weiterlernen" | "Frei üben";

/**
 * Beschriftung der Hauptschaltfläche. „Weiterlernen“ gibt es nur, wenn es etwas
 * fortzusetzen gibt (offenes Portionselement, heutige Portion oder eine
 * Empfehlung). Ein neues Kind „legt los“; wer schon gelernt hat, aber heute
 * nichts geplant hat, übt „frei“. So widerspricht die Schaltfläche nie dem
 * Satz „Heute ist noch nichts geplant“.
 */
export function homeMainAction(input: {
  firstContact: boolean;
  /** Es gibt ein offenes Portionselement oder eine Empfehlung. */
  hasNextStep: boolean;
  planTotal: number;
}): HomeMainAction {
  if (input.firstContact) return "Loslegen";
  if (input.hasNextStep || input.planTotal > 0) return "Weiterlernen";
  return "Frei üben";
}
