import type { Metadata } from "next";
import { AppHeader } from "../components/app-header";
import { FirstLearningRound } from "../components/first-learning-round";

export const metadata: Metadata = { title: "Heute lernen" };

export default function Page() {
  return (
    <main className="module-page">
      <AppHeader />
      <FirstLearningRound />
    </main>
  );
}
