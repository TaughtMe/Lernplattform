import type { Metadata } from "next";
import { AppHeader } from "../components/app-header";
import { MeineKlasseApp } from "../components/meine-klasse/meine-klasse-app";

export const metadata: Metadata = { title: "Meine Klasse" };

export default function Page() {
  return (
    <main className="module-page">
      <AppHeader />
      <section className="module-hero module-hero--wide">
        <p className="eyebrow">Klassenbriefkasten</p>
        <h1>Meine Klasse</h1>
        <p>
          Einmalig den Einschreibungscode deiner Lehrkraft scannen. Für eine Abgabe brauchst du den Turnus-Code, den
          deine Lehrkraft ansagt oder anschreibt — dein Leistungsbrief bleibt sichtbar, bis du ihn selbst schließt.
        </p>
        <MeineKlasseApp />
      </section>
    </main>
  );
}
