import type { Metadata } from "next";
import { StudentShell } from "../components/student-shell";
import { ProfileClient } from "./profile-client";

export const metadata: Metadata = { title: "Profil" };

export default function Page() {
  return <StudentShell><ProfileClient /></StudentShell>;
}
