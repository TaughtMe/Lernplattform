import type { Metadata } from "next";
import { StudentPage } from "../../ui/shell/student-page";
import { DailyTrainingApp } from "./daily-training-app";

export const metadata: Metadata = { title: "Dein Training" };

export default function Page() {
  return (
    <StudentPage activePath="/lernen/training">
      <DailyTrainingApp />
    </StudentPage>
  );
}
