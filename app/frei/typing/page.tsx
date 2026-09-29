import type { Metadata } from "next";
import { StudentPage } from "../../ui/shell/student-page";
import { TypingWorld } from "./typing-world";

export const metadata: Metadata = { title: "Tastenwelt" };

export default function TypingPage() {
  return (
    <StudentPage activePath="/frei/typing" bare>
      <TypingWorld />
    </StudentPage>
  );
}
