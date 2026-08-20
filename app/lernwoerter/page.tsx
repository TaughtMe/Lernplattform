import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "../components/app-header";
import { LernwoerterApp } from "../components/lernwoerter/lernwoerter-app";

export const metadata: Metadata = { title: "Meine Lernwörter" };

export default function Page() {
  return (
    <main className="module-page">
      <AppHeader />
      <section className="module-hero module-hero--wide">
        <p className="eyebrow">Rechtschreibung mit der Merkstrecke</p>
        <h1>Meine Lernwörter</h1>
        <p>
          Fünf Merkstufen von „abschreiben“ bis „mehrere Wörter aus dem Gedächtnis tippen“ — standardmäßig lokal auf diesem Gerät
          gespeichert.
        </p>
        <p className="module-hero__alt-link">
          Vokabeln statt Rechtschreibung? <Link href="/lernbox">Meine LernBox öffnen →</Link>
        </p>
        <LernwoerterApp />
      </section>
    </main>
  );
}
