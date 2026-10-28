import type { Metadata } from "next";
import { StudentPage } from "../../ui/shell/student-page";
import { StartPointApp } from "./start-point-app";

export const metadata: Metadata = { title: "Startpunkt" };

export default function Page() {
  return (
    <StudentPage activePath="/lernen/startpunkt">
      <StartPointApp />
    </StudentPage>
  );
}
