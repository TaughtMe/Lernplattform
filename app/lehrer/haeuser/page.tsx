import type { Metadata } from "next";
import { TeacherHouses } from "./teacher-houses";

export const metadata: Metadata = { title: "Häuser" };

export default function Page() {
  return <TeacherHouses />;
}
