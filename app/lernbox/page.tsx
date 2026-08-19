import type { Metadata } from "next";
import { AppHeader } from "../components/app-header";
import { LernBoxApp } from "../components/lernbox/lernbox-app";

export const metadata: Metadata = { title: "Meine LernBox" };

export default function Page() {
  return (
    <main className="module-page">
      <AppHeader />
      <section className="module-hero module-hero--wide">
        <p className="eyebrow">Dein persönlicher Lernstand</p>
        <h1>Meine LernBox</h1>
        <p>Vokabeln, Fälligkeiten und persönliche Fehlerübungen – standardmäßig lokal auf diesem Gerät gespeichert.</p>
        <LernBoxApp />
      </section>
    </main>
  );
}
