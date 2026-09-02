import type { Metadata } from "next";
import Link from "next/link";
import { FirstLearningRound } from "../../../../components/first-learning-round";

export const metadata: Metadata = { title: "School words · Klasse 7b" };

export default function Page() {
  return (
    <main className="module-page">
      <header className="class-topbar">
        <Link href="/klasse/7b" className="back-link">
          ← Klasse 7b
        </Link>
        <span className="ranking-note">Zählt zum Klassenfortschritt</span>
      </header>
      <FirstLearningRound />
    </main>
  );
}
