import type { Metadata } from "next";
import { LearningBoxApp } from "../components/learning-box-app";

export const metadata: Metadata = { title: "Meine LernBox" };

export default function Page() {
  return <LearningBoxApp />;
}
