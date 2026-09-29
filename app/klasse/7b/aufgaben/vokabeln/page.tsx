import type { Metadata } from "next";
import { FirstLearningRound } from "../../../../components/first-learning-round";
import { StudentPage } from "../../../../ui/shell/student-page";

export const metadata: Metadata = { title: "School words · Klasse 7b" };

export default function Page() {
  return (
    <StudentPage activePath="/lernen/klasse">
      <FirstLearningRound />
    </StudentPage>
  );
}
