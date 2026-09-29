import type { Metadata } from "next";
import { RunningDictationApp } from "./running-dictation-app";
import { StudentPage } from "../../../ui/shell/student-page";

export const metadata: Metadata = { title: "Laufdiktat" };

export default function RunningDictationPage() {
  return (
    <StudentPage activePath="/frei/german/laufdiktat">
      <RunningDictationApp />
    </StudentPage>
  );
}
