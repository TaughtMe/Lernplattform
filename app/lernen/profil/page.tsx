import type { Metadata } from "next";
import { StudentPage } from "../../ui/shell/student-page";
import { CompetenceProfileApp } from "./competence-profile-app";

export const metadata: Metadata = { title: "Mein Lernstand" };

export default function Page() {
  return (
    <StudentPage activePath="/lernen/profil">
      <CompetenceProfileApp />
    </StudentPage>
  );
}
