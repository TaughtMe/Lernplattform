import type { Metadata } from "next";
import { AppHeader } from "../components/app-header";
import { DashboardApp } from "../components/laufdiktat/dashboard-app";

export const metadata: Metadata = { title: "Lehrer-Login" };

export default function Page() {
  return (
    <main className="module-page">
      <AppHeader />
      <section className="module-hero module-hero--wide">
        <p className="eyebrow">Laufdiktat</p>
        <h1>Lehrer-Login</h1>
        <p>
          Wortliste einfügen, Raum öffnen, Diktat starten. Eine eigene Lehrer-Authentifizierung ist laut
          Entscheidungsprotokoll noch offen — dieser Bereich ist bis dahin nicht zusätzlich geschützt.
        </p>
        <DashboardApp />
      </section>
    </main>
  );
}
