import {
  BookOpenIcon,
  CalculatorIcon,
  KeyboardIcon,
  LanguagesIcon,
} from "./ui-icons";

export function SubjectIcon({ subject }: { subject: string }) {
  if (subject === "german") return <BookOpenIcon aria-hidden="true" />;
  if (subject === "mathematics") return <CalculatorIcon aria-hidden="true" />;
  if (subject === "vocabulary") return <LanguagesIcon aria-hidden="true" />;
  return <KeyboardIcon aria-hidden="true" />;
}
