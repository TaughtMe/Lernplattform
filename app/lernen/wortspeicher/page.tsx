import type { Metadata } from "next";
import { StudentShell } from "../../components/student-shell";
import { WortspeicherClient } from "./wortspeicher-client";

export const metadata: Metadata = { title: "Lernen · Wortspeicher" };

export default function Page() {
  return <StudentShell><WortspeicherClient /></StudentShell>;
}
