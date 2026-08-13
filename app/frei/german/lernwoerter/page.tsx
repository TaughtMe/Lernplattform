import type { Metadata } from "next";
import { LearningWordApp } from "../../../components/learning-word-app";

export const metadata: Metadata = { title: "Lernwörter" };

export default function LearningWordsPage() {
  return <LearningWordApp />;
}
