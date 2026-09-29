import type { Metadata } from "next";
import { StudentPage } from "../ui/shell/student-page";
import { LearnerHome } from "./learner-home";

export const metadata: Metadata = { title: "Mein Lernraum" };

export default function Page() {
  return (
    <StudentPage activePath="/lernen" bare>
      <LearnerHome />
    </StudentPage>
  );
}
