import type { Metadata } from "next";
import { TeacherOverview } from "./teacher-overview";

export const metadata: Metadata = { title: "Lehrerbereich" };

export default function Page() {
  return <TeacherOverview />;
}
