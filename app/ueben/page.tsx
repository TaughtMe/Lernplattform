import type { Metadata } from "next";
import { StudentPage } from "../ui/shell/student-page";
import { PracticeOverview } from "./practice-overview";

export const metadata: Metadata = { title: "Üben" };

export default function Page() {
  return (
    <StudentPage activePath="/ueben" bare>
      <PracticeOverview />
    </StudentPage>
  );
}
