import type { Metadata } from "next";
import { HausTeacherClient } from "./haus-teacher-client";

export const metadata: Metadata = { title: "Häuser · Lehrkraft" };

export default function Page() {
  return <HausTeacherClient />;
}
