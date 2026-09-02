import type { Metadata } from "next";
import { StudentHome } from "../components/student-home";

export const metadata: Metadata = { title: "Mein Lernraum" };

export default function Page() {
  return <StudentHome />;
}
