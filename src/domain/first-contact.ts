/**
 * Erstkontakt auf der Lernen-Startseite (Befund C-003): Ein Kind ohne Lernstand
 * bekommt keine Empfehlung aus dem Nichts, sondern eine kurze Begrüßung; „Loslegen“
 * führt nach „Üben“. Bereichskarten gibt es erst, wenn heute Aufgaben anstehen
 * (`today-tasks.ts`). Alles hier ist rein; der Lernstand kommt von außen.
 */
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
