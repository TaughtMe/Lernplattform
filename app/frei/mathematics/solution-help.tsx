import { MathText } from "../../components/math-display";
import { Notice } from "../../ui/primitives";

/** Lösungsweg nach einem Fehlversuch: Schritte ohne Endergebnis (Regel C4-3). */
export function SolutionHelp({ steps }: { steps: readonly string[] }) {
  return (
    <Notice>
      <p>
        <strong>So geht es:</strong>
      </p>
      <ol className="ui-math__steps">
        {steps.map((step) => (
          <li key={step}>
            <MathText text={step} />
          </li>
        ))}
      </ol>
      <p>Rechne die nächste Aufgabe wieder ohne Hilfe.</p>
    </Notice>
  );
}
