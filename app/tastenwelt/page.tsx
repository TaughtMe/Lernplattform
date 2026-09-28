import type { Metadata } from "next";
import { StudentShell } from "../components/student-shell";
import { TastenweltClient } from "./tastenwelt-client";

export const metadata: Metadata = { title: "Tastenwelt" };

export default function Page() {
  return <StudentShell><TastenweltClient /></StudentShell>;
}
