import type { Metadata } from "next";
import { StudentShell } from "../components/student-shell";
import { HausClient } from "./haus-client";

export const metadata: Metadata = { title: "Mein Haus" };

export default function Page() {
  return <StudentShell><HausClient /></StudentShell>;
}
