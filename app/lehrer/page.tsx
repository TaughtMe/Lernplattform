import type { Metadata } from "next";
import { AppHeader } from "../components/app-header";
import { LehrerBereich } from "../components/lehrer/lehrer-bereich";

export const metadata: Metadata = { title: "Lehrerbereich" };

export default function Page() {
  return (
    <main className="module-page">
      <AppHeader />
      <section className="module-hero module-hero--wide">
        <p className="eyebrow">Lehrerbereich</p>
        <h1>Lehrerbereich</h1>
        <p>
          Klassenbriefkasten für Abgaberunden, dazu Wortliste einfügen, Raum öffnen und Diktat starten. Dieser
          Bereich ist lokal mit einer PIN geschützt — Wiederherstellung bei vergessener PIN ist laut
          Entscheidungsprotokoll noch offen.
        </p>
        <LehrerBereich />
      </section>
    </main>
  );
}
