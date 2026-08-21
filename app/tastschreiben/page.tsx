import type { Metadata } from "next";
import { AppHeader } from "../components/app-header";
import { TastschreibenApp } from "../components/tastschreiben/tastschreiben-app";

export const metadata: Metadata = { title: "Tastschreiben" };

export default function Page() {
  return (
    <main className="module-page">
      <AppHeader />
      <section className="module-hero module-hero--wide">
        <p className="eyebrow">Zehnfingersystem, Schritt für Schritt</p>
        <h1>Tastschreiben</h1>
        <p>
          Von der Grundstellung über jede Tastenreihe bis zu Wörtern, Sätzen und freiem Text — mit einer Bildschirmtastatur, die
          beim Tippen mitleuchtet. Braucht eine externe Tastatur, läuft komplett lokal auf diesem Gerät.
        </p>
        <TastschreibenApp />
      </section>
    </main>
  );
}
