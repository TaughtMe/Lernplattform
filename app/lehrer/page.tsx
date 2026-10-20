import type { Metadata } from "next";
import { TeacherStart } from "./teacher-start";

export const metadata: Metadata = { title: "Start" };

export default function Page() {
  return <TeacherStart />;
}
