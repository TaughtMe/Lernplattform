import type { Metadata } from "next";
import { MentalMathApp } from "./mental-math-app";
import { StudentPage } from "../../ui/shell/student-page";

export const metadata: Metadata = { title: "Kopfrechnen" };

export default function MathematicsPage() {
  return (
    <StudentPage activePath="/frei/mathematics">
      <MentalMathApp />
    </StudentPage>
  );
}
