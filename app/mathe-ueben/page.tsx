import type { Metadata } from "next";
import { AppHeader } from "../components/app-header";
import { SelfPractice } from "../components/laufdiktat/self-practice";

export const metadata: Metadata = { title: "Mathe üben" };

export default function Page() {
  return (
    <main className="module-page">
      <AppHeader />
      <section className="module-hero">
        <p className="eyebrow">Ohne Raum, ganz für dich</p>
        <h1>Mathe üben</h1>
        <p>Erstelle eigene Aufgaben oder lass sie automatisch zu deinem Können passen — ganz ohne Raumcode.</p>
        <SelfPractice />
      </section>
    </main>
  );
}
