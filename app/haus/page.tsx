import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "../components/app-header";

export const metadata: Metadata = { title: "Mein Haus" };

export default function Page() {
  return (
    <main className="module-page">
      <AppHeader />
      <section className="module-hero module-hero--wide">
        <p className="eyebrow">Gemeinsame Ziele</p>
        <h1>Mein Haus</h1>
        <p>
          Häuser, Punkte und Hausmissionen gibt es bereits — die Rangliste lebt aber bewusst nur auf dem Gerät
          deiner Lehrkraft, nicht live auf deinem eigenen. Ohne Rückkanal zwischen den Geräten (siehe
          Entscheidungsprotokoll) kann dein Gerät den aktuellen Hausstand nicht selbst abfragen; deine Lehrkraft
          zeigt oder sagt ihn im Unterricht an.
        </p>
        <p className="module-hero__alt-link">
          Deinen eigenen Beitrag zum Ranking erzeugst du unter <Link href="/meine-klasse">Meine Klasse →</Link>
        </p>
      </section>
    </main>
  );
}
