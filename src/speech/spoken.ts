/** Mathe-Aufgaben so umschreiben, wie sie vorgelesen werden („3 + 4“ → „3 plus 4“). */
export function spokenMath(text: string): string {
  return text
    .replace(/\+/g, " plus ")
    .replace(/[−-]/g, " minus ")
    .replace(/[·*×]/g, " mal ")
    .replace(/[:/÷]/g, " geteilt durch ");
}
