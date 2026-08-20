import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "../components/app-header";
import { JoinRoom } from "../components/laufdiktat/join-room";

export const metadata: Metadata = { title: "Raum beitreten" };

export default function Page() {
  return (
    <main className="module-page">
      <AppHeader />
      <section className="module-hero">
        <p className="eyebrow">Unterrichtsraum</p>
        <h1>Raum beitreten</h1>
        <p>Gib den Raumcode deiner Lehrkraft ein, wähle deinen Tiernamen und leg los.</p>
        <JoinRoom />
        <p className="module-hero__alt-link">
          Keinen Raumcode? <Link href="/mathe-ueben">Mathe selbstständig üben →</Link>
        </p>
      </section>
    </main>
  );
}
