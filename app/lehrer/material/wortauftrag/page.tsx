import type { Metadata } from "next";
import { TeacherWordOrder } from "./teacher-word-order";

export const metadata: Metadata = { title: "Wortauftrag" };

export default function Page() {
  return <TeacherWordOrder />;
}
