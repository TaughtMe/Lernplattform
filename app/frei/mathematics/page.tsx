import type { Metadata } from "next";
import { MentalMathApp } from "../../components/mental-math-app";

export const metadata: Metadata = { title: "Kopfrechnen" };

export default function MathematicsPage() {
  return <MentalMathApp />;
}
