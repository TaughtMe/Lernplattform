import type { Metadata } from "next";
import { LearningWordApp } from "../../components/learning-word-app";

export const metadata: Metadata = { title: "Deutsch · Lernwörter" };

export default function GermanPracticePage() {
  return <LearningWordApp />;
}
